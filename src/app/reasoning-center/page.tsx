import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reasoning Center",
  description:
    "A Moral Trade forum-style index for essays, quick takes, open questions, and review notes about cooperation under moral disagreement.",
  alternates: {
    canonical: "/reasoning-center",
  },
  openGraph: {
    title: "Reasoning Center",
    description:
      "Forum-style reasoning, debates, questions, and governance notes for the Moral Trade pilot.",
    url: getAbsoluteUrl("/reasoning-center"),
    type: "website",
  },
};

const navSections = [
  { label: "All reasoning", count: 126 },
  { label: "Frontpage", count: 42 },
  { label: "Trade design", count: 31 },
  { label: "Public goods", count: 24 },
  { label: "Safety review", count: 18 },
  { label: "Quick takes", count: 37 },
  { label: "Sequences", count: 8 },
] as const;

const postTabs = ["New & upvoted", "Curated", "Questions", "Debates", "Sequences"] as const;

const topics = [
  "Donation offsets",
  "Pledge swaps",
  "Anti-threat rules",
  "Public goods fund",
  "Evidence design",
  "Moral uncertainty",
] as const;

const posts = [
  {
    votes: 72,
    comments: 19,
    title: "A stronger baseline test for donation offsets",
    author: "Mira Chen",
    date: "May 24",
    tags: ["Donation offsets", "Baselines"],
    excerpt:
      "The hard part is not proving that a gift happened. It is proving the matched redirection was not replacing an action the donor was already going to take.",
  },
  {
    votes: 58,
    comments: 14,
    title: "When a pledge swap becomes pressure rather than cooperation",
    author: "Samir Patel",
    date: "May 23",
    tags: ["Safety review", "Pledge swaps"],
    excerpt:
      "This note proposes warning signs for trades that begin voluntary but drift into coercive renegotiation, social penalty, or reputational leverage.",
  },
  {
    votes: 47,
    comments: 11,
    title: "Public goods fund governance: publish dissent before allocation",
    author: "Elena Roth",
    date: "May 22",
    tags: ["Public goods", "Governance"],
    excerpt:
      "A threshold public-good cycle should expose unresolved objections, not merely final percentages. Dissent is part of the evidence environment.",
  },
  {
    votes: 39,
    comments: 8,
    title: "What counts as evidence for a month-long action?",
    author: "Jon Bell",
    date: "May 21",
    tags: ["Evidence design", "Review"],
    excerpt:
      "Receipts, public logs, dated attestations, and third-party records each fail differently. The review rule should name the failure mode in advance.",
  },
  {
    votes: 33,
    comments: 6,
    title: "Should party-relative scores ever appear in search ranking?",
    author: "Nadia Okafor",
    date: "May 20",
    tags: ["Ranking", "Moral uncertainty"],
    excerpt:
      "A score can help counterparties find each other while still becoming a de facto platform ranking. This is a proposal for keeping that line bright.",
  },
] as const;

const quickTakes = [
  {
    author: "Ravi M.",
    text: "I would like every worked example to show the no-trade default in the first viewport, not only in the detail view.",
  },
  {
    author: "Ada L.",
    text: "Challenge windows need a visible close time. Otherwise pending review reads like quiet endorsement.",
  },
  {
    author: "Theo G.",
    text: "Public-goods pools should have one sentence explaining why a non-participant moral view might still object.",
  },
] as const;

const openQuestions = [
  "Can offset matching distinguish counterfactual change from already-planned giving?",
  "Which third-party harms should give standing to challenge a private agreement?",
  "When should political-adjacent trades be rejected rather than sandboxed as examples?",
] as const;

const notices = [
  "Reviewer notes for the first donation-offset templates are open for comment.",
  "The next public-goods fund cycle is collecting candidate-pool objections.",
  "Founding cohort participants can propose one forum question for the next review call.",
] as const;

