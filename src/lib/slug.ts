/**
 * URL slugs from German titles.
 *
 * Umlauts are transliterated the German way (ä → ae), not stripped to bare
 * vowels, so «Über den Zweifel» becomes `ueber-den-zweifel` rather than
 * `ber-den-zweifel`.
 */

const TRANSLITERATIONS: Record<string, string> = {
  "ä": "ae",
  "ö": "oe",
  "ü": "ue",
  "Ä": "ae",
  "Ö": "oe",
  "Ü": "ue",
  "ß": "ss",
};

export function slugify(input: string): string {
  const transliterated = input
    .split("")
    .map((char) => TRANSLITERATIONS[char] ?? char)
    .join("");

  return transliterated
    .toLowerCase()
    // Decompose remaining accents (é → e + ◌́) and drop the combining marks.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Appends -2, -3 … until the slug is free. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "text";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
