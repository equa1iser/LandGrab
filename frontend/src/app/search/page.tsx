"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";
import { PropertyList } from "@/components/search/PropertyList";
import { FilterPanel, type FilterValues } from "@/components/search/FilterPanel";
import { PropertyMap } from "@/components/map/PropertyMap";
import { useSearch } from "@/lib/hooks/useSearch";
import { useAuthStore } from "@/lib/store/authStore";

const DEFAULT_FILTERS: FilterValues = {
  minPrice: "",
  maxPrice: "",
  beds: "",
  propertyType: "",
};

function SearchContent() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);

  // Must be called before any conditional return (React rules of hooks)
  const { properties, isLoading: searchLoading } = useSearch(query, filters);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) router.replace("/auth/login");
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized || !isAuthenticated) return null;

  return (
    <div className="mt-14 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top search bar */}
      <div className="h-14 border-b border-border-subtle bg-bg-secondary flex items-center px-4 gap-4">
        <SearchBar initialValue={query} compact />
        <FilterPanel values={filters} onChange={setFilters} />
      </div>

      {/* Split pane: list + map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Property list */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto border-r border-border-subtle bg-bg-primary">
          <div className="p-4">
            {searchLoading ? (
              <div className="font-mono text-text-muted text-sm py-8 text-center">
                <span className="animate-blink">█</span> SCANNING...
              </div>
            ) : properties.length === 0 ? (
              <div className="font-mono text-text-muted text-sm py-8 text-center">
                {query ? `No results for "${query}"` : "Enter a location to search"}
              </div>
            ) : (
              <PropertyList properties={properties} />
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <PropertyMap properties={properties} />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
