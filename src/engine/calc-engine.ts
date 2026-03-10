/**
 * @module calc-engine
 *
 * A pure-TypeScript calculator engine composed of three pipeline stages:
 *
 *   Source string
 *     │
 *     ▼  tokenize()
 *   Token[]
 *     │
 *     ▼  shuntingYard()  (Dijkstra's shunting-yard algorithm)
 *   RPNItem[]
 *     │
 *     ▼  buildAST()
 *   ASTNode          ← returned by parseExpression()
 *     │
 *     ▼  evaluateAST()
 *   Decimal          ← arbitrary-precision result
 *
 * The AST is a first-class value that callers can inspect, serialise,
 * transform (e.g. symbolic differentiation), or cache before evaluation.
 *
 * @example
 * ```ts
 * import { parseExpression, evaluateAST } from './calc-engine';
 *
 * const ast = parseExpression('sin(pi/6) + sqrt(3)/2');
 * const result = evaluateAST(ast, { angleMode: 'rad', precision: 20 });
 * console.log(result.toString()); // "1"
 * ```
 */

import Decimal from 'decimal.js';
import { addBreadcrumb } from '@/services/SentryService';

// ─────────────────────────────────────────────────────────────────────────────
// §1  Public type definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Infix binary operators recognised by the parser. */
export type BinaryOperator = '+' | '-' | '*' | '/' | '^' | '%';

/** Unary prefix operators recognised by the parser. */
export type UnaryOperator = 'u-' | 'u+';

/** Mathematical constants available as identifiers in expressions. */
export type ConstantName = 'pi' | 'e' | 'tau' | 'phi';

/**
 * Built-in functions available in expressions.
 *
 * Trigonometry (angle mode controlled via {@link EvaluateOptions.angleMode}):
 * `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`
 *
 * Hyperbolic: `sinh`, `cosh`, `tanh`
 *
 * Power / root: `sqrt`, `cbrt`, `exp`, `pow`
 *
 * Logarithm: `ln`, `log` (= log₁₀), `log2`, `log10`
 *
 * Rounding: `abs`, `ceil`, `floor`, `round`, `sign`
 *
 * Selection: `max`, `min`
 */
export type BuiltinFunction =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'asin'
  | 'acos'
  | 'atan'
  | 'atan2'
  | 'sinh'
  | 'cosh'
  | 'tanh'
  | 'sqrt'
  | 'cbrt'
  | 'exp'
  | 'pow'
  | 'ln'
  | 'log'
  | 'log2'
  | 'log10'
  | 'abs'
  | 'ceil'
  | 'floor'
  | 'round'
  | 'sign'
  | 'max'
  | 'min';

// ─── AST node variants ───────────────────────────────────────────────────────

/** A numeric literal, stored as a string to avoid JS float rounding. */
export interface NumberNode {
  readonly kind: 'Number';
  /** Raw string from the source expression, e.g. `"3.14"` or `"1e-10"`. */
  readonly value: string;
}

/** A named mathematical constant (`pi`, `e`, `tau`, `phi`). */
export interface ConstantNode {
  readonly kind: 'Constant';
  readonly name: ConstantName;
}

/** An infix binary operation applied to two sub-expressions. */
export interface BinaryOpNode {
  readonly kind: 'BinaryOp';
  readonly op: BinaryOperator;
  readonly left: ASTNode;
  readonly right: ASTNode;
}

/** A unary prefix operation applied to one sub-expression. */
export interface UnaryOpNode {
  readonly kind: 'UnaryOp';
  readonly op: UnaryOperator;
  readonly operand: ASTNode;
}

/** A call to a named built-in function with zero or more arguments. */
export interface FunctionCallNode {
  readonly kind: 'FunctionCall';
  readonly name: BuiltinFunction;
  readonly args: readonly ASTNode[];
}

