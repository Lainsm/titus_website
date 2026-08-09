import type { Metadata } from "next";
import { listPublications } from "@/lib/content";
import { PUBLICATION_KINDS, type PublicationKind } from "@/lib/site";
import { refine } from "@/lib/typography";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publikationen",
  description: "Bücher, Beiträge, Artikel und Vorträge.",
};

export default async function PublikationenPage() {
  const publications = await listPublications();

  return (
    <>
      <div className="listing">
        <div className="section-head">
          <p className="section-head__label label">Verzeichnis</p>
          <h1 className="section-head__title">Publikationen</h1>
          <p className="section-head__aside">
            {publications.length}{" "}
            {publications.length === 1 ? "Eintrag" : "Einträge"}
          </p>
        </div>

        {publications.length === 0 ? (
          <p className="empty">
            Sobald etwas erscheint, steht es hier — mit Verlag, Jahr und, wo
            vorhanden, einem Link zur Bezugsquelle.
          </p>
        ) : (
          <div className="publication-list">
            {publications.map((publication) => (
              <article key={publication.id} className="publication">
                <div className="publication__year">
                  <p className="label label--ink">{publication.year ?? "—"}</p>
                  <p className="label label--stacked">
                    {PUBLICATION_KINDS[publication.kind as PublicationKind] ??
                      publication.kind}
                  </p>
                </div>

                <div className="publication__body">
                  <h2 className="publication__title">
                    {refine(publication.title)}
                  </h2>

                  {publication.subtitle && (
                    <p className="publication__subtitle">
                      {refine(publication.subtitle)}
                    </p>
                  )}

                  {(publication.publisher || publication.isbn) && (
                    <p className="publication__imprint">
                      {[
                        publication.publisher,
                        publication.isbn && `ISBN ${publication.isbn}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  {publication.description && (
                    <p className="publication__description">
                      {refine(publication.description)}
                    </p>
                  )}

                  {publication.url && (
                    <a
                      className="publication__link"
                      href={publication.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mehr erfahren →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