export default async function ReasoningCenterPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);

  return (
    <div className="page-shell reasoning-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(isAuthenticated)}
        {...getTopbarActions(isAuthenticated)}
        showLogout={isAuthenticated}
        showSearch
      />

      <main className="reasoning-layout" id="main-content" tabIndex={-1}>
        <aside className="reasoning-left-rail" aria-label="Reasoning sections">
          <Link className="reasoning-new-post" href={isAuthenticated ? "/dashboard" : "/signup"}>
            New post
          </Link>
          <nav className="reasoning-side-nav" aria-label="Reasoning center navigation">
            {navSections.map((section, index) => (
              <Link
                aria-current={index === 0 ? "page" : undefined}
                href="/reasoning-center"
                key={section.label}
              >
                <span>{section.label}</span>
                <small>{section.count}</small>
              </Link>
            ))}
          </nav>
          <section className="reasoning-rail-block" aria-labelledby="sequences-heading">
            <h2 id="sequences-heading">Sequences</h2>
            <Link href="/reasoning-center">Donation-offset design</Link>
            <Link href="/reasoning-center">Anti-threat review</Link>
            <Link href="/reasoning-center">Public-goods governance</Link>
          </section>
        </aside>

        <section className="reasoning-feed" aria-labelledby="reasoning-title">
          <header className="reasoning-feed-head">
            <div>
              <p className="eyebrow">Forum index</p>
              <h1 id="reasoning-title">Reasoning Center</h1>
              <p>
                Essays, quick takes, questions, and reviewer notes for making moral trades
                legible before anyone relies on them.
              </p>
            </div>
            <Link className="button button-primary" href="/reasoning-standards">
              Standards
            </Link>
          </header>

          <div className="reasoning-tabs" aria-label="Feed filters">
            {postTabs.map((tab, index) => (
              <Link aria-current={index === 0 ? "page" : undefined} href="/reasoning-center" key={tab}>
                {tab}
              </Link>
            ))}
          </div>

          <div className="reasoning-topic-strip" aria-label="Topics">
            {topics.map((topic) => (
              <Link href="/reasoning-center" key={topic}>
                {topic}
              </Link>
            ))}
          </div>

          <div className="reasoning-post-list" aria-label="Reasoning posts">
            {posts.map((post, index) => (
              <article className="reasoning-post-row" key={post.title}>
                <div className="reasoning-vote-box" aria-label={`${post.votes} votes`}>
                  <span>{post.votes}</span>
                  <small>karma</small>
                </div>
                <div className="reasoning-post-main">
                  <div className="reasoning-post-rank">#{index + 1}</div>
                  <h2>
                    <Link href="/reasoning-center">{post.title}</Link>
                  </h2>
                  <p>{post.excerpt}</p>
                  <div className="reasoning-post-meta">
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                    <span>{post.comments} comments</span>
                    {post.tags.map((tag) => (
                      <Link href="/reasoning-center" key={tag}>
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="reasoning-right-rail" aria-label="Reasoning center sidebar">
          <section className="reasoning-widget">
            <div className="reasoning-widget-head">
              <h2>Quick takes</h2>
              <Link href="/reasoning-center">View all</Link>
            </div>
            <div className="quick-take-list">
              {quickTakes.map((take) => (
                <article className="quick-take" key={take.text}>
                  <p>{take.text}</p>
                  <span>{take.author}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="reasoning-widget">
            <div className="reasoning-widget-head">
              <h2>Open questions</h2>
              <Link href="/reasoning-center">Ask</Link>
            </div>
            <ol className="reasoning-question-list">
              {openQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </section>

          <section className="reasoning-widget reasoning-standards-widget">
            <h2>Reasoning standards</h2>
            <p>
              Separate claims about moral value, evidence quality, counterfactual baselines, and
              safety boundaries before publishing a trade.
            </p>
            <Link className="inline-link" href="/reasoning-standards">
              Read standards
            </Link>
          </section>

          <section className="reasoning-widget">
            <h2>Community notices</h2>
            <ul className="reasoning-notice-list">
              {notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </section>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}
