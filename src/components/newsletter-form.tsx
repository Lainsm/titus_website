"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveNewsletterAction } from "@/app/admin/(app)/newsletter/actions";
import { initialNewsletterFormState } from "@/lib/form-states";
import { Editor } from "@/components/editor";

function SaveButton({ label = "Save draft" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button button--ghost" disabled={pending}>
      {pending ? "Saving …" : label}
    </button>
  );
}

export function NewsletterForm({
  id,
  subject,
  intro,
  bodyHtml,
  readOnly = false,
  savedNotice = false,
  children,
}: {
  id?: number;
  subject: string;
  intro: string;
  bodyHtml: string;
  readOnly?: boolean;
  savedNotice?: boolean;
  /** Sending panel, rendered in the sidebar next to the draft controls. */
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(
    saveNewsletterAction,
    initialNewsletterFormState,
  );

  return (
    <form action={formAction} className="admin-form">
      {id && <input type="hidden" name="id" value={id} />}

      <div className="admin-form__main">
        {(state.error || state.message || savedNotice) && (
          <div
            className={state.error ? "notice notice--error" : "notice notice--success"}
            role={state.error ? "alert" : "status"}
          >
            {state.error || state.message || "Saved."}
          </div>
        )}

        {readOnly && (
          <div className="notice">
            This issue has been sent. It is kept here as a record and can no
            longer be changed.
          </div>
        )}

        <div className="field">
          <label htmlFor="subject">Subject line</label>
          <input
            id="subject"
            name="subject"
            className="title-input"
            defaultValue={subject}
            required
            disabled={readOnly}
            placeholder="Ein neuer Text ist erschienen"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="intro">Preview line</label>
          <input
            id="intro"
            name="intro"
            defaultValue={intro}
            disabled={readOnly}
            placeholder="The grey line mail apps show next to the subject"
            autoComplete="off"
          />
          <p className="field__hint">
            Shown in the inbox list after the subject. Keep it under about 90
            characters.
          </p>
        </div>

        {readOnly ? (
          <div
            className="panel prose"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <Editor
            initialHtml={bodyHtml}
            placeholder="Liebe Leserinnen und Leser …"
          />
        )}
      </div>

      <div className="admin-form__side">
        {!readOnly && (
          <div className="panel">
            <p className="panel__title">Draft</p>
            <SaveButton />
            <p className="field__hint" style={{ marginTop: "var(--space-4)" }}>
              Save before sending — sending uses the last saved version.
            </p>
          </div>
        )}
        {children}
      </div>
    </form>
  );
}
