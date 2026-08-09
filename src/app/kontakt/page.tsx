import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Nachricht an ${site.name} — Fragen, Rückmeldungen, Anfragen.`,
};

export default function KontaktPage() {
  return (
    <div className="simple-page">
      <div className="simple-page__aside">
        <h1 className="simple-page__title">Kontakt</h1>
      </div>

      <div className="simple-page__body">
        <div className="prose simple-page__intro">
          <p>
            Für Fragen zu einem Text, Rückmeldungen, Anfragen für Lesungen oder
            Beiträge: schreiben Sie mir hier oder direkt an{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
        </div>

        <div className="signup">
          <p className="label label--accent signup__label">Nachricht</p>
          <ContactForm />
          <p className="contact-form__note">
            Ihre Angaben werden ausschliesslich zur Beantwortung Ihrer Nachricht
            verwendet und nicht weitergegeben. Näheres in der{" "}
            <a href="/datenschutz">Datenschutzerklärung</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
