import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const faqDescription =
  "Plain-language answers about Moral Trade offers, worked examples, evidence review, payments, privacy, and safety.";

export const metadata: Metadata = {
  title: "FAQ",
  description: faqDescription,
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "Moral Trade FAQ",
    description: faqDescription,
    url: getAbsoluteUrl("/faq"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moral Trade FAQ",
    description: faqDescription,
  },
};

const faqs = [
  {
    question: "Are worked examples live offers?",
    answer:
      "No. Worked examples show how terms should be structured. They do not count as live marketplace liquidity.",
  },
  {
    question: "Does Moral Trade hold money?",
    answer:
      "No. Public flows use external-payment evidence unless a provider-approved checkout is explicitly live and reviewed.",
  },
  {
    question: "Is this legal, tax, or escrow advice?",
    answer:
      "No. The service does not provide legal, tax, escrow, custody, investment, or charity-evaluator services.",
  },
  {
    question: "What gets blocked?",
    answer:
      "Threats, coercion, harassment, doxxing, fraud, illegal asks, and political campaign contribution offsets are outside the platform boundary.",
  },
  {
    question: "Does Moral Trade decide which moral view is correct?",
    answer:
      "No. Each participant evaluates the proposed change by their own values. The service checks structure, evidence, safety, privacy, and review state rather than imposing a platform moral ranking.",
  },
] as const;

export default async function FaqPage() {
  const viewer = await getViewer();
  const faqStructuredData = buildFaqPageJsonLd({
    description: faqDescription,
    faqs,
    name: "Moral Trade FAQ",
    path: "/faq",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([{ href: "/faq", label: "FAQ" }]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <Breadcrumbs items={[{ href: "/faq", label: "FAQ" }]} />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">FAQ</p>
        <h1>Common questions about Moral Trade</h1>
        <p>
          Short answers for visitors who want to understand the service without first reading the
          full methodology.
        </p>
        <div className="faq-list">
          {faqs.map((item) => (
            <section className="panel faq-item" key={item.question}>
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </section>
          ))}
        </div>
        <section className="section section-white">
          <SectionHeader eyebrow="Next steps" title="Read the standards or inspect examples." />
          <div className="hero-actions">
            <Link className="button button-primary" href="/worked-examples">
              View worked examples
            </Link>
            <Link className="button button-secondary" href="/methodology">
              Read methodology
            </Link>
            <Link className="button button-secondary" href="/safety">
              Safety rules
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
