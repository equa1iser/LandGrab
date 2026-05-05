"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/authStore";

export function useProperty(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => api.getProperty(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && isAuthenticated,
  });
}

export function useDealScore(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["deal-score", id],
    queryFn: () => api.getDealScore(id),
    staleTime: 12 * 60 * 60 * 1000,
    enabled: !!id && isAuthenticated,
    retry: 1,
  });
}

export function useComps(id: string, maxDistance: number = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["comps", id, maxDistance],
    queryFn: () => api.getComps(id, maxDistance),
    staleTime: 30 * 60 * 1000,
    enabled: !!id && isAuthenticated,
  });
}

export function usePriceHistory(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["price-history", id],
    queryFn: () => api.getPriceHistory(id),
    staleTime: 60 * 60 * 1000,
    enabled: !!id && isAuthenticated,
  });
}

export function useAVM(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["avm", id],
    queryFn: () => api.getAVM(id),
    staleTime: 60 * 60 * 1000,
    enabled: !!id && isAuthenticated,
  });
}

export function useCurrentRates() {
  return useQuery({
    queryKey: ["rates"],
    queryFn: () => api.getCurrentRates(),
    staleTime: 60 * 60 * 1000,
  });
}
