"use client";

import { useFormStatus } from "react-dom";
export function PaymentSubmit({ children, pendingLabel = "Opening Stripe…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button className="button button-primary" type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingLabel : children}</button>;
}
