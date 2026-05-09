import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing } from '../../theme';

interface ProGateProps {
  viewsUsed: number;
  viewsLimit: number;
}

export function ProGate({ viewsUsed, viewsLimit }: ProGateProps) {
  const router = useRouter();

  return (
    <View style={styles.overlay}>
      <Ionicons name="lock-closed" size={32} color={Colors.accentAmber} />
      <Text style={styles.title}>FREE TIER LIMIT</Text>
      <Text style={styles.sub}>
        {viewsUsed}/{viewsLimit} property views used this month
      </Text>
      <Text style={styles.desc}>
        Upgrade to Pro for unlimited property details and deal analysis.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/profile')}>
        <Text style={styles.btnText}>VIEW UPGRADE OPTIONS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    backgroundColor: `${Colors.bgPrimary}ee`,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.accentAmber,
    marginTop: Spacing.lg,
    letterSpacing: 2,
  },
  sub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    letterSpacing: 1,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.accentAmber,
    borderRadius: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  btnText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.accentAmber,
    letterSpacing: 1.5,
  },
});