/**
 * A node in the Abstract Syntax Tree produced by {@link parseExpression}.
 *
 * Discriminate on the `kind` field:
 * ```ts
 * function print(node: ASTNode): string {
 *   switch (node.kind) {
 *     case 'Number':       return node.value;
 *     case 'Constant':     return node.name;
 *     case 'UnaryOp':      return `(${node.op}${print(node.operand)})`;
 *     case 'BinaryOp':     return `(${print(node.left)}${node.op}${print(node.right)})`;
 *     case 'FunctionCall': return `${node.name}(${node.args.map(print).join(',')})`;
 *   }
 * }
 * ```
 */
export type ASTNode = NumberNode | ConstantNode | BinaryOpNode | UnaryOpNode | FunctionCallNode;

// ─── Evaluation options ───────────────────────────────────────────────────────

/**
 * Options forwarded to {@link evaluateAST}.
 */
export interface EvaluateOptions {
  /**
   * Number of significant digits used by `Decimal.js` throughout evaluation.
   * Must be a positive integer in the range `[1, 9_000_000_000]`.
   *
   * @default 20
   */
  precision?: number;

  /**
   * `Decimal.js` rounding mode applied when rounding intermediate or final
   * values.  Use the `Decimal.ROUND_*` constants.
   *
   * @default Decimal.ROUND_HALF_UP
   * @see {@link https://mikemcl.github.io/decimal.js/#constructor-properties}
   */
  rounding?: Decimal.Rounding;

  /**
   * Angle unit used for trigonometric functions (`sin`, `cos`, `tan`, `asin`,
   * `acos`, `atan`, `atan2`).
   *
   * - `'rad'` — input is already in radians (default)
   * - `'deg'` — input is in degrees; the engine converts to radians before
   *             calling the underlying function and converts inverse-trig
   *             results back to degrees
   *
   * @default 'rad'
   */
  angleMode?: 'rad' | 'deg';

  /**
   * Optional map of additional named variables available inside the
   * expression.  Values are coerced to `Decimal` before use.
   *
   * @example
   * ```ts
   * evaluateAST(ast, { variables: { x: '3.5', y: new Decimal(2) } });
   * ```
   */
  variables?: Record<string, Decimal | number | string>;
}

// ─── Error types ─────────────────────────────────────────────────────────────

/**
 * Thrown by {@link parseExpression} when the expression string contains a
 * syntax error (e.g. mismatched parentheses, unknown token).
 */
export class ParseError extends Error {
  /**
   * @param message - Human-readable description of the problem.
   * @param position - Zero-based character offset in the source string where
   *                   the error was detected, or `-1` if unavailable.
   */
  constructor(
    message: string,
    public readonly position: number = -1,
  ) {
    super(position >= 0 ? `${message} (position ${position})` : message);
    this.name = 'ParseError';
  }
}

/**
 * Thrown by {@link evaluateAST} when the AST cannot be evaluated — for
 * example, division by zero or a domain error (e.g. `sqrt(-1)`).
 */
export class EvaluateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluateError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §2  Internal token representation
// ─────────────────────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'CONSTANT'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'UNARY'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
  /** Zero-based source position. */
  pos: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3  Static metadata tables
// ─────────────────────────────────────────────────────────────────────────────

/** Operator precedence (higher → tighter binding) and associativity. */
const OPERATOR_INFO: Record<string, { precedence: number; rightAssoc: boolean }> = {
  '+': { precedence: 1, rightAssoc: false },
  '-': { precedence: 1, rightAssoc: false },
  '*': { precedence: 2, rightAssoc: false },
  '/': { precedence: 2, rightAssoc: false },
  '%': { precedence: 2, rightAssoc: false },
  '^': { precedence: 3, rightAssoc: true },
  'u-': { precedence: 4, rightAssoc: true }, // unary minus
  'u+': { precedence: 4, rightAssoc: true }, // unary plus (no-op, kept for AST completeness)
};

/** Number of arguments each built-in function expects. */
const FUNCTION_ARITY: Record<BuiltinFunction, number> = {
  sin: 1,
  cos: 1,
  tan: 1,
  asin: 1,
  acos: 1,
  atan: 1,
  atan2: 2,
  sinh: 1,
  cosh: 1,
  tanh: 1,
  sqrt: 1,
  cbrt: 1,
  exp: 1,
  pow: 2,
  ln: 1,
  log: 1,
  log2: 1,
  log10: 1,
  abs: 1,
  ceil: 1,
  floor: 1,
  round: 1,
  sign: 1,
  max: 2,
  min: 2,
};

