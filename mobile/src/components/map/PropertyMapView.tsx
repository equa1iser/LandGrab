import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Colors, Fonts, scoreColor } from '../../theme';
import type { PropertySummary } from '../../types';

// Dark map style mimicking the web Mapbox dark tiles
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2234' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f1f0f' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

interface PropertyMapViewProps {
  properties: PropertySummary[];
}

export function PropertyMapView({ properties }: PropertyMapViewProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const withCoords = properties.filter((p) => p.lat != null && p.lng != null);

  const initialRegion = withCoords.length > 0
    ? {
        latitude: withCoords[0].lat!,
        longitude: withCoords[0].lng!,
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      }
    : { latitude: 39.5, longitude: -98.35, latitudeDelta: 30, longitudeDelta: 30 };

  const markerColor = (p: PropertySummary) => {
    if (!p.deal_score) return Colors.textMuted;
    return scoreColor(p.deal_score);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {withCoords.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat!, longitude: p.lng! }}
            onPress={() => setSelected(p.id)}
          >
            <View style={[styles.marker, { borderColor: markerColor(p), backgroundColor: `${markerColor(p)}33` }]}>
              <Text style={[styles.markerText, { color: markerColor(p) }]}>
                {p.current_price != null
                  ? p.current_price >= 1_000_000
                    ? `$${(p.current_price / 1_000_000).toFixed(1)}M`
                    : `$${Math.round(p.current_price / 1000)}K`
                  : '?'}
              </Text>
            </View>
            <Callout onPress={() => router.push(`/property/${p.id}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutAddress} numberOfLines={1}>{p.address_line1}</Text>
                <Text style={styles.calloutCity}>{p.city}, {p.state}</Text>
                <Text style={styles.calloutTap}>Tap to view details →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { label: 'A (80+)', color: Colors.accentGreen },
          { label: 'B (60+)', color: Colors.accentCyan },
          { label: 'C (40+)', color: Colors.accentAmber },
          { label: 'D/F', color: Colors.accentRed },
        ].map(({ label, color }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  markerText: { fontFamily: Fonts.monoBold, fontSize: 10 },
  callout: {
    backgroundColor: Colors.bgCard,
    borderRadius: 6,
    padding: 8,
    minWidth: 160,
  },
  calloutAddress: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: '#111', marginBottom: 2 },
  calloutCity: { fontFamily: Fonts.mono, fontSize: 10, color: '#555' },
  calloutTap: { fontFamily: Fonts.mono, fontSize: 10, color: '#00aa33', marginTop: 4 },
  legend: {
    position: 'absolute',
    bottom: 16,
    right: 12,
    backgroundColor: `${Colors.bgCard}ee`,
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textSecondary },
});
