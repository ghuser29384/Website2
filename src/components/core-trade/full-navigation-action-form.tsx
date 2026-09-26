"use client";

import type {
  ComponentPropsWithoutRef,
  FormEvent,
} from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

export function FullNavigationActionForm({
  action,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"form">, "action" | "onSubmit"> & {
  action: ServerAction;
}) {
  function submitWithFullNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (
      (submitter instanceof HTMLButtonElement ||
        submitter instanceof HTMLInputElement) &&
      submitter.name
    ) {
      const submittedValue = document.createElement("input");
      submittedValue.type = "hidden";
      submittedValue.name = submitter.name;
      submittedValue.value = submitter.value;
      form.append(submittedValue);
    }

    HTMLFormElement.prototype.submit.call(form);
  }

  return (
    <form action={action} onSubmit={submitWithFullNavigation} {...props}>
      {children}
    </form>
  );
}
