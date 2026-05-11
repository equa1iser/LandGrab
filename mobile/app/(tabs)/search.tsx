import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSearch } from '../../src/lib/hooks/useProperty';
import { searchApi } from '../../src/lib/api-client';
import { PropertyCard } from '../../src/components/search/PropertyCard';
import { PropertyMapView } from '../../src/components/map/PropertyMapView';
import { Colors, Fonts, Spacing } from '../../src/theme';
import type { SearchParams } from '../../src/types';

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land'];
const BED_OPTIONS = ['Any', '1', '2', '3', '4+'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<SearchParams>({ limit: 30 });
  const [tempFilters, setTempFilters] = useState<SearchParams>({});
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; address?: string; lat?: number; lng?: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []);

  const hasFilters = !!(filters.min_price || filters.max_price || filters.beds || filters.property_type);

  const searchParams = useMemo<SearchParams>(() => {
    if (!activeQuery) return { ...filters, limit: 30 };
    const q = activeQuery.trim();
    // Detect zip (5 digits), city, or address
    if (/^\d{5}$/.test(q)) return { ...filters, zip_code: q, limit: 30 };
    return { ...filters, city: q, limit: 30 };
  }, [activeQuery, filters]);

  const { data: properties, isLoading, isFetching } = useSearch(searchParams, !!activeQuery);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const { data } = await searchApi.autocomplete(q);
      const items = Array.isArray(data) ? data.slice(0, 6) : [];
      // API returns either strings or objects with display_name
      setSuggestions(items.map((item: any) =>
        typeof item === 'string' ? { display_name: item } : item
      ));
      setShowSuggestions(true);
    } catch { setSuggestions([]); }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    fetchSuggestions(text);
  };

  const handleSearch = (val?: string) => {
    const q = (val ?? query).trim();
    setActiveQuery(q);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const applyFilters = () => {
    setFilters((prev) => ({ ...prev, ...tempFilters }));
    bottomSheetRef.current?.close();
  };

  const clearFilters = () => {
    setTempFilters({});
    setFilters({ limit: 30 });
    bottomSheetRef.current?.close();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="City, ZIP, or address…"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
            selectionColor={Colors.accentGreen}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setActiveQuery(''); setSuggestions([]); setShowSuggestions(false); }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => { setTempFilters(filters); bottomSheetRef.current?.expand(); }}
        >
          <Ionicons name="options-outline" size={18} color={hasFilters ? Colors.accentGreen : Colors.textSecondary} />
          {hasFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionItem}
              onPress={() => { setQuery(s.display_name); handleSearch(s.display_name); }}
            >
              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.suggestionText}>{s.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* View toggle */}
      <View style={styles.toggleRow}>
        {(['list', 'map'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
            onPress={() => setViewMode(mode)}
          >
            <Ionicons
              name={mode === 'list' ? 'list' : 'map'}
              size={13}
              color={viewMode === mode ? Colors.bgPrimary : Colors.textSecondary}
            />
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        {(isLoading || isFetching) && (
          <ActivityIndicator size="small" color={Colors.accentGreen} style={{ marginLeft: 'auto' }} />
        )}
        {properties && (
          <Text style={styles.resultCount}>
            {properties.length} result{properties.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Content */}
      {!activeQuery ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>START YOUR SEARCH</Text>
          <Text style={styles.emptyText}>Enter a city, ZIP code, or address above</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PropertyCard property={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="home-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>NO PROPERTIES FOUND</Text>
                <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <PropertyMapView properties={properties ?? []} />
      )}

      {/* Filter bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: Colors.bgCard }}
        handleIndicatorStyle={{ backgroundColor: Colors.borderSubtle }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.filterSheet}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>FILTER PROPERTIES</Text>
            <TouchableOpacity onPress={() => bottomSheetRef.current?.close()}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Price range */}
          <Text style={styles.filterLabel}>PRICE RANGE</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min $"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={tempFilters.min_price?.toString() ?? ''}
              onChangeText={(v) => setTempFilters((p) => ({ ...p, min_price: v ? Number(v) : undefined }))}
              selectionColor={Colors.accentGreen}
            />
            <Text style={styles.priceDash}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max $"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={tempFilters.max_price?.toString() ?? ''}
              onChangeText={(v) => setTempFilters((p) => ({ ...p, max_price: v ? Number(v) : undefined }))}
              selectionColor={Colors.accentGreen}
            />
          </View>

          {/* Beds */}
          <Text style={styles.filterLabel}>MIN BEDROOMS</Text>
          <View style={styles.chipRow}>
            {BED_OPTIONS.map((b) => {
              const val = b === 'Any' ? undefined : b === '4+' ? 4 : Number(b);
              const active = (tempFilters.beds ?? undefined) === val;
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTempFilters((p) => ({ ...p, beds: val }))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Property type */}
          <Text style={styles.filterLabel}>PROPERTY TYPE</Text>
          <View style={styles.typeGrid}>
            {PROPERTY_TYPES.map((t) => {
              const active = tempFilters.property_type === t.toLowerCase().replace(' ', '_');
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, active && styles.chipActive]}
                  onPress={() =>
                    setTempFilters((p) => ({
                      ...p,
                      property_type: active ? undefined : t.toLowerCase().replace(' ', '_'),
                    }))
                  }
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearText}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyText}>APPLY</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  filterBtn: {
    width: 42,
    height: 42,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accentGreen,
  },
  suggestions: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    zIndex: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  suggestionText: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textPrimary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  toggleBtnActive: { backgroundColor: Colors.accentGreen, borderColor: Colors.accentGreen },
  toggleText: { fontFamily: Fonts.mono, fontSize: 10, color: Colors.textSecondary, letterSpacing: 1 },
  toggleTextActive: { color: Colors.bgPrimary },
  resultCount: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 'auto',
    letterSpacing: 0.5,
  },
  list: { padding: Spacing.lg },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, marginTop: 80 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 14, color: Colors.textMuted, letterSpacing: 2, marginTop: Spacing.lg },
  emptyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  filterSheet: { padding: Spacing.xl },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  filterTitle: { fontFamily: Fonts.display, fontSize: 13, color: Colors.accentGreen, letterSpacing: 2 },
  filterLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  priceInput: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 6,
    padding: Spacing.md,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  priceDash: { fontFamily: Fonts.mono, color: Colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: { borderColor: Colors.accentGreen, backgroundColor: `${Colors.accentGreen}18` },
  chipText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accentGreen },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterActions: { flexDirection: 'row', gap: Spacing.md },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.accentRed,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.accentRed, letterSpacing: 1.5 },
  applyBtn: { flex: 2, backgroundColor: Colors.accentGreen, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  applyText: { fontFamily: Fonts.monoBold, fontSize: 11, color: Colors.bgPrimary, letterSpacing: 1.5 },
});
