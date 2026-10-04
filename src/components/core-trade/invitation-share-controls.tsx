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
      setMessage("We couldn’t copy the link. You can open Preview and copy the address from your browser.");
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
        text: "Take a look at the terms and decide whether you’d like to join.",
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
    `I’d like to invite you to a proposal on Moral Trade. Take a look at the terms and see what you think. There’s no obligation to join.\n\n${invitationUrl}`,
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
