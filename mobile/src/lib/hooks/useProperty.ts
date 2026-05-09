import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi, usersApi } from '../api-client';
import type { SearchParams } from '../../types';

export const useSearch = (params: SearchParams, enabled = true) =>
  useQuery({
    queryKey: ['properties', 'search', params],
    queryFn: () => propertiesApi.search(params as Record<string, unknown>).then((r) => r.data),
    enabled,
    staleTime: 1000 * 60 * 5,
  });

export const useProperty = (id: string) =>
  useQuery({
    queryKey: ['properties', id],
    queryFn: () => propertiesApi.detail(id).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  });

export const useDealScore = (id: string) =>
  useQuery({
    queryKey: ['properties', id, 'score'],
    queryFn: () => propertiesApi.score(id).then((r) => r.data),
    staleTime: 1000 * 60 * 30,
  });

export const useComps = (id: string, maxDistance = 20) =>
  useQuery({
    queryKey: ['properties', id, 'comps', maxDistance],
    queryFn: () => propertiesApi.comps(id, maxDistance).then((r) => r.data),
    staleTime: 1000 * 60 * 30,
  });

export const usePriceHistory = (id: string) =>
  useQuery({
    queryKey: ['properties', id, 'price-history'],
    queryFn: () => propertiesApi.priceHistory(id).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
  });

export const useAVM = (id: string) =>
  useQuery({
    queryKey: ['properties', id, 'avm'],
    queryFn: () => propertiesApi.avm(id).then((r) => r.data),
    staleTime: 1000 * 60 * 60,
  });

export const useSavedProperties = () =>
  useQuery({
    queryKey: ['saved-properties'],
    queryFn: () => usersApi.savedProperties().then((r) => r.data),
  });

export const useSaveProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, alertEnabled }: { propertyId: string; alertEnabled?: boolean }) =>
      usersApi.saveProperty(propertyId, alertEnabled).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-properties'] }),
  });
};

export const useUnsaveProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (savedId: string) => usersApi.unsaveProperty(savedId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-properties'] }),
  });
};

export const useUsage = () =>
  useQuery({
    queryKey: ['usage'],
    queryFn: () => usersApi.usage().then((r) => r.data),
  });

export const useAutocomplete = (q: string) => {
  const { searchApi } = require('../api-client') as typeof import('../api-client');
  return useQuery({
    queryKey: ['autocomplete', q],
    queryFn: () => searchApi.autocomplete(q).then((r: { data: unknown }) => r.data),
    enabled: q.length >= 2,
    staleTime: 1000 * 60,
  });
};
