import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../src/lib/api-client';
import { useAuthStore } from '../src/lib/store/authStore';
import { HudCard } from '../src/components/ui/HudCard';
import { Colors, Fonts, Spacing } from '../src/theme';

export default function AdminScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminApi.overview().then((r) => r.data),
    enabled: user?.is_admin,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => adminApi.users(page).then((r) => r.data),
    enabled: user?.is_admin,
  });

  if (!user?.is_admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={40} color={Colors.accentRed} />
          <Text style={styles.noAccess}>ADMIN ACCESS REQUIRED</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.noAccess, { color: Colors.accentGreen, fontSize: 12, marginTop: 12 }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleToggleTier = (userId: string, currentTier: string) => {
    const newTier = currentTier === 'pro' ? 'free' : 'pro';
    Alert.alert('Change Tier', `Switch user to ${newTier.toUpperCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await adminApi.updateUser(userId, { tier: newTier });
          } catch {
            Alert.alert('Error', 'Could not update user.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>ADMIN DASHBOARD</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview stats */}
        {ovLoading ? (
          <ActivityIndicator color={Colors.accentGreen} style={{ marginVertical: 20 }} />
        ) : overview ? (
          <>
            <HudCard label="USERS" glow="green">
              <View style={styles.statsGrid}>
                {[
                  { label: 'TOTAL', val: overview.users?.total },
                  { label: 'ACTIVE', val: overview.users?.active },
                  { label: 'PRO', val: overview.users?.pro },
                  { label: 'NEW 30D', val: overview.users?.new_30d },
                ].map(({ label, val }) => (
                  <View key={label} style={styles.statItem}>
                    <Text style={styles.statVal}>{val ?? '—'}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </HudCard>

            <HudCard label="PROPERTIES & API" glow="cyan">
              <View style={styles.apiRow}>
                <Text style={styles.apiKey}>CACHED PROPERTIES</Text>
                <Text style={styles.apiVal}>{overview.properties?.total_cached ?? '—'}</Text>
              </View>
              <View style={styles.apiRow}>
                <Text style={styles.apiKey}>RENTCAST CALLS (MTH)</Text>
                <Text style={[styles.apiVal, { color: Colors.accentAmber }]}>
                  {overview.api_usage?.rentcast_calls_this_month ?? 0} / {overview.api_usage?.rentcast_monthly_quota ?? 50}
                </Text>
              </View>
            </HudCard>
          </>
        ) : null}

        {/* User list */}
        <Text style={styles.sectionTitle}>USER MANAGEMENT</Text>
        {usersLoading && <ActivityIndicator color={Colors.accentGreen} style={{ marginVertical: 12 }} />}

        {(usersData?.items ?? []).map((u: any) => (
          <View key={u.id} style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{u.full_name}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
              <View style={styles.userMeta}>
                <Text style={[styles.metaChip, { color: u.tier === 'pro' ? Colors.accentCyan : Colors.textMuted, borderColor: u.tier === 'pro' ? Colors.accentCyan : Colors.textMuted }]}>
                  {u.tier?.toUpperCase()}
                </Text>
                {u.is_admin && (
                  <Text style={[styles.metaChip, { color: Colors.accentAmber, borderColor: Colors.accentAmber }]}>ADMIN</Text>
                )}
                <Text style={styles.views}>{u.views_used ?? 0} views</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.tierBtn, { borderColor: u.tier === 'pro' ? Colors.accentRed : Colors.accentGreen }]}
              onPress={() => handleToggleTier(u.id, u.tier)}
            >
              <Text style={[styles.tierBtnText, { color: u.tier === 'pro' ? Colors.accentRed : Colors.accentGreen }]}>
                {u.tier === 'pro' ? '→ FREE' : '→ PRO'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Pagination */}
        {usersData && usersData.pages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}
              onPress={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.pageText}>{page} / {usersData.pages}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, page >= usersData.pages && { opacity: 0.4 }]}
              onPress={() => setPage(Math.min(usersData.pages, page + 1))}
              disabled={page >= usersData.pages}
            >
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noAccess: { fontFamily: Fonts.display, fontSize: 14, color: Colors.accentRed, letterSpacing: 2 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  title: { fontFamily: Fonts.display, fontSize: 14, color: Colors.accentGreen, letterSpacing: 2 },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { fontFamily: Fonts.display, fontSize: 24, color: Colors.accentGreen },
  statLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  apiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: `${Colors.borderSubtle}66` },
  apiKey: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted },
  apiVal: { fontFamily: Fonts.monoBold, fontSize: 12, color: Colors.textPrimary },
  sectionTitle: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, backgroundColor: Colors.bgCard,
    borderRadius: 6, borderWidth: 1, borderColor: Colors.borderSubtle, marginBottom: Spacing.sm,
  },
  userName: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  userEmail: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, marginBottom: 4 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaChip: { fontFamily: Fonts.mono, fontSize: 8, letterSpacing: 0.5, borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  views: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted },
  tierBtn: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6 },
  tierBtnText: { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.5 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.md },
  pageBtn: { width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  pageText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textSecondary },
});
