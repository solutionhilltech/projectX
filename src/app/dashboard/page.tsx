import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
import { BrandMark } from "@/components/brand-mark";

/**
 * Server Component. The static branding below renders on the server and is
 * passed into the client dashboard as a prop, so it costs no client JS.
 * Suspense is required here because Dashboard reads the active tab from the
 * URL via useSearchParams.
 */
export default function Page() {
  return (
    <Suspense>
      <Dashboard brand={<BrandMark dark />} />
    </Suspense>
  );
}
