"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that asks first. Used for anything destructive — deleting a
 * text, sending a newsletter to everyone.
 */
export function ConfirmButton({
  message,
  children,
  className = "button",
  name,
  value,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? "Working …" : children}
    </button>
  );
}
