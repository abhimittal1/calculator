/**
 * Comprehensive unit tests for calc-engine.
 *
 * Coverage areas:
 *  §1  Operator precedence
 *  §2  Nested parentheses
 *  §3  Unary minus / plus
 *  §4  Decimal (floating-point) operations
 *  §5  Percentage / modulo behaviour
 *  §6  Very large and very small numbers
 *  §7  Division by zero and other arithmetic errors
 *  §8  ParseError cases
 *  §9  Built-in functions & constants
 *  §10 Evaluation options (precision, angleMode)
 *  §11 AST structure (parseExpression)
 *  §12 Edge cases & regression
 */

import Decimal from 'decimal.js';
import {
  parseExpression,
  evaluateAST,
  evaluate,
  ParseError,
  EvaluateError,
  type BinaryOpNode,
  type UnaryOpNode,
  type FunctionCallNode,
  type NumberNode,
  type ConstantNode,
} from '../calc-engine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Evaluate an expression and return a plain JS number. */
const calc = (expr: string, precision = 20): number => evaluate(expr, { precision }).toNumber();

/** Evaluate and return a string (exact representation). */
const calcStr = (expr: string, precision = 20): string => evaluate(expr, { precision }).toString();

/** Evaluate in degrees and return a number. */
const calcDeg = (expr: string): number =>
  evaluate(expr, { angleMode: 'deg', precision: 20 }).toNumber();

// ─────────────────────────────────────────────────────────────────────────────
// §1  Operator precedence
// ─────────────────────────────────────────────────────────────────────────────

