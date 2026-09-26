import type { ReactNode } from "react";

interface CommitmentsDocumentLinkProps {
  href: string;
  children: ReactNode;
  "aria-current"?: "page";
}

// These private, server-rendered views deliberately use document navigation.
// It avoids speculative portfolio reads and cannot leave the selected view
// behind a stalled client-router transition. Authentication stays on the server.
export function CommitmentsDocumentLink({
  href,
  children,
  "aria-current": current,
}: CommitmentsDocumentLinkProps) {
  return <a aria-current={current} href={href}>{children}</a>;
}
