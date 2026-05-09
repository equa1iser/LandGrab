import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '../../theme';

interface StatBadgeProps {
  label: string;
  value: string | number;
  accent?: string;
}

export function StatBadge({ label, value, accent = Colors.textPrimary }: StatBadgeProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 72,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontFamily: Fonts.monoBold,
    fontSize: 13,
  },
});
