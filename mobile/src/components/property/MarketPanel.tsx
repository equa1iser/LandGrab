import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HudCard } from '../ui/HudCard';
import { Colors, Fonts, Spacing } from '../../theme';
import type { MarketSummary } from '../../types';

function fmtPct(n?: number) {
  if (n == null) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtPrice(n?: number) {
  if (n == null) return '—';
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${n.toLocaleString()}`;
}

interface Props { market?: MarketSummary; isLand?: boolean }

export function MarketPanel({ market, isLand }: Props) {
  if (!market) {
    return (
      <HudCard label="MARKET CONDITIONS">
        <Text style={styles.empty}>Market data unavailable</Text>
      </HudCard>
    );
  }

  const rows = [
    { key: 'MEDIAN PRICE', val: fmtPrice(market.median_price) },
    ...(!isLand ? [{ key: 'PRICE / SQFT', val: market.price_per_sqft != null ? `$${market.price_per_sqft.toFixed(0)}` : '—' }] : []),
    { key: 'MEDIAN DOM', val: market.median_days_on_market != null ? `${Math.round(market.median_days_on_market)} days` : '—' },
    { key: 'MONTHS SUPPLY', val: market.months_of_supply != null ? `${market.months_of_supply.toFixed(1)} mo` : '—' },
    { key: '30-DAY VOLUME', val: market.sales_volume_30d != null ? `${market.sales_volume_30d} sales` : '—' },
    { key: 'YOY CHANGE', val: fmtPct(market.yoy_price_change_pct), color: market.yoy_price_change_pct != null ? (market.yoy_price_change_pct > 0 ? Colors.accentGreen : Colors.accentRed) : undefined },
    { key: 'MOM CHANGE', val: fmtPct(market.mom_price_change_pct), color: market.mom_price_change_pct != null ? (market.mom_price_change_pct > 0 ? Colors.accentGreen : Colors.accentRed) : undefined },
  ];

  return (
    <HudCard label="MARKET CONDITIONS" glow="cyan">
      {rows.map(({ key, val, color }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.key}>{key}</Text>
          <Text style={[styles.val, color ? { color } : {}]}>{val}</Text>
        </View>
      ))}
    </HudCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.borderSubtle}66`,
  },
  key: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  val: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.textPrimary },
});
