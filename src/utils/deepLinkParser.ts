/**
 * deepLinkParser
 *
 * Validates and sanitises incoming expressions received via the
 * `calculatorapp://calculate?expr=<value>` deep link before they are
 * passed to the calculator engine.
 *
 * Security considerations:
 *  - Input length is capped at MAX_EXPR_LENGTH to prevent ReDoS or
 *    pathologically large evaluations.
 *  - Only characters that can appear in a valid mathematical expression are
 *    allowed (digits, basic operators, parentheses, decimal point, the
 *    letters used by named constants and functions, whitespace, and the
 *    caret for exponentiation).  Everything else — HTML tags, script
 *    injection payloads, OS-level command characters — is rejected.
 */

/** Maximum allowed raw (URL-encoded or decoded) expression length. */
export const MAX_EXPR_LENGTH = 500;

/**
 * Allowlist of characters that may appear in a math expression.
 *
 * Covers:
 *  - Digits 0-9 and decimal point
 *  - Basic arithmetic operators + - * /
 *  - Exponentiation ^
 *  - Display-layer aliases × ÷ − (produced by the UI; also safe to accept)
 *  - Parentheses ( )
 *  - Whitespace (trimmed later but harmless)
 *  - Letters a-z / A-Z  — for named constants (pi, e, tau, phi) and
 *    function names (sin, cos, sqrt, log, ln, …)
 *  - Underscore _ — used in some constant names (kept for forward-compat)
 *  - Comma ,      — function argument separator (abs(-1,2) etc.)
 *  - Percent %    — supported by the UI
 */
const ALLOWED_CHARS_RE =
  /^[\d \t\+\-\*\/\^\.eEpitauphsincoqrtlgbdfmnvwxyz,_()\u00d7\u00f7\u2212%]+$/i;

/** Returned by `parseDeepLinkExpr` on failure. */
export interface ParseError {
  ok: false;
  reason: 'empty' | 'too_long' | 'invalid_chars';
}

/** Returned by `parseDeepLinkExpr` on success. */
export interface ParseSuccess {
  ok: true;
  /** The sanitised expression, safe to pass to the calc engine. */
  expr: string;
}

export type ParseResult = ParseSuccess | ParseError;

/**
 * Parse and validate a raw expression string coming from a deep link URL
 * query parameter.
 *
 * The caller should pass the **already URL-decoded** value of the `expr`
 * query parameter.  React Navigation / React Native's `Linking` API decodes
 * percent-encoded characters automatically, so this is guaranteed in normal
 * usage.
 *
 * @example
 * parseDeepLinkExpr('1+2')          // { ok: true, expr: '1+2' }
 * parseDeepLinkExpr('<script>')      // { ok: false, reason: 'invalid_chars' }
 * parseDeepLinkExpr('x'.repeat(501)) // { ok: false, reason: 'too_long' }
 */
export function parseDeepLinkExpr(raw: string | null | undefined): ParseResult {
  // ── Null / empty ──────────────────────────────────────────────────────────
  if (raw == null || raw.trim() === '') {
    return { ok: false, reason: 'empty' };
  }

  // ── Length guard ──────────────────────────────────────────────────────────
  if (raw.length > MAX_EXPR_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  const trimmed = raw.trim();

  // ── Re-check after trim ───────────────────────────────────────────────────
  if (trimmed === '') {
    return { ok: false, reason: 'empty' };
  }

  // ── Character allowlist ───────────────────────────────────────────────────
  if (!ALLOWED_CHARS_RE.test(trimmed)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  return { ok: true, expr: trimmed };
}

/**
 * Convenience helper: returns the sanitised expression or `null` on failure.
 * Useful when the caller doesn't need the failure reason.
 */
export function safeParseExpr(raw: string | null | undefined): string | null {
  const result = parseDeepLinkExpr(raw);
  return result.ok ? result.expr : null;
}
