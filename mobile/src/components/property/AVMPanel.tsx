import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HudCard } from '../ui/HudCard';
import { Colors, Fonts, Spacing } from '../../theme';
import type { AVMResult } from '../../types';

interface Props { avm?: AVMResult }

export function AVMPanel({ avm }: Props) {
  if (!avm || avm.status === 'unavailable' || !avm.estimated_value) {
    return (
      <HudCard label="ESTIMATED VALUE (AVM)">
        <Text style={styles.empty}>
          {avm?.status === 'unavailable'
            ? 'AVM model not trained. Run train_avm.py on the backend.'
            : 'Valuation data unavailable.'}
        </Text>
      </HudCard>
    );
  }

  const range = avm.confidence_low != null && avm.confidence_high != null
    ? `$${avm.confidence_low.toLocaleString()} – $${avm.confidence_high.toLocaleString()}`
    : null;

  const vsListPct = avm.vs_list_price_pct;
  const isUndervalued = vsListPct != null && vsListPct < 0;
  const vsListLabel = vsListPct != null
    ? `${vsListPct > 0 ? '+' : ''}${vsListPct.toFixed(1)}%`
    : null;

  const topFeatures = avm.feature_importances
    ? Object.entries(avm.feature_importances)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <HudCard label="ESTIMATED VALUE (AVM)" glow="green">
      <Text style={styles.value}>${avm.estimated_value.toLocaleString()}</Text>
      {range && (
        <>
          <Text style={styles.rangeLabel}>90% CONFIDENCE RANGE</Text>
          <Text style={styles.range}>{range}</Text>
        </>
      )}

      {vsListLabel && (
        <View style={styles.vsBlock}>
          <Text style={styles.vsLabel}>vs. LIST PRICE</Text>
          <Text style={[styles.vsPct, { color: isUndervalued ? Colors.accentGreen : Colors.accentRed }]}>
            {vsListLabel}
          </Text>
          <Text style={[styles.vsTag, { color: isUndervalued ? Colors.accentGreen : Colors.accentRed }]}>
            {isUndervalued ? 'UNDERVALUED' : 'OVERPRICED'}
          </Text>
        </View>
      )}

      {topFeatures.length > 0 && (
        <View style={styles.featuresBlock}>
          <Text style={styles.featuresLabel}>WHAT DROVE THIS ESTIMATE</Text>
          {topFeatures.map(([key, val]) => (
            <View key={key} style={styles.featureRow}>
              <Text style={styles.featureKey}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
              <View style={styles.featureBar}>
                <View style={[styles.featureFill, { width: `${Math.min(val * 100, 100)}%` }]} />
              </View>
              <Text style={styles.featureVal}>{Math.round(val * 100)}%</Text>
            </View>
          ))}
        </View>
      )}

      {avm.model_version && (
        <Text style={styles.model}>Model: {avm.model_version}</Text>
      )}
    </HudCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  value: { fontFamily: Fonts.display, fontSize: 32, color: Colors.accentGreen, letterSpacing: 1, marginBottom: Spacing.sm },
  rangeLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 4 },
  range: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md },
  vsBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  vsLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  vsPct: { fontFamily: Fonts.monoBold, fontSize: 15 },
  vsTag: { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  featuresBlock: { marginBottom: Spacing.md },
  featuresLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  featureKey: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, width: 110, letterSpacing: 0.3 },
  featureBar: { flex: 1, height: 4, backgroundColor: Colors.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  featureFill: { height: 4, borderRadius: 2, backgroundColor: Colors.accentCyan },
  featureVal: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.accentCyan, width: 32, textAlign: 'right' },
  model: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, textAlign: 'right' },
});
