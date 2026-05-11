import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { authApi } from '../../src/lib/api-client';
import { useAuthStore } from '../../src/lib/store/authStore';
import { Colors, Fonts, Spacing } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hooks must be called unconditionally — use placeholder when not configured
  // so the hook doesn't throw. Button is hidden when clientId is absent.
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || null;
  const placeholder = 'not-configured';
  const [_request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleClientId ?? placeholder,
    androidClientId: googleClientId ?? placeholder,
    webClientId: googleClientId ?? placeholder,
  });

  // Handle Google sign-in response
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const { data } = await authApi.google(idToken);
      await login(data);
      router.replace('/(tabs)/search');
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(email.trim(), password);
      await login(data);
      router.replace('/(tabs)/search');
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Invalid credentials.';
      setError(typeof msg === 'string' ? msg : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logo}>
            <Text style={styles.logoText}>LAND</Text>
            <Text style={[styles.logoText, { color: Colors.accentGreen }]}>GRAB</Text>
          </View>
          <Text style={styles.tagline}>REAL ESTATE INTELLIGENCE</Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>SIGN IN</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholderTextColor={Colors.textMuted}
              placeholder="your@email.com"
              selectionColor={Colors.accentGreen}
            />

            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={Colors.textMuted}
              placeholder="••••••••"
              selectionColor={Colors.accentGreen}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color={Colors.bgPrimary} />
                : <Text style={styles.btnPrimaryText}>SIGN IN</Text>}
            </TouchableOpacity>

            {googleClientId && (
              <>
                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.btnGoogle} onPress={() => promptAsync()} disabled={loading}>
                  <Text style={styles.btnGoogleText}>CONTINUE WITH GOOGLE</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/auth/register">
                <Text style={[styles.footerText, { color: Colors.accentGreen }]}>Register</Text>
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
  logoText: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  form: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    padding: Spacing.xl,
  },
  formTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.accentGreen,
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  error: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.accentRed,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  btnPrimary: {
    backgroundColor: Colors.accentGreen,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  btnPrimaryText: {
    fontFamily: Fonts.monoBold,
    fontSize: 13,
    color: Colors.bgPrimary,
    letterSpacing: 2,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  dividerText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
  },
  btnGoogle: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  btnGoogleText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
