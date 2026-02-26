import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from '@/navigation';
import {ThemeProvider, useTheme} from '@/theme';

function NavigationRoot(): React.JSX.Element {
  const {theme, colorScheme} = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: colorScheme === 'dark',
        colors: {
          primary: theme.colors.primary.default,
          background: theme.colors.background.primary,
          card: theme.colors.surface.default,
          text: theme.colors.text.primary,
          border: theme.colors.border.default,
          notification: theme.colors.error.default,
        },
      }}>
      <RootNavigator />
    </NavigationContainer>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
