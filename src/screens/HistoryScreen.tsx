/**
 * HistoryScreen
 *
 * Displays past calculations with three actions per row:
 *   Edit         — re-type the expression; result is re-evaluated on save
 *   Use Result   — loads the result into the calculator display
 *   Delete       — removes the entry
 *
 * Rows are tapped to expand / collapse an inline action bar.
 * The edit action opens a bottom-sheet Modal with a TextInput.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme, type Theme } from '@/theme';
import { useHistory } from '@/history';
import type { HistoryEntry } from '@/history';
import { evaluate } from '@/engine/calc-engine';
import type { TabParamList } from '@/navigation/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Navigation -----------------------------------------------------------------------

type HistoryNavProp = BottomTabNavigationProp<TabParamList, 'History'>;

// Helpers --------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Re-evaluate an expression string and return a formatted result string. */
function reEvaluate(expression: string): string {
  try {
    const result = evaluate(expression.trim(), { precision: 12 });
    return result.isInteger() ? result.toFixed(0) : result.toSignificantDigits(10).toFixed();
  } catch {
    return 'Error';
  }
}

// Edit Modal -----------------------------------------------------------------------

interface EditModalProps {
  entry: HistoryEntry | null;
  onSave: (id: string, expression: string, result: string) => Promise<void>;
  onClose: () => void;
  theme: Theme;
}