/** Named constants and their high-precision values (evaluated lazily). */
const CONSTANT_VALUES: Record<ConstantName, () => Decimal> = {
  pi: () => Decimal.acos(-1),
  e: () => new Decimal(1).exp(),
  tau: () => Decimal.acos(-1).times(2),
  phi: () => new Decimal(1).plus(new Decimal(5).sqrt()).div(2),
};

/** Unicode aliases for operators, mapped to their ASCII equivalents. */
const OPERATOR_ALIASES: Record<string, string> = {
  '×': '*',
  '÷': '/',
  '−': '-',
  '·': '*',
};

// ─────────────────────────────────────────────────────────────────────────────
// §4  Tokenizer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits a mathematical expression string into a flat list of typed tokens.
 *
 * Handles:
 * - Integer and decimal numbers including scientific notation (`1.5e-3`)
 * - Unicode operator aliases (`×`, `÷`, `−`)
 * - Named constants (`pi`, `π`, `e`, `tau`, `φ`, `phi`)
 * - Built-in function identifiers (`sin`, `cos`, `sqrt`, …)
 * - Parentheses and commas for function arguments
 * - Automatic unary-minus / unary-plus detection
 *
 * @param expression - Raw expression string from the user.
 * @returns Ordered array of tokens.
 * @throws {@link ParseError} on unrecognised characters.
 *
 * @internal
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    // Skip whitespace
    if (/\s/.test(expression[i])) {
      i++;
      continue;
    }

    // Numbers: integer, decimal, optional scientific notation
    if (
      /[0-9]/.test(expression[i]) ||
      (expression[i] === '.' && /[0-9]/.test(expression[i + 1] ?? ''))
    ) {
      let num = '';
      const pos = i;
      while (i < expression.length && /[0-9.]/.test(expression[i])) num += expression[i++];
      // Optional exponent: e/E followed by optional sign and digits
      if (i < expression.length && /[eE]/.test(expression[i])) {
        num += expression[i++];
        if (i < expression.length && /[+-]/.test(expression[i])) num += expression[i++];
        while (i < expression.length && /[0-9]/.test(expression[i])) num += expression[i++];
      }
      tokens.push({ type: 'NUMBER', value: num, pos });
      continue;
    }

    // Identifiers: function names and constants
    if (/[a-zA-Zπφτ_]/.test(expression[i])) {
      let ident = '';
      const pos = i;
      while (i < expression.length && /[a-zA-Z0-9πφτ_]/.test(expression[i]))
        ident += expression[i++];

      // Normalise Unicode constant glyphs
      const normalised =
        ident === 'π' ? 'pi' : ident === 'φ' ? 'phi' : ident === 'τ' ? 'tau' : ident;

      if (normalised in CONSTANT_VALUES) {
        tokens.push({ type: 'CONSTANT', value: normalised, pos });
      } else if (normalised in FUNCTION_ARITY) {
        tokens.push({ type: 'FUNCTION', value: normalised, pos });
      } else {
        throw new ParseError(`Unknown identifier "${ident}"`, pos);
      }
      continue;
    }

    // Parentheses
    if (expression[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i++ });
      continue;
    }
    if (expression[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i++ });
      continue;
    }
    if (expression[i] === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i++ });
      continue;
    }

    // Operators (including unicode aliases)
    const ch = OPERATOR_ALIASES[expression[i]] ?? expression[i];
    if (ch in OPERATOR_INFO && ch !== 'u-' && ch !== 'u+') {
      // Distinguish unary from binary +/-
      const prev = tokens[tokens.length - 1];
      const isUnary =
        (ch === '+' || ch === '-') &&
        (!prev ||
          prev.type === 'OPERATOR' ||
          prev.type === 'UNARY' ||
          prev.type === 'LPAREN' ||
          prev.type === 'COMMA');

      if (isUnary) {
        tokens.push({ type: 'UNARY', value: ch === '-' ? 'u-' : 'u+', pos: i });
      } else {
        tokens.push({ type: 'OPERATOR', value: ch, pos: i });
      }
      i++;
      continue;
    }

    throw new ParseError(`Unrecognised character "${expression[i]}"`, i);
  }

  return tokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// §5  Shunting-yard → RPN
