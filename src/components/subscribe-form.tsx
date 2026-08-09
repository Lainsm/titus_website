"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { subscribeAction } from "@/app/newsletter/actions";
import { initialSubscribeState } from "@/lib/form-states";

const NOTICE_ID = "nl-notice";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <>
      {/*
        aria-disabled rather than disabled: a disabled button drops out of the
        tab order, and the browser pulls focus back to <body> the moment it
        does — so pressing Enter to subscribe would cost you your place on the
        page. This stays focusable and refuses the second click instead.
      */}
      <button
        type="submit"
        className="button"
        aria-disabled={pending || undefined}
        onClick={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {pending ? "Wird gesendet …" : "Anmelden"}
      </button>
      {/* A label change on the focused element is not reliably announced. */}
      <p className="visually-hidden" role="status">
        {pending ? "Anmeldung wird gesendet …" : ""}
      </p>
    </>
  );
}

export function SubscribeForm() {
  const [state, formAction] = useActionState(
    subscribeAction,
    initialSubscribeState,
  );
  const noticeRef = useRef<HTMLDivElement>(null);

  /*
   * The success notice replaces the form, which unmounts the button that had
   * focus and strands the caret at the top of the document. Moving focus onto
   * the notice keeps the reader where they were and reads the result out.
   */
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

  const invalid = state.status === "error";

  return (
    <form action={formAction} className="subscribe-form">
      {state.status !== "idle" && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          id={NOTICE_ID}
          className={invalid ? "notice notice--error" : "notice"}
          role="alert"
        >
          {state.message}
        </div>
      )}

      <div className="subscribe-form__row">
        <div className="field">
          <label htmlFor="nl-name">Name (freiwillig)</label>
          <input
            id="nl-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Vorname Nachname"
          />
        </div>
        <div className="field">
          <label htmlFor="nl-email">E-Mail-Adresse</label>
          {/*
            The notice is the only place the problem is named, so the field
            points at it — otherwise tabbing back here after an error is
            silent.
          */}
          <input
            id="nl-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ihre@adresse.ch"
            aria-invalid={invalid || undefined}
            aria-describedby={state.status !== "idle" ? NOTICE_ID : undefined}
          />
        </div>
      </div>

      {/* Not display:none — some bots skip those. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="nl-website">Bitte leer lassen</label>
        <input id="nl-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <SubmitButton />
      </div>

      <p className="subscribe-form__note">
        Sie erhalten eine E-Mail zur Bestätigung. Kein Weiterverkauf der
        Adresse, keine Werbung, jederzeit abbestellbar. Näheres in der{" "}
        <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>
    </form>
  );
}
