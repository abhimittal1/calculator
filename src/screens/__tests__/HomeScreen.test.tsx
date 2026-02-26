import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {HomeScreen} from '@/screens/HomeScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
}));

const mockNavigate = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
} as any;

const mockRoute = {
  key: 'Home',
  name: 'Home',
  params: undefined,
} as any;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heading and subtitle', () => {
    const {getByText} = render(
      <HomeScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('Welcome 👋')).toBeTruthy();
    expect(getByText('Select an item to see its details.')).toBeTruthy();
  });

  it('renders all items', () => {
    const {getByText} = render(
      <HomeScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('Item One')).toBeTruthy();
    expect(getByText('Item Two')).toBeTruthy();
    expect(getByText('Item Three')).toBeTruthy();
  });

  it('navigates to Details when an item is pressed', () => {
    const {getByTestId} = render(
      <HomeScreen navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.press(getByTestId('home-item-1'));
    expect(mockNavigate).toHaveBeenCalledWith('Details', {itemId: 1, title: 'Item One'});
  });
});
