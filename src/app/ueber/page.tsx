import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StandingPage } from "@/components/standing-page";
import { authorSchema } from "@/lib/schema";
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
    <>
      {/*
        This page is the one that is actually *about* him rather than by him,
        so it is where the Person is stated outright. Every text repeats the
        same definition under the same @id; see lib/schema.ts.
      */}
      <JsonLd data={{ "@context": "https://schema.org", ...authorSchema() }} />

      <StandingPage
        slug="ueber"
        title="Über"
        fallbackHtml={FALLBACK}
        portrait={{
          src: "/img/titus-bihl.jpg",
          alt: `${site.name} vor einer Fensterfront mit Blick über die Themse auf die Hochhäuser von Canary Wharf.`,
        }}
      />
    </>
  );
}
