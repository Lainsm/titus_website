"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { contactAction } from "@/app/kontakt/actions";
import { initialContactState } from "@/lib/form-states";

const NOTICE_ID = "kontakt-notice";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <>
      {/* aria-disabled, not disabled — see subscribe-form.tsx: disabling the
          focused button hands focus back to <body> mid-submit. */}
      <button
        type="submit"
        className="button"
        aria-disabled={pending || undefined}
        onClick={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {pending ? "Wird gesendet …" : "Nachricht senden"}
      </button>
      <p className="visually-hidden" role="status">
        {pending ? "Nachricht wird gesendet …" : ""}
      </p>
    </>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(contactAction, initialContactState);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") noticeRef.current?.focus();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div
        ref={noticeRef}
        tabIndex={-1}
        className="notice notice--success"
        role="status"
      >
        {state.message}
      </div>
    );
  }

  const failed = state.status === "error";
  // Only the field the server named is marked invalid; a bad address should
  // not paint the message box red as well.
  const describedBy = (field: string) =>
    failed && state.field === field ? NOTICE_ID : undefined;
  const invalid = (field: string) =>
    failed && state.field === field ? true : undefined;

  return (
    <form action={formAction} className="contact-form">
      {failed && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          id={NOTICE_ID}
          className="notice notice--error"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <div className="contact-form__row">
        <div className="field">
          <label htmlFor="kontakt-name">Name (freiwillig)</label>
          <input
            id="kontakt-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
          />
        </div>
        <div className="field">
          <label htmlFor="kontakt-email">E-Mail-Adresse</label>
          <input
            id="kontakt-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            aria-invalid={invalid("email")}
            aria-describedby={describedBy("email")}
          />
        </div>
      </div>

      <div className="field">
        {/* Not just "Nachricht": the section eyebrow above already reads that,
            and two identical labels for two different things is the confusion
            2.4.6 exists to catch. */}
        <label htmlFor="kontakt-message">Ihre Nachricht</label>
        <textarea
          id="kontakt-message"
          name="message"
          required
          rows={9}
          maxLength={5000}
          aria-invalid={invalid("message")}
          aria-describedby={describedBy("message")}
        />
      </div>

      {/* Not display:none — some bots skip those. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="kontakt-website">Bitte leer lassen</label>
        <input
          id="kontakt-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
