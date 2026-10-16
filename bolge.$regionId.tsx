import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("@/pages/region-page"));

export const Route = createFileRoute("/bolge/$regionId")({
  component: function RegionRoute() {
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  },
});