describe('§1 Operator precedence', () => {
  it('* before +: 2+3*4 = 14', () => expect(calc('2+3*4')).toBe(14));
  it('* before -: 10-2*3 = 4', () => expect(calc('10-2*3')).toBe(4));
  it('/ before +: 1+8/4 = 3', () => expect(calc('1+8/4')).toBe(3));
  it('/ before -: 20-9/3 = 17', () => expect(calc('20-9/3')).toBe(17));
  it('^ before *: 2*3^2 = 18', () => expect(calc('2*3^2')).toBe(18));
  it('^ before /: 48/2^4 = 3', () => expect(calc('48/2^4')).toBe(3));
  it('left-assoc +/-: 5-3+2 = 4', () => expect(calc('5-3+2')).toBe(4));
  it('left-assoc *: 24/6*2 = 8', () => expect(calc('24/6*2')).toBe(8));
  it('right-assoc ^: 2^3^2 = 512 (not 64)', () => expect(calc('2^3^2')).toBe(512));
  it('right-assoc ^: 2^2^3 = 256', () => expect(calc('2^2^3')).toBe(256));
  it('mixed chain: 1+2*3-4/2 = 5', () => expect(calc('1+2*3-4/2')).toBe(5));
  it('long expression: 3+4*2/(1-5)^2 = 3.5', () =>
    expect(calc('3+4*2/(1-5)^2')).toBeCloseTo(3.5, 10));
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  Nested parentheses
// ─────────────────────────────────────────────────────────────────────────────

describe('§2 Nested parentheses', () => {
  it('simple group: (2+3)*4 = 20', () => expect(calc('(2+3)*4')).toBe(20));
  it('nested 2 deep: ((2+3))*4 = 20', () => expect(calc('((2+3))*4')).toBe(20));
  it('nested 3 deep: (((4+6)))/2 = 5', () => expect(calc('(((4+6)))/2')).toBe(5));
  it('multiple groups: (1+2)*(3+4) = 21', () => expect(calc('(1+2)*(3+4)')).toBe(21));
  it('nested on right: 2*(3*(4+1)) = 30', () => expect(calc('2*(3*(4+1))')).toBe(30));
  it('nested on left: ((10-4)*2)+1 = 13', () => expect(calc('((10-4)*2)+1')).toBe(13));
  it('power of group: (2+3)^2 = 25', () => expect(calc('(2+3)^2')).toBe(25));
  it('group in power base: (2*3)^2 = 36', () => expect(calc('(2*3)^2')).toBe(36));
  it('deeply nested: 2+(3*(4+(5*(6-4)))) = 44', () => expect(calc('2+(3*(4+(5*(6-4))))')).toBe(44));
  it('throws ParseError for unclosed (', () => expect(() => evaluate('(2+3')).toThrow(ParseError));
  it('throws ParseError for unexpected )', () =>
    expect(() => evaluate('2+3)')).toThrow(ParseError));
  it('throws ParseError for mismatched: )(', () =>
    expect(() => evaluate(')(2+3')).toThrow(ParseError));
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  Unary minus / plus
// ─────────────────────────────────────────────────────────────────────────────

describe('§3 Unary minus / plus', () => {
  it('plain negative: -5 = -5', () => expect(calc('-5')).toBe(-5));
  it('unary plus: +5 = 5', () => expect(calc('+5')).toBe(5));
  it('negative added: -3+8 = 5', () => expect(calc('-3+8')).toBe(5));
  it('negative multiplied: -3*-4 = 12', () => expect(calc('-3*-4')).toBe(12));
  it('unary after operator: 5*-2 = -10', () => expect(calc('5*-2')).toBe(-10));
  it('unary after (: (-5+3) = -2', () => expect(calc('(-5+3)')).toBe(-2));
  it('double unary: --5 = 5', () => expect(calc('--5')).toBe(5));
  it('triple unary: ---5 = -5', () => expect(calc('---5')).toBe(-5));
  it('unary on group: -(3+2) = -5', () => expect(calc('-(3+2)')).toBe(-5));
  it('unary on group in sum: 10+-(3+2) = 5', () => expect(calc('10+-(3+2)')).toBe(5));
  it('unary on power: -2^2 = 4 (unary prec > ^ prec)', () => expect(calc('-2^2')).toBe(4));
  it('negative sqrt: -sqrt(9) = -3', () => expect(calc('-sqrt(9)')).toBe(-3));
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  Decimal (floating-point) operations
// ─────────────────────────────────────────────────────────────────────────────

describe('§4 Decimal operations', () => {
  it('0.1+0.2 = 0.3 (no float drift with Decimal.js)', () =>
    expect(calcStr('0.1+0.2')).toBe('0.3'));
  it('0.1*0.1 = 0.01', () => expect(calcStr('0.1*0.1')).toBe('0.01'));
  it('1/3 matches Decimal precision', () =>
    expect(evaluate('1/3', { precision: 10 }).toString()).toBe('0.3333333333'));
  it('2/3 + 1/3 ≈ 1', () => expect(calc('2/3+1/3')).toBeCloseTo(1, 15));
  it('1.5 + 2.25 = 3.75', () => expect(calc('1.5+2.25')).toBe(3.75));
  it('10.5 - 0.5 = 10', () => expect(calc('10.5-0.5')).toBe(10));
  it('3.14 * 2 = 6.28', () => expect(calc('3.14*2')).toBe(6.28));
  it('7.5 / 2.5 = 3', () => expect(calc('7.5/2.5')).toBe(3));
  it('scientific notation: 1e3 = 1000', () => expect(calc('1e3')).toBe(1000));
  it('scientific notation: 1.5e-3 = 0.0015', () => expect(calc('1.5e-3')).toBe(0.0015));
  it('negative scientific: -2.5e2 = -250', () => expect(calc('-2.5e2')).toBe(-250));
  it('small decimal: 0.001 * 0.001 ≈ 1e-6', () =>
    expect(calc('0.001*0.001')).toBeCloseTo(1e-6, 20));
  it('repeating: 1/9 to 5 digits = 0.11111', () =>
    expect(evaluate('1/9', { precision: 5 }).toFixed(5)).toBe('0.11111'));
});

// ─────────────────────────────────────────────────────────────────────────────
// §5  Percentage / modulo behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('§5 Percentage / modulo', () => {
  it('10%3 = 1', () => expect(calc('10%3')).toBe(1));
  it('10%4 = 2', () => expect(calc('10%4')).toBe(2));
  it('9%3 = 0', () => expect(calc('9%3')).toBe(0));
  it('7%2 = 1', () => expect(calc('7%2')).toBe(1));
  it('negative mod: -7%3 = -1 (sign follows dividend)', () => expect(calc('-7%3')).toBe(-1));
  it('float mod: 10.5%3 = 1.5', () => expect(calc('10.5%3')).toBeCloseTo(1.5, 10));
  it('mod of zero divisor throws EvaluateError', () =>
    expect(() => evaluate('5%0')).toThrow(EvaluateError));
  it('50/100 = 0.5 (UI percent shorthand)', () => expect(calc('50/100')).toBe(0.5));
  it('25/100 * 200 = 50', () => expect(calc('25/100*200')).toBe(50));
  it('100%100 = 0', () => expect(calc('100%100')).toBe(0));
});

// ─────────────────────────────────────────────────────────────────────────────
// §6  Very large and very small numbers
// ─────────────────────────────────────────────────────────────────────────────

describe('§6 Very large and very small numbers', () => {
  it('10^20 evaluates exactly', () => expect(calcStr('10^20')).toBe('100000000000000000000'));
  it('2^53 = 9007199254740992', () => expect(calcStr('2^53')).toBe('9007199254740992'));
  it('2^100 exact at precision 35', () =>
    expect(evaluate('2^100', { precision: 35 }).toFixed(0)).toBe(
      '1267650600228229401496703205376',
    ));
  it('1e-20 * 1e20 = 1', () => expect(calc('1e-20*1e20')).toBe(1));
  it('very small: 1e-15 + 2e-15 ≈ 3e-15', () =>
    expect(evaluate('1e-15+2e-15', { precision: 20 }).toNumber()).toBeCloseTo(3e-15, 25));
  it('large product: 999999999*999999999 = 999999998000000001', () =>
    expect(calcStr('999999999*999999999')).toBe('999999998000000001'));
  it('pi to 49 decimal places (precision 50)', () => {
    const pi50 = evaluate('pi', { precision: 50 }).toFixed(49);
    expect(pi50.startsWith('3.14159265358979')).toBe(true);
  });
  it('0 * very_large = 0', () => expect(calc('0*1e100')).toBe(0));
});

// ─────────────────────────────────────────────────────────────────────────────
// §7  Division by zero and other arithmetic errors
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 Division by zero and arithmetic errors', () => {
  it('1/0 throws EvaluateError', () => expect(() => evaluate('1/0')).toThrow(EvaluateError));
  it('-5/0 throws EvaluateError', () => expect(() => evaluate('-5/0')).toThrow(EvaluateError));
  it('0/0 throws EvaluateError', () => expect(() => evaluate('0/0')).toThrow(EvaluateError));
  it('5%0 throws EvaluateError', () => expect(() => evaluate('5%0')).toThrow(EvaluateError));
  it('sqrt(-1) throws EvaluateError', () =>
    expect(() => evaluate('sqrt(-1)')).toThrow(EvaluateError));
  it('sqrt(-0.0001) throws EvaluateError', () =>
    expect(() => evaluate('sqrt(-0.0001)')).toThrow(EvaluateError));
  it('ln(0) throws EvaluateError', () => expect(() => evaluate('ln(0)')).toThrow(EvaluateError));
  it('ln(-1) throws EvaluateError', () => expect(() => evaluate('ln(-1)')).toThrow(EvaluateError));
  it('log(0) throws EvaluateError', () => expect(() => evaluate('log(0)')).toThrow(EvaluateError));
  it('log(-5) throws EvaluateError', () =>
    expect(() => evaluate('log(-5)')).toThrow(EvaluateError));
  it('log2(0) throws EvaluateError', () =>
    expect(() => evaluate('log2(0)')).toThrow(EvaluateError));
  it('asin(2) throws EvaluateError — out of domain', () =>
    expect(() => evaluate('asin(2)')).toThrow(EvaluateError));
  it('acos(-2) throws EvaluateError — out of domain', () =>
    expect(() => evaluate('acos(-2)')).toThrow(EvaluateError));
  it('EvaluateError for /0 has name "EvaluateError"', () => {
    expect(() => evaluate('1/0')).toThrow(expect.objectContaining({ name: 'EvaluateError' }));
  });
  it('0/1 does not throw', () => expect(() => evaluate('0/1')).not.toThrow());
});

// ─────────────────────────────────────────────────────────────────────────────
// §8  ParseError cases
// ─────────────────────────────────────────────────────────────────────────────

describe('§8 ParseError cases', () => {
  it('empty string', () => expect(() => evaluate('')).toThrow(ParseError));
  it('whitespace-only', () => expect(() => evaluate('   ')).toThrow(ParseError));
  it('unknown identifier: foo', () => expect(() => evaluate('foo')).toThrow(ParseError));
  it('unrecognised character: @', () => expect(() => evaluate('2@3')).toThrow(ParseError));
  it('unclosed paren', () => expect(() => evaluate('(2+3')).toThrow(ParseError));
  it('extra close paren', () => expect(() => evaluate('2+3)')).toThrow(ParseError));
  it('trailing operator: "2+" throws', () => expect(() => evaluate('2+')).toThrow(ParseError));
  it('double unary "2++3" is valid (unary+): no throw', () =>
    expect(() => evaluate('2++3')).not.toThrow());
  it('ParseError has name "ParseError"', () =>
    expect(() => evaluate('')).toThrow(expect.objectContaining({ name: 'ParseError' })));
  it('ParseError.position >= 0 for bad char', () => {
    let err: unknown;
    try {
      evaluate('2@3');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ParseError);
    expect((err as ParseError).position).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9  Built-in functions & constants
// ─────────────────────────────────────────────────────────────────────────────

describe('§9 Built-in functions & constants', () => {
  // Trig — radians
  it('sin(0) = 0', () => expect(calc('sin(0)')).toBeCloseTo(0));
  it('cos(0) = 1', () => expect(calc('cos(0)')).toBeCloseTo(1));
  it('tan(0) = 0', () => expect(calc('tan(0)')).toBeCloseTo(0));
  it('sin(pi) ≈ 0', () => expect(calc('sin(pi)')).toBeCloseTo(0, 15));
  it('cos(pi) = -1', () => expect(calc('cos(pi)')).toBeCloseTo(-1, 15));
  // Trig — degrees
  it('sin(90°) = 1', () => expect(calcDeg('sin(90)')).toBeCloseTo(1));
  it('cos(180°) = -1', () => expect(calcDeg('cos(180)')).toBeCloseTo(-1));
  it('tan(45°) = 1', () => expect(calcDeg('tan(45)')).toBeCloseTo(1));
  it('asin(1)° = 90', () => expect(calcDeg('asin(1)')).toBeCloseTo(90));
  it('acos(-1)° = 180', () => expect(calcDeg('acos(-1)')).toBeCloseTo(180));
  it('atan(1)° = 45', () => expect(calcDeg('atan(1)')).toBeCloseTo(45));
  // Hyperbolic
  it('sinh(0) = 0', () => expect(calc('sinh(0)')).toBeCloseTo(0));
  it('cosh(0) = 1', () => expect(calc('cosh(0)')).toBeCloseTo(1));
  it('tanh(0) = 0', () => expect(calc('tanh(0)')).toBeCloseTo(0));
  // Power / root
  it('sqrt(9) = 3', () => expect(calc('sqrt(9)')).toBe(3));
  it('sqrt(2)*sqrt(2) ≈ 2', () => expect(calc('sqrt(2)*sqrt(2)')).toBeCloseTo(2));
  it('cbrt(27) = 3', () => expect(calc('cbrt(27)')).toBeCloseTo(3));
  it('exp(0) = 1', () => expect(calc('exp(0)')).toBe(1));
  it('exp(1) ≈ e', () => expect(calc('exp(1)')).toBeCloseTo(Math.E, 10));
  it('pow(2,10) = 1024', () => expect(calc('pow(2,10)')).toBe(1024));
  // Logarithms
  it('ln(e) = 1', () => expect(calc('ln(e)')).toBeCloseTo(1, 15));
  it('log(100) = 2', () => expect(calc('log(100)')).toBeCloseTo(2, 15));
  it('log10(1000) = 3', () => expect(calc('log10(1000)')).toBeCloseTo(3, 15));
  it('log2(8) = 3', () => expect(calc('log2(8)')).toBeCloseTo(3, 15));
  // Rounding & sign
  it('abs(-7) = 7', () => expect(calc('abs(-7)')).toBe(7));
  it('ceil(1.1) = 2', () => expect(calc('ceil(1.1)')).toBe(2));
  it('floor(1.9) = 1', () => expect(calc('floor(1.9)')).toBe(1));
  it('round(1.5) = 2', () => expect(calc('round(1.5)')).toBe(2));
  it('round(1.4) = 1', () => expect(calc('round(1.4)')).toBe(1));
  it('sign(-5) = -1', () => expect(calc('sign(-5)')).toBe(-1));
  it('sign(0) = 0', () => expect(calc('sign(0)')).toBe(0));
  it('sign(5) = 1', () => expect(calc('sign(5)')).toBe(1));
  // Selection
  it('max(3,7) = 7', () => expect(calc('max(3,7)')).toBe(7));
  it('min(3,7) = 3', () => expect(calc('min(3,7)')).toBe(3));
  // Constants
  it('pi starts 3.14159', () =>
    expect(evaluate('pi', { precision: 20 }).toFixed(5)).toBe('3.14159'));
  it('e starts 2.71828', () => expect(evaluate('e', { precision: 20 }).toFixed(5)).toBe('2.71828'));
  it('tau = 2*pi', () => expect(calc('tau-2*pi')).toBeCloseTo(0, 15));
  it('phi = (1+sqrt(5))/2', () => expect(calc('phi-(1+sqrt(5))/2')).toBeCloseTo(0, 15));
  // Unicode aliases
  it('π works as pi', () => expect(evaluate('π', { precision: 10 }).toFixed(5)).toBe('3.14159'));
  it('φ works as phi', () => expect(evaluate('φ', { precision: 10 }).toFixed(4)).toBe('1.6180'));
});

// ─────────────────────────────────────────────────────────────────────────────
// §10  Evaluation options
// ─────────────────────────────────────────────────────────────────────────────

describe('§10 Evaluation options', () => {
  it('precision 5: 1/3 = 0.33333', () =>
    expect(evaluate('1/3', { precision: 5 }).toFixed(5)).toBe('0.33333'));
  it('precision 30: pi has correct digits', () => {
    // π rounded to 30 sig figs — last digit rounds up from 79502... → 8
    const r = evaluate('pi', { precision: 30 }).toFixed(29);
    expect(r.startsWith('3.14159265358979323846264338328')).toBe(true);
  });
  it('rounding ROUND_DOWN truncates', () => {
    const r = evaluate('1/3', { precision: 4, rounding: Decimal.ROUND_DOWN }).toFixed(4);
    expect(r).toBe('0.3333');
  });
  it('angleMode deg: sin(30) = 0.5', () =>
    expect(evaluate('sin(30)', { angleMode: 'deg', precision: 20 }).toNumber()).toBeCloseTo(0.5));
  it('angleMode rad: sin(pi/6) = 0.5', () =>
    expect(evaluate('sin(pi/6)', { angleMode: 'rad', precision: 20 }).toNumber()).toBeCloseTo(0.5));
  it('same AST, two precisions', () => {
    const ast = parseExpression('1/3');
    expect(evaluateAST(ast, { precision: 5 }).toFixed(5)).toBe('0.33333');
    expect(evaluateAST(ast, { precision: 10 }).toFixed(10)).toBe('0.3333333333');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §11  AST structure from parseExpression
// ─────────────────────────────────────────────────────────────────────────────

describe('§11 AST structure', () => {
  it('bare number → NumberNode', () => {
    const node = parseExpression('42') as NumberNode;
    expect(node.kind).toBe('Number');
    expect(node.value).toBe('42');
  });
  it('constant → ConstantNode', () => {
    const node = parseExpression('pi') as ConstantNode;
    expect(node.kind).toBe('Constant');
    expect(node.name).toBe('pi');
  });
  it('addition → BinaryOpNode', () => {
    const node = parseExpression('3+4') as BinaryOpNode;
    expect(node.kind).toBe('BinaryOp');
    expect(node.op).toBe('+');
    expect((node.left as NumberNode).value).toBe('3');
    expect((node.right as NumberNode).value).toBe('4');
  });
  it('2+3*4: + at root, * on right', () => {
    const root = parseExpression('2+3*4') as BinaryOpNode;
    expect(root.op).toBe('+');
    const right = root.right as BinaryOpNode;
    expect(right.op).toBe('*');
  });
  it('2^3^2: right-associative nesting', () => {
    const root = parseExpression('2^3^2') as BinaryOpNode;
    expect(root.op).toBe('^');
    expect((root.right as BinaryOpNode).op).toBe('^');
  });
  it('unary minus → UnaryOpNode', () => {
    const node = parseExpression('-5') as UnaryOpNode;
    expect(node.kind).toBe('UnaryOp');
    expect(node.op).toBe('u-');
    expect((node.operand as NumberNode).value).toBe('5');
  });
  it('function call → FunctionCallNode', () => {
    const node = parseExpression('sqrt(16)') as FunctionCallNode;
    expect(node.kind).toBe('FunctionCall');
    expect(node.name).toBe('sqrt');
    expect(node.args).toHaveLength(1);
  });
  it('two-arg function: atan2 has 2 args', () => {
    const node = parseExpression('atan2(1,1)') as FunctionCallNode;
    expect(node.args).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §12  Edge cases & regression
// ─────────────────────────────────────────────────────────────────────────────

describe('§12 Edge cases & regression', () => {
  it('single digit 0', () => expect(calc('0')).toBe(0));
  it('single digit 9', () => expect(calc('9')).toBe(9));
  it('+0 = 0', () => expect(calc('+0')).toBe(0));
  it('-0 is zero', () => expect(evaluate('-0', { precision: 10 }).isZero()).toBe(true));
  it('1+1+1+1+1 = 5', () => expect(calc('1+1+1+1+1')).toBe(5));
  it('((((5)))) = 5', () => expect(calc('((((5))))')).toBe(5));
  it('+1+2 = 3 (leading unary +)', () => expect(calc('+1+2')).toBe(3));
  it('1*2*3*4*5 = 120', () => expect(calc('1*2*3*4*5')).toBe(120));
  it('whitespace is ignored', () => expect(calc(' 2 + 3 ')).toBe(5));
  it('unicode × ÷ −: 3×4÷2−1 = 5', () => expect(calc('3×4÷2−1')).toBe(5));
  it('4^0.5 = 2', () => expect(calc('4^0.5')).toBeCloseTo(2));
  it('x^0 = 1', () => {
    expect(calc('5^0')).toBe(1);
    expect(calc('1000^0')).toBe(1);
  });
  it('x^1 = x', () => expect(calc('42^1')).toBe(42));
  it('evaluate() and evaluateAST(parseExpression()) match', () => {
    const expr = 'sin(pi/4)*sqrt(2)';
    const r1 = evaluate(expr, { precision: 20 }).toString();
    const r2 = evaluateAST(parseExpression(expr), { precision: 20 }).toString();
    expect(r1).toBe(r2);
  });
  it.each(['0+0', '1-1', '0*1000', '1/1', '1^1', '0^0'])('"%s" evaluates without error', expr =>
    expect(() => evaluate(expr)).not.toThrow(),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// §13  Extended coverage — previously uncovered branches
// ─────────────────────────────────────────────────────────────────────────────

describe('§13a Deeply nested parentheses (4+ levels)', () => {
  it('4 levels: ((((1+2)))) = 3', () => expect(calc('((((1+2))))')).toBe(3));
  it('5 levels: (((((10))))) = 10', () => expect(calc('(((((10)))))')).toBe(10));
  it('4-level with ops: ((((2+3))))*((((4+1)))) = 25', () =>
    expect(calc('((((2+3))))*((((4+1))))')).toBe(25));
  it('mixed 4-level: 1+(((2*(3+(4*5))))) = 47', () => expect(calc('1+(((2*(3+(4*5)))))')).toBe(47));
  it('4-level nested functions: sqrt((((((16)))))) = 4', () =>
    expect(calc('sqrt((((((16))))))')).toBe(4));
  it('deeply nested power: ((2^((2+1)))) = 8', () => expect(calc('((2^((2+1))))')).toBe(8));
});

describe('§13b All trig functions – radian mode', () => {
  it('sin(pi/2) ≈ 1', () => expect(calc('sin(pi/2)')).toBeCloseTo(1, 14));
  it('sin(pi/6) ≈ 0.5', () => expect(calc('sin(pi/6)')).toBeCloseTo(0.5, 14));
  it('cos(pi/3) ≈ 0.5', () => expect(calc('cos(pi/3)')).toBeCloseTo(0.5, 14));
  it('cos(pi/2) ≈ 0', () => expect(calc('cos(pi/2)')).toBeCloseTo(0, 14));
  it('tan(pi/4) ≈ 1', () => expect(calc('tan(pi/4)')).toBeCloseTo(1, 14));
  it('asin(0) = 0', () => expect(calc('asin(0)')).toBeCloseTo(0, 14));
  it('asin(0.5) ≈ pi/6', () => expect(calc('asin(0.5)')).toBeCloseTo(Math.PI / 6, 10));
  it('acos(1) = 0', () => expect(calc('acos(1)')).toBeCloseTo(0, 14));
  it('acos(0) ≈ pi/2', () => expect(calc('acos(0)')).toBeCloseTo(Math.PI / 2, 10));
  it('atan(0) = 0', () => expect(calc('atan(0)')).toBeCloseTo(0, 14));
  it('atan(1) ≈ pi/4', () => expect(calc('atan(1)')).toBeCloseTo(Math.PI / 4, 10));
  it('atan2(1,1) ≈ pi/4', () => expect(calc('atan2(1,1)')).toBeCloseTo(Math.PI / 4, 10));
  it('atan2(0,1) = 0', () => expect(calc('atan2(0,1)')).toBeCloseTo(0, 14));
  it('atan2(1,0) ≈ pi/2', () => expect(calc('atan2(1,0)')).toBeCloseTo(Math.PI / 2, 10));
  it('sinh(1) ≈ 1.1752', () => expect(calc('sinh(1)')).toBeCloseTo(1.17520119719, 8));
  it('cosh(1) ≈ 1.5430', () => expect(calc('cosh(1)')).toBeCloseTo(1.54308063482, 8));
  it('tanh(1) ≈ 0.7616', () => expect(calc('tanh(1)')).toBeCloseTo(0.76159415595, 8));
});

describe('§13c All trig functions – degree mode', () => {
  it('sin(30°) = 0.5', () => expect(calcDeg('sin(30)')).toBeCloseTo(0.5, 12));
  it('sin(0°) = 0', () => expect(calcDeg('sin(0)')).toBeCloseTo(0, 12));
  it('sin(60°) ≈ sqrt(3)/2', () => expect(calcDeg('sin(60)')).toBeCloseTo(Math.sqrt(3) / 2, 10));
  it('cos(0°) = 1', () => expect(calcDeg('cos(0)')).toBeCloseTo(1, 12));
  it('cos(60°) = 0.5', () => expect(calcDeg('cos(60)')).toBeCloseTo(0.5, 12));
  it('cos(90°) ≈ 0', () => expect(calcDeg('cos(90)')).toBeCloseTo(0, 10));
  it('tan(0°) = 0', () => expect(calcDeg('tan(0)')).toBeCloseTo(0, 12));
  it('tan(60°) ≈ sqrt(3)', () => expect(calcDeg('tan(60)')).toBeCloseTo(Math.sqrt(3), 10));
  it('asin(0)° = 0', () => expect(calcDeg('asin(0)')).toBeCloseTo(0, 12));
  it('asin(0.5)° = 30', () => expect(calcDeg('asin(0.5)')).toBeCloseTo(30, 10));
  it('acos(0)° = 90', () => expect(calcDeg('acos(0)')).toBeCloseTo(90, 10));
  it('acos(0.5)° = 60', () => expect(calcDeg('acos(0.5)')).toBeCloseTo(60, 10));
  it('atan(0)° = 0', () => expect(calcDeg('atan(0)')).toBeCloseTo(0, 12));
  it('atan(1)° = 45', () => expect(calcDeg('atan(1)')).toBeCloseTo(45, 10));
  it('atan2(1,1)° = 45', () =>
    expect(evaluate('atan2(1,1)', { angleMode: 'deg', precision: 20 }).toNumber()).toBeCloseTo(
      45,
      10,
    ));
  it('atan2(0,1)° = 0', () =>
    expect(evaluate('atan2(0,1)', { angleMode: 'deg', precision: 20 }).toNumber()).toBeCloseTo(
      0,
      12,
    ));
  it('sinh and cosh unaffected by angleMode', () => {
    const rad = evaluate('sinh(1)', { angleMode: 'rad', precision: 20 }).toNumber();
    const deg = evaluate('sinh(1)', { angleMode: 'deg', precision: 20 }).toNumber();
    expect(rad).toBeCloseTo(deg, 10);
  });
});

describe('§13d All named constants – exact values', () => {
  it('pi ≈ 3.14159265358979', () =>
    expect(evaluate('pi', { precision: 20 }).toNumber()).toBeCloseTo(Math.PI, 12));
  it('pi * 2 = tau', () => expect(calc('pi*2 - tau')).toBeCloseTo(0, 14));
  it('e ≈ 2.71828182845905', () =>
    expect(evaluate('e', { precision: 20 }).toNumber()).toBeCloseTo(Math.E, 12));
  it('e = exp(1)', () => expect(calc('e - exp(1)')).toBeCloseTo(0, 14));
  it('tau ≈ 6.28318', () =>
    expect(evaluate('tau', { precision: 20 }).toNumber()).toBeCloseTo(2 * Math.PI, 12));
  it('tau = 2 * pi', () => expect(calc('tau / pi')).toBeCloseTo(2, 14));
  it('phi ≈ 1.61803398875', () =>
    expect(evaluate('phi', { precision: 20 }).toNumber()).toBeCloseTo(1.6180339887498948, 12));
  it('phi satisfies phi^2 = phi + 1', () => expect(calc('phi^2 - phi - 1')).toBeCloseTo(0, 12));
  it('pi can combine with trig: sin(pi) ≈ 0', () => expect(calc('sin(pi)')).toBeCloseTo(0, 14));
  it('e^(ln(e)) = e', () => expect(calc('exp(ln(e)) - e')).toBeCloseTo(0, 12));
  it('cos(tau) ≈ 1', () => expect(calc('cos(tau)')).toBeCloseTo(1, 12));
  it('Unicode τ works as tau', () =>
    expect(evaluate('τ', { precision: 10 }).toNumber()).toBeCloseTo(2 * Math.PI, 8));
});

describe('§13e Variables option and evalWithVars branch', () => {
  it('variable overrides root constant: pi → 3', () => {
    // evalWithVars is applied only at the top-level call.
    // When the root AST node IS a Constant, the variable substitutes it.
    const ast = parseExpression('pi');
    const result = evaluateAST(ast, { variables: { pi: 3 } as any });
    expect(result.toNumber()).toBe(3);
  });
  it('non-matching variable leaves the constant unchanged', () => {
    const ast = parseExpression('pi');
    const result = evaluateAST(ast, { variables: { x: 99 } as any });
    expect(result.toNumber()).toBeCloseTo(Math.PI, 12);
  });
  it('variables do not affect sub-nodes (evalWithVars is root-only)', () => {
    // When root is BinaryOp(pi + e), evalWithVars receives BinaryOp —
    // not a Constant — so inner constants use their normal values.
    const ast = parseExpression('pi + e');
    const result = evaluateAST(ast, { variables: { pi: 10, e: 5 } as any });
    expect(result.toNumber()).toBeCloseTo(Math.PI + Math.E, 8);
  });
  it('empty variables map is a no-op', () => {
    const ast = parseExpression('pi');
    const result = evaluateAST(ast, { variables: {} });
    expect(result.toNumber()).toBeCloseTo(Math.PI, 12);
  });
});

describe('§13f Edge error paths in parseExpression / buildAST', () => {
  it('sin() with no args throws ParseError (stack underflow in buildAST)', () =>
    expect(() => evaluate('sin()')).toThrow(ParseError));
  it('pow() with no args throws ParseError', () =>
    expect(() => evaluate('pow()')).toThrow(ParseError));
  it('"1 2" (two operands, no operator) throws ParseError', () =>
    expect(() => evaluate('1 2')).toThrow(ParseError));
  it('misplaced comma outside function throws ParseError', () =>
    expect(() => evaluate('1,2')).toThrow(ParseError));
  it('empty parens () throw ParseError', () => expect(() => evaluate('()')).toThrow(ParseError));
});
