import type { ReactNode } from "react";

import densityStyles from "./offers-density.module.css";
import topbarStyles from "./offers-topbar.module.css";

export default function OffersLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${densityStyles.scope} ${topbarStyles.scope}`}>
      {children}
    </div>
  );
}
