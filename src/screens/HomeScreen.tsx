import React from 'react';
import {StyleSheet, Text, TouchableOpacity, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RootStackScreenProps} from '@/navigation/types';
import {useTheme, type Theme} from '@/theme';

type Props = RootStackScreenProps<'Home'>;

const ITEMS = [
  {id: 1, title: 'Item One'},
  {id: 2, title: 'Item Two'},
  {id: 3, title: 'Item Three'},
];

export function HomeScreen({navigation}: Props): React.JSX.Element {
  const {theme} = useTheme();
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Text style={s.heading}>Welcome 👋</Text>
      <Text style={s.subtitle}>Select an item to see its details.</Text>
      <FlatList
        data={ITEMS}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        renderItem={({item}) => (
          <TouchableOpacity
            testID={`home-item-${item.id}`}
            style={s.card}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('Details', {itemId: item.id, title: item.title})
            }>
            <Text style={s.cardText}>{item.title}</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const {colors, spacing, radii, typography, shadows} = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    heading: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.bold,
      marginTop: spacing[6],
      marginHorizontal: spacing[4],
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: typography.sizes.md,
      color: colors.text.secondary,
      marginHorizontal: spacing[4],
      marginTop: spacing[1],
      marginBottom: spacing[4],
    },
    list: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[6],
      gap: spacing[3],
    },
    card: {
      backgroundColor: colors.surface.default,
      borderRadius: radii.md,
      padding: spacing[4],
      flexDirection: 'row',
      alignItems: 'center',
      ...shadows.sm,
    },
    cardText: {
      flex: 1,
      fontSize: typography.sizes.lg,
      color: colors.text.primary,
    },
    chevron: {
      fontSize: 22,
      color: colors.text.tertiary,
    },
  });
}
