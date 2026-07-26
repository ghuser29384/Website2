"use client";

import { useFormStatus } from "react-dom";

export function CollectiveSubmitButton({
  children,
  pendingLabel,
  secondary = false,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  secondary?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`button ${secondary ? "button-secondary" : "button-primary"}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
