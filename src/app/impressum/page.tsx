import type { Metadata } from "next";
import { StandingPage } from "@/components/standing-page";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false, follow: true },
};

const FALLBACK = `
  <p>Verantwortlich für den Inhalt dieser Website:</p>
  <p>${site.name}<br>
  Adresse<br>
  Schweiz</p>
  <p>Kontakt: <a href="mailto:kontakt@example.ch">kontakt@example.ch</a></p>
  <p><em>Bitte im Redaktionsbereich unter «Seiten» durch die richtigen Angaben ersetzen.</em></p>
`;

export default function ImpressumPage() {
  return (
    <StandingPage slug="impressum" title="Impressum" fallbackHtml={FALLBACK} />
  );
}
