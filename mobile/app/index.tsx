import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/lib/store/authStore';
import { Colors } from '../src/theme';

export default function Index() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accentGreen} size="large" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/search' : '/auth/login'} />;
}
