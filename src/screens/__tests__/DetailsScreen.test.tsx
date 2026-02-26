import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {DetailsScreen} from '@/screens/DetailsScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
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
  params: {itemId: 2, title: 'Item Two'},
} as any;

describe('DetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the item title and id', () => {
    const {getByText} = render(
      <DetailsScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('Item Two')).toBeTruthy();
    expect(getByText('#2')).toBeTruthy();
  });

  it('calls goBack when the button is pressed', () => {
    const {getByTestId} = render(
      <DetailsScreen navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.press(getByTestId('go-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
