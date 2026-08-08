"use client";

import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useState } from "react";

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className="editor__button"
      data-active={active ? "true" : undefined}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/**
 * The writing surface. Emits HTML into a hidden input so the surrounding
 * <form> can be submitted straight to a Server Action — no client-side fetch,
 * and the draft survives a full page reload of the form.
 */
export function Editor({
  name = "body_html",
  initialHtml = "",
  placeholder = "Hier schreiben …",
}: {
  name?: string;
  initialHtml?: string;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(initialHtml);

  const editor = useEditor({
    // Required in Next.js: rendering during SSR would mismatch on hydration.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        // German hyphenation inside the editor too, so line breaks in the
        // editor match what the reader will see.
        lang: "de-CH",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) => setHtml(current.getHTML()),
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-Adresse (leer lassen zum Entfernen)", previous ?? "https://");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const words = editor?.storage.characterCount?.words() ?? 0;
  const characters = editor?.storage.characterCount?.characters() ?? 0;
  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <div className="editor">
      <input type="hidden" name={name} value={html} />

      <div className="editor__toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton
          title="Bold (⌘B)"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic (⌘I)"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>

        <span className="editor__separator" aria-hidden="true" />

        <ToolbarButton
          title="Section heading"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Sub-heading"
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>

        <span className="editor__separator" aria-hidden="true" />

        <ToolbarButton
          title="Quotation"
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          title="Bulleted list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          title="Divider"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          —
        </ToolbarButton>

        <span className="editor__separator" aria-hidden="true" />

        <ToolbarButton
          title="Insert or edit link"
          active={editor?.isActive("link")}
          onClick={setLink}
        >
          ↗
        </ToolbarButton>
        <ToolbarButton
          title="Clear formatting"
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          ⌫
        </ToolbarButton>

        <span className="editor__separator" aria-hidden="true" />

        <ToolbarButton
          title="Undo (⌘Z)"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          ↺
        </ToolbarButton>
        <ToolbarButton
          title="Redo (⇧⌘Z)"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          ↻
        </ToolbarButton>
      </div>

      <div className="editor__surface">
        <EditorContent editor={editor} />
      </div>

      <div className="editor__status">
        <span>
          {words.toLocaleString("de-CH")} words · {characters.toLocaleString("de-CH")} characters
        </span>
        <span>≈ {minutes} min read · quotes become «…» when published</span>
      </div>
    </div>
  );
}
