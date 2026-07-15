import type { ReactNode } from "react";
import { Suspense } from "react";

import { OfferPlaneInlineMount } from "./offer-plane-inline-mount";

export default function OffersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <OfferPlaneInlineMount />
      </Suspense>
    </>
  );
}
