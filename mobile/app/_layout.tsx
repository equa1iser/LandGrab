import { useEffect, useRef } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../src/lib/store/authStore';
import { Colors } from '../src/theme';
import {
  initTelemetry,
  installGlobalErrorHandler,
  getTracer,
  SpanStatusCode,
} from '../src/lib/telemetry';
import type { Span } from '../src/lib/telemetry';

// Initialize before any component mounts so the tracer is ready
// when the first API call (loadUser) fires via the Axios interceptor
initTelemetry();
installGlobalErrorHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function useNavigationTracing() {
  const pathname = usePathname();
  const activeSpan = useRef<Span | null>(null);

  useEffect(() => {
    activeSpan.current?.setStatus({ code: SpanStatusCode.OK });
    activeSpan.current?.end();
    activeSpan.current = getTracer().startSpan(`navigation ${pathname}`, {
      attributes: { 'screen.path': pathname },
    });
    return () => {
      activeSpan.current?.end();
      activeSpan.current = null;
    };
  }, [pathname]);
}

export default function RootLayout() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  useNavigationTracing();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={Colors.bgPrimary} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgPrimary } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="property/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
});
