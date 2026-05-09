import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { HudCard } from '../ui/HudCard';
import { Colors, Fonts, Spacing } from '../../theme';
import type { PriceEvent } from '../../types';

const W = Dimensions.get('window').width - 64; // account for card padding

function fmtPrice(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
}

interface Props { events: PriceEvent[] }

export function PriceHistoryChart({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <HudCard label="PRICE HISTORY" glow="cyan">
        <Text style={styles.empty}>No price history available</Text>
      </HudCard>
    );
  }

  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
  const data = sorted.map((e) => ({
    value: e.price,
    label: e.event_date.slice(0, 7),
    dataPointText: fmtPrice(e.price),
  }));

  return (
    <HudCard label="PRICE HISTORY" glow="cyan">
      <LineChart
        data={data}
        width={W}
        height={160}
        color={Colors.accentCyan}
        thickness={2}
        dataPointsColor={Colors.accentCyan}
        dataPointsRadius={4}
        startFillColor={`${Colors.accentCyan}33`}
        endFillColor={`${Colors.accentCyan}00`}
        areaChart
        hideYAxisText={false}
        yAxisColor={Colors.borderSubtle}
        xAxisColor={Colors.borderSubtle}
        yAxisTextStyle={{ color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.mono }}
        xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 8, fontFamily: Fonts.mono }}
        backgroundColor={Colors.bgCard}
        noOfSections={4}
        hideRules
        curved
        showVerticalLines={false}
      />

      {/* Event list */}
      <View style={styles.events}>
        {sorted.slice(-5).reverse().map((e) => (
          <View key={e.id} style={styles.eventRow}>
            <View style={[styles.dot, { backgroundColor: Colors.accentCyan }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eventType}>{e.event_type.replace(/_/g, ' ')}</Text>
              <Text style={styles.eventDate}>{e.event_date}</Text>
            </View>
            <Text style={styles.eventPrice}>{fmtPrice(e.price)}</Text>
          </View>
        ))}
      </View>
    </HudCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  events: { marginTop: Spacing.lg, gap: Spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  eventType: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.textPrimary, textTransform: 'capitalize' },
  eventDate: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted },
  eventPrice: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.accentCyan },
});
