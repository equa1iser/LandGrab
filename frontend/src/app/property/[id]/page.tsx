import { Suspense } from "react";
import { PropertyDetailClient } from "@/components/property/PropertyDetailClient";

export default function PropertyPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen pt-14">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96 font-mono text-text-muted">
            <span className="animate-blink">█</span>&nbsp;LOADING INTELLIGENCE...
          </div>
        }
      >
        <PropertyDetailClient propertyId={params.id} />
      </Suspense>
    </div>
  );
}
