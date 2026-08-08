/**
 * Swiss-German typographic refinement.
 *
 * Swiss orthography differs from German-German in two ways that matter here:
 *   1. Quotation marks are guillemets pointing outward — «so» and ‹so› —
 *      not the German „Gänsefüsschen“.
 *   2. The Eszett (ß) is not used; it is always written ss.
 *
 * These run over stored HTML at render time rather than at save time, so the
 * author's original text is never destroyed and the rules can be changed later.
 */

const NBSP = " ";

/** Abbreviations that must not break across a line. */
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bz\.\s*B\./g, `z.${NBSP}B.`],
  [/\bd\.\s*h\./g, `d.${NBSP}h.`],
  [/\bu\.\s*a\./g, `u.${NBSP}a.`],
  [/\bv\.\s*a\./g, `v.${NBSP}a.`],
  [/\bu\.\s*U\./g, `u.${NBSP}U.`],
  [/\bz\.\s*T\./g, `z.${NBSP}T.`],
  [/\bs\.\s*o\./g, `s.${NBSP}o.`],
  [/\bs\.\s*u\./g, `s.${NBSP}u.`],
  [/\bi\.\s*d\.\s*R\./g, `i.${NBSP}d.${NBSP}R.`],
  [/\bggf\.\s/g, "ggf. "],
];

/** Units and prefixes that stay glued to their number. */
const UNIT_PATTERN =
  /(\d)\s+(%|‰|°|km|cm|mm|kg|mg|ml|dl|Jh\.|Mio\.|Mrd\.|Fr\.|CHF|EUR|m|h|min|s)\b/g;

function refineText(input: string): string {
  let text = input;

  // Swiss orthography: no Eszett.
  text = text.replace(/ß/g, "ss");

  // Double quotes → «guillemets». Opening if preceded by start, space or
  // an opening bracket; closing otherwise.
  text = text.replace(/(^|[\s([{—–])"/g, "$1«");
  text = text.replace(/"/g, "»");

  // Single quotes → ‹chevrons›, but only as a matched pair whose opening sits
  // at a word boundary. Matching the pair is what keeps a closing quote
  // (‹Der Zauberberg›) from being mistaken for an apostrophe, since both are
  // a straight ' directly after a letter.
  text = text.replace(/(^|[\s([{«])'([^'\n]*)'/g, "$1‹$2›");

  // Whatever straight quotes survive are apostrophes (s’Gschichtli, Hans’ Buch).
  text = text.replace(/(\p{L})'(\p{L})/gu, "$1’$2");
  text = text.replace(/(\p{L})'(?=\s|$|[,.;:!?])/gu, "$1’");

  // Dashes: -- becomes an en dash; a hyphen used as a parenthetical dash
  // (space-hyphen-space) becomes an en dash, which is the German convention.
  text = text.replace(/--/g, "–");
  text = text.replace(/ - /g, " – ");

  // Numeric ranges: 1914-1918 → 1914–1918.
  text = text.replace(/(\d)\s*-\s*(\d)/g, "$1–$2");

  // Ellipsis.
  text = text.replace(/\.\.\./g, "…");

  for (const [pattern, replacement] of ABBREVIATIONS) {
    text = text.replace(pattern, replacement);
  }

  // Keep numbers with their units, and § / Nr. with what follows.
  text = text.replace(UNIT_PATTERN, `$1${NBSP}$2`);
  // No \b here: § is not a word character, so \b would never match it at the
  // start of a string.
  text = text.replace(/(Nr\.|Bd\.|S\.|Art\.|§)\s+(\d)/g, `$1${NBSP}$2`);

  return text;
}

/**
 * Applies the refinements to the text content of an HTML string, leaving tags,
 * attributes and the contents of <code>/<pre> untouched.
 */
export function refineHtml(html: string): string {
  if (!html) return "";

  let skipDepth = 0;
  // Split into tags and text runs. Tags keep their original form.
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag: string | undefined, text: string | undefined) => {
    if (tag) {
      if (/^<\s*(code|pre)\b/i.test(tag)) skipDepth += 1;
      else if (/^<\s*\/\s*(code|pre)\s*>/i.test(tag) && skipDepth > 0) skipDepth -= 1;
      return tag;
    }
    if (skipDepth > 0) return text ?? "";
    return refineText(text ?? "");
  });
}

/** Same refinements for a bare string (titles, leads, subject lines). */
export function refine(text: string): string {
  return text ? refineText(text) : "";
}

/** Strips tags and collapses whitespace — for excerpts and plain-text mail. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/h[1-6]|\/li|\/blockquote)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(html: string): number {
  const text = htmlToText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** German prose reads at roughly 200 words per minute. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

/** Builds a short teaser from body HTML when the author left the lead empty. */
export function excerptFrom(html: string, maxChars = 220): string {
  const text = htmlToText(html).replace(/\n+/g, " ");
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()} …`;
}
