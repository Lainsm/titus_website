import { PUBLICATION_KINDS, type PublicationKind } from "@/lib/site";
import type { Publication } from "@/lib/content";

/**
 * Shared field set for creating and editing a publication. Plain server-side
 * form — no rich text here, so no client component is needed.
 */
export function PublicationFields({
  publication,
}: {
  publication?: Publication;
}) {
  return (
    <div className="admin-form">
      <div className="admin-form__main">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            className="title-input"
            defaultValue={publication?.title ?? ""}
            required
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="subtitle">Subtitle</label>
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={publication?.subtitle ?? ""}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={publication?.description ?? ""}
            placeholder="A few sentences about the book, article or talk."
          />
        </div>
      </div>

      <div className="admin-form__side">
        <div className="panel">
          <p className="panel__title">Details</p>

          <div className="field">
            <label htmlFor="kind">Kind</label>
            <select
              id="kind"
              name="kind"
              defaultValue={publication?.kind ?? "buch"}
            >
              {Object.entries(PUBLICATION_KINDS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label as string}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="year">Year</label>
            <input
              id="year"
              name="year"
              type="number"
              min="1900"
              max="2100"
              defaultValue={publication?.year ?? ""}
            />
          </div>

          <div className="field">
            <label htmlFor="publisher">Publisher / outlet</label>
            <input
              id="publisher"
              name="publisher"
              defaultValue={publication?.publisher ?? ""}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="isbn">ISBN</label>
            <input
              id="isbn"
              name="isbn"
              defaultValue={publication?.isbn ?? ""}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="url">Link</label>
            <input
              id="url"
              name="url"
              type="url"
              placeholder="https://"
              defaultValue={publication?.url ?? ""}
            />
          </div>

          <div className="field">
            <label htmlFor="sort_order">Sort order</label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={publication?.sort_order ?? 0}
            />
            <p className="field__hint">
              Lower numbers come first. Entries with the same number fall back
              to newest year.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PublicationKind };
