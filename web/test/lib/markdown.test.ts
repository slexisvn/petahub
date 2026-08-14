import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/lib/markdown";

describe("renderMarkdown", () => {
  it("renders ordinary markdown structure", () => {
    const html = renderMarkdown("# Title\n\nSome **bold** text.\n\n- one\n- two\n");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>one</li>");
  });

  it("strips a script tag embedded in the readme", () => {
    const html = renderMarkdown("Hello\n\n<script>fetch('/api/v1/auth/tokens')</script>\n");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("fetch(");
  });

  it("strips an inline event handler from raw html", () => {
    const html = renderMarkdown(`<img src="x" onerror="alert(document.cookie)">`);
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("alert(");
  });

  it("removes a javascript: link target", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("strips a style attribute used to cover the page", () => {
    const html = renderMarkdown(
      `<div style="position:fixed;inset:0;z-index:99">overlay</div>`
    );
    expect(html).not.toContain("style=");
  });

  it("drops a form that could phish for a token", () => {
    const html = renderMarkdown(`<form action="https://evil.test"><input name="token"></form>`);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });

  it("marks outbound links so they cannot reach back into the page", () => {
    const html = renderMarkdown("[docs](https://example.test/docs)");
    expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("keeps a readme image from leaking the referrer", () => {
    const html = renderMarkdown("![badge](https://example.test/badge.svg)");
    expect(html).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('loading="lazy"');
  });

  it("escapes html written inside a fenced code block", () => {
    const html = renderMarkdown("```\n<script>bad()</script>\n```\n");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("highlights a tera code fence without emitting raw source", () => {
    const html = renderMarkdown("```tera\nimport slexis.json\n```\n");
    expect(html).toContain('<span class="tok-keyword">import</span>');
  });
});
