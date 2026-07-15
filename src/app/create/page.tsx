import type { Metadata } from "next";
import Link from "next/link";

import { CreateRouteChooser } from "@/components/create/create-route-chooser";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { readCreateMode } from "@/lib/create-routes";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Create",
  description:
    "Compare Moral Trade creation routes, inspect the required baseline and safety terms, and continue to a non-binding draft.",
  alternates: { canonical: "/create" },
  openGraph: {
    title: "Create a Moral Trade",
    description:
      "Choose a concrete coordination route, state the no-deal default, and review complete terms before authorization.",
    url: getAbsoluteUrl("/create"),
    type: "website",
  },
};

interface CreatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const selectedMode = readCreateMode(resolvedSearchParams.mode);
  const isAuthenticated = Boolean(viewer);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Create safely</span>
        <span>A draft is not a commitment. Authorization and settlement are separate states.</span>
        <Link href="/trust">Trust rules</Link>
      </div>

      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showSearch={false}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <CreateRouteChooser initialMode={selectedMode} isAuthenticated={isAuthenticated} />
      </main>

      <SiteFooter />
    </div>
  );
}
