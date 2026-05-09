import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HudCard } from '../ui/HudCard';
import { ScoreBadge } from '../ui/ScoreBadge';
import { Colors, Fonts, Spacing, gradeColor } from '../../theme';
import type { NeighborhoodSummary } from '../../types';

const NATIONAL_VIOLENT = 370;
const NATIONAL_PROPERTY = 2100;

function RateBar({ label, value, national, color }: { label: string; value?: number; national: number; color: string }) {
  if (value == null) return null;
  const pct = Math.min((value / (national * 2)) * 100, 100);
  const natPct = Math.min((national / (national * 2)) * 100, 100);
  return (
    <View style={styles.rateRow}>
      <Text style={styles.rateLabel}>{label}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        {/* National average marker */}
        <View style={[styles.natMark, { left: `${natPct}%` }]} />
      </View>
      <Text style={[styles.rateVal, { color }]}>{value.toFixed(0)}</Text>
    </View>
  );
}

interface Props { neighborhood?: NeighborhoodSummary }

export function CrimePanel({ neighborhood }: Props) {
  if (!neighborhood?.crime_grade) {
    return (
      <HudCard label="CRIME & SAFETY">
        <Text style={styles.unavail}>Crime data unavailable for this area</Text>
      </HudCard>
    );
  }

  const { crime_grade, crime_index, violent_rate_per_100k, property_rate_per_100k } = neighborhood;
  const gc = gradeColor(crime_grade);

  return (
    <HudCard label="CRIME & SAFETY">
      <View style={styles.header}>
        <View>
          <Text style={styles.gradeLabel}>CRIME GRADE</Text>
          <ScoreBadge grade={crime_grade} size="lg" />
        </View>
        {crime_index != null && (
          <View style={styles.indexBlock}>
            <Text style={styles.indexLabel}>CRIME INDEX</Text>
            <Text style={[styles.indexVal, { color: gc }]}>{crime_index.toFixed(0)}</Text>
            <Text style={styles.indexSub}>(0 = safest)</Text>
          </View>
        )}
      </View>

      <Text style={styles.ratesTitle}>RATES PER 100K RESIDENTS</Text>
      <RateBar
        label="VIOLENT"
        value={violent_rate_per_100k}
        national={NATIONAL_VIOLENT}
        color={gradeColor(
          (violent_rate_per_100k ?? 0) < NATIONAL_VIOLENT * 0.6 ? 'A'
          : (violent_rate_per_100k ?? 0) < NATIONAL_VIOLENT ? 'B'
          : (violent_rate_per_100k ?? 0) < NATIONAL_VIOLENT * 1.5 ? 'C' : 'F'
        )}
      />
      <RateBar
        label="PROPERTY"
        value={property_rate_per_100k}
        national={NATIONAL_PROPERTY}
        color={gradeColor(
          (property_rate_per_100k ?? 0) < NATIONAL_PROPERTY * 0.6 ? 'A'
          : (property_rate_per_100k ?? 0) < NATIONAL_PROPERTY ? 'B'
          : (property_rate_per_100k ?? 0) < NATIONAL_PROPERTY * 1.5 ? 'C' : 'F'
        )}
      />

      <Text style={styles.note}>
        <Text style={{ color: Colors.textMuted }}>— </Text>
        National avg: violent {NATIONAL_VIOLENT}/100k · property {NATIONAL_PROPERTY}/100k
      </Text>
    </HudCard>
  );
}

const styles = StyleSheet.create({
  unavail: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxl, marginBottom: Spacing.xl },
  gradeLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 6 },
  indexBlock: { flex: 1 },
  indexLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 4 },
  indexVal: { fontFamily: Fonts.display, fontSize: 28, fontWeight: '700' },
  indexSub: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted },
  ratesTitle: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.md },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  rateLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, width: 54, letterSpacing: 0.5 },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: { height: 6, borderRadius: 3 },
  natMark: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 12,
    backgroundColor: Colors.textMuted,
    borderRadius: 1,
  },
  rateVal: { fontFamily: Fonts.mono, fontSize: 11, width: 40, textAlign: 'right' },
  note: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, marginTop: Spacing.md, letterSpacing: 0.3 },
});
