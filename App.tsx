import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { linking } from '@/navigation/linking';
import { ThemeProvider, useTheme } from '@/theme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkService } from '@/services/NetworkService';
import { SyncQueue } from '@/services/SyncQueue';

function NavigationRoot(): React.JSX.Element {
  const { theme, colorScheme } = useTheme();

  return (
    <ErrorBoundary colorScheme={colorScheme}>
      <NavigationContainer
        linking={linking}
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
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}

// ─── Offline banner ───────────────────────────────────────────────────────────

function OfflineBanner(): React.JSX.Element | null {
  const { theme } = useTheme();
  const [isOnline, setIsOnline] = useState(NetworkService.isOnline);

  useEffect(() => {
    return NetworkService.subscribe(online => setIsOnline(online));
  }, []);

  if (isOnline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.error.default }]}>
      <Text style={styles.bannerText}>⚠ No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

// ─── App root ─────────────────────────────────────────────────────────────────

function App(): React.JSX.Element {
  useEffect(() => {
    NetworkService.start();
    // Attempt to flush any queued operations from a previous session
    SyncQueue.replay().catch(() => {});
    return () => NetworkService.stop();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <OfflineBanner />
        <NavigationRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
