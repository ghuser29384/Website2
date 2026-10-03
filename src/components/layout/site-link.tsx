import NextLink, { type LinkProps } from "next/link";
import type { ComponentPropsWithRef } from "react";

type SiteLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  href: string;
  prefetch?: LinkProps["prefetch"];
};

/** The homepage is a standalone HTML document, not an App Router RSC page. */
export function SiteLink({ href, prefetch, ...props }: SiteLinkProps) {
  if (/^\/(?:[?#]|$)/.test(href)) {
    // Native navigation avoids requesting a nonexistent Flight payload both
    // during prefetch and on click. Keep the URL, styling and anchor semantics.
    return <a {...props} href={href} />;
  }

  // Other destinations retain their existing Next.js navigation and prefetching.
  return <NextLink {...props} href={href} prefetch={prefetch} />;
}
