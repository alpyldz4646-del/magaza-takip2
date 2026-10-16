import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("@/pages/report-page"));

export const Route = createFileRoute("/rapor")({
  component: function ReportRoute() {
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  },
});
