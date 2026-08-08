import type { Metadata } from "next";
import { StandingPage } from "@/components/standing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datenschutz",
  robots: { index: false, follow: true },
};

/**
 * Describes what this site actually does: no analytics, no third-party fonts,
 * no cookies for visitors. Only the newsletter stores anything.
 */
const FALLBACK = `
  <h2>Grundsatz</h2>
  <p>Diese Website erhebt so wenig Daten wie möglich. Es werden keine
  Analyse-Dienste eingesetzt, keine Werbenetzwerke eingebunden und keine
  Schriften von fremden Servern nachgeladen. Für Besucherinnen und Besucher
  werden keine Cookies gesetzt.</p>

  <h2>Server-Protokolle</h2>
  <p>Der Webserver in der Schweiz protokolliert technisch notwendige Angaben
  (IP-Adresse, Zeitpunkt, aufgerufene Seite). Diese Protokolle dienen dem
  Betrieb und der Sicherheit und werden nach kurzer Zeit gelöscht.</p>

  <h2>Newsletter</h2>
  <p>Wer den Newsletter abonniert, gibt eine E-Mail-Adresse und freiwillig
  einen Namen an. Die Anmeldung wird durch eine Bestätigungsmail überprüft
  (Double Opt-in); ohne Bestätigung wird nichts versendet. Die Adressen liegen
  auf demselben Schweizer Server wie die Website und werden nicht
  weitergegeben. Jede Nachricht enthält einen Abmeldelink; nach der Abmeldung
  wird die Adresse nicht mehr verwendet.</p>

  <h2>Ihre Rechte</h2>
  <p>Sie können jederzeit Auskunft über die zu Ihrer Person gespeicherten Daten
  verlangen sowie deren Berichtigung oder Löschung. Eine kurze Nachricht an die
  im Impressum genannte Adresse genügt.</p>

  <p><em>Dieser Text ist eine Vorlage und ersetzt keine Rechtsberatung. Er kann
  im Redaktionsbereich unter «Seiten» angepasst werden.</em></p>
`;

export default function DatenschutzPage() {
  return (
    <StandingPage
      slug="datenschutz"
      title="Datenschutz"
      fallbackHtml={FALLBACK}
    />
  );
}
