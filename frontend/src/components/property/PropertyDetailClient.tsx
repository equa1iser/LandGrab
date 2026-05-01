"use client";

import { useProperty, usePriceHistory } from "@/lib/hooks/useProperty";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { TaxHistoryPanel } from "./TaxHistoryPanel";
import { CompsPanel } from "./CompsPanel";
import { NeighborhoodPanel } from "./NeighborhoodPanel";
import { MarketPanel } from "./MarketPanel";
import { InterestRatesPanel } from "./InterestRatesPanel";
import { DealScorePanel } from "./DealScorePanel";
import { AVMPanel } from "./AVMPanel";
import {
  Bed, Bath, Square, MapPin, Calendar, Layers,
  Home, Heart, Share2, ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface PropertyDetailClientProps {
  propertyId: string;
}

function PropertyHeader({ prop }: { prop: any }) {
  const pricePerSqft =
    prop.current_price && prop.sqft
      ? (prop.current_price / prop.sqft).toFixed(0)
      : null;

  return (
    <div className="border-b border-border-subtle bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-xs text-text-muted mb-4">
          <Link href="/" className="hover:text-text-secondary">Home</Link>
          <span>/</span>
          <Link href="/search" className="hover:text-text-secondary">Search</Link>
          <span>/</span>
          <span className="text-text-secondary">{prop.zip_code}</span>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-text-primary truncate">
              {prop.address_line1}
            </h1>
            <div className="flex items-center gap-2 text-text-muted font-mono text-sm mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {prop.city}, {prop.state} {prop.zip_code}
              {prop.county && <span className="text-text-muted">· {prop.county} County</span>}
            </div>

            {/* Property specs */}
            <div className="flex items-center gap-5 mt-4 text-text-secondary text-sm font-mono">
              {prop.beds && (
                <span className="flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-text-muted" /> {prop.beds} bed
                </span>
              )}
              {prop.baths && (
                <span className="flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-text-muted" /> {prop.baths} bath
                </span>
              )}
              {prop.sqft && (
                <span className="flex items-center gap-1.5">
                  <Square className="w-4 h-4 text-text-muted" /> {prop.sqft.toLocaleString()} sqft
                </span>
              )}
              {prop.lot_size_acres && (
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-text-muted" /> {prop.lot_size_acres} acres
                </span>
              )}
              {prop.year_built && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-text-muted" /> Built {prop.year_built}
                </span>
              )}
              {prop.property_type && (
                <span className="flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-text-muted" />
                  {prop.property_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          {/* Price block */}
          <div className="text-right flex-shrink-0">
            <div className="font-display font-bold text-4xl glow-text-green">
              {prop.current_price
                ? `$${prop.current_price.toLocaleString()}`
                : "Price N/A"}
            </div>
            {pricePerSqft && (
              <div className="font-mono text-sm text-text-muted mt-1">
                ${pricePerSqft}/sqft
              </div>
            )}
            {prop.days_on_market != null && (
              <div className="font-mono text-xs text-text-muted mt-1">
                {prop.days_on_market === 0 ? "Listed today" : `${prop.days_on_market}d on market`}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end mt-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-text-muted
                hover:border-accent-red/40 hover:text-accent-red transition-colors text-xs font-mono">
                <Heart className="w-3.5 h-3.5" /> Save
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-text-muted
                hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors text-xs font-mono">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PropertyDetailClient({ propertyId }: PropertyDetailClientProps) {
  const { data, isLoading, error } = useProperty(propertyId);
  const { data: priceHistory } = usePriceHistory(propertyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-text-muted">
        <span className="animate-blink">█</span>&nbsp;LOADING INTELLIGENCE...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="font-mono text-accent-red">PROPERTY NOT FOUND</div>
        <Link href="/search" className="font-mono text-xs text-text-muted hover:text-text-secondary underline">
          ← Back to search
        </Link>
      </div>
    );
  }

  const prop = data.property;

  return (
    <div>
      <PropertyHeader prop={prop} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — primary data */}
          <div className="lg:col-span-2 space-y-6">
            <PriceHistoryChart
              history={priceHistory || data.price_history || []}
              currentPrice={prop.current_price}
            />
            <CompsPanel
              propertyId={propertyId}
              subjectPrice={prop.current_price}
            />
            <TaxHistoryPanel
              history={data.tax_history || []}
              currentPrice={prop.current_price}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NeighborhoodPanel data={data.neighborhood} />
              <MarketPanel data={data.market} zip={prop.zip_code} />
            </div>
            <InterestRatesPanel price={prop.current_price} />
          </div>

          {/* Right column — AI analysis */}
          <div className="space-y-6">
            <DealScorePanel propertyId={propertyId} />
            <AVMPanel
              propertyId={propertyId}
              listPrice={prop.current_price}
            />

            {/* Quick stats card */}
            <div className="hud-card p-5 space-y-3">
              <div className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                Property Details
              </div>
              {[
                { label: "Property Type", value: prop.property_type?.replace(/_/g, " ") },
                { label: "Year Built", value: prop.year_built },
                { label: "Lot Size", value: prop.lot_size_acres ? `${prop.lot_size_acres} acres` : null },
                { label: "ZIP Code", value: prop.zip_code },
                { label: "County", value: prop.county },
                { label: "Source", value: "—" },
              ]
                .filter((s) => s.value)
                .map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-text-muted">{s.label}</span>
                    <span className="font-mono text-xs text-text-secondary capitalize">
                      {String(s.value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
