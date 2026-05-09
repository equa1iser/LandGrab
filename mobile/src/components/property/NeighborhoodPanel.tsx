import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HudCard } from '../ui/HudCard';
import { StatBadge } from '../ui/StatBadge';
import { Colors, Fonts, Spacing } from '../../theme';
import type { NeighborhoodSummary } from '../../types';

function fmt(n?: number, prefix = '', suffix = '') {
  if (n == null) return '—';
  return `${prefix}${n.toLocaleString()}${suffix}`;
}

interface Props { neighborhood?: NeighborhoodSummary }

export function NeighborhoodPanel({ neighborhood }: Props) {
  if (!neighborhood) {
    return (
      <HudCard label="NEIGHBORHOOD">
        <Text style={styles.empty}>Neighborhood data unavailable</Text>
      </HudCard>
    );
  }

  return (
    <HudCard label="NEIGHBORHOOD">
      <Text style={styles.sectionLabel}>LIVABILITY</Text>
      <View style={styles.badges}>
        <StatBadge label="WALK" value={neighborhood.walk_score != null ? `${neighborhood.walk_score}/100` : '—'} accent={Colors.accentCyan} />
        <StatBadge label="TRANSIT" value={neighborhood.transit_score != null ? `${neighborhood.transit_score}/100` : '—'} accent={Colors.accentCyan} />
        <StatBadge label="BIKE" value={neighborhood.bike_score != null ? `${neighborhood.bike_score}/100` : '—'} accent={Colors.accentCyan} />
        {neighborhood.school_rating_avg != null && (
          <StatBadge label="SCHOOLS" value={`${neighborhood.school_rating_avg.toFixed(1)}/10`} accent={Colors.accentAmber} />
        )}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>DEMOGRAPHICS</Text>
      <View style={styles.demos}>
        <View style={styles.demoRow}>
          <Text style={styles.demoKey}>MEDIAN INCOME</Text>
          <Text style={styles.demoVal}>{fmt(neighborhood.median_household_income, '$')}</Text>
        </View>
        <View style={styles.demoRow}>
          <Text style={styles.demoKey}>POPULATION</Text>
          <Text style={styles.demoVal}>{fmt(neighborhood.population)}</Text>
        </View>
        {neighborhood.population_growth_pct != null && (
          <View style={styles.demoRow}>
            <Text style={styles.demoKey}>POP. GROWTH</Text>
            <Text style={[styles.demoVal, { color: neighborhood.population_growth_pct > 0 ? Colors.accentGreen : Colors.accentRed }]}>
              {neighborhood.population_growth_pct > 0 ? '+' : ''}{neighborhood.population_growth_pct.toFixed(1)}%
            </Text>
          </View>
        )}
        {neighborhood.owner_occupied_pct != null && (
          <View style={styles.demoRow}>
            <Text style={styles.demoKey}>OWNER-OCCUPIED</Text>
            <Text style={styles.demoVal}>{neighborhood.owner_occupied_pct.toFixed(1)}%</Text>
          </View>
        )}
      </View>
    </HudCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  sectionLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  demos: { gap: Spacing.xs },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  demoKey: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  demoVal: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.textPrimary },
});
