import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/lib/store/authStore';
import { useUsage } from '../../src/lib/hooks/useProperty';
import { usersApi } from '../../src/lib/api-client';
import { HudCard } from '../../src/components/ui/HudCard';
import { Colors, Fonts, Spacing } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout, updateUser } = useAuthStore();
  const { data: usage } = useUsage();

  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(user?.preferences ?? {
    notify_price_drops: true,
    notify_new_listings: false,
    alert_frequency: 'daily',
    marketing_emails: false,
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  if (isInitialized && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.gated}>
          <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.gatedTitle}>SIGN IN TO VIEW PROFILE</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login')}>
            <Text style={styles.signInText}>SIGN IN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.signInBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.accentGreen, marginTop: 8 }]} onPress={() => router.push('/auth/register')}>
            <Text style={[styles.signInText, { color: Colors.accentGreen }]}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const savePrefs = async () => {
    setSaving(true);
    try {
      const { data } = await usersApi.updatePreferences(prefs);
      updateUser({ preferences: data.preferences });
    } catch {
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError('');
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields required.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 8) { setPwError('Min 8 characters.'); return; }
    setSaving(true);
    try {
      await usersApi.changePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowPasswordForm(false);
      Alert.alert('Success', 'Password changed.');
    } catch {
      setPwError('Current password incorrect.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const viewsDisplay = usage?.is_unlimited
    ? '∞'
    : `${usage?.views_used ?? 0} / ${usage?.views_limit ?? 5}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PROFILE</Text>
        {user?.is_admin && (
          <TouchableOpacity onPress={() => router.push('/admin')}>
            <Text style={styles.adminLink}>ADMIN →</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User info */}
        <HudCard label="ACCOUNT">
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.tierRow}>
            <View style={[styles.tierBadge, { borderColor: user?.tier === 'pro' ? Colors.accentCyan : Colors.textMuted }]}>
              <Text style={[styles.tierText, { color: user?.tier === 'pro' ? Colors.accentCyan : Colors.textMuted }]}>
                {(user?.tier ?? 'FREE').toUpperCase()} TIER
              </Text>
            </View>
            <Text style={styles.memberSince}>
              Member since {user?.created_at?.slice(0, 10) ?? '—'}
            </Text>
          </View>
        </HudCard>

        {/* Usage */}
        <HudCard label="MONTHLY USAGE">
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>PROPERTY VIEWS</Text>
            <Text style={styles.usageVal}>{viewsDisplay}</Text>
          </View>
          <View style={styles.usageBar}>
            <View
              style={[
                styles.usageFill,
                {
                  width: usage?.is_unlimited ? '100%' : `${Math.min((usage?.views_used ?? 0) / (usage?.views_limit ?? 5) * 100, 100)}%`,
                  backgroundColor: usage?.is_unlimited ? Colors.accentCyan : Colors.accentGreen,
                },
              ]}
            />
          </View>
          {usage && !usage.is_unlimited && (
            <Text style={styles.resetsAt}>Resets {usage.resets_at?.slice(0, 10)}</Text>
          )}
        </HudCard>

        {/* Notification prefs */}
        <HudCard label="NOTIFICATIONS">
          {[
            { key: 'notify_price_drops', label: 'PRICE DROP ALERTS' },
            { key: 'notify_new_listings', label: 'NEW LISTINGS' },
            { key: 'marketing_emails', label: 'MARKETING EMAILS' },
          ].map(({ key, label }) => (
            <View key={key} style={styles.prefRow}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Switch
                value={(prefs as any)[key] ?? false}
                onValueChange={(v) => setPrefs((p: any) => ({ ...p, [key]: v }))}
                trackColor={{ false: Colors.borderSubtle, true: `${Colors.accentGreen}66` }}
                thumbColor={(prefs as any)[key] ? Colors.accentGreen : Colors.textMuted}
              />
            </View>
          ))}

          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>FREQUENCY</Text>
            <View style={styles.freqChips}>
              {(['immediate', 'daily', 'weekly'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqChip, prefs.alert_frequency === f && styles.freqChipActive]}
                  onPress={() => setPrefs((p: any) => ({ ...p, alert_frequency: f }))}
                >
                  <Text style={[styles.freqText, prefs.alert_frequency === f && { color: Colors.accentGreen }]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={savePrefs} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.bgPrimary} />
              : <Text style={styles.saveBtnText}>SAVE PREFERENCES</Text>}
          </TouchableOpacity>
        </HudCard>

        {/* Change password */}
        <HudCard label="SECURITY">
          <TouchableOpacity
            style={styles.changePasswordToggle}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Text style={styles.changePasswordText}>CHANGE PASSWORD</Text>
            <Ionicons
              name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={styles.passwordForm}>
              {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
              {[
                { label: 'CURRENT PASSWORD', val: currentPw, setter: setCurrentPw },
                { label: 'NEW PASSWORD', val: newPw, setter: setNewPw },
                { label: 'CONFIRM NEW PASSWORD', val: confirmPw, setter: setConfirmPw },
              ].map(({ label, val, setter }) => (
                <View key={label}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={val}
                    onChangeText={setter}
                    secureTextEntry
                    placeholderTextColor={Colors.textMuted}
                    placeholder="••••••••"
                    selectionColor={Colors.accentGreen}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={changePassword} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color={Colors.bgPrimary} />
                  : <Text style={styles.saveBtnText}>UPDATE PASSWORD</Text>}
              </TouchableOpacity>
            </View>
          )}
        </HudCard>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color={Colors.accentRed} />
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  gated: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  gatedTitle: { fontFamily: Fonts.display, fontSize: 14, color: Colors.textMuted, letterSpacing: 2, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  signInBtn: { backgroundColor: Colors.accentGreen, borderRadius: 6, paddingVertical: 12, paddingHorizontal: Spacing.xxl, alignItems: 'center', width: '100%', marginBottom: 8 },
  signInText: { fontFamily: Fonts.monoBold, fontSize: 12, color: Colors.bgPrimary, letterSpacing: 2 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  title: { fontFamily: Fonts.display, fontSize: 16, color: Colors.accentGreen, letterSpacing: 2 },
  adminLink: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.accentCyan, letterSpacing: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  userName: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.textPrimary, marginBottom: 4 },
  email: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tierBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  tierText: { fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1 },
  memberSince: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  usageLabel: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  usageVal: { fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.accentGreen },
  usageBar: { height: 4, backgroundColor: Colors.borderSubtle, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
  usageFill: { height: 4, borderRadius: 2 },
  resetsAt: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, textAlign: 'right' },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: `${Colors.borderSubtle}66`,
  },
  prefLabel: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textSecondary, letterSpacing: 1 },
  freqChips: { flexDirection: 'row', gap: 4 },
  freqChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: Colors.borderSubtle },
  freqChipActive: { borderColor: Colors.accentGreen },
  freqText: { fontFamily: Fonts.mono, fontSize: 8, color: Colors.textMuted, letterSpacing: 0.5 },
  saveBtn: { backgroundColor: Colors.accentGreen, borderRadius: 6, paddingVertical: 10, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.bgPrimary, letterSpacing: 1.5 },
  changePasswordToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changePasswordText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textSecondary, letterSpacing: 1 },
  passwordForm: { marginTop: Spacing.md },
  pwError: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.accentRed, marginBottom: Spacing.sm },
  fieldLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: 6, paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontFamily: Fonts.mono, fontSize: 13, color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.accentRed,
    borderRadius: 6, paddingVertical: 14, marginTop: Spacing.sm,
  },
  logoutText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.accentRed, letterSpacing: 1.5 },
});
