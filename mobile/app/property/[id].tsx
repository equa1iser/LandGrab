import React, { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Share, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  useProperty, useAVM, useSaveProperty, useUnsaveProperty,
  useSavedProperties, useUsage,
} from '../../src/lib/hooks/useProperty';
import { useAuthStore } from '../../src/lib/store/authStore';
import { DealScorePanel } from '../../src/components/property/DealScorePanel';
import { PriceHistoryChart } from '../../src/components/property/PriceHistoryChart';
import { CompsPanel } from '../../src/components/property/CompsPanel';
import { CrimePanel } from '../../src/components/property/CrimePanel';
import { NeighborhoodPanel } from '../../src/components/property/NeighborhoodPanel';
import { TaxHistoryPanel } from '../../src/components/property/TaxHistoryPanel';
import { MarketPanel } from '../../src/components/property/MarketPanel';
import { InterestRatesPanel } from '../../src/components/property/InterestRatesPanel';
import { AVMPanel } from '../../src/components/property/AVMPanel';
import { ProGate } from '../../src/components/ui/ProGate';
import { Colors, Fonts, Spacing } from '../../src/theme';

const { width: W } = Dimensions.get('window');

function fmtPrice(n?: number) {
  if (n == null) return '—';
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${n.toLocaleString()}`;
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: detail, isLoading, error } = useProperty(id);
  const { data: avm } = useAVM(id);
  const { data: usage } = useUsage();
  const { data: saved } = useSavedProperties();
  const { mutate: saveProperty } = useSaveProperty();
  const { mutate: unsaveProperty } = useUnsaveProperty();

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <ProGate viewsUsed={0} viewsLimit={5} />
      </SafeAreaView>
    );
  }

  if (usage && !usage.is_unlimited && usage.views_remaining === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <ProGate viewsUsed={usage.views_used} viewsLimit={usage.views_limit} />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accentGreen} />
          <Text style={styles.loadingText}>LOADING PROPERTY DATA</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.accentRed} />
          <Text style={styles.errorText}>Property not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.errorText, { color: Colors.accentGreen, marginTop: 8 }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { property, price_history, tax_history, neighborhood, market, deal_score } = detail;
  const isLand = property.property_type?.toLowerCase() === 'land';
  const photos = property.photo_urls ?? [];

  const savedEntry = (saved ?? []).find((s: any) => s.property_id === id);
  const isSaved = !!savedEntry;

  const handleSave = () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (isSaved) {
      unsaveProperty(savedEntry.id);
    } else {
      saveProperty({ propertyId: id });
    }
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${property.address_line1}, ${property.city} ${property.state} on LandGrab` });
  };

  const pricePerUnit = isLand
    ? (property.current_price && property.lot_size_acres ? property.current_price / property.lot_size_acres : null)
    : (property.current_price && property.sqft ? property.current_price / property.sqft : null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Back button overlay */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Photo carousel */}
        <View style={styles.photoWrap}>
          {photos.length > 0 ? (
            <>
              <Image source={{ uri: photos[photoIndex] }} style={styles.photo} contentFit="cover" />
              {photos.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.photoNav, { left: 12 }]}
                    onPress={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
                  >
                    <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoNav, { right: 12 }]}
                    onPress={() => setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1))}
                  >
                    <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <View style={styles.photoCounter}>
                    <Text style={styles.photoCounterText}>{photoIndex + 1} / {photos.length}</Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="home-outline" size={48} color={Colors.textMuted} />
            </View>
          )}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.address}>{property.address_line1}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.location}>
                {property.city}, {property.state} {property.zip_code}
                {property.county ? ` · ${property.county} County` : ''}
              </Text>
            </View>

            {/* Specs */}
            <View style={styles.specs}>
              {!isLand && property.beds != null && (
                <View style={styles.spec}>
                  <Ionicons name="bed-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.specText}>{property.beds} bd</Text>
                </View>
              )}
              {!isLand && property.baths != null && (
                <View style={styles.spec}>
                  <Ionicons name="water-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.specText}>{property.baths} ba</Text>
                </View>
              )}
              {!isLand && property.sqft != null && (
                <View style={styles.spec}>
                  <Ionicons name="resize-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.specText}>{property.sqft.toLocaleString()} sf</Text>
                </View>
              )}
              {property.lot_size_acres != null && (
                <View style={styles.spec}>
                  <Ionicons name="map-outline" size={12} color={isLand ? Colors.accentGreen : Colors.textMuted} />
                  <Text style={[styles.specText, isLand && { color: Colors.accentGreen }]}>
                    {property.lot_size_acres.toFixed(2)} ac
                  </Text>
                </View>
              )}
              {property.year_built != null && (
                <View style={styles.spec}>
                  <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.specText}>{property.year_built}</Text>
                </View>
              )}
              {property.days_on_market != null && (
                <View style={styles.spec}>
                  <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.specText}>{property.days_on_market}d on market</Text>
                </View>
              )}
            </View>
          </View>

          {/* Price + actions */}
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{fmtPrice(property.current_price)}</Text>
            {pricePerUnit != null && (
              <Text style={styles.perUnit}>
                ${pricePerUnit.toFixed(0)}/{isLand ? 'ac' : 'sf'}
              </Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, isSaved && { borderColor: Colors.accentRed }]} onPress={handleSave}>
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isSaved ? Colors.accentRed : Colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.accentCyan }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={Colors.accentCyan} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Panels */}
        <View style={styles.panels}>
          {deal_score && <DealScorePanel dealScore={deal_score} />}
          <PriceHistoryChart events={price_history ?? []} />
          <CompsPanel propertyId={id} isLand={isLand} />
          <CrimePanel neighborhood={neighborhood} />
          <NeighborhoodPanel neighborhood={neighborhood} />
          <TaxHistoryPanel records={tax_history ?? []} />
          <MarketPanel market={market} isLand={isLand} />
          <InterestRatesPanel market={market} />
          <AVMPanel avm={avm} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted, letterSpacing: 2, marginTop: 8 },
  errorText: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.accentRed },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.bgCard}cc`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: { width: W, height: W * 0.6, backgroundColor: Colors.bgSecondary },
  photo: { width: W, height: W * 0.6 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoNav: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.bgCard}cc`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: `${Colors.bgCard}cc`,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  photoCounterText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textPrimary },
  header: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  address: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 24,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  location: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, flex: 1 },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  specText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textSecondary },
  priceBlock: { alignItems: 'flex-end', minWidth: 90 },
  price: { fontFamily: Fonts.display, fontSize: 20, color: Colors.accentGreen, letterSpacing: 0.5 },
  perUnit: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textMuted, marginBottom: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panels: { padding: Spacing.lg },
});
