import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Fonts, Spacing } from '../../theme';

type GlowVariant = 'green' | 'cyan' | 'amber' | 'none';

interface HudCardProps {
  children: React.ReactNode;
  label?: string;
  glow?: GlowVariant;
  style?: ViewStyle;
}

const glowColors: Record<GlowVariant, string> = {
  green: Colors.accentGreen,
  cyan: Colors.accentCyan,
  amber: Colors.accentAmber,
  none: Colors.borderSubtle,
};

export function HudCard({ children, label, glow = 'none', style }: HudCardProps) {
  const borderColor = glow !== 'none' ? `${glowColors[glow]}44` : Colors.borderSubtle;

  return (
    <View style={[styles.card, { borderColor }, style]}>
      {label && (
        <View style={styles.labelWrap}>
          <Text style={[styles.label, { color: glowColors[glow === 'none' ? 'green' : glow] }]}>
            {label.toUpperCase()}
          </Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  labelWrap: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
  },
});
