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
  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);

  const previewSlug = slug || slugify(title) || "text";

  return (
    <form action={formAction} className="admin-form">
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
              defaultValue={values.category}
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
            <input
              id="published_at"
              name="published_at"
              type="datetime-local"
              defaultValue={toLocalInput(values.published_at)}
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