function EditModal({ entry, onSave, onClose, theme }: EditModalProps): React.JSX.Element | null {
  const { colors, spacing, radii, typography } = theme;
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(entry?.expression ?? '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setText(entry?.expression ?? '');
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  if (!entry) return null;

  const preview = text.trim() ? reEvaluate(text.trim()) : '';

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    const result = reEvaluate(trimmed);
    await onSave(entry.id, trimmed, result);
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      testID="edit-modal"
    >
      <Pressable style={ms.overlay} onPress={onClose} testID="modal-backdrop" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ms.kav}>
        <View
          style={[
            ms.sheet,
            {
              backgroundColor: colors.surface.raised,
              paddingBottom: insets.bottom + spacing[4],
            },
          ]}
        >
          <View style={[ms.handle, { backgroundColor: colors.border.strong }]} />

          <Text style={[ms.sheetTitle, { color: colors.text.primary }]}>Edit Expression</Text>

          <Text
            style={[ms.original, { color: colors.text.tertiary, fontSize: typography.sizes.sm }]}
            numberOfLines={1}
          >
            Original: {entry.expression} = {entry.result}
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            style={[
              ms.input,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: colors.border.focus,
                borderRadius: radii.md,
                fontSize: typography.sizes.xl,
              },
            ]}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            testID="edit-input"
          />

          {preview ? (
            <Text
              style={[ms.preview, { color: colors.primary.default, fontSize: typography.sizes.md }]}
            >
              = {preview}
            </Text>
          ) : null}

          <View style={ms.sheetActions}>
            <TouchableOpacity
              style={[
                ms.sheetBtn,
                { backgroundColor: colors.background.secondary, borderRadius: radii.md },
              ]}
              onPress={onClose}
              testID="edit-cancel"
            >
              <Text style={[ms.sheetBtnText, { color: colors.text.primary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                ms.sheetBtn,
                { backgroundColor: colors.primary.default, borderRadius: radii.md },
                (!text.trim() || saving) && ms.sheetBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!text.trim() || saving}
              testID="edit-save"
            >
              {saving ? (
                <ActivityIndicator color={colors.primary.contrast} />
              ) : (
                <Text style={[ms.sheetBtnText, { color: colors.primary.contrast }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  original: {
    marginBottom: 16,
  },
  input: {
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  preview: {
    marginBottom: 20,
    fontWeight: '500',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetBtnDisabled: {
    opacity: 0.45,
  },
  sheetBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// HistoryRow -----------------------------------------------------------------------

interface HistoryRowProps {
  item: HistoryEntry;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (entry: HistoryEntry) => void;
  onUseResult: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  s: ReturnType<typeof makeStyles>;
  theme: Theme;
}

function HistoryRow({
  item,
  isExpanded,
  onToggle,
  onEdit,
  onUseResult,
  onDelete,
  s,
  theme,
}: HistoryRowProps): React.JSX.Element {
  const { colors } = theme;

  return (
    <View testID={`history-row-${item.id}`}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onToggle(item.id)} style={s.row}>
        <View style={s.rowLeft}>
          <Text style={s.expression} numberOfLines={1}>
            {item.expression}
          </Text>
          <Text style={s.time}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <View style={s.rowRight}>
          <Text style={s.result} numberOfLines={1} adjustsFontSizeToFit>
            {item.result}
          </Text>
          <Text style={[s.chevron, isExpanded && s.chevronUp]}>&#x203A;</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={s.actionBar}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.background.secondary }]}
            onPress={() => onEdit(item)}
            testID={`action-edit-${item.id}`}
          >
            <Text style={s.actionIcon}>&#x270F;</Text>
            <Text style={[s.actionLabel, { color: colors.text.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.primary.subtle }]}
            onPress={() => onUseResult(item)}
            testID={`action-use-${item.id}`}
          >
            <Text style={s.actionIcon}>&#x21A9;</Text>
            <Text style={[s.actionLabel, { color: colors.primary.default }]}>Use Result</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.error.subtle }]}
            onPress={() => onDelete(item.id)}
            testID={`action-delete-${item.id}`}
          >
            <Text style={s.actionIcon}>&#x1F5D1;</Text>
            <Text style={[s.actionLabel, { color: colors.error.default }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Screen ---------------------------------------------------------------------------

export function HistoryScreen(): React.JSX.Element {
  const { theme, colorScheme } = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<HistoryNavProp>();

  const { entries, isLoading, hasMore, loadMore, refresh, clear, remove, update } = useHistory();

  // Re-fetch every time this tab comes into focus so entries saved by
  // CalculatorHome (which has its own useHistory instance) are visible
  // immediately without requiring a full app restart.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<HistoryEntry | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleEdit = useCallback((entry: HistoryEntry) => {
    setExpandedId(null);
    setEditTarget(entry);
  }, []);

  const handleSave = useCallback(
    async (id: string, expression: string, result: string) => {
      await update(id, expression, result);
    },
    [update],
  );

  const handleUseResult = useCallback(
    (entry: HistoryEntry) => {
      setExpandedId(null);
      navigation.navigate('Home', { loadValue: entry.result });
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setExpandedId(null);
      remove(id);
    },
    [remove],
  );

  const handleLoadMore = useCallback(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);

  const ListFooter = hasMore ? (
    <ActivityIndicator color={theme.colors.primary.default} style={{ marginVertical: 12 }} />
  ) : null;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
        </View>
      ) : entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>&#x1F550;</Text>
          <Text style={s.emptyTitle}>No history yet</Text>
          <Text style={s.emptySubtitle}>
            Your past calculations will appear here once you start using the calculator.
          </Text>
        </View>
      ) : (
        <ErrorBoundary title="History" colorScheme={colorScheme}>
          <TouchableOpacity style={s.clearButton} onPress={clear} testID="btn-clear-history">
            <Text style={s.clearButtonText}>Clear All</Text>
          </TouchableOpacity>

          <FlatList
            data={entries}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            ItemSeparatorComponent={() => <View style={s.divider} />}
            ListFooterComponent={ListFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <HistoryRow
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onUseResult={handleUseResult}
                onDelete={handleDelete}
                s={s}
                theme={theme}
              />
            )}
          />
        </ErrorBoundary>
      )}

      <EditModal
        entry={editTarget}
        onSave={handleSave}
        onClose={() => setEditTarget(null)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// Styles ---------------------------------------------------------------------------

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[8],
    },
    emptyIcon: {
      fontSize: 56,
      marginBottom: spacing[4],
    },
    emptyTitle: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.semiBold,
      color: colors.text.primary,
      marginBottom: spacing[2],
    },
    emptySubtitle: {
      fontSize: typography.sizes.md,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: typography.sizes.md * 1.5,
    },
    clearButton: {
      alignSelf: 'flex-end',
      margin: spacing[4],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radii.md,
      backgroundColor: colors.error.default,
    },
    clearButtonText: {
      color: '#fff',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semiBold,
    },
    list: {
      paddingHorizontal: spacing[4],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[4],
    },
    rowLeft: {
      flex: 1,
      marginRight: spacing[3],
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    expression: {
      fontSize: typography.sizes.md,
      color: colors.text.secondary,
    },
    time: {
      fontSize: typography.sizes.xs,
      color: colors.text.tertiary,
      marginTop: spacing[1],
    },
    result: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.semiBold,
      color: colors.text.primary,
      maxWidth: 110,
    },
    chevron: {
      fontSize: 20,
      color: colors.text.tertiary,
      transform: [{ rotate: '90deg' }],
    },
    chevronUp: {
      transform: [{ rotate: '-90deg' }],
    },
    actionBar: {
      flexDirection: 'row',
      gap: spacing[2],
      paddingBottom: spacing[3],
    },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing[3],
      borderRadius: radii.md,
      gap: spacing[1],
    },
    actionIcon: {
      fontSize: 18,
    },
    actionLabel: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.medium,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.default,
    },
  });
}
