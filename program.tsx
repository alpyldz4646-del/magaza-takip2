import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Page = lazy(() => import("@/pages/program-page"));

export const Route = createFileRoute("/program")({
  component: function ProgramRoute() {
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  },
});
