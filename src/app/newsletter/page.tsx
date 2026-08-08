import type { Metadata } from "next";
import { SubscribeForm } from "@/components/subscribe-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Newsletter",
  description: `Neue Texte von ${site.name} per E-Mail — selten, ohne Werbung, jederzeit abbestellbar.`,
};

export default function NewsletterPage() {
  return (
    <div className="container simple-page">
      <h1 className="simple-page__title">Newsletter</h1>

      <div className="simple-page__body">
        <div className="prose" style={{ marginBottom: "var(--space-12)" }}>
          <p>
            Wenn ein neuer Text erscheint, schicke ich eine kurze Nachricht:
            den Titel, die ersten Sätze und einen Link. Mehr nicht.
          </p>
          <p>
            Es gibt keinen festen Rhythmus. Manchmal vergehen Monate. Werbung
            ist keine dabei, und die Adressen bleiben auf demselben Schweizer
            Server wie diese Website — sie werden weder verkauft noch
            weitergegeben.
          </p>
        </div>

        <div style={{ borderTop: "2px solid var(--rule-strong)", paddingTop: "var(--space-8)" }}>
          <p className="label label--accent" style={{ marginBottom: "var(--space-6)" }}>
            Anmeldung
          </p>
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
