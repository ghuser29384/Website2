"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

type ImportStatus = {
  tone: "idle" | "error" | "success";
  text: string;
};

export function ProfilePortabilityPanel() {
  const [payload, setPayload] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ImportStatus>({
    tone: "idle",
    text: "Import a Moral Trade profile export when you want to restore or migrate your wish registry data.",
  });

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setPayload(text);
    setStatus({
      tone: "idle",
      text: `${file.name} is loaded locally. Review the JSON before importing it.`,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setStatus({
        tone: "error",
        text: "Import failed before upload: the payload is not valid JSON.",
      });
      return;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setStatus({
        tone: "error",
        text: "Import failed before upload: the payload must be a JSON object.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ tone: "idle", text: "Importing profile data..." });

    try {
      const response = await fetch("/api/profile/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...(parsed as Record<string, unknown>),
          replaceExisting,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; importedCounts?: Record<string, number> }
        | null;

      if (!response.ok) {
        setStatus({
          tone: "error",
          text: body?.error ?? "Import failed. Check the export format and try again.",
        });
        return;
      }

      const importedCounts = body?.importedCounts ?? {};
      const totalImported = Object.values(importedCounts).reduce(
        (sum, value) => sum + (Number.isFinite(value) ? value : 0),
        0,
      );
      setStatus({
        tone: "success",
        text: `Import complete. ${totalImported} record group(s) were processed.`,
      });
    } catch {
      setStatus({
        tone: "error",
        text: "Import failed because the request could not reach the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section section-subtle" id="data-portability">
      <div className="section-head">
        <p className="eyebrow">Data portability</p>
        <h2>Export or import your wish registry data</h2>
        <p>
          The profile export includes records readable by your signed-in profile. Import accepts the
          same JSON shape so members can migrate wish profiles, source notes, saved searches, and
          background-networking settings.
        </p>
      </div>

      <div className="editorial-grid editorial-grid-wide">
        <article className="panel editorial-card">
          <h3>Export</h3>
          <p>
            Download a JSON record of your public profile, wish profile, wish entries, manual
            source notes, saved searches, privacy grants, and related background-networking data.
          </p>
          <div className="offer-actions">
            <a className="button button-primary button-mini" href="/api/profile/export">
              Export profile JSON
            </a>
            <a className="button button-secondary button-mini" href="/api/profile/schema">
              View schema
            </a>
          </div>
        </article>

        <article className="panel editorial-card">
          <h3>Import</h3>
          <form className="compact-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Profile export JSON</span>
              <textarea
                name="profile_export_json"
                onChange={(event) => setPayload(event.target.value)}
                placeholder='{"wishProfile": {"causes": ["Animal welfare"]}, "wishEntries": []}'
                rows={8}
                value={payload}
              />
            </label>
            <label className="field">
              <span>Load JSON file</span>
              <input accept="application/json,.json" onChange={handleFileChange} type="file" />
            </label>
            <label className="checkbox-label">
              <input
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                type="checkbox"
              />
              <span>Replace existing portable records before import</span>
            </label>
            <button className="button button-primary button-mini" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Importing..." : "Import profile JSON"}
            </button>
            <div
              aria-live="polite"
              className={
                status.tone === "idle"
                  ? "panel-note"
                  : `status-banner ${
                      status.tone === "error" ? "status-banner-error" : "status-banner-success"
                    }`
              }
            >
              {status.text}
            </div>
          </form>
        </article>
      </div>
    </section>
  );
}
