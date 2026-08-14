import DOMPurify from "dompurify";
import { Marked } from "marked";
import { escapeHtml, highlight, isHighlightable } from "./highlight";

const FORBIDDEN_TAGS = ["button", "form", "input", "select", "style", "textarea"];
const FORBIDDEN_ATTRIBUTES = ["style"];
const LINK_REL = "nofollow ugc noopener noreferrer";

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const language = (lang ?? "").trim().split(/\s+/)[0] ?? "";
      const body = isHighlightable(language) ? highlight(text, language) : escapeHtml(text);
      const attribute = language.length === 0 ? "" : ` class="language-${escapeHtml(language)}"`;
      return `<pre><code${attribute}>${body}</code></pre>\n`;
    }
  }
});

let hardened = false;

function harden(): void {
  if (hardened) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("rel", LINK_REL);
      node.setAttribute("target", "_blank");
    }
    if (node.tagName === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("referrerpolicy", "no-referrer");
    }
  });
  hardened = true;
}

export function renderMarkdown(source: string): string {
  harden();
  const html = marked.parse(source, { async: false });
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTRIBUTES,
    ALLOW_DATA_ATTR: false
  });
}
