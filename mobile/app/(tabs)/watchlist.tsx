import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSavedProperties, useUnsaveProperty } from '../../src/lib/hooks/useProperty';
import { useAuthStore } from '../../src/lib/store/authStore';
import { PropertyCard } from '../../src/components/search/PropertyCard';
import { Colors, Fonts, Spacing } from '../../src/theme';

export default function WatchlistScreen() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { data: saved, isLoading } = useSavedProperties();
  const { mutate: unsave } = useUnsaveProperty();

  if (isInitialized && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.gated}>
          <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.gatedTitle}>SIGN IN TO VIEW WATCHLIST</Text>
          <Text style={styles.gatedSub}>Save properties to track them over time</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login')}>
            <Text style={styles.signInText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleUnsave = (savedId: string, address: string) => {
    Alert.alert('Remove Property', `Remove ${address} from watchlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => unsave(savedId) },
    ]);
  };

  const properties = (saved ?? []).map((s: any) => s.property).filter(Boolean);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>WATCHLIST</Text>
        {saved && <Text style={styles.count}>{saved.length} saved</Text>}
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accentGreen} />
        </View>
      )}

      {!isLoading && saved?.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>NO SAVED PROPERTIES</Text>
          <Text style={styles.emptySub}>Tap the heart icon on any property to save it</Text>
          <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.searchText}>START SEARCHING</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={saved ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: any) => (
          <View style={styles.savedItem}>
            {item.property && <PropertyCard property={item.property} />}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleUnsave(item.id, item.property?.address_line1 ?? 'this property')}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.accentRed} />
              <Text style={styles.removeText}>REMOVE</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  title: { fontFamily: Fonts.display, fontSize: 16, color: Colors.accentGreen, letterSpacing: 2 },
  count: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 13, color: Colors.textMuted, letterSpacing: 2, marginTop: Spacing.lg },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  searchBtn: {
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.accentGreen,
    borderRadius: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  searchText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.accentGreen, letterSpacing: 1.5 },
  gated: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  gatedTitle: { fontFamily: Fonts.display, fontSize: 14, color: Colors.textMuted, letterSpacing: 2, marginTop: Spacing.lg },
  gatedSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  signInBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.accentGreen,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xxl,
  },
  signInText: { fontFamily: Fonts.monoBold, fontSize: 12, color: Colors.bgPrimary, letterSpacing: 2 },
  list: { padding: Spacing.lg },
  savedItem: { marginBottom: Spacing.xs },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    alignSelf: 'flex-end',
  },
  removeText: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.accentRed, letterSpacing: 1 },
});
