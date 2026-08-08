import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Whitelist for prose written in the admin editor. Deliberately narrow: the
 * editor can only produce these tags, so anything else arrived by paste or by
 * a crafted request and is dropped.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "i",
  "b",
  "u",
  "s",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "hr",
  "code",
  "pre",
  "sup",
  "sub",
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Every outbound link opens safely.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      };
    },
    // Word and Google Docs paste bold/italic as <span style>; the editor
    // normalises most of it, these catch the rest.
    div: () => ({ tagName: "p", attribs: {} }),
    h1: () => ({ tagName: "h2", attribs: {} }),
    h5: () => ({ tagName: "h4", attribs: {} }),
    h6: () => ({ tagName: "h4", attribs: {} }),
  },
  // Drop empty paragraphs left behind by pasted markup.
  exclusiveFilter: (frame) =>
    frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
};

export function sanitizeProse(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}

/** Even narrower: for newsletter bodies, which land in unpredictable clients. */
export function sanitizeNewsletter(html: string): string {
  return sanitizeHtml(html ?? "", {
    ...OPTIONS,
    allowedTags: ALLOWED_TAGS.filter(
      (tag) => !["pre", "code", "sup", "sub"].includes(tag),
    ),
  });
}
