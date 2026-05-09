import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HudCard } from '../ui/HudCard';
import { Colors, Fonts, Spacing } from '../../theme';
import type { MarketSummary } from '../../types';

interface Props { market?: MarketSummary }

export function InterestRatesPanel({ market }: Props) {
  const r30 = market?.interest_rate_30yr;
  const r15 = market?.interest_rate_15yr;
  const r5 = market?.interest_rate_5yr_arm;

  if (r30 == null && r15 == null && r5 == null) {
    return (
      <HudCard label="INTEREST RATES">
        <Text style={styles.empty}>Rate data unavailable</Text>
      </HudCard>
    );
  }

  const rates = [
    { label: '30-YEAR FIXED', val: r30 },
    { label: '15-YEAR FIXED', val: r15 },
    { label: '5/1 ARM', val: r5 },
  ].filter((r) => r.val != null);

  return (
    <HudCard label="INTEREST RATES">
      {rates.map(({ label, val }) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.rate}>{val!.toFixed(2)}%</Text>
        </View>
      ))}
      <Text style={styles.source}>Source: Federal Reserve FRED</Text>
    </HudCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.borderSubtle}66`,
  },
  label: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.5 },
  rate: { fontFamily: Fonts.display, fontSize: 18, color: Colors.accentCyan, letterSpacing: 1 },
  source: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, marginTop: Spacing.md, textAlign: 'right' },
});
