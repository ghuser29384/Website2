import type { ReactNode } from "react";
import { Suspense } from "react";

import { OfferPlaneInlineMount } from "./offer-plane-inline-mount";
import densityStyles from "./offers-density.module.css";
import topbarStyles from "./offers-topbar.module.css";

export default function OffersLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${densityStyles.scope} ${topbarStyles.scope}`}>
      {children}
      <Suspense fallback={null}>
        <OfferPlaneInlineMount />
      </Suspense>
    </div>
  );
}
