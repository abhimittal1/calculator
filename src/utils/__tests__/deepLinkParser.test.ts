/**
 * deepLinkParser Tests
 *
 * §1 Valid expressions   — accepted and returned verbatim (trimmed)
 * §2 Empty / null        — rejected with reason 'empty'
 * §3 Oversized inputs    — rejected with reason 'too_long'
 * §4 Invalid characters  — XSS attempts, script tags, shell chars rejected
 * §5 safeParseExpr       — convenience wrapper returns string | null
 * §6 Edge cases          — whitespace-only, exactly at limit, Unicode ops
 */

import { parseDeepLinkExpr, safeParseExpr, MAX_EXPR_LENGTH } from '@/utils/deepLinkParser';

// ─── §1: Valid expressions ────────────────────────────────────────────────────

describe('§1 Valid expressions', () => {
  const validCases: [string, string][] = [
    ['1+2', '1+2'],
    ['3.14 * 2', '3.14 * 2'],
    ['(1+2)*3', '(1+2)*3'],
    ['sin(pi)', 'sin(pi)'],
    ['sqrt(144)', 'sqrt(144)'],
    ['2^10', '2^10'],
    ['100/4', '100/4'],
    ['log(1000)', 'log(1000)'],
    ['ln(e)', 'ln(e)'],
    ['cos(0)+sin(0)', 'cos(0)+sin(0)'],
    ['tau/2', 'tau/2'],
    ['phi^2-phi', 'phi^2-phi'],
    ['  5 + 5  ', '5 + 5'], // leading/trailing whitespace trimmed
    ['1×2÷3', '1×2÷3'], // UI display aliases
    ['5%', '5%'],
    ['1,2', '1,2'], // comma (function args)
    ['a', 'a'], // single letter (variable)
    ['x^2 - 3*x + 2', 'x^2 - 3*x + 2'],
  ];

  test.each(validCases)('accepts %j → %j', (input, expected) => {
    const result = parseDeepLinkExpr(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expr).toBe(expected);
    }
  });
});

// ─── §2: Empty / null ─────────────────────────────────────────────────────────

describe('§2 Empty / null inputs', () => {
  it('rejects null', () => {
    expect(parseDeepLinkExpr(null)).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects undefined', () => {
    expect(parseDeepLinkExpr(undefined)).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects empty string', () => {
    expect(parseDeepLinkExpr('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects whitespace-only string', () => {
    expect(parseDeepLinkExpr('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects tab-only string', () => {
    expect(parseDeepLinkExpr('\t')).toEqual({ ok: false, reason: 'empty' });
  });
});

// ─── §3: Oversized inputs ─────────────────────────────────────────────────────

describe('§3 Oversized inputs', () => {
  it(`rejects expressions longer than ${MAX_EXPR_LENGTH} characters`, () => {
    const tooLong = '1'.repeat(MAX_EXPR_LENGTH + 1);
    expect(parseDeepLinkExpr(tooLong)).toEqual({ ok: false, reason: 'too_long' });
  });

  it(`accepts expressions exactly at the ${MAX_EXPR_LENGTH}-character limit`, () => {
    // Build a valid-character string of exactly MAX_EXPR_LENGTH chars
    const atLimit = '1'.repeat(MAX_EXPR_LENGTH);
    const result = parseDeepLinkExpr(atLimit);
    expect(result.ok).toBe(true);
  });

  it('rejects input at limit+1', () => {
    const overLimit = 'x'.repeat(MAX_EXPR_LENGTH + 1);
    expect(parseDeepLinkExpr(overLimit)).toEqual({ ok: false, reason: 'too_long' });
  });

  it('rejects a 10 000-character payload', () => {
    const huge = 'a'.repeat(10_000);
    expect(parseDeepLinkExpr(huge)).toEqual({ ok: false, reason: 'too_long' });
  });
});

// ─── §4: Invalid characters — XSS, injection, OS chars ───────────────────────

describe('§4 Invalid characters', () => {
  const invalidCases: [string, string][] = [
    ['<script>alert(1)</script>', 'HTML script tag (XSS)'],
    ['<img src=x onerror=alert(1)>', 'img onerror XSS'],
    ['1+2; rm -rf /', 'semicolon + shell command'],
    ['eval("1+2")', 'double-quote (eval injection)'],
    ["'; DROP TABLE history; --", 'SQL injection with single quote'],
    ['1+2\n3', 'newline character'],
    ['1+2\r3', 'carriage return'],
    ['1+{2}', 'curly brace'],
    ['1+[2]', 'square bracket'],
    ['1+2|3', 'pipe character'],
    ['1+2&3', 'ampersand'],
    ['1+2=3', 'equals sign'],
    ['1+2@3', 'at-sign'],
    ['1+2!3', 'exclamation mark'],
    ['1+2$3', 'dollar sign'],
    ['1+2#', 'hash / comment character'],
    ['1+2`cmd`', 'backtick (shell substitution)'],
    ['1+2\\3', 'backslash'],
    ['javascript:alert(1)', 'javascript: URI'],
    ['<>', 'angle brackets (no tag content)'],
  ];

  test.each(invalidCases)('rejects %j (%s)', input => {
    const result = parseDeepLinkExpr(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_chars');
    }
  });
});

// ─── §5: safeParseExpr convenience wrapper ────────────────────────────────────

describe('§5 safeParseExpr', () => {
  it('returns the sanitised expression for valid input', () => {
    expect(safeParseExpr('1+2')).toBe('1+2');
  });

  it('returns null for null input', () => {
    expect(safeParseExpr(null)).toBeNull();
  });

  it('returns null for an XSS payload', () => {
    expect(safeParseExpr('<script>')).toBeNull();
  });

  it('returns null for an oversized input', () => {
    expect(safeParseExpr('x'.repeat(MAX_EXPR_LENGTH + 1))).toBeNull();
  });

  it('returns trimmed expression', () => {
    expect(safeParseExpr('  sin(pi)  ')).toBe('sin(pi)');
  });
});

// ─── §6: Edge cases ──────────────────────────────────────────────────────────

describe('§6 Edge cases', () => {
  it('accepts a single digit', () => {
    expect(parseDeepLinkExpr('0')).toEqual({ ok: true, expr: '0' });
  });

  it('accepts a single letter (variable name)', () => {
    expect(parseDeepLinkExpr('x')).toEqual({ ok: true, expr: 'x' });
  });

  it('accepts the − Unicode minus (U+2212) used by the UI', () => {
    // \u2212 is in the display alias set
    expect(parseDeepLinkExpr('5\u22123')).toEqual({ ok: true, expr: '5\u22123' });
  });

  it('trims surrounding spaces before returning', () => {
    const result = parseDeepLinkExpr('   42   ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.expr).toBe('42');
  });

  it('rejects a string that becomes empty after trimming', () => {
    expect(parseDeepLinkExpr('\n\t\r')).toEqual({ ok: false, reason: 'empty' });
  });

  it('accepts negation with leading minus', () => {
    expect(parseDeepLinkExpr('-5+3')).toEqual({ ok: true, expr: '-5+3' });
  });

  it('accepts complex nested expression', () => {
    const expr = 'sqrt(sin(pi/6)^2 + cos(pi/6)^2)';
    const result = parseDeepLinkExpr(expr);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.expr).toBe(expr);
  });
});
