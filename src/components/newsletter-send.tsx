"use client";

import { useState } from "react";
import {
  sendNewsletterAction,
  sendTestAction,
} from "@/app/admin/(app)/newsletter/actions";
import { initialSendState, type SendState } from "@/lib/form-states";

function makeFormData(id: number): FormData {
  const data = new FormData();
  data.set("id", String(id));
  return data;
}

/**
 * Sending happens in batches so no single request runs long enough to be cut
 * off by the host. This drives the batches one after another and shows
 * progress; deliveries are recorded server-side, so stopping and resuming —
 * or reloading the page — never sends anyone a second copy.
 */
export function NewsletterSendPanel({
  id,
  recipientCount,
  alreadySent,
  status,
}: {
  id: number;
  recipientCount: number;
  alreadySent: number;
  status: string;
}) {
  const [testState, setTestState] = useState<SendState | null>(null);
  const [testPending, setTestPending] = useState(false);

  const [progress, setProgress] = useState<SendState | null>(null);
  const [sending, setSending] = useState(false);
  const [delivered, setDelivered] = useState(alreadySent);

  const outstanding = recipientCount - delivered;
  const finished = status === "sent" || progress?.done === true;

  async function sendTest() {
    setTestPending(true);
    try {
      setTestState(await sendTestAction(initialSendState, makeFormData(id)));
    } catch (error) {
      setTestState({
        ...initialSendState,
        error: error instanceof Error ? error.message : "Sending failed.",
      });
    } finally {
      setTestPending(false);
    }
  }

  async function sendToEveryone() {
    const subject =
      document.querySelector<HTMLInputElement>("#subject")?.value ?? "";
    if (
      !window.confirm(
        `Send «${subject}» to ${outstanding} subscribers? This cannot be undone.`,
      )
    ) {
      return;
    }

    setSending(true);
    try {
      // Keep asking for another batch until the server reports it is done.
      for (;;) {
        const result = await sendNewsletterAction(
          initialSendState,
          makeFormData(id),
        );
        setProgress(result);
        setDelivered((previous) => previous + result.sent);
        if (result.error || result.done || result.remaining === 0) break;
      }
    } catch (error) {
      setProgress({
        ...initialSendState,
        error: error instanceof Error ? error.message : "Sending failed.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="panel">
        <p className="panel__title">Test</p>
        <button
          type="button"
          className="button button--ghost button--small"
          disabled={testPending}
          onClick={sendTest}
        >
          {testPending ? "Sending …" : "Send a test to myself"}
        </button>
        {testState && (testState.message || testState.error) && (
          <p
            className={`field__hint field__hint--after${
              testState.error ? " field__hint--error" : ""
            }`}
          >
            {testState.error || testState.message}
          </p>
        )}
        <p className="field__hint field__hint--after">
          Save the draft first — the test uses the saved version.
        </p>
      </div>

      <div className="panel">
        <p className="panel__title">Send</p>

        <p className="send-count">
          <span className="stat__value stat__value--inline">
            {Math.max(outstanding, 0)}
          </span>
          <span className="label">
            {outstanding === 1 ? "subscriber waiting" : "subscribers waiting"}
          </span>
        </p>

        {delivered > 0 && (
          <p className="field__hint field__hint--before">
            Already delivered to {delivered} of {recipientCount}.
          </p>
        )}

        {finished ? (
          <div className="notice notice--success">
            This issue has gone out to the whole list.
          </div>
        ) : (
          <>
            <button
              type="button"
              className="button"
              disabled={sending || outstanding <= 0}
              onClick={sendToEveryone}
            >
              {sending ? "Sending …" : `Send to ${outstanding} subscribers`}
            </button>

            {outstanding <= 0 && (
              <p className="field__hint field__hint--after">
                Nobody has confirmed their subscription yet.
              </p>
            )}
          </>
        )}

        {progress && (progress.message || progress.error) && (
          <p
            className={`field__hint field__hint--after${
              progress.error ? " field__hint--error" : ""
            }`}
          >
            {progress.error || progress.message}
            {progress.failed > 0 && ` ${progress.failed} failed.`}
          </p>
        )}

        {sending && (
          <p className="field__hint field__hint--after">
            Keep this page open until it finishes.
          </p>
        )}
      </div>
    </>
  );
}
