"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { savePostAction } from "@/app/admin/(app)/texts/actions";
import { initialPostFormState } from "@/lib/form-states";
import { Editor } from "@/components/editor";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/site";
import { slugify } from "@/lib/slug";

type PostFormValues = {
  id?: number;
  title: string;
  subtitle: string;
  category: string;
  lead: string;
  slug: string;
  body_html: string;
  status: "draft" | "published";
  published_at: string | null;
};

function ActionButton({
  intent,
  children,
  variant = "",
}: {
  intent: string;
  children: React.ReactNode;
  variant?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      className={`button ${variant}`}
      disabled={pending}
    >
      {pending ? "Working …" : children}
    </button>
  );
}

/** yyyy-MM-ddTHH:mm for <input type="datetime-local">. */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/*
 * The wall clock above, resolved to an actual instant — and it has to happen
 * here, in the browser, because that is the only place that knows which zone
 * the author meant.
 *
 * A `datetime-local` value carries no offset, so `new Date()` resolves it
 * against whatever zone the code runs in. toLocalInput writes the field in the
 * editor's zone; a server parsing that same string resolves it in the host's,
 * which on a Linux box is UTC and not where the author is sitting. The two
 * disagree by the offset between them, and because the field is read back and
 * rewritten on every save the error compounds: two hours per save through a
 * Swiss summer. Since every public query gates on `published_at <= now()`,
 * a couple of edits are enough to date a published text into the future and
 * drop it out of the index, the feed and its own page.
 *
 * Sending the instant instead leaves the server nothing to interpret.
 */
function toInstant(localValue: string): string {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function PostForm({
  values,
  savedNotice = false,
}: {
  values: PostFormValues;
  savedNotice?: boolean;
}) {
  const [state, formAction] = useActionState(
    savePostAction,
    initialPostFormState,
  );
  /*
   * Every field the author can change is React state, deliberately. React
   * resets an uncontrolled <form action> once the action returns, and a reset
   * restores each field to its *default*, not to what was just saved. For text
   * inputs that is invisible, because React keeps `defaultValue` in step with
   * what it rendered, so the reset lands on the new value. A <select> has no
   * such sync — React marks the chosen <option> at mount and never touches
   * `defaultSelected` again — so an uncontrolled category silently snapped back
   * to whatever the page was first loaded with, and the next Save wrote that
   * stale value over the good one.
   */
  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);
  const [category, setCategory] = useState(values.category);
  const [publishedAt, setPublishedAt] = useState(
    toLocalInput(values.published_at),
  );

  const previewSlug = slug || slugify(title) || "text";

  return (
    /*
     * React resets the form once the action returns. That is the right default
     * for a form you submit and walk away from — a comment box, a search — and
     * exactly wrong for one you stay in and keep editing: this is an edit
     * screen, and the reset only ever throws away what the author just typed.
     *
     * Controlled fields are not enough on their own to stop it. React writes to
     * the DOM only where this render differs from the last one, so a value that
     * survived the round trip unchanged — the category you saved a moment ago —
     * produces no write, and the reset then moves the DOM out from under it.
     * The reset event is cancelable, so this refuses it outright.
     */
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="admin-form"
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="admin-form__main">
        {(state.error || state.message || savedNotice) && (
          <div
            className={state.error ? "notice notice--error" : "notice notice--success"}
            role={state.error ? "alert" : "status"}
          >
            {state.error || state.message || "Saved."}
          </div>
        )}

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            className="title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="Der Titel des Textes"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="subtitle">Subtitle</label>
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={values.subtitle}
            placeholder="Optional — shown in italics under the title"
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="lead">Lead paragraph</label>
          <textarea
            id="lead"
            name="lead"
            rows={3}
            defaultValue={values.lead}
            placeholder="The opening sentences, used in the index and in the newsletter."
          />
          <p className="field__hint">
            Shown large above the text, in the register, and as the description
            for search engines and the RSS feed.
          </p>
        </div>

        <Editor
          initialHtml={values.body_html}
          placeholder="Hier beginnt der Text …"
        />
      </div>

      <div className="admin-form__side">
        <div className="panel">
          <p className="panel__title">Publishing</p>

          <p className="panel__status">
            <span className={`badge badge--${values.status}`}>
              {values.status}
            </span>
          </p>

          <div className="button-row">
            <ActionButton intent="save" variant="button--ghost">
              Save
            </ActionButton>
            {values.status === "published" ? (
              <ActionButton intent="unpublish" variant="button--ghost">
                Unpublish
              </ActionButton>
            ) : (
              <ActionButton intent="publish">Publish</ActionButton>
            )}
          </div>

          {values.status === "published" && values.id && (
            <p className="field__hint field__hint--after">
              <Link href={`/texte/${values.slug}`} target="_blank">
                View on the site ↗
              </Link>
            </p>
          )}
        </div>

        <div className="panel">
          <p className="panel__title">Details</p>

          <div className="field">
            <label htmlFor="category">Kind</label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORIES[key].singular}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="published_at">Publication date</label>
            {/*
              No `name` on the visible field: the form submits the instant
              below, not the wall clock, so the server never has to guess a
              zone. See toInstant.
            */}
            <input
              id="published_at"
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
            />
            <input
              type="hidden"
              name="published_at"
              value={toInstant(publishedAt)}
            />
            <p className="field__hint">
              Leave empty to use the moment you press Publish. A future date
              keeps the text hidden until then.
            </p>
          </div>

          <div className="field">
            <label htmlFor="slug">Web address</label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={slugify(title)}
              autoComplete="off"
            />
            <p className="field__hint">
              /texte/<strong>{previewSlug}</strong>
              <br />
              Leave empty and it is made from the title. Changing it after
              publishing breaks existing links.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
