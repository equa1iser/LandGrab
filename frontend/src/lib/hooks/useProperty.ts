"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => api.getProperty(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useDealScore(id: string) {
  return useQuery({
    queryKey: ["deal-score", id],
    queryFn: () => api.getDealScore(id),
    staleTime: 12 * 60 * 60 * 1000, // 12h — matches backend TTL
    enabled: !!id,
    retry: 1,
  });
}

export function useComps(id: string, maxDistance: number = 20) {
  return useQuery({
    queryKey: ["comps", id, maxDistance],
    queryFn: () => api.getComps(id, maxDistance),
    staleTime: 30 * 60 * 1000,
    enabled: !!id,
  });
}

export function usePriceHistory(id: string) {
  return useQuery({
    queryKey: ["price-history", id],
    queryFn: () => api.getPriceHistory(id),
    staleTime: 60 * 60 * 1000,
    enabled: !!id,
  });
}

export function useAVM(id: string) {
  return useQuery({
    queryKey: ["avm", id],
    queryFn: () => api.getAVM(id),
    staleTime: 60 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCurrentRates() {
  return useQuery({
    queryKey: ["rates"],
    queryFn: () => api.getCurrentRates(),
    staleTime: 60 * 60 * 1000,
  });
}
