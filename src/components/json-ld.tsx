/**
 * A JSON-LD block: structured data for search engines, invisible to readers.
 *
 * `type="application/ld+json"` is a data block rather than a program — the
 * browser parses it and never executes it — so the site's script-src nonce
 * does not apply and none is needed here.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      /*
       * JSON.stringify is not enough on its own: it happily emits a literal
       * `</script>` inside a string, which closes this tag early and lets
       * everything after it parse as markup. Titles and descriptions are
       * authored in the back office rather than by the public, but "only an
       * admin can reach it" is an authorisation argument, not an escaping one —
       * and this is the one place on the site where authored text is written
       * into a script body. Escaping < and & costs nothing and holds
       * regardless. U+2028 and U+2029 are legal in JSON and illegal in a
       * JavaScript string literal, so they go too — in the four-digit form,
       * which needs no `u` flag on the pattern.
       */
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data)
          .replace(/</g, "\\u003c")
          .replace(/&/g, "\\u0026")
          .replace(/\u2028/g, "\\u2028")
          .replace(/\u2029/g, "\\u2029"),
      }}
    />
  );
}
