"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PropertyMap } from "@/components/map/PropertyMap";
import { SearchBar } from "@/components/search/SearchBar";
import { useAuthStore } from "@/lib/store/authStore";
import { api } from "@/lib/api-client";

interface Property {
  id: string;
  address_line1: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  current_price?: number;
  beds?: number;
  baths?: number;
  deal_score?: number;
  property_type?: string;
}

interface BboxParams {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
}

interface ViewportInfo {
  bbox: BboxParams;
  widthMiles: number;
  zoom: number;
}

const DEBOUNCE_MS = 600;
const ENV_DEFAULT_MILES = Number(process.env.NEXT_PUBLIC_MAP_BBOX_MILES ?? 40);

export default function MapPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo | null>(null);
  const [thresholdMiles, setThresholdMiles] = useState(ENV_DEFAULT_MILES);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) router.replace("/auth/login");
  }, [isInitialized, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getSettings().then((s) => {
      if (s?.map_bbox_miles) setThresholdMiles(s.map_bbox_miles);
    }).catch(() => { /* keep env default on error */ });
  }, [isAuthenticated]);

  const handleViewportChange = useCallback((info: ViewportInfo) => {
    setViewportInfo(info);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (info.widthMiles > thresholdMiles) {
      setProperties([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await api.searchByBbox(info.bbox);
        setProperties(results);
      } catch {
        // silently ignore — map stays as-is on error
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [thresholdMiles]);

  if (!isInitialized || !isAuthenticated) return null;

  const tooZoomedOut = viewportInfo && viewportInfo.widthMiles > thresholdMiles;
  const propCount = properties.length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="h-14 border-b border-border-subtle bg-bg-secondary flex items-center px-4 gap-4">
        <SearchBar compact />
        <div className="flex items-center gap-3 ml-auto">
          {isLoading && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-accent-cyan">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              LOADING
            </div>
          )}
          {!isLoading && tooZoomedOut && (
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
              Zoom in to load properties
            </div>
          )}
          {!isLoading && !tooZoomedOut && viewportInfo && (
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
              {propCount === 0 ? "No properties in view" : `${propCount} propert${propCount === 1 ? "y" : "ies"} in view`}
            </div>
          )}
          {!viewportInfo && (
            <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
              Full Map View
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">
        <PropertyMap
          properties={properties}
          onViewportChange={handleViewportChange}
          isLoading={isLoading}
          disableAutoFit
        />
      </div>
    </div>
  );
}
