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

  return (
    <HudCard label="ESTIMATED VALUE (AVM)" glow="green">
      <Text style={styles.value}>${avm.estimated_value.toLocaleString()}</Text>
      {range && (
        <>
          <Text style={styles.rangeLabel}>90% CONFIDENCE RANGE</Text>
          <Text style={styles.range}>{range}</Text>
        </>
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
  model: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, textAlign: 'right' },
});
