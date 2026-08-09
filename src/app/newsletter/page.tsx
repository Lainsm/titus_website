import type { Metadata } from "next";
import { SubscribeForm } from "@/components/subscribe-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Newsletter",
  description: `Neue Texte von ${site.name} per E-Mail — selten, ohne Werbung, jederzeit abbestellbar.`,
};

export default function NewsletterPage() {
  return (
    <div className="simple-page">
      <div className="simple-page__aside">
        <h1 className="simple-page__title">Newsletter</h1>
      </div>

      <div className="simple-page__body">
        <div className="prose simple-page__intro">
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

        <div className="signup">
          <p className="label label--accent signup__label">
            Anmeldung
          </p>
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
