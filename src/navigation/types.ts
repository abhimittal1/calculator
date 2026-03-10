import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';

// ─── Tab Navigator ────────────────────────────────────────────────────────────
export type TabParamList = {
  /**
   * loadValue: pre-loads a number string into the calculator display (internal).
   * expr:      raw expression from the deep link calculatorapp://calculate?expr=…
   *            Validated by deepLinkParser before use.
   */
  Home: { loadValue?: string; expr?: string } | undefined;
  History: undefined;
  Graph: undefined;
  Settings: undefined;
};

// ─── Root Stack Navigator ─────────────────────────────────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Details: { itemId: number; title: string };
};

// ─── Screen Props Helpers ─────────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/** Props for screens sitting inside the bottom tab navigator. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
