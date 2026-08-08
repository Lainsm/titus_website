"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeAction } from "@/app/newsletter/actions";
import { initialSubscribeState } from "@/lib/form-states";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      {pending ? "Wird gesendet …" : "Anmelden"}
    </button>
  );
}

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction] = useActionState(
    subscribeAction,
    initialSubscribeState,
  );

  if (state.status === "success") {
    return (
      <div className="notice notice--success" role="status">
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="subscribe-form">
      {state.status !== "idle" && (
        <div
          className={
            state.status === "error" ? "notice notice--error" : "notice"
          }
          role="alert"
        >
          {state.message}
        </div>
      )}

      <div className="subscribe-form__row">
        {!compact && (
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
        )}
        <div className="field">
          <label htmlFor="nl-email">E-Mail-Adresse</label>
          <input
            id="nl-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ihre@adresse.ch"
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
