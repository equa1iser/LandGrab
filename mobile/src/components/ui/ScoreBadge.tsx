import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { gradeColor, Fonts } from '../../theme';

interface ScoreBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ grade, size = 'md' }: ScoreBadgeProps) {
  const color = gradeColor(grade);
  const dim = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 20 : 14;

  return (
    <View
      style={[
        styles.badge,
        { width: dim, height: dim, borderRadius: dim / 2, borderColor: color, backgroundColor: `${color}22` },
      ]}
    >
      <Text style={[styles.text, { color, fontSize }]}>{grade?.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Fonts.display,
    fontWeight: '700',
  },
});
