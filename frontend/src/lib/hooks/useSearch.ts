"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useSearch(query: string) {
  const isAddress = /\d/.test(query) && query.length > 5;
  const isZip = /^\d{5}$/.test(query.trim());

  const params: Record<string, unknown> = { limit: 30 };
  if (isZip) {
    params.zip_code = query.trim();
  } else if (isAddress) {
    params.address = query;
  } else if (query) {
    // City/state — parse "Austin TX" style
    const parts = query.trim().split(/\s+/);
    if (parts.length >= 2 && parts[parts.length - 1].length === 2) {
      params.state = parts[parts.length - 1].toUpperCase();
      params.city = parts.slice(0, -1).join(" ");
    } else {
      params.city = query;
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", query],
    queryFn: () => (query ? api.searchProperties(params) : Promise.resolve([])),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  return { properties: (data as any[]) || [], isLoading, error };
}
