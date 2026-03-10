import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DetailsScreen } from '@/screens/DetailsScreen';
import { ThemeProvider } from '@/theme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockGoBack = jest.fn();

const mockNavigation = {
  navigate: jest.fn(),
  goBack: mockGoBack,
  canGoBack: jest.fn(() => true),
} as any;

const mockRoute = {
  key: 'Details',
  name: 'Details',
  params: { itemId: 2, title: 'Item Two' },
} as any;

describe('DetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the item title and id', () => {
    const { getAllByText, getByText } = render(
      <ThemeProvider>
        <DetailsScreen navigation={mockNavigation} route={mockRoute} />
      </ThemeProvider>,
    );
    // 'Item Two' appears as the standalone title and inside the description sentence
    expect(getAllByText('Item Two').length).toBeGreaterThanOrEqual(1);
    expect(getByText('#2')).toBeTruthy();
  });

  it('calls goBack when the button is pressed', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <DetailsScreen navigation={mockNavigation} route={mockRoute} />
      </ThemeProvider>,
    );
    fireEvent.press(getByTestId('go-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
