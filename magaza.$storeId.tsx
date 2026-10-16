import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("@/pages/store-page"));

export const Route = createFileRoute("/magaza/$storeId")({
  component: function StoreRoute() {
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  },
});
