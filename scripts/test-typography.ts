/**
 * Checks the Swiss-German typographic rules and slug generation.
 *
 *   npm run test:typography
 */
import { countWords, excerptFrom, htmlToText, refine, refineHtml } from "../src/lib/typography.ts";
import { slugify, uniqueSlug } from "../src/lib/slug.ts";

let passed = 0;
let failed = 0;

function eq(
  name: string,
  actual: string | number | boolean,
  expected: string | number | boolean,
) {
  if (actual === expected) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}\n         got: ${JSON.stringify(actual)}\n    expected: ${JSON.stringify(expected)}`);
  }
}

console.log("\nSwiss quotation marks");
eq("double quotes become guillemets", refine('Er sagte "guten Tag" zu mir.'), "Er sagte «guten Tag» zu mir.");
eq("quote at the start of a line", refine('"Warum?", fragte sie.'), "«Warum?», fragte sie.");
eq("nested single quotes", refine(`Er las "das Buch 'Der Zauberberg' war gut".`), "Er las «das Buch ‹Der Zauberberg› war gut».");
eq("quote after an opening bracket", refine('(siehe "oben")'), "(siehe «oben»)");

console.log("\nApostrophes");
eq("apostrophe between letters", refine("s'Gschichtli"), "s’Gschichtli");
eq("trailing apostrophe", refine("Hans' Buch"), "Hans’ Buch");

console.log("\nSwiss orthography");
eq("Eszett becomes ss", refine("Die Straße war groß."), "Die Strasse war gross.");
eq("Eszett inside a compound", refine("Fußgängerstreifen"), "Fussgängerstreifen");

console.log("\nDashes, ellipses and spacing");
eq("double hyphen becomes en dash", refine("Er kam -- und ging."), "Er kam – und ging.");
eq("spaced hyphen becomes en dash", refine("Er kam - und ging."), "Er kam – und ging.");
eq("numeric range", refine("1914-1918"), "1914–1918");
eq("ellipsis", refine("Und dann..."), "Und dann…");
eq("z. B. is held together", refine("z. B. hier"), "z.\u00A0B. hier");
eq("d.h. gets its space", refine("d.h. so"), "d.\u00A0h. so");
eq("unit stays with its number", refine("5 km weit"), "5\u00A0km weit");
eq("paragraph sign binds", refine("§ 12"), "§\u00A012");

console.log("\nHTML safety");
eq("tags and attributes untouched",
  refineHtml('<a href="https://a.ch/x--y" title="a">"Text"</a>'),
  '<a href="https://a.ch/x--y" title="a">«Text»</a>');
eq("code blocks left alone",
  refineHtml('<p>"a"</p><code>"b" -- c</code>'),
  '<p>«a»</p><code>"b" -- c</code>');
eq("pre blocks left alone",
  refineHtml('<pre>Die Straße "x"</pre>'),
  '<pre>Die Straße "x"</pre>');
eq("refinement survives nesting",
  refineHtml('<p>Er sagte <em>"ja"</em> dazu.</p>'),
  "<p>Er sagte <em>«ja»</em> dazu.</p>");

console.log("\nText extraction");
eq("html to text", htmlToText("<p>Eins</p><p>Zwei</p>"), "Eins\nZwei");
eq("entities decoded", htmlToText("<p>A &amp; B</p>"), "A & B");
eq("word count", countWords("<p>eins zwei drei</p><p>vier</p>"), 4);
eq("excerpt truncates on a word boundary",
  excerptFrom("<p>" + "wort ".repeat(60) + "</p>", 20).endsWith("…"), true);

console.log("\nSlugs");
eq("umlauts transliterated", slugify("Über den Zweifel"), "ueber-den-zweifel");
eq("Eszett becomes ss", slugify("Die Straße"), "die-strasse");
eq("accents stripped", slugify("Café Crème"), "cafe-creme");
eq("punctuation collapsed", slugify("Was nun? Der «Fall» — Teil 2!"), "was-nun-der-fall-teil-2");
eq("mixed umlauts", slugify("Ärzte, Öfen und Übungen"), "aerzte-oefen-und-uebungen");
eq("collision gets a suffix", uniqueSlug("essay", new Set(["essay"])), "essay-2");
eq("second collision", uniqueSlug("essay", new Set(["essay", "essay-2"])), "essay-3");
eq("empty falls back", slugify("···"), "");

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
