export const Colors = {
  bgPrimary: '#0a0a0a',
  bgSecondary: '#0d1117',
  bgCard: '#111827',
  bgElevated: '#1a2234',

  accentGreen: '#00ff41',
  accentCyan: '#00d4ff',
  accentAmber: '#f59e0b',
  accentRed: '#ef4444',

  borderSubtle: '#1f2937',
  borderGlow: '#00ff4133',

  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#4b5563',
} as const;

export const Fonts = {
  display: 'Orbitron_700Bold',
  displayBold: 'Orbitron_900Black',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const gradeColor = (grade: string): string => {
  switch (grade?.toUpperCase()) {
    case 'A': return Colors.accentGreen;
    case 'B': return Colors.accentCyan;
    case 'C': return Colors.accentAmber;
    case 'D': return '#f97316';
    case 'F': return Colors.accentRed;
    default: return Colors.textMuted;
  }
};

export const scoreColor = (score: number): string => {
  if (score >= 80) return Colors.accentGreen;
  if (score >= 60) return Colors.accentCyan;
  if (score >= 40) return Colors.accentAmber;
  if (score >= 20) return '#f97316';
  return Colors.accentRed;
};

export const verdictColor = (verdict?: string): string => {
  if (!verdict) return Colors.textMuted;
  const v = verdict.toLowerCase();
  if (v.includes('strong buy')) return Colors.accentGreen;
  if (v.includes('buy')) return Colors.accentCyan;
  if (v.includes('avoid')) return Colors.accentRed;
  return Colors.accentAmber;
};
