import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/authStore";

interface UsageData {
  views_used: number;
  views_limit: number;
  views_remaining: number;
  resets_at: string;
  is_unlimited: boolean;
}

export function useUsage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data } = useQuery<UsageData>({
    queryKey: ["usage"],
    queryFn: () => api.getUsage(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });

  const isUnlimited = data?.is_unlimited ?? false;
  const viewsRemaining = data?.views_remaining ?? (isUnlimited ? -1 : 5);
  const canView = isUnlimited || viewsRemaining > 0;

  return {
    viewsUsed: data?.views_used ?? 0,
    viewsRemaining,
    viewsLimit: data?.views_limit ?? 5,
    isUnlimited,
    canView,
    resetsAt: data?.resets_at ?? null,
  };
}
