import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '@/screens/HomeScreen';
import { ThemeProvider } from '@/theme';

// -- Mocks ---------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: () => void) => cb(),
}));

// -- Helpers -------------------------------------------------------------------

function renderScreen() {
  return render(
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>,
  );
}

// -- Tests ---------------------------------------------------------------------

describe('HomeScreen (CalculatorHome)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the initial display value "0"', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('display-result').props.children).toBe('0');
  });

  it('updates display when digit keys are pressed', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('key-4'));
    fireEvent.press(getByTestId('key-2'));
    expect(getByTestId('display-result').props.children).toBe('42');
  });

  it('evaluates an addition expression', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('key-3'));
    fireEvent.press(getByTestId('key-+'));
    fireEvent.press(getByTestId('key-5'));
    fireEvent.press(getByTestId('key-='));
    expect(getByTestId('display-result').props.children).toBe('8');
  });

  it('clears state when C is pressed', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('key-9'));
    fireEvent.press(getByTestId('key-C'));
    expect(getByTestId('display-result').props.children).toBe('0');
  });

  it('navigates to History when the History button is pressed', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('btn-history'));
    expect(mockNavigate).toHaveBeenCalledWith('History');
  });
});
