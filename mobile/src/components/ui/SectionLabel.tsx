import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../../theme';

interface SectionLabelProps {
  children: string;
  color?: string;
}

export function SectionLabel({ children, color = Colors.textMuted }: SectionLabelProps) {
  return <Text style={[styles.label, { color }]}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },
});
