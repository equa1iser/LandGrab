import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../src/lib/api-client';
import { useAuthStore } from '../../src/lib/store/authStore';
import { Colors, Fonts, Spacing } from '../../src/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!fullName || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register(email.trim(), password, fullName.trim());
      await login(data);
      router.replace('/(tabs)/search');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail[0]?.msg ?? 'Validation error.');
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoText}>LAND</Text>
            <Text style={[styles.logoText, { color: Colors.accentGreen }]}>GRAB</Text>
          </View>
          <Text style={styles.tagline}>REAL ESTATE INTELLIGENCE</Text>

          <View style={styles.form}>
            <Text style={styles.formTitle}>CREATE ACCOUNT</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {[
              { label: 'FULL NAME', value: fullName, setter: setFullName, placeholder: 'John Smith', secure: false, keyboard: 'default' as const },
              { label: 'EMAIL', value: email, setter: setEmail, placeholder: 'your@email.com', secure: false, keyboard: 'email-address' as const },
              { label: 'PASSWORD', value: password, setter: setPassword, placeholder: '••••••••', secure: true, keyboard: 'default' as const },
              { label: 'CONFIRM PASSWORD', value: confirmPassword, setter: setConfirmPassword, placeholder: '••••••••', secure: true, keyboard: 'default' as const },
            ].map(({ label, value, setter, placeholder, secure, keyboard }) => (
              <View key={label}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setter}
                  secureTextEntry={secure}
                  autoCapitalize={secure || label === 'EMAIL' ? 'none' : 'words'}
                  keyboardType={keyboard}
                  placeholderTextColor={Colors.textMuted}
                  placeholder={placeholder}
                  selectionColor={Colors.accentGreen}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color={Colors.bgPrimary} />
                : <Text style={styles.btnPrimaryText}>CREATE ACCOUNT</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/auth/login">
                <Text style={[styles.footerText, { color: Colors.accentGreen }]}>Sign In</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  container: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },
  logo: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.sm },
  logoText: { fontFamily: Fonts.display, fontSize: 36, color: Colors.textPrimary, letterSpacing: 4 },
  tagline: {
    fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted,
    letterSpacing: 3, textAlign: 'center', marginBottom: Spacing.xxxl,
  },
  form: {
    backgroundColor: Colors.bgCard, borderWidth: 1,
    borderColor: Colors.borderSubtle, borderRadius: 8, padding: Spacing.xl,
  },
  formTitle: {
    fontFamily: Fonts.display, fontSize: 16,
    color: Colors.accentGreen, letterSpacing: 2, marginBottom: Spacing.xl,
  },
  error: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.accentRed, marginBottom: Spacing.md },
  fieldLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: 6, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: Fonts.mono, fontSize: 13, color: Colors.textPrimary, marginBottom: Spacing.lg,
  },
  btnPrimary: {
    backgroundColor: Colors.accentGreen, borderRadius: 6,
    paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.xl,
  },
  btnPrimaryText: { fontFamily: Fonts.monoBold, fontSize: 13, color: Colors.bgPrimary, letterSpacing: 2 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
});
