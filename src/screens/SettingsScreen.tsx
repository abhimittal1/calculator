import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@/theme';
import { useHistory } from '@/history';
import { useSettingsStore } from '@/store';

export function SettingsScreen(): React.JSX.Element {
  const { theme, colorScheme, toggleTheme } = useTheme();
  const s = makeStyles(theme);
  const isDark = colorScheme === 'dark';
  const { clear: clearHistory } = useHistory();

  const hapticEnabled = useSettingsStore(s => s.hapticEnabled);
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const saveHistory = useSettingsStore(s => s.saveHistory);
  const toggleHaptic = useSettingsStore(s => s.toggleHaptic);
  const toggleSound = useSettingsStore(s => s.toggleSound);
  const toggleSaveHistory = useSettingsStore(s => s.toggleSaveHistory);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all saved calculations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearHistory().catch(() => {}),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Appearance ── */}
        <Text style={s.sectionHeader}>Appearance</Text>
        <View style={s.section}>
          <SettingRow
            label="Dark Mode"
            description="Switch between light and dark theme"
            right={<Switch value={isDark} onValueChange={toggleTheme} />}
            styles={s}
          />
        </View>

        {/* ── Calculator ── */}
        <Text style={s.sectionHeader}>Calculator</Text>
        <View style={s.section}>
          <SettingRow
            label="Vibration"
            description="Haptic feedback on key press"
            right={<Switch value={hapticEnabled} onValueChange={toggleHaptic} />}
            hasBorder
            styles={s}
          />
          <SettingRow
            label="Sound"
            description="Play sound on key press"
            right={<Switch value={soundEnabled} onValueChange={toggleSound} />}
            styles={s}
          />
        </View>

        {/* ── History ── */}
        <Text style={s.sectionHeader}>History</Text>
        <View style={s.section}>
          <SettingRow
            label="Save History"
            description="Store past calculations locally"
            right={<Switch value={saveHistory} onValueChange={toggleSaveHistory} />}
            hasBorder
            styles={s}
          />
          <TouchableOpacity style={s.dangerRow} activeOpacity={0.7} onPress={handleClearHistory}>
            <Text style={s.dangerLabel}>Clear All History</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={s.sectionHeader}>About</Text>
        <View style={s.section}>
          <SettingRow
            label="Version"
            right={<Text style={s.valueText}>0.0.1</Text>}
            hasBorder
            styles={s}
          />
          <SettingRow
            label="Framework"
            right={<Text style={s.valueText}>React Native 0.73</Text>}
            styles={s}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Reusable row component ────────────────────────────────────────────────────
type RowProps = {
  label: string;
  description?: string;
  right?: React.ReactNode;
  hasBorder?: boolean;
  styles: ReturnType<typeof makeStyles>;
};

function SettingRow({ label, description, right, hasBorder, styles: s }: RowProps) {
  return (
    <View style={[s.row, hasBorder && s.rowBorder]}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel}>{label}</Text>
        {description ? <Text style={s.rowDescription}>{description}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    scroll: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[8],
    },
    sectionHeader: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semiBold,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing[5],
      marginBottom: spacing[2],
      marginLeft: spacing[2],
    },
    section: {
      backgroundColor: colors.surface.default,
      borderRadius: radii.lg,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      minHeight: 52,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.default,
    },
    rowLeft: {
      flex: 1,
      marginRight: spacing[4],
    },
    rowLabel: {
      fontSize: typography.sizes.md,
      color: colors.text.primary,
    },
    rowDescription: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
      marginTop: 2,
    },
    valueText: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
    },
    dangerRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      alignItems: 'flex-start',
    },
    dangerLabel: {
      fontSize: typography.sizes.md,
      color: colors.error?.default ?? '#FF3B30',
      fontWeight: typography.weights.semiBold,
    },
  });
}
