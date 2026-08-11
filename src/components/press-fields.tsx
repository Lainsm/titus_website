import type { PressItem } from "@/lib/content";
import { PRESS_KINDS, PRESS_KIND_KEYS } from "@/lib/site";

/**
 * Shared field set for creating and editing a press entry. Plain server-side
 * form — no rich text, so no client component is needed.
 *
 * The fields are uncontrolled, which is only safe because savePressAction ends
 * in a redirect: React resets a form once its action returns, and a reset puts
 * an uncontrolled <select> back to the option it was built with rather than
 * the one just chosen. A redirect unmounts the form before that can matter. If
 * this action ever returns state instead, the kind select has to become
 * controlled or it will silently discard the editor's choice.
 */
export function PressFields({ item }: { item?: PressItem }) {
  return (
    <div className="admin-form">
      <div className="admin-form__main">
        <div className="field">
          <label htmlFor="outlet">Outlet</label>
          <input
            id="outlet"
            name="outlet"
            defaultValue={item?.outlet ?? ""}
            required
            placeholder="Freiburger Nachrichten"
            autoComplete="off"
          />
          <p className="field__hint">
            The publication that ran the piece, as it calls itself.
          </p>
        </div>

        <div className="field">
          <label htmlFor="title">Headline</label>
          <input
            id="title"
            name="title"
            className="title-input"
            defaultValue={item?.title ?? ""}
            required
            placeholder="Der Arzt, der Demenz nicht nur von der medizinischen Seite betrachtet"
            autoComplete="off"
          />
          <p className="field__hint">
            The headline the piece carries, not a description of it.
          </p>
        </div>

        <div className="field">
          <label htmlFor="quote">Quoted sentence</label>
          <textarea
            id="quote"
            name="quote"
            rows={3}
            defaultValue={item?.quote ?? ""}
            placeholder="Ein Satz aus dem Artikel, der neugierig macht."
          />
          <p className="field__hint">
            One or two sentences, no more — enough to interest a reader, short
            enough to stay a quotation rather than a reprint. This is also what
            the entry still says if the link behind it stops working.
          </p>
        </div>
      </div>

      <div className="admin-form__side">
        <div className="panel">
          <p className="panel__title">Details</p>

          <div className="field">
            <label htmlFor="kind">Kind</label>
            <select id="kind" name="kind" defaultValue={item?.kind ?? "artikel"}>
              {PRESS_KIND_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PRESS_KINDS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="published_at">Date</label>
            <input
              id="published_at"
              name="published_at"
              type="date"
              defaultValue={item?.published_at ?? ""}
            />
          </div>

          <div className="field">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              name="language"
              defaultValue={item?.language ?? "de"}
            >
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="sort_order">Order</label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={item?.sort_order ?? 0}
            />
            <p className="field__hint">
              Leave at 0 and the list stays in date order, newest first.
            </p>
          </div>
        </div>

        <div className="panel">
          <p className="panel__title">Links</p>

          <div className="field">
            <label htmlFor="url">Link to the piece</label>
            <input
              id="url"
              name="url"
              type="url"
              defaultValue={item?.url ?? ""}
              placeholder="https://…"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="archive_url">Archived copy</label>
            <input
              id="archive_url"
              name="archive_url"
              type="url"
              defaultValue={item?.archive_url ?? ""}
              placeholder="https://web.archive.org/…"
              autoComplete="off"
            />
            <p className="field__hint">
              Newspaper links move, expire, or slip behind a paywall. Save a
              snapshot at web.archive.org while the piece is still readable and
              paste it here; the site falls back to it when there is no link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
