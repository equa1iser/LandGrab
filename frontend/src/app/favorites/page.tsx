"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import { Heart, Trash2, MapPin, ExternalLink, Bed, Bath, Square } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface SavedProperty {
  id: string;
  property_id: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  current_price?: number;
  price_snapshot?: number;
  notes?: string;
  alert_enabled: boolean;
  created_at: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const { data: saved = [], isLoading } = useQuery<SavedProperty[]>({
    queryKey: ["saved-properties"],
    queryFn: () => api.getSavedProperties(),
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (savedId: string) => api.removeSavedProperty(savedId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-properties"] }),
  });

  if (!isAuthenticated) {
    return (
      <div className="mt-14 max-w-7xl mx-auto px-6 py-24 text-center">
        <Heart className="w-10 h-10 text-text-muted mx-auto mb-4" />
        <div className="font-mono text-text-muted text-sm mb-4 uppercase tracking-widest">
          Sign in to view your watchlist
        </div>
        <Link
          href="/auth/login"
          className="font-mono text-xs text-accent-cyan hover:underline"
        >
          Sign in →
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-14 max-w-7xl mx-auto px-6 py-24 flex justify-center">
        <Spinner size="lg" color="green" label="Loading watchlist..." />
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="mt-14 max-w-7xl mx-auto px-6 py-24 text-center">
        <Heart className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <div className="font-mono text-text-muted text-sm mb-2 uppercase tracking-widest">
          No saved properties
        </div>
        <p className="text-text-muted text-xs font-mono mb-6 max-w-xs mx-auto">
          Hit the Save button on any property to add it to your watchlist.
        </p>
        <Link href="/search" className="font-mono text-xs text-accent-green hover:underline">
          Browse properties →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-14 max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-5 h-5 text-accent-red fill-accent-red" />
        <h1 className="font-display font-bold text-xl text-text-primary uppercase tracking-wider">
          Watchlist
        </h1>
        <span className="font-mono text-xs text-text-muted border border-border-subtle px-2 py-0.5">
          {saved.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {saved.map((prop) => {
          const priceChange =
            prop.price_snapshot && prop.current_price
              ? ((prop.current_price - prop.price_snapshot) / prop.price_snapshot) * 100
              : null;

          return (
            <div key={prop.id} className="hud-card p-4 group relative flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-primary text-sm truncate">
                    {prop.address}
                  </div>
                  <div className="flex items-center gap-1 text-text-muted text-xs font-mono mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {prop.city}, {prop.state}
                    {prop.zip_code && <span className="ml-1">{prop.zip_code}</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeMutation.mutate(prop.id)}
                  className="p-1 text-text-muted hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Specs */}
              {(prop.beds || prop.baths || prop.sqft) && (
                <div className="flex items-center gap-4 font-mono text-xs text-text-muted">
                  {prop.beds && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-3 h-3" /> {prop.beds}
                    </span>
                  )}
                  {prop.baths && (
                    <span className="flex items-center gap-1">
                      <Bath className="w-3 h-3" /> {prop.baths}
                    </span>
                  )}
                  {prop.sqft && (
                    <span className="flex items-center gap-1">
                      <Square className="w-3 h-3" /> {prop.sqft.toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* Price */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-display font-bold text-xl text-text-primary">
                    {prop.current_price
                      ? `$${prop.current_price.toLocaleString()}`
                      : "Price N/A"}
                  </div>
                  {priceChange !== null && (
                    <div
                      className={`font-mono text-xs mt-0.5 ${
                        priceChange > 0 ? "text-accent-red" : "text-accent-green"
                      }`}
                    >
                      {priceChange > 0 ? "▲" : "▼"}{" "}
                      {Math.abs(priceChange).toFixed(1)}% since saved
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setNavigatingId(prop.property_id); router.push(`/property/${prop.property_id}`); }}
                  className="flex items-center gap-1 text-xs font-mono text-text-muted hover:text-accent-cyan transition-colors"
                >
                  {navigatingId === prop.property_id
                    ? <Spinner size="sm" color="cyan" />
                    : <><ExternalLink className="w-3 h-3" /> View</>}
                </button>
              </div>

              {/* Notes */}
              {prop.notes && (
                <div className="pt-2 border-t border-border-subtle text-xs font-mono text-text-muted italic">
                  "{prop.notes}"
                </div>
              )}

              {/* Footer */}
              <div className="font-mono text-xs text-text-muted">
                Saved {new Date(prop.created_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
