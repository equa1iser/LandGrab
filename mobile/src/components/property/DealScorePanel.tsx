import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HudCard } from '../ui/HudCard';
import { DealScoreMeter } from '../ui/DealScoreMeter';
import { Colors, Fonts, Spacing, scoreColor } from '../../theme';
import type { DealScoreSummary } from '../../types';

interface Props { dealScore: DealScoreSummary }

export function DealScorePanel({ dealScore }: Props) {
  const { score, grade, verdict, ai_analysis, key_factors, score_components } = dealScore;

  return (
    <HudCard label="DEAL SCORE" glow="green">
      <View style={styles.meterRow}>
        <DealScoreMeter score={score} grade={grade} />
        <View style={styles.verdictBlock}>
          <Text style={styles.verdictLabel}>VERDICT</Text>
          <Text style={[styles.verdict, { color: scoreColor(score) }]}>{verdict ?? '—'}</Text>
        </View>
      </View>

      {ai_analysis && (
        <View style={styles.analysisBlock}>
          <Text style={styles.analysisLabel}>AI ANALYSIS</Text>
          <Text style={styles.analysisText}>{ai_analysis}</Text>
        </View>
      )}

      {key_factors && key_factors.length > 0 && (
        <View style={styles.factors}>
          <Text style={styles.factorsLabel}>KEY FACTORS</Text>
          {key_factors.map((f, i) => (
            <View key={i} style={styles.factor}>
              <Ionicons
                name={f.impact === 'positive' ? 'trending-up' : f.impact === 'negative' ? 'trending-down' : 'remove'}
                size={14}
                color={f.impact === 'positive' ? Colors.accentGreen : f.impact === 'negative' ? Colors.accentRed : Colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.factorName}>{f.factor}</Text>
                <Text style={styles.factorDesc}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {score_components && Object.keys(score_components).length > 0 && (
        <View style={styles.components}>
          <Text style={styles.factorsLabel}>COMPONENT SCORES</Text>
          {Object.entries(score_components).map(([key, val]) => (
            <View key={key} style={styles.componentRow}>
              <Text style={styles.componentKey}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
              <View style={styles.componentBar}>
                <View
                  style={[
                    styles.componentFill,
                    { width: `${Math.min(val * 100, 100)}%`, backgroundColor: scoreColor(val * 100) },
                  ]}
                />
              </View>
              <Text style={[styles.componentVal, { color: scoreColor(val * 100) }]}>
                {Math.round(val * 100)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </HudCard>
  );
}

const styles = StyleSheet.create({
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, marginBottom: Spacing.lg },
  verdictBlock: { flex: 1 },
  verdictLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 4 },
  verdict: { fontFamily: Fonts.display, fontSize: 16, letterSpacing: 1 },
  analysisBlock: { marginBottom: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.bgElevated, borderRadius: 6 },
  analysisLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 6 },
  analysisText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  factors: { marginBottom: Spacing.md },
  factorsLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  factor: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  factorName: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.textPrimary },
  factorDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary },
  components: {},
  componentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  componentKey: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, width: 100, letterSpacing: 0.5 },
  componentBar: { flex: 1, height: 4, backgroundColor: Colors.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  componentFill: { height: 4, borderRadius: 2 },
  componentVal: { fontFamily: Fonts.mono, fontSize: 11, width: 28, textAlign: 'right' },
});
