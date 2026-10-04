import NextLink, { type LinkProps } from "next/link";
import type { ComponentPropsWithRef } from "react";

type SiteLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  href: string;
  prefetch?: LinkProps["prefetch"];
};

/** These routes are standalone HTML documents, not App Router RSC pages. */
export function SiteLink({ href, prefetch, ...props }: SiteLinkProps) {
  if (/^\/(?:feed\/?|discover\/?|walkthrough\/?)?(?:[?#]|$)/.test(href)) {
    // Native navigation avoids requesting a nonexistent Flight payload both
    // during prefetch and on click. Keep the URL, styling and anchor semantics.
    return <a {...props} href={href} />;
  }

  // Other destinations retain their existing Next.js navigation and prefetching.
  return <NextLink {...props} href={href} prefetch={prefetch} />;
}
