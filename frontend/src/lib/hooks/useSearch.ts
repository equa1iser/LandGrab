"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/authStore";
import type { FilterValues } from "@/components/search/FilterPanel";

export function useSearch(query: string, filters?: FilterValues) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAddress = /\d/.test(query) && query.length > 5;
  const isZip = /^\d{5}$/.test(query.trim());

  const params: Record<string, unknown> = { limit: 30 };
  if (isZip) {
    params.zip_code = query.trim();
  } else if (isAddress) {
    params.address = query;
  } else if (query) {
    const parts = query.trim().split(/\s+/);
    if (parts.length >= 2 && parts[parts.length - 1].length === 2) {
      params.state = parts[parts.length - 1].toUpperCase();
      params.city = parts.slice(0, -1).join(" ");
    } else {
      params.city = query;
    }
  }

  if (filters?.minPrice) params.min_price = Number(filters.minPrice);
  if (filters?.maxPrice) params.max_price = Number(filters.maxPrice);
  if (filters?.beds) params.beds = Number(filters.beds);
  if (filters?.propertyType) params.property_type = filters.propertyType;

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", query, filters],
    queryFn: () => (query ? api.searchProperties(params) : Promise.resolve([])),
    enabled: query.length >= 2 && isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  return { properties: (data as any[]) || [], isLoading, error };
}
