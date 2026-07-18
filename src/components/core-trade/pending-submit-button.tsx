"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  className = "button button-primary",
  disabled = false,
  pendingLabel = "Saving...",
  value,
  name,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel?: string;
  value?: string;
  name?: string;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      aria-disabled={isDisabled}
      className={className}
      disabled={isDisabled}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
