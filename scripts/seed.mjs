#!/usr/bin/env node
/**
 * Optional demo content, so the site can be looked at before anything real is
 * written. Everything it inserts is marked, and it never overwrites existing
 * rows — run it once, then delete the entries from the editorial pages.
 *
 *   npm run db:seed
 */
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl:
    process.env.PGSSLMODE === "require"
      ? { rejectUnauthorized: false }
      : undefined,
});

await client.connect();

// Straight quotes on purpose: the site converts them to «Guillemets» when it
// renders, which is what the Swiss convention asks for.
const posts = [
  {
    slug: "der-mann-der-die-uhren-anhielt",
    title: "Der Mann, der die Uhren anhielt",
    subtitle: "Eine Erzählung aus dem Nachtdienst",
    category: "erzaehlung",
    lead: "Um vier Uhr morgens ist die Station ein anderer Ort. Die Geräte behalten ihren Takt, die Menschen verlieren ihn, und irgendwo dazwischen sitzt einer, der beschlossen hat, dass die Zeit ihn nichts mehr angeht.",
    days_ago: 4,
    body: `
<p>Herr B. war seit elf Tagen bei uns, und seit elf Tagen trug er seine Armbanduhr in der Faust. Nicht am Handgelenk — in der Faust, wie einen Stein, den man aufgehoben hat und nicht mehr weglegen mag.</p>
<p>"Sie geht falsch", sagte er, wenn man ihn fragte. Er sagte es freundlich, beinahe entschuldigend, als sei ihm die Unbequemlichkeit dieser Auskunft bewusst.</p>
<p>In der ersten Nacht hielt ich das für Verwirrtheit. In der zweiten für Trotz. Erst in der dritten begriff ich, dass es eine Behauptung war, und zwar eine, die überprüft werden wollte.</p>
<h2>Was die Geräte wissen</h2>
<p>Ein Spital ist eine Maschine zur Herstellung von Gleichzeitigkeit. Die Visite um acht, das Mittagessen um zwölf, die Nachtruhe um zweiundzwanzig Uhr. Wer krank ist, verliert vieles, aber zuerst verliert er das Recht, seinen eigenen Tag einzuteilen.</p>
<blockquote>Man kann einem Menschen die Uhr nicht wegnehmen, ohne ihm etwas anderes wegzunehmen, für das wir kein so gutes Wort haben.</blockquote>
<p>Herr B. hatte, das erfuhr ich später von seiner Tochter, vierzig Jahre lang eine Werkstatt geführt. Uhren, Barometer, gelegentlich ein Grammophon. Er wusste, was in einem Gehäuse vorgeht, und er wusste vor allem, dass ein Mechanismus, den man nicht mehr aufzieht, nicht kaputt ist. Er ruht nur.</p>
<h2>Elf Tage</h2>
<p>Am zwölften Morgen lag die Uhr auf dem Nachttisch, das Glas nach unten. Er hatte sie nicht aufgezogen. Er sagte nichts dazu, und ich fragte nicht.</p>
<p>Wir haben, glaube ich, beide gewusst, was das heisst. Es gibt Entscheidungen, die kein Formular vorsieht und für die es in keiner Akte eine Zeile gibt, und trotzdem sind sie die klarsten, die in einem solchen Zimmer je getroffen werden.</p>
<p>Er starb an einem Dienstag, kurz nach fünf. Die Uhr stand auf zehn nach drei — auf irgendeinem Nachmittag, den nur er kannte.</p>`,
  },
  {
    slug: "ueber-die-geduld",
    title: "Über die Geduld",
    subtitle: "Vom Unterschied zwischen Warten und Aushalten",
    category: "essay",
    lead: "Geduld gilt als Tugend der Langsamen. Das ist ein Missverständnis, und es ist ein folgenreiches: Wer Geduld für Passivität hält, wird sie nie aufbringen, wenn es darauf ankommt.",
    days_ago: 18,
    body: `
<p>Es gibt zwei Zustände, die von aussen gleich aussehen und von innen nichts miteinander zu tun haben. Der eine heisst Warten. Der andere heisst Aushalten.</p>
<p>Wer wartet, hat sein Ziel bereits erreicht — in Gedanken. Ihm fehlt nur noch die Zeit, die dazwischenliegt, und diese Zeit ist ihm ein Ärgernis. Wer aushält, hat kein Ziel, jedenfalls keines, das er benennen könnte. Er hat einen Zustand, und er hat den Entschluss, in diesem Zustand zu bleiben, solange er dauert.</p>
<h2>Die Ungeduld der Gebildeten</h2>
<p>Man beobachtet in Sprechstunden ein merkwürdiges Gefälle. Menschen, die viel gelesen haben, ertragen Ungewissheit oft schlechter als solche, die wenig gelesen haben. Das liegt nicht daran, dass sie klüger wären oder dümmer. Es liegt daran, dass Bildung die Erwartung erzeugt, jede Frage habe irgendwo bereits eine Antwort, und man müsse nur an die richtige Stelle greifen.</p>
<p>Der Körper hält sich nicht daran. Er antwortet in seinem eigenen Tempo, und er antwortet häufig gar nicht, sondern hört einfach auf zu fragen.</p>
<h2>Was Geduld kostet</h2>
<p>Geduld ist teuer. Sie verlangt, dass man das Bedürfnis nach Klarheit zurückstellt, ohne es aufzugeben — nicht zu resignieren und nicht zu drängen, sondern beides zugleich zu unterlassen. Das ist Arbeit, und zwar anstrengendere als die meisten Formen von Aktivität.</p>
<blockquote>Wer aushält, tut etwas. Man sieht es ihm nur nicht an.</blockquote>
<p>Vielleicht ist das der Grund, weshalb wir Geduld so selten loben, wenn sie tatsächlich stattfindet, und so oft, wenn sie nur behauptet wird. Die geleistete Geduld ist unsichtbar. Sie hinterlässt keine Spur ausser der, dass etwas nicht geschehen ist: kein Abbruch, kein überstürzter Eingriff, kein Satz, den man zurücknehmen müsste.</p>`,
  },
  {
    slug: "was-wir-fortschritt-nennen",
    title: "Was wir Fortschritt nennen",
    subtitle: "Anmerkungen zu einem strapazierten Wort",
    category: "kommentar",
    lead: "Jede Generation hält ihre eigenen Werkzeuge für den Endpunkt einer Entwicklung. Ein Blick in alte Lehrbücher heilt zuverlässig von dieser Annahme — und macht bescheidener, als es angenehm ist.",
    days_ago: 42,
    body: `
<p>In meinem Regal steht ein Lehrbuch der inneren Medizin von 1961. Es ist ein ausgezeichnetes Buch: sorgfältig, klar geschrieben, von Leuten verfasst, die wussten, was sie taten. Ungefähr ein Drittel dessen, was darin steht, ist heute falsch.</p>
<p>Das Beunruhigende daran ist nicht das Drittel. Das Beunruhigende ist, dass man den Seiten nicht ansieht, welches Drittel es ist.</p>
<h2>Zwei Arten von Irrtum</h2>
<p>Es gibt Irrtümer, die man erkennt, weil sie schlecht begründet sind. Und es gibt Irrtümer, die tadellos begründet sind und trotzdem falsch — weil die Frage, die man stellte, an der Sache vorbeiging.</p>
<p>Die erste Art wird von der Wissenschaft zuverlässig aussortiert. Die zweite überlebt oft Jahrzehnte, weil niemand einen Grund sieht, sie zu prüfen.</p>
<h2>Ein Vorschlag</h2>
<p>Man müsste in jedes Lehrbuch einen Satz auf die erste Seite drucken: Ein Drittel des Folgenden ist falsch, und wir wissen nicht, welches. Das wäre keine Kapitulation, sondern die genaueste verfügbare Beschreibung des Sachverhalts.</p>
<p>Und es wäre, nebenbei, die beste Vorbereitung auf einen Beruf, in dem man täglich entscheiden muss, bevor man weiss.</p>`,
  },
];

