"use client";

import { useState } from "react";

export function InvitationShareControls({
  invitationUrl,
}: {
  invitationUrl: string;
}) {
  const [message, setMessage] = useState("");

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setMessage("Private link copied.");
    } catch {
      setMessage("Copy was unavailable. Open Preview and copy the address from your browser.");
    }
  }

  async function shareInvitation() {
    if (!navigator.share) {
      await copyInvitation();
      return;
    }

    try {
      await navigator.share({
        title: "Private Moral Trade invitation",
        text: "Inspect the complete terms before deciding whether to join.",
        url: invitationUrl,
      });
      setMessage("Share sheet opened.");
    } catch {
      // Closing the native share sheet is not an error the user needs to resolve.
    }
  }

  const emailHref = `mailto:?subject=${encodeURIComponent(
    "Private Moral Trade invitation",
  )}&body=${encodeURIComponent(
    `I invited you to inspect a bounded Moral Trade proposal. You can read every term before joining and the invitation creates no obligation.\n\n${invitationUrl}`,
  )}`;

  return (
    <div>
      <div className="form-actions">
        <button className="button button-primary button-mini" onClick={copyInvitation} type="button">
          Copy link
        </button>
        <button className="button button-secondary button-mini" onClick={shareInvitation} type="button">
          Share
        </button>
        <a className="button button-secondary button-mini" href={emailHref}>
          Email
        </a>
        <a
          className="button button-secondary button-mini"
          href={invitationUrl}
          rel="noreferrer"
          target="_blank"
        >
          Preview
        </a>
      </div>
      {message ? (
        <p aria-live="polite" className="route-text">
          {message}
        </p>
      ) : null}
    </div>
  );
}
