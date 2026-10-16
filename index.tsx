import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("@/pages/home-page"));

export const Route = createFileRoute("/")({
  component: function HomeRoute() {
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  },
});
