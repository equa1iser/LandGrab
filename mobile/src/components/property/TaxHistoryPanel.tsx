import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HudCard } from '../ui/HudCard';
import { Colors, Fonts, Spacing } from '../../theme';
import type { TaxRecord } from '../../types';

interface Props { records: TaxRecord[] }

export function TaxHistoryPanel({ records }: Props) {
  if (!records || records.length === 0) {
    return (
      <HudCard label="TAX HISTORY">
        <Text style={styles.empty}>No tax records available</Text>
      </HudCard>
    );
  }

  const sorted = [...records].sort((a, b) => b.year - a.year);

  return (
    <HudCard label="TAX HISTORY">
      <View style={styles.headerRow}>
        <Text style={styles.th}>YEAR</Text>
        <Text style={styles.th}>ASSESSED</Text>
        <Text style={[styles.th, { textAlign: 'right' }]}>TAX</Text>
      </View>
      {sorted.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={styles.year}>{r.year}</Text>
          <Text style={styles.cell}>
            {r.assessed_value != null ? `$${r.assessed_value.toLocaleString()}` : '—'}
          </Text>
          <Text style={[styles.cell, { textAlign: 'right', color: Colors.accentAmber }]}>
            {r.tax_amount != null ? `$${r.tax_amount.toLocaleString()}` : '—'}
          </Text>
        </View>
      ))}
    </HudCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: Spacing.sm,
  },
  th: { flex: 1, fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.borderSubtle}66`,
  },
  year: { flex: 1, fontFamily: Fonts.monoBold, fontSize: 12, color: Colors.textPrimary },
  cell: { flex: 1, fontFamily: Fonts.mono, fontSize: 12, color: Colors.textSecondary },
});
