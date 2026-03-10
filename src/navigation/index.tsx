import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/theme';
import { HomeScreen } from '@/screens/HomeScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { GraphScreen } from '@/screens/GraphScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { DetailsScreen } from '@/screens/DetailsScreen';
import { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Emoji icons — swap with a vector icon library when available
const TAB_ICONS: Record<keyof TabParamList, string> = {
  Home: '🔢',
  History: '🕐',
  Graph: '📈',
  Settings: '⚙️',
};

function TabNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  const { colors, typography } = theme;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Header
        headerStyle: { backgroundColor: colors.surface.default },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: typography.weights.bold,
          fontSize: typography.sizes.lg,
        },
        // Tab bar
        tabBarStyle: {
          backgroundColor: colors.surface.default,
          borderTopColor: colors.border.default,
        },
        tabBarActiveTintColor: colors.primary.default,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarIcon: ({ size }: { color: string; size: number }) => (
          <Text style={{ fontSize: size - 4 }}>{TAB_ICONS[route.name as keyof TabParamList]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Calculator' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Graph" component={GraphScreen} options={{ title: 'Graph' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={{
          headerShown: true,
          title: 'Details',
          headerStyle: { backgroundColor: theme.colors.primary.default },
          headerTintColor: theme.colors.primary.contrast,
          headerTitleStyle: { fontWeight: theme.typography.weights.bold },
        }}
      />
    </Stack.Navigator>
  );
}
