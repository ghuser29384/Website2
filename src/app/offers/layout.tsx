import type { ReactNode } from "react";

import densityStyles from "./offers-density.module.css";

export default function OffersLayout({ children }: { children: ReactNode }) {
  return <div className={densityStyles.scope}>{children}</div>;
}
