/**
 * Tests for calculatorStore (Zustand).
 *
 * Imports via the barrel (src/store/index.ts) so that barrel is also covered.
 *
 * Coverage areas:
 *  §1  Initial state
 *  §2  Individual actions (setExpression, setResult, setAngleMode, setPrecision)
 *  §3  reset() restores initial state regardless of current mutations
 */

// Import from the barrel — this also covers src/store/index.ts
import { useCalculatorStore, type AngleMode } from '@/store';

/** Convenience: get current state snapshot. */
const state = () => useCalculatorStore.getState();

const INITIAL = {
  expression: '',
  result: '',
  angleMode: 'deg' as AngleMode,
  precision: 12,
};

beforeEach(() => {
  useCalculatorStore.setState(INITIAL);
});

// ─────────────────────────────────────────────────────────────────────────────
// §1  Initial state
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatorStore — initial state', () => {
  it('expression defaults to ""', () => expect(state().expression).toBe(''));
  it('result defaults to ""', () => expect(state().result).toBe(''));
  it('angleMode defaults to "deg"', () => expect(state().angleMode).toBe('deg'));
  it('precision defaults to 12', () => expect(state().precision).toBe(12));
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  Individual actions
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatorStore — actions', () => {
  it('setExpression() updates expression', () => {
    state().setExpression('1+2');
    expect(state().expression).toBe('1+2');
  });

  it('setExpression() does not affect other fields', () => {
    state().setExpression('sin(x)');
    expect(state().result).toBe('');
    expect(state().angleMode).toBe('deg');
  });

  it('setResult() updates result', () => {
    state().setResult('42');
    expect(state().result).toBe('42');
  });

  it('setResult("Error") stores the error string', () => {
    state().setResult('Error');
    expect(state().result).toBe('Error');
  });

  it('setAngleMode("rad") updates angleMode', () => {
    state().setAngleMode('rad');
    expect(state().angleMode).toBe('rad');
  });

  it('setAngleMode("deg") restores degree mode', () => {
    state().setAngleMode('rad');
    state().setAngleMode('deg');
    expect(state().angleMode).toBe('deg');
  });

  it('setPrecision() updates precision', () => {
    state().setPrecision(20);
    expect(state().precision).toBe(20);
  });

  it('setPrecision(1) sets minimum-ish precision', () => {
    state().setPrecision(1);
    expect(state().precision).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  reset()
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatorStore — reset()', () => {
  it('restores expression to ""', () => {
    state().setExpression('5*5');
    state().reset();
    expect(state().expression).toBe('');
  });

  it('restores result to ""', () => {
    state().setResult('25');
    state().reset();
    expect(state().result).toBe('');
  });

  it('restores angleMode to "deg"', () => {
    state().setAngleMode('rad');
    state().reset();
    expect(state().angleMode).toBe('deg');
  });

  it('restores precision to 12', () => {
    state().setPrecision(5);
    state().reset();
    expect(state().precision).toBe(12);
  });

  it('reset after multiple mutations resets everything', () => {
    state().setExpression('2^10');
    state().setResult('1024');
    state().setAngleMode('rad');
    state().setPrecision(30);
    state().reset();
    const s = state();
    expect(s.expression).toBe('');
    expect(s.result).toBe('');
    expect(s.angleMode).toBe('deg');
    expect(s.precision).toBe(12);
  });
});
