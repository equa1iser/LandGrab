"use client";

import { PropertyMap } from "@/components/map/PropertyMap";
import { SearchBar } from "@/components/search/SearchBar";

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="h-14 border-b border-border-subtle bg-bg-secondary flex items-center px-4 gap-4">
        <SearchBar compact />
        <div className="font-mono text-xs text-text-muted uppercase tracking-wider">
          Full Map View
        </div>
      </div>
      <div className="flex-1">
        <PropertyMap properties={[]} />
      </div>
    </div>
  );
}
