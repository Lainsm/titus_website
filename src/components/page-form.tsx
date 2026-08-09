"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePageAction } from "@/app/admin/(app)/pages/actions";
import { initialPageFormState } from "@/lib/form-states";
import { Editor } from "@/components/editor";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      {pending ? "Saving …" : "Save page"}
    </button>
  );
}

export function PageForm({
  slug,
  title,
  bodyHtml,
}: {
  slug: string;
  title: string;
  bodyHtml: string;
}) {
  const [state, formAction] = useActionState(
    savePageAction,
    initialPageFormState,
  );

  return (
    <form action={formAction} className="admin-form">
      <input type="hidden" name="slug" value={slug} />

      <div className="admin-form__main">
        {(state.error || state.message) && (
          <div
            className={state.error ? "notice notice--error" : "notice notice--success"}
            role={state.error ? "alert" : "status"}
          >
            {state.error || state.message}
          </div>
        )}

        <div className="field">
          <label htmlFor="title">Heading</label>
          <input
            id="title"
            name="title"
            className="title-input"
            defaultValue={title}
            autoComplete="off"
          />
        </div>

        <Editor initialHtml={bodyHtml} placeholder="Text der Seite …" />
      </div>

      <div className="admin-form__side">
        <div className="panel">
          <p className="panel__title">Publishing</p>
          <p className="field__hint field__hint--before">
            Standing pages go live as soon as you save — there is no draft
            state for them.
          </p>
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
