import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { scoreColor, gradeColor, Colors, Fonts } from '../../theme';

interface DealScoreMeterProps {
  score: number;
  grade: string;
  size?: number;
}

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToXY(cx, cy, r, startAngle);
  const end = polarToXY(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function DealScoreMeter({ score, grade, size = 140 }: DealScoreMeterProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeWidth = size * 0.065;
  const color = scoreColor(score);
  const badgeColor = gradeColor(grade);

  // Arc spans 240 degrees (from -120 to 120 around bottom)
  const startAngle = 150;
  const endAngle = 150 + (score / 100) * 240;

  const trackPath = describeArc(cx, cy, r, 150, 390);
  const scorePath = score > 0 ? describeArc(cx, cy, r, 150, endAngle) : null;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Path
          d={trackPath}
          stroke={Colors.borderSubtle}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {/* Score arc */}
        {scorePath && (
          <Path
            d={scorePath}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
      {/* Score number centred in SVG */}
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[styles.score, { color }]}>{score}</Text>
        <View style={[styles.gradeBadge, { borderColor: `${badgeColor}88`, backgroundColor: `${badgeColor}22` }]}>
          <Text style={[styles.grade, { color: badgeColor }]}>{grade}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  score: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700',
  },
  gradeBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  grade: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
});