let inserted = 0;

for (const post of posts) {
  const { rowCount } = await client.query(
    `INSERT INTO posts
       (slug, title, subtitle, category, lead, body_html, word_count, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', now() - ($8 || ' days')::interval)
     ON CONFLICT (slug) DO NOTHING`,
    [
      post.slug,
      post.title,
      post.subtitle,
      post.category,
      post.lead,
      post.body.trim(),
      post.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
      String(post.days_ago),
    ],
  );
  inserted += rowCount;
}

await client.query(
  `INSERT INTO pages (slug, title, body_html)
   VALUES ('ueber', 'Über', $1)
   ON CONFLICT (slug) DO NOTHING`,
  [
    `<p>Ich bin Arzt und schreibe. Das eine erklärt das andere nicht, aber es hat damit zu tun: Wer täglich zuhört, sammelt Geschichten, ob er will oder nicht.</p>
<p>Auf dieser Seite stehen Erzählungen, Essays und gelegentlich ein Kommentar. Die Erzählungen sind erfunden, auch dort, wo sie es nicht scheinen. Die Essays sind Versuche im Wortsinn — Gedankengänge, die ich zu Ende gehen wollte, um zu sehen, wohin sie führen.</p>
<p><em>Dieser Text stammt aus den Beispieldaten. Er kann im Redaktionsbereich unter «Seiten» ersetzt werden.</em></p>`,
  ],
);

await client.query(
  `INSERT INTO publications (title, subtitle, publisher, year, kind, description, sort_order)
   SELECT $1, $2, $3, $4, $5, $6, $7
    WHERE NOT EXISTS (SELECT 1 FROM publications WHERE title = $1)`,
  [
    "Die Sprechstunde",
    "Zwölf Erzählungen",
    "Beispielverlag, Zürich",
    2024,
    "buch",
    "Beispieleintrag aus den Demodaten — im Redaktionsbereich unter «Publications» zu löschen oder zu ersetzen.",
    0,
  ],
);

console.log(
  inserted > 0
    ? `Inserted ${inserted} sample text(s), the Über page and one publication.`
    : "Sample content was already present — nothing changed.",
);
console.log("Everything here is demo material; delete it from the editorial pages once real texts exist.");

await client.end();
