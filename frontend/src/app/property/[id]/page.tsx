import { Suspense } from "react";
import { PropertyDetailClient } from "@/components/property/PropertyDetailClient";
import { Spinner } from "@/components/ui/Spinner";

export default function PropertyPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen pt-14">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <Spinner size="lg" color="green" label="Loading intelligence..." />
          </div>
        }
      >
        <PropertyDetailClient propertyId={params.id} />
      </Suspense>
    </div>
  );
}
