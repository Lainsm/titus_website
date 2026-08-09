import type { Metadata } from "next";
import { StandingPage } from "@/components/standing-page";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Über",
  description: `Über ${site.name} — ${site.role}.`,
};

const FALLBACK = `
  <p>Diese Seite wartet noch auf ihren Text. Melden Sie sich im Redaktionsbereich
  an und schreiben Sie unter «Seiten» ein paar Zeilen über sich.</p>
`;

export default function UeberPage() {
  return (
    <StandingPage
      slug="ueber"
      title="Über"
      fallbackHtml={FALLBACK}
      portrait={{
        src: "/img/titus-bihl.jpg",
        alt: `${site.name} vor einer Fensterfront mit Blick über die Themse auf die Hochhäuser von Canary Wharf.`,
      }}
    />
  );
}
