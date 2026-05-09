import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearch } from '../../src/lib/hooks/useProperty';
import { PropertyMapView } from '../../src/components/map/PropertyMapView';
import { Colors, Fonts } from '../../src/theme';

export default function MapScreen() {
  // Load a broad set of properties for the map view
  const { data: properties, isLoading } = useSearch({ limit: 50 }, true);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PROPERTY MAP</Text>
        {isLoading && <ActivityIndicator size="small" color={Colors.accentGreen} />}
        {properties && (
          <Text style={styles.count}>{properties.length} listings</Text>
        )}
      </View>
      <PropertyMapView properties={properties ?? []} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.accentGreen,
    letterSpacing: 2,
  },
  count: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
