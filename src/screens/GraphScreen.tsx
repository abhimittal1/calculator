import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Share,
  Alert,
  processColor,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import { LineChart } from 'react-native-charts-wrapper';
import { useTheme, type Theme } from '@/theme';
import { useHistory } from '@/history';
import { evaluate } from '@/engine/calc-engine';
import { useCalculatorStore } from '@/store';

// ─── Types ─────────────────────────────────────────────────────────────────
type TabKey = 'history' | 'plotter';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'history', label: 'History Chart' },
  { key: 'plotter', label: 'Function Plotter' },
];

// ─── Component ─────────────────────────────────────────────────────────────
export function GraphScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const { colors } = theme;

  const [activeTab, setActiveTab] = useState<TabKey>('history');
  const chartRef = useRef<View>(null);

  // ── History chart state ─────────────────────────────────────────────────
  const { entries, refresh, isLoading } = useHistory({ pageSize: 20 });

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const historyPoints = entries
    .slice()
    .reverse()
    .map((e, i) => ({ x: i, y: parseFloat(e.result) }))
    .filter(p => isFinite(p.y));

  const historyLabels = entries
    .slice()
    .reverse()
    .map(e => (e.expression.length > 10 ? e.expression.slice(0, 10) + '…' : e.expression));

  // ── Function plotter state ──────────────────────────────────────────────
  const angleMode = useCalculatorStore(st => st.angleMode);
  const precision = useCalculatorStore(st => st.precision);
  const [funcExpr, setFuncExpr] = useState('sin(x)');
  const [plotPoints, setPlotPoints] = useState<{ x: number; y: number }[]>([]);
  const [plotError, setPlotError] = useState('');
  const [isPlotting, setIsPlotting] = useState(false);

  const plotFunction = useCallback(() => {
    setPlotError('');
    setIsPlotting(true);
    // Defer heavy work so the loading indicator renders first
    setTimeout(() => {
      const STEPS = 200;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const x = -10 + (20 * i) / STEPS;
        const expr = funcExpr.replace(/\bx\b/g, `(${x})`);
        try {
          const y = evaluate(expr, { angleMode, precision }).toNumber();
          if (isFinite(y) && !isNaN(y) && Math.abs(y) < 1e10) {
            points.push({ x: parseFloat(x.toFixed(4)), y });
          }
        } catch {
          // Skip discontinuities / undefined points
        }
      }
      setIsPlotting(false);
      if (points.length === 0) {
        setPlotError('No valid points found. Use "x" as the variable (e.g. sin(x), x^2).');
      } else {
        setPlotPoints(points);
      }
    }, 0);
  }, [funcExpr, angleMode, precision]);

  // Auto-plot the default expression on mount
  useEffect(() => {
    plotFunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!chartRef.current) {
      Alert.alert('Nothing to export', 'Display a chart first.');
      return;
    }
    try {
      const uri = await captureRef(chartRef, { format: 'png', quality: 1 });
      await Share.share({
        url: uri,
        message: 'Graph from Calculator App',
        title: 'Export Graph',
      });
    } catch {
      Alert.alert('Export failed', 'Unable to capture or share the graph.');
    }
  }, []);

  // ── Shared chart colours ────────────────────────────────────────────────
  const C = {
    primary: processColor(colors.primary.default),
    primarySubtle: processColor(colors.primary.subtle),
    warning: processColor(colors.warning.default),
    textSecondary: processColor(colors.text.secondary),
    border: processColor(colors.border.default),
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* ── Top tab bar ─────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'history' ? (
          /* ── History Chart ── */
          <View>
            <Text style={s.sectionTitle}>Last {historyPoints.length || '–'} Results</Text>
            <Text style={s.sectionSubtitle}>
              Each point is a saved calculation result, plotted chronologically.
            </Text>

            {isLoading ? (
              <View style={s.placeholder}>
                <ActivityIndicator color={colors.primary.default} />
              </View>
            ) : historyPoints.length === 0 ? (
              <View style={s.placeholder}>
                <Text style={s.placeholderIcon}>📊</Text>
                <Text style={s.placeholderText}>No history yet</Text>
                <Text style={s.placeholderSub}>
                  Press = in the calculator to start saving results here.
                </Text>
              </View>
            ) : (
              <View ref={chartRef} collapsable={false} style={s.chartContainer}>
                <LineChart
                  style={s.chart}
                  data={{
                    dataSets: [
                      {
                        label: 'Results',
                        values: historyPoints,
                        config: {
                          color: C.primary,
                          drawCircles: historyPoints.length <= 30,
                          circleColor: C.primary,
                          circleRadius: 4,
                          drawValues: false,
                          lineWidth: 2,
                          mode: 'CUBIC_BEZIER',
                          drawFilled: true,
                          fillColor: C.primarySubtle,
                          fillAlpha: 80,
                          highlightColor: C.warning,
                          highlightLineWidth: 1,
                        },
                      },
                    ],
                  }}
                  chartDescription={{ text: '' }}
                  legend={{ enabled: false }}
                  xAxis={{
                    position: 'BOTTOM',
                    textColor: C.textSecondary,
                    textSize: 9,
                    drawGridLines: false,
                    granularityEnabled: true,
                    granularity: 1,
                    valueFormatter: historyLabels,
                    labelRotationAngle: -30,
                  }}
                  yAxis={{
                    left: {
                      textColor: C.textSecondary,
                      gridColor: C.border,
                      textSize: 10,
                      drawGridLines: true,
                    },
                    right: { enabled: false },
                  }}
                  touchEnabled
                  dragEnabled
                  scaleEnabled
                  pinchZoom
                  doubleTapToZoomEnabled={false}
                />
              </View>
            )}
          </View>
        ) : (
          /* ── Function Plotter ── */
          <View>
            <Text style={s.sectionTitle}>Plot f(x)</Text>
            <Text style={s.sectionSubtitle}>
              Enter an expression using <Text style={s.code}>x</Text> as the variable. x ranges from
              −10 to 10.
            </Text>

            {/* Input row */}
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={funcExpr}
                onChangeText={setFuncExpr}
                placeholder="e.g.  sin(x)  |  x^2  |  ln(x+11)"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={plotFunction}
              />
              <TouchableOpacity style={s.plotBtn} onPress={plotFunction} activeOpacity={0.8}>
                <Text style={s.plotBtnText}>{isPlotting ? '…' : 'Plot'}</Text>
              </TouchableOpacity>
            </View>

            {plotError ? <Text style={s.errorText}>{plotError}</Text> : null}

            {isPlotting ? (
              <View style={s.placeholder}>
                <ActivityIndicator color={colors.primary.default} />
                <Text style={[s.placeholderSub, { marginTop: 8 }]}>Plotting…</Text>
              </View>
            ) : plotPoints.length > 0 ? (
              <View ref={chartRef} collapsable={false} style={s.chartContainer}>
                <LineChart
                  style={s.chart}
                  data={{
                    dataSets: [
                      {
                        label: funcExpr,
                        values: plotPoints,
                        config: {
                          color: C.primary,
                          drawCircles: false,
                          drawValues: false,
                          lineWidth: 2,
                          mode: 'CUBIC_BEZIER',
                          drawFilled: true,
                          fillColor: C.primarySubtle,
                          fillAlpha: 60,
                          highlightColor: C.warning,
                          highlightLineWidth: 1,
                        },
                      },
                    ],
                  }}
                  chartDescription={{ text: '' }}
                  legend={{ enabled: false }}
                  xAxis={{
                    position: 'BOTTOM',
                    textColor: C.textSecondary,
                    textSize: 10,
                    gridColor: C.border,
                    drawGridLines: false,
                    granularityEnabled: true,
                    granularity: 2,
                  }}
                  yAxis={{
                    left: {
                      textColor: C.textSecondary,
                      gridColor: C.border,
                      textSize: 10,
                      drawGridLines: true,
                    },
                    right: { enabled: false },
                  }}
                  touchEnabled
                  dragEnabled
                  scaleEnabled
                  pinchZoom
                  doubleTapToZoomEnabled={false}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── Export button ─────────────────────────────────────────────────── */}
      <TouchableOpacity style={s.exportBtn} onPress={handleExport} activeOpacity={0.8}>
        <Text style={s.exportBtnText}>⬆ Export Graph</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    // ── Tab bar ────────────────────────────────────────────────────────────
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: spacing[4],
      marginTop: spacing[3],
      backgroundColor: colors.surface.default,
      borderRadius: radii.lg,
      padding: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing[2],
      alignItems: 'center',
      borderRadius: radii.md,
    },
    tabActive: {
      backgroundColor: colors.primary.default,
    },
    tabLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semiBold,
      color: colors.text.secondary,
    },
    tabLabelActive: {
      color: colors.primary.contrast,
    },
    // ── Scroll content ─────────────────────────────────────────────────────
    scroll: {
      padding: spacing[4],
      paddingBottom: spacing[4],
      gap: spacing[3],
    },
    sectionTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semiBold,
      color: colors.text.primary,
    },
    sectionSubtitle: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
      lineHeight: typography.sizes.sm * 1.5,
    },
    code: {
      fontWeight: typography.weights.semiBold,
      color: colors.primary.default,
    },
    // ── Chart ──────────────────────────────────────────────────────────────
    chartContainer: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: colors.surface.default,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
    },
    chart: {
      height: 280,
    },
    // ── Input row (plotter) ────────────────────────────────────────────────
    inputRow: {
      flexDirection: 'row',
      gap: spacing[2],
      alignItems: 'center',
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface.default,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
      borderRadius: radii.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2] + 2,
      fontSize: typography.sizes.md,
      color: colors.text.primary,
    },
    plotBtn: {
      backgroundColor: colors.primary.default,
      borderRadius: radii.md,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2] + 2,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    plotBtnText: {
      color: colors.primary.contrast,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semiBold,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: colors.error.default,
    },
    // ── Empty / loading state ──────────────────────────────────────────────
    placeholder: {
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      borderRadius: radii.lg,
      backgroundColor: colors.surface.default,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
    },
    placeholderIcon: {
      fontSize: 40,
    },
    placeholderText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semiBold,
      color: colors.text.primary,
    },
    placeholderSub: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: spacing[6],
    },
    // ── Export button ──────────────────────────────────────────────────────
    exportBtn: {
      margin: spacing[4],
      marginTop: spacing[2],
      backgroundColor: colors.primary.default,
      borderRadius: radii.md,
      paddingVertical: spacing[3] + 2,
      alignItems: 'center',
    },
    exportBtnText: {
      color: colors.primary.contrast,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.semiBold,
    },
  });
}
