import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, scoreColor } from '../../theme';
import { ScoreBadge } from '../ui/ScoreBadge';
import type { PropertySummary } from '../../types';

function fmt(n?: number) {
  if (n == null) return '—';
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n}`;
}

export function PropertyCard({ property }: { property: PropertySummary }) {
  const router = useRouter();
  const isLand = property.property_type?.toLowerCase() === 'land';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/property/${property.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.address} numberOfLines={1}>
            {property.address_line1}
          </Text>
          <Text style={styles.location}>
            {property.city}, {property.state} {property.zip_code}
          </Text>
          <View style={styles.specs}>
            {!isLand && property.beds != null && (
              <View style={styles.spec}>
                <Ionicons name="bed-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.specText}>{property.beds}</Text>
              </View>
            )}
            {!isLand && property.baths != null && (
              <View style={styles.spec}>
                <Ionicons name="water-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.specText}>{property.baths}</Text>
              </View>
            )}
            {!isLand && property.sqft != null && (
              <View style={styles.spec}>
                <Ionicons name="resize-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.specText}>{property.sqft.toLocaleString()} sf</Text>
              </View>
            )}
            {isLand && property.lot_size_acres != null && (
              <View style={styles.spec}>
                <Ionicons name="map-outline" size={11} color={Colors.accentGreen} />
                <Text style={[styles.specText, { color: Colors.accentGreen }]}>
                  {property.lot_size_acres.toFixed(2)} ac
                </Text>
              </View>
            )}
            {property.days_on_market != null && (
              <View style={styles.spec}>
                <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.specText}>{property.days_on_market}d</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.price}>{fmt(property.current_price)}</Text>
          {property.deal_score != null && (
            <ScoreBadge
              grade={
                property.deal_score >= 80 ? 'A'
                : property.deal_score >= 60 ? 'B'
                : property.deal_score >= 40 ? 'C'
                : property.deal_score >= 20 ? 'D' : 'F'
              }
              size="sm"
            />
          )}
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, marginRight: Spacing.sm },
  address: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  location: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  specText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  right: { alignItems: 'center', gap: 4 },
  price: {
    fontFamily: Fonts.monoBold,
    fontSize: 15,
    color: Colors.accentGreen,
  },
});
