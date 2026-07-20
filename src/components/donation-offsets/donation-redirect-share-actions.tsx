"use client";

import { useMemo, useState } from "react";

import styles from "./donation-redirect-impact-flow.module.css";

export interface DonationRedirectReceiptImageContent {
  headline: string;
  originSummary: string;
  viewerDestination: string;
  viewerImpact: string;
  matchDestination: string;
  matchImpact: string;
  combinedImpact: string;
  receiptMeta: string;
}

export interface DonationRedirectShareActionsProps {
  allowOriginalDestinationDisclosure?: boolean;
  disabledReason?: string | null;
  disclosedShareText?: string | null;
  downloadFileName?: string;
  genericShareText: string;
  image: DonationRedirectReceiptImageContent;
  originalDestinationDisclosureLabel?: string;
  publicUrl?: string | null;
  title: string;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Copy is unavailable in this browser.");
  }
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maximumWidth: number,
) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maximumWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawWrappedCanvasText({
  context,
  value,
  x,
  y,
  maximumWidth,
  lineHeight,
  maximumLines,
}: {
  context: CanvasRenderingContext2D;
  value: string;
  x: number;
  y: number;
  maximumWidth: number;
  lineHeight: number;
  maximumLines: number;
}) {
  const lines = wrapCanvasText(context, value, maximumWidth).slice(0, maximumLines);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function buildReceiptImage(content: DonationRedirectReceiptImageContent) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Image export is unavailable in this browser."));
      return;
    }

    context.fillStyle = "#f3f5f0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d9ddd5";
    context.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 40) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 40) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    context.fillStyle = "#121413";
    context.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText("MORAL TRADE · DONATION REDIRECT", 64, 62);

    context.fillStyle = "#5748ff";
    context.fillRect(940, 34, 196, 46);
    context.fillStyle = "#ffffff";
    context.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText("✓ COMPLETED", 970, 64);

    context.fillStyle = "#121413";
    context.font = "700 48px Arial, sans-serif";
    drawWrappedCanvasText({
      context,
      value: content.headline,
      x: 64,
      y: 130,
      maximumWidth: 1040,
      lineHeight: 52,
      maximumLines: 2,
    });

    context.fillStyle = "#454a46";
    context.font = "22px Arial, sans-serif";
    drawWrappedCanvasText({
      context,
      value: content.originSummary,
      x: 64,
      y: 235,
      maximumWidth: 1040,
      lineHeight: 28,
      maximumLines: 2,
    });

    const cards = [
      {
        x: 64,
        label: "FUNDED BY YOU",
        destination: content.viewerDestination,
        impact: content.viewerImpact,
      },
      {
        x: 614,
        label: "FUNDED BY YOUR MATCH",
        destination: content.matchDestination,
        impact: content.matchImpact,
      },
    ];

    for (const card of cards) {
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#8e948c";
      context.fillRect(card.x, 294, 522, 176);
      context.strokeRect(card.x, 294, 522, 176);
      context.fillStyle = "#6b716c";
      context.font = "700 16px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillText(card.label, card.x + 22, 327);
      context.fillStyle = "#121413";
      context.font = "700 27px Arial, sans-serif";
      const destinationBottom = drawWrappedCanvasText({
        context,
        value: card.destination,
        x: card.x + 22,
        y: 365,
        maximumWidth: 478,
        lineHeight: 30,
        maximumLines: 2,
      });
      context.fillStyle = "#3e31d5";
      context.font = "700 22px Arial, sans-serif";
      drawWrappedCanvasText({
        context,
        value: card.impact,
        x: card.x + 22,
        y: Math.min(destinationBottom + 10, 442),
        maximumWidth: 478,
        lineHeight: 26,
        maximumLines: 2,
      });
    }

    context.fillStyle = "#121413";
    context.font = "700 24px Arial, sans-serif";
    drawWrappedCanvasText({
      context,
      value: content.combinedImpact,
      x: 64,
      y: 515,
      maximumWidth: 1060,
      lineHeight: 28,
      maximumLines: 2,
    });

    context.fillStyle = "#6b716c";
    context.font = "17px Arial, sans-serif";
    context.fillText(content.receiptMeta, 64, 584);
    context.textAlign = "right";
    context.fillText("Agree on the deal, not the values. · moraltrade.org", 1136, 584);
    context.textAlign = "left";

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The receipt image could not be created."));
    }, "image/png");
  });
}

export function DonationRedirectShareActions({
  allowOriginalDestinationDisclosure = true,
  disabledReason,
  disclosedShareText,
  downloadFileName = "moral-trade-donation-redirect.png",
  genericShareText,
  image,
  originalDestinationDisclosureLabel =
    "Include the original political destinations in shared text",
  publicUrl,
  title,
}: DonationRedirectShareActionsProps) {
  const [includeOriginalDestinations, setIncludeOriginalDestinations] = useState(false);
  const [status, setStatus] = useState("");
  const sharingDisabled = Boolean(disabledReason);
  const shareText = useMemo(
    () =>
      includeOriginalDestinations && disclosedShareText
        ? disclosedShareText
        : genericShareText,
    [disclosedShareText, genericShareText, includeOriginalDestinations],
  );
  const shareValue = [shareText, publicUrl].filter(Boolean).join(" ");

  async function shareReceipt() {
    if (sharingDisabled) return;
    setStatus("");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text: shareText, url: publicUrl ?? undefined });
        setStatus("Share sheet opened.");
      } else {
        await copyText(shareValue);
        setStatus("Share text copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("Share canceled.");
      } else {
        setStatus("Sharing was unavailable. Try copying the text instead.");
      }
    }
  }

  async function copyReceipt() {
    if (sharingDisabled) return;
    setStatus("");
    try {
      await copyText(shareValue);
      setStatus("Share text copied.");
    } catch {
      setStatus("Copying is unavailable in this browser.");
    }
  }

  async function downloadReceipt() {
    if (sharingDisabled) return;
    setStatus("");
    try {
      const blob = await buildReceiptImage(image);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      setStatus("Receipt image downloaded.");
    } catch {
      setStatus("Image download is unavailable in this browser.");
    }
  }

  return (
    <section className={styles.sharePanel} aria-label="Share completed redirection">
      {allowOriginalDestinationDisclosure && disclosedShareText ? (
        <label className={styles.disclosureControl}>
          <input
            checked={includeOriginalDestinations}
            disabled={sharingDisabled}
            onChange={(event) => setIncludeOriginalDestinations(event.target.checked)}
            type="checkbox"
          />
          <span>{originalDestinationDisclosureLabel}</span>
        </label>
      ) : null}

      <div className={styles.shareActions}>
        <button
          className={`button button-primary ${styles.shareButton}`}
          disabled={sharingDisabled}
          onClick={shareReceipt}
          type="button"
        >
          Share receipt
        </button>
        <button
          className={`button button-secondary ${styles.shareButton}`}
          disabled={sharingDisabled}
          onClick={copyReceipt}
          type="button"
        >
          Copy share text
        </button>
        <button
          className={`button button-secondary ${styles.shareButton}`}
          disabled={sharingDisabled}
          onClick={downloadReceipt}
          type="button"
        >
          Download image
        </button>
      </div>

      <p className={styles.shareStatus} role="status" aria-live="polite">
        {disabledReason ?? status}
      </p>
    </section>
  );
}
