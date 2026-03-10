import { create } from 'zustand';

export type AngleMode = 'rad' | 'deg';

export interface CalculatorState {
  expression: string;
  result: string;
  angleMode: AngleMode;
  precision: number;
}

export interface CalculatorActions {
  setExpression: (expression: string) => void;
  setResult: (result: string) => void;
  setAngleMode: (mode: AngleMode) => void;
  setPrecision: (precision: number) => void;
  reset: () => void;
}

const initialState: CalculatorState = {
  expression: '',
  result: '',
  angleMode: 'deg',
  precision: 12,
};

export const useCalculatorStore = create<CalculatorState & CalculatorActions>(set => ({
  ...initialState,

  setExpression: expression => set({ expression }),
  setResult: result => set({ result }),
  setAngleMode: angleMode => set({ angleMode }),
  setPrecision: precision => set({ precision }),
  reset: () => set(initialState),
}));
