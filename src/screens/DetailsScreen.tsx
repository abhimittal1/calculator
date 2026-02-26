import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RootStackScreenProps} from '@/navigation/types';
import {useTheme, type Theme} from '@/theme';

type Props = RootStackScreenProps<'Details'>;

export function DetailsScreen({route, navigation}: Props): React.JSX.Element {
  const {itemId, title} = route.params;
  const {theme} = useTheme();
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.content}>
        <View style={s.badge}>
          <Text style={s.badgeText}>#{itemId}</Text>
        </View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.description}>
          This is the detail view for <Text style={s.bold}>{title}</Text>. Add your content
          here.
        </Text>
        <TouchableOpacity
          testID="go-back-button"
          style={s.button}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}>
          <Text style={s.buttonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const {colors, spacing, radii, typography} = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[6],
    },
    badge: {
      backgroundColor: colors.primary.default,
      borderRadius: radii.full,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      marginBottom: spacing[4],
    },
    badgeText: {
      color: colors.primary.contrast,
      fontWeight: typography.weights.bold,
      fontSize: typography.sizes.lg,
    },
    title: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
      marginBottom: spacing[3],
      textAlign: 'center',
    },
    description: {
      fontSize: typography.sizes.lg,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: typography.sizes.lg * typography.lineHeights.relaxed,
      marginBottom: spacing[8],
    },
    bold: {
      fontWeight: typography.weights.semiBold,
      color: colors.text.primary,
    },
    button: {
      backgroundColor: colors.primary.default,
      borderRadius: radii.md,
      paddingVertical: spacing[3] + 2,
      paddingHorizontal: spacing[8],
    },
    buttonText: {
      color: colors.primary.contrast,
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semiBold,
    },
  });
}
