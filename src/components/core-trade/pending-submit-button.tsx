"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  className = "button button-primary",
  pendingLabel = "Saving...",
  value,
  name,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  value?: string;
  name?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className={className}
      disabled={pending}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
