"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useEffect, useState } from "react";

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
}

interface PropertyMapProps {
  properties: Property[];
  onPropertySelect?: (id: string) => void;
}

function scoreToColor(score?: number): string {
  if (!score) return "#00d4ff";
  if (score >= 75) return "#00ff41";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function PropertyMap({ properties, onPropertySelect }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      setMapToken(token);
    } else {
      setMapError(true);
    }
  }, []);

  useEffect(() => {
    if (!mapToken || !mapContainer.current || mapRef.current) return;

    import("mapbox-gl").then((mapboxgl) => {
      mapboxgl.default.accessToken = mapToken;
      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-98.35, 39.5],
        zoom: 4,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.default.NavigationControl(), "top-right");
      map.addControl(
        new mapboxgl.default.AttributionControl({ compact: true }),
        "bottom-right"
      );

      mapRef.current = map;
      map.on("load", () => setMapReady(true));
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapToken]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    import("mapbox-gl").then((mapboxgl) => {
      if (!mapRef.current) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const validProperties = properties.filter((p) => p.lat && p.lng);
      if (validProperties.length === 0) return;

      validProperties.forEach((prop) => {
        const el = document.createElement("div");
        el.className = "property-marker";
        const color = scoreToColor(prop.deal_score);
        el.style.cssText = `
          width: 12px; height: 12px; border-radius: 50%;
          background: ${color}; border: 2px solid rgba(0,0,0,0.6);
          cursor: pointer; position: relative;
          box-shadow: 0 0 8px ${color}80;
        `;

        const popup = new mapboxgl.default.Popup({
          offset: 15,
          closeButton: false,
          className: "landgrab-popup",
        }).setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
              ${prop.city}, ${prop.state}
            </div>
            <div style="font-weight: 600; font-size: 14px; color: #e5e7eb; margin-bottom: 8px;">
              ${prop.address_line1}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: 'Orbitron', sans-serif; font-size: 18px; color: #00ff41; font-weight: 700;">
                ${prop.current_price ? `$${prop.current_price.toLocaleString()}` : "—"}
              </span>
              ${prop.beds ? `<span style="font-size: 12px; color: #9ca3af;">${prop.beds}br · ${prop.baths}ba</span>` : ""}
            </div>
            ${prop.deal_score ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #1f2937; font-size: 11px; color: ${color}; font-family: monospace;">
                DEAL SCORE: ${prop.deal_score}/100
              </div>` : ""}
            <a href="/property/${prop.id}" style="display: block; margin-top: 8px; padding: 6px 12px; background: #00ff41; color: #0a0a0a; text-align: center; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase; text-decoration: none; letter-spacing: 0.1em;">
              VIEW ANALYSIS →
            </a>
          </div>
        `);

        const marker = new mapboxgl.default.Marker(el)
          .setLngLat([prop.lng!, prop.lat!])
          .setPopup(popup)
          .addTo(mapRef.current!);

        el.addEventListener("click", () => {
          onPropertySelect?.(prop.id);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds
      if (validProperties.length > 1) {
        const bounds = validProperties.reduce(
          (b, p) => b.extend([p.lng!, p.lat!]),
          new mapboxgl.default.LngLatBounds(
            [validProperties[0].lng!, validProperties[0].lat!],
            [validProperties[0].lng!, validProperties[0].lat!]
          )
        );
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      } else if (validProperties.length === 1) {
        mapRef.current.flyTo({
          center: [validProperties[0].lng!, validProperties[0].lat!],
          zoom: 13,
        });
      }
    });
  }, [properties, onPropertySelect, mapReady]);

  if (mapError) {
    return (
      <div className="w-full h-full bg-bg-secondary flex flex-col items-center justify-center gap-4 p-8">
        <div className="font-display text-text-muted text-sm uppercase tracking-widest">
          MAP UNAVAILABLE
        </div>
        <p className="text-text-muted text-xs font-mono text-center max-w-xs">
          Add your Mapbox token to <code>.env</code> as{" "}
          <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the interactive map.
        </p>
        <a
          href="https://account.mapbox.com/"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-mono text-accent-cyan hover:underline"
        >
          Get a free Mapbox token →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-bg-card/90 border border-border-subtle p-3 font-mono text-xs space-y-1.5">
        <div className="text-text-muted uppercase tracking-wider mb-2">Deal Score</div>
        {[
          { color: "#00ff41", label: "75+ · Strong" },
          { color: "#f59e0b", label: "50-74 · Moderate" },
          { color: "#ef4444", label: "< 50 · Weak" },
          { color: "#00d4ff", label: "No score yet" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 4px ${color}80` }}
            />
            <span className="text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
