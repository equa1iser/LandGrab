import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useComps } from '../../lib/hooks/useProperty';
import { HudCard } from '../ui/HudCard';
import { Colors, Fonts, Spacing } from '../../theme';

const DISTANCES = [1.5, 5, 10, 20];

function fmtPrice(n?: number) {
  if (n == null) return '—';
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
}

interface Props { propertyId: string; isLand: boolean }

export function CompsPanel({ propertyId, isLand }: Props) {
  const [dist, setDist] = useState(20);
  const { data: comps, isLoading } = useComps(propertyId, dist);

  const label = isLand ? 'COMPARABLE LAND LISTINGS' : 'COMPARABLE SALES';

  return (
    <HudCard label={label} glow="amber">
      {/* Distance filter */}
      <View style={styles.filters}>
        {DISTANCES.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, dist === d && styles.chipActive]}
            onPress={() => setDist(d)}
          >
            <Text style={[styles.chipText, dist === d && styles.chipTextActive]}>{d}mi</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && <ActivityIndicator color={Colors.accentAmber} style={{ marginVertical: 16 }} />}

      {!isLoading && (!comps || comps.length === 0) && (
        <Text style={styles.empty}>No comparables found within {dist} miles</Text>
      )}

      {(comps ?? []).map((c: import('../../types').ComparableSale, i: number) => (
        <View key={i} style={styles.comp}>
          <View style={{ flex: 1 }}>
            <Text style={styles.address} numberOfLines={1}>{c.address}</Text>
            <Text style={styles.location}>{c.city}, {c.state}</Text>
            <View style={styles.specs}>
              {isLand && c.lot_size_acres != null && (
                <Text style={styles.spec}>{c.lot_size_acres.toFixed(2)} ac</Text>
              )}
              {!isLand && c.sqft != null && <Text style={styles.spec}>{c.sqft.toLocaleString()} sf</Text>}
              {!isLand && c.beds != null && <Text style={styles.spec}>{c.beds} bd</Text>}
              {c.distance_miles != null && (
                <Text style={[styles.spec, { color: Colors.textMuted }]}>{c.distance_miles.toFixed(1)} mi</Text>
              )}
            </View>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{fmtPrice(c.price)}</Text>
            {isLand && c.lot_size_acres && c.price && (
              <Text style={styles.perUnit}>{fmtPrice(c.price / c.lot_size_acres)}/ac</Text>
            )}
            {!isLand && c.price_per_sqft != null && (
              <Text style={styles.perUnit}>${c.price_per_sqft.toFixed(0)}/sf</Text>
            )}
            <Text style={styles.date}>{c.sale_date?.slice(0, 7)}</Text>
          </View>
        </View>
      ))}
    </HudCard>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: Colors.borderSubtle },
  chipActive: { borderColor: Colors.accentAmber, backgroundColor: `${Colors.accentAmber}18` },
  chipText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accentAmber },
  empty: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  comp: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  address: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  location: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, marginBottom: 4 },
  specs: { flexDirection: 'row', gap: Spacing.sm },
  spec: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textSecondary },
  priceBlock: { alignItems: 'flex-end', minWidth: 70 },
  price: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.accentAmber },
  perUnit: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted },
  date: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, marginTop: 2 },
});