// ─────────────────────────────────────────────────────────────────────────────

/** An item in the Reverse Polish Notation output queue. */
type RPNItem =
  | { tag: 'number'; value: string }
  | { tag: 'constant'; name: ConstantName }
  | { tag: 'binaryOp'; op: BinaryOperator }
  | { tag: 'unaryOp'; op: UnaryOperator }
  | { tag: 'function'; name: BuiltinFunction; arity: number };

/**
 * Converts a token stream to a Reverse Polish Notation sequence using
 * Dijkstra's shunting-yard algorithm, extended for:
 *
 * - Unary operators
 * - Named functions with static arity
 * - Named constants
 * - Right-associative operators (`^`)
 *
 * @param tokens - Output of {@link tokenize}.
 * @returns Flat RPN sequence ready for AST construction.
 * @throws {@link ParseError} on mismatched parentheses or malformed input.
 *
 * @internal
 */
function shuntingYard(tokens: Token[]): RPNItem[] {
  const output: RPNItem[] = [];
  const opStack: Token[] = []; // operators, unary ops, functions, LPARENs

  const topOp = (): Token | undefined => opStack[opStack.length - 1];

  const popToOutput = () => {
    const tok = opStack.pop()!;
    if (tok.type === 'OPERATOR') {
      output.push({ tag: 'binaryOp', op: tok.value as BinaryOperator });
    } else if (tok.type === 'UNARY') {
      output.push({ tag: 'unaryOp', op: tok.value as UnaryOperator });
    } else if (tok.type === 'FUNCTION') {
      const name = tok.value as BuiltinFunction;
      output.push({ tag: 'function', name, arity: FUNCTION_ARITY[name] });
    }
  };

  for (const tok of tokens) {
    switch (tok.type) {
      case 'NUMBER':
        output.push({ tag: 'number', value: tok.value });
        break;

      case 'CONSTANT':
        output.push({ tag: 'constant', name: tok.value as ConstantName });
        break;

      case 'FUNCTION':
        opStack.push(tok);
        break;

      case 'COMMA': {
        // Pop until matching LPAREN
        while (topOp() && topOp()!.type !== 'LPAREN') popToOutput();
        if (!topOp()) throw new ParseError('Misplaced comma or mismatched parentheses', tok.pos);
        break;
      }

      case 'OPERATOR': {
        const info = OPERATOR_INFO[tok.value];
        while (
          topOp() &&
          topOp()!.type !== 'LPAREN' &&
          (topOp()!.type === 'FUNCTION' ||
            topOp()!.type === 'UNARY' ||
            (() => {
              const top = OPERATOR_INFO[topOp()!.value];
              return (
                top &&
                (top.precedence > info.precedence ||
                  (top.precedence === info.precedence && !info.rightAssoc))
              );
            })())
        ) {
          popToOutput();
        }
        opStack.push(tok);
        break;
      }

      case 'UNARY': {
        // Unary operators are right-associative with precedence 4;
        // never pop another unary of equal precedence (right-assoc)
        opStack.push(tok);
        break;
      }

      case 'LPAREN':
        opStack.push(tok);
        break;

      case 'RPAREN': {
        while (topOp() && topOp()!.type !== 'LPAREN') popToOutput();
        if (!topOp()) throw new ParseError('Mismatched parentheses — unexpected ")"', tok.pos);
        opStack.pop(); // discard LPAREN
        // If a function sits on top, pop it too
        if (topOp()?.type === 'FUNCTION') popToOutput();
        break;
      }
    }
  }

  // Drain remaining operators
  while (opStack.length) {
    const tok = topOp()!;
    if (tok.type === 'LPAREN')
      throw new ParseError('Mismatched parentheses — unclosed "("', tok.pos);
    popToOutput();
  }

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// §6  RPN → AST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walks the RPN sequence and builds an {@link ASTNode} tree using a stack.
 *
 * @param rpn - Output of {@link shuntingYard}.
 * @returns Root {@link ASTNode} of the parsed expression.
 * @throws {@link ParseError} when the RPN is malformed (arity mismatch).
 *
 * @internal
 */
function buildAST(rpn: RPNItem[]): ASTNode {
  const stack: ASTNode[] = [];

  const pop = (): ASTNode => {
    if (!stack.length) throw new ParseError('Unexpected end of expression');
    return stack.pop()!;
  };

  for (const item of rpn) {
    switch (item.tag) {
      case 'number':
        stack.push({ kind: 'Number', value: item.value });
        break;

      case 'constant':
        stack.push({ kind: 'Constant', name: item.name });
        break;

      case 'unaryOp': {
        const operand = pop();
        stack.push({ kind: 'UnaryOp', op: item.op, operand });
        break;
      }

      case 'binaryOp': {
        const right = pop();
        const left = pop();
        stack.push({ kind: 'BinaryOp', op: item.op, left, right });
        break;
      }

      case 'function': {
        if (stack.length < item.arity) {
          throw new ParseError(
            `Not enough arguments for function "${item.name}"; expected ${item.arity}`,
          );
        }
        // Arguments are on the stack in reverse order
        const args: ASTNode[] = [];
        for (let k = 0; k < item.arity; k++) args.unshift(pop());
        stack.push({ kind: 'FunctionCall', name: item.name, args });
        break;
      }
    }
  }

  if (stack.length !== 1) throw new ParseError('Invalid expression: too many operands');
  return stack[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// §7  Public API — parseExpression
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a mathematical expression string into a typed Abstract Syntax Tree.
 *
 * **Supported syntax**
 *
 * | Category | Examples |
 * |---|---|
 * | Literals | `42`, `3.14`, `1.5e-3` |
 * | Binary operators | `+`, `-`, `*`, `/`, `^` (power), `%` (mod) |
 * | Unicode operators | `×`, `÷`, `−` (mapped to `*`, `/`, `-`) |
 * | Unary prefix | `-x`, `+x` |
 * | Constants | `pi`, `π`, `e`, `tau`, `τ`, `phi`, `φ` |
 * | Functions | `sin(x)`, `sqrt(x)`, `pow(x,n)`, `atan2(y,x)`, … |
 *
 * **Why parse separately from evaluate?**
 *
 * - The same AST can be evaluated multiple times with different options
 *   (e.g. different `angleMode` or `precision`) without re-parsing.
 * - The AST can be serialised, logged, or displayed (e.g. to a history view).
 * - Future features like symbolic differentiation or LaTeX rendering can walk
 *   the AST without touching the evaluator.
 *
 * @param expression - Infix expression string, e.g. `"sin(pi/6) * 2"`.
 * @returns The root {@link ASTNode} of the parsed AST.
 *
 * @throws {@link ParseError}
 *   - Unrecognised character or identifier
 *   - Mismatched parentheses
 *   - Malformed number literal
 *   - Wrong number of arguments to a function
 *
 * @example
 * ```ts
 * const ast = parseExpression('2 + 3 * 4');
 * // BinaryOpNode(+, NumberNode(2), BinaryOpNode(*, NumberNode(3), NumberNode(4)))
 * ```
 *
 * @example
 * ```ts
 * // Unary minus
 * const ast = parseExpression('-sqrt(16)');
 * // UnaryOpNode(u-, FunctionCallNode(sqrt, [NumberNode(16)]))
 * ```
 */
export function parseExpression(expression: string): ASTNode {
  if (!expression.trim()) throw new ParseError('Expression must not be empty');
  const tokens = tokenize(expression);
  const rpn = shuntingYard(tokens);
  return buildAST(rpn);
}

// ─────────────────────────────────────────────────────────────────────────────
// §8  Public API — evaluateAST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively evaluates an {@link ASTNode} tree and returns an arbitrary-
 * precision {@link Decimal} result.
 *
 * All arithmetic is performed using `decimal.js`; no intermediate values are
 * coerced through JavaScript's IEEE-754 double-precision floats.
 *
 * **Angle mode**
 *
 * When `angleMode` is `'deg'`, degree values are converted to radians before
 * being passed to `sin` / `cos` / `tan`, and the results of `asin` / `acos` /
 * `atan` / `atan2` are converted back to degrees.
 *
 * @param ast - Root node returned by {@link parseExpression}.
 * @param options - Optional evaluation settings.
 * @returns A `Decimal` holding the computed result.
 *
 * @throws {@link EvaluateError}
 *   - Division by zero (`x / 0`)
 *   - Modulo by zero (`x % 0`)
 *   - Negative radicand for `sqrt`
 *   - Argument out of domain for `asin`, `acos`
 *   - Logarithm of a non-positive number
 *
 * @example
 * ```ts
 * const ast = parseExpression('pow(2, 10)');
 * evaluateAST(ast).toString(); // "1024"
 * ```
 *
 * @example
 * ```ts
 * // 20-digit precision, degrees
 * const ast = parseExpression('sin(30) + cos(60)');
 * evaluateAST(ast, { precision: 20, angleMode: 'deg' }).toString(); // "1"
 * ```
 */
export function evaluateAST(ast: ASTNode, options: EvaluateOptions = {}): Decimal {
  const precision = options.precision ?? 20;
  const rounding = options.rounding ?? Decimal.ROUND_HALF_UP;
  const angleMode = options.angleMode ?? 'rad';
  const variables = options.variables ?? {};

  // Record a breadcrumb so Sentry can show the expression that preceded a crash.
  addBreadcrumb({
    category: 'calc-engine',
    message: 'evaluateAST called',
    level: 'info',
    data: { angleMode, precision },
  });

  // Apply precision/rounding to the Decimal constructor for this evaluation
  Decimal.set({ precision, rounding, toExpNeg: -9e15, toExpPos: 9e15 });

  /** Convert degrees to radians if needed. */
  const toRad = (d: Decimal): Decimal =>
    angleMode === 'deg' ? d.times(Decimal.acos(-1)).div(180) : d;

  /** Convert radians to degrees if needed. */
  const toDeg = (d: Decimal): Decimal =>
    angleMode === 'deg' ? d.times(180).div(Decimal.acos(-1)) : d;

  /** Recursive evaluator. */
  function evalNode(node: ASTNode): Decimal {
    switch (node.kind) {
      // ── Literal number ────────────────────────────────────────────────────
      case 'Number':
        return new Decimal(node.value);

      // ── Mathematical constant ─────────────────────────────────────────────
      case 'Constant':
        return CONSTANT_VALUES[node.name]();

      // ── Unary operator ────────────────────────────────────────────────────
      case 'UnaryOp': {
        const val = evalNode(node.operand);
        return node.op === 'u-' ? val.neg() : val;
      }

      // ── Binary operator ───────────────────────────────────────────────────
      case 'BinaryOp': {
        const l = evalNode(node.left);
        const r = evalNode(node.right);
        switch (node.op) {
          case '+':
            return l.plus(r);
          case '-':
            return l.minus(r);
          case '*':
            return l.times(r);
          case '/':
            if (r.isZero()) throw new EvaluateError('Division by zero');
            return l.div(r);
          case '^':
            return l.pow(r);
          case '%':
            if (r.isZero()) throw new EvaluateError('Modulo by zero');
            return l.mod(r);
        }
      }

      // ── Built-in function ─────────────────────────────────────────────────
      case 'FunctionCall': {
        const a = node.args.map(evalNode);

        switch (node.name) {
          // Trigonometry
          case 'sin':
            return Decimal.sin(toRad(a[0]));
          case 'cos':
            return Decimal.cos(toRad(a[0]));
          case 'tan': {
            const rad = toRad(a[0]);
            return Decimal.sin(rad).div(Decimal.cos(rad));
          }
          case 'asin': {
            if (a[0].abs().gt(1)) throw new EvaluateError('asin: argument must be in [-1, 1]');
            return toDeg(Decimal.asin(a[0]));
          }
          case 'acos': {
            if (a[0].abs().gt(1)) throw new EvaluateError('acos: argument must be in [-1, 1]');
            return toDeg(Decimal.acos(a[0]));
          }
          case 'atan':
            return toDeg(Decimal.atan(a[0]));
          case 'atan2':
            return toDeg(Decimal.atan2(a[0], a[1]));

          // Hyperbolic
          case 'sinh': {
            const ex = a[0].exp();
            return ex.minus(new Decimal(1).div(ex)).div(2);
          }
          case 'cosh': {
            const ex = a[0].exp();
            return ex.plus(new Decimal(1).div(ex)).div(2);
          }
          case 'tanh': {
            const ex = a[0].times(2).exp();
            const one = new Decimal(1);
            return ex.minus(one).div(ex.plus(one));
          }

          // Power / root
          case 'sqrt': {
            if (a[0].isNegative()) throw new EvaluateError('sqrt: argument must be non-negative');
            return a[0].sqrt();
          }
          case 'cbrt':
            return a[0].cbrt();
          case 'exp':
            return a[0].exp();
          case 'pow':
            return a[0].pow(a[1]);

          // Logarithms
          case 'ln': {
            if (a[0].lte(0)) throw new EvaluateError('ln: argument must be positive');
            return a[0].ln();
          }
          case 'log':
          case 'log10': {
            if (a[0].lte(0)) throw new EvaluateError('log10: argument must be positive');
            return a[0].log();
          }
          case 'log2': {
            if (a[0].lte(0)) throw new EvaluateError('log2: argument must be positive');
            return a[0].log().div(new Decimal(2).log());
          }

          // Rounding & sign
          case 'abs':
            return a[0].abs();
          case 'ceil':
            return a[0].ceil();
          case 'floor':
            return a[0].floor();
          case 'round':
            return a[0].round();
          case 'sign':
            return new Decimal(Decimal.sign(a[0]));

          // Selection
          case 'max':
            return Decimal.max(a[0], a[1]);
          case 'min':
            return Decimal.min(a[0], a[1]);
        }
      }
      // TypeScript exhaustiveness guard → should never reach here
      /* istanbul ignore next */
      // eslint-disable-next-line no-fallthrough
      default:
        throw new EvaluateError(
          `Unknown AST node kind: ${(node as ASTNode & { kind: string }).kind}`,
        );
    }
  }

  // Inject user-supplied variable constants into CONSTANT_VALUES temporarily
  // by treating them as NumberNodes during traversal via a closure override.
  const varDecimalMap: Record<string, Decimal> = {};
  for (const [k, v] of Object.entries(variables)) {
    varDecimalMap[k] = new Decimal(v as Decimal.Value);
  }

  /**
   * Wraps evalNode to resolve user variables stored in `varDecimalMap`.
   * Only ConstantNodes whose name matches a key in `variables` are affected.
   */
  function evalWithVars(node: ASTNode): Decimal {
    if (node.kind === 'Constant' && node.name in varDecimalMap) {
      return varDecimalMap[node.name];
    }
    return evalNode(node);
  }

  return evalWithVars(ast);
}

// ─────────────────────────────────────────────────────────────────────────────
// §9  Convenience combinator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-shot convenience function: parses **and** evaluates an expression string.
 *
 * Equivalent to:
 * ```ts
 * evaluateAST(parseExpression(expression), options)
 * ```
 *
 * Use {@link parseExpression} + {@link evaluateAST} separately when you need
 * to evaluate the same expression more than once or inspect the AST.
 *
 * @param expression - Infix expression string.
 * @param options - Optional evaluation settings.
 * @returns A {@link Decimal} holding the result.
 *
 * @throws {@link ParseError} — syntax error in the expression
 * @throws {@link EvaluateError} — runtime arithmetic error
 *
 * @example
 * ```ts
 * import { evaluate } from './calc-engine';
 * evaluate('(1 + sqrt(5)) / 2').toFixed(10); // "1.6180339887"
 * ```
 */
export function evaluate(expression: string, options?: EvaluateOptions): Decimal {
  return evaluateAST(parseExpression(expression), options);
}
