type TokenKind = "keyword" | "string" | "number" | "comment" | "function" | "punctuation";

type Rule = {
  readonly kind: TokenKind;
  readonly pattern: string;
};

const TERA_KEYWORDS = [
  "abstract", "and", "async", "await", "break", "case", "catch", "class", "const", "continue",
  "default", "delete", "do", "else", "extends", "false", "finally", "fn", "for", "from",
  "function", "if", "import", "in", "instanceof", "let", "model", "new", "not", "null", "of",
  "or", "private", "protected", "public", "return", "super", "switch", "this", "throw", "true",
  "try", "typeof", "undefined", "var", "while", "yield"
];

const SHELL_KEYWORDS = [
  "case", "cd", "do", "done", "echo", "elif", "else", "esac", "export", "fi", "for", "if", "in",
  "then", "while"
];

const JSON_LITERALS = ["false", "null", "true"];

const STRING_RULE: Rule = {
  kind: "string",
  pattern: `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'`
};

const NUMBER_RULE: Rule = {
  kind: "number",
  pattern: String.raw`\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b`
};

const HASH_COMMENT_RULE: Rule = { kind: "comment", pattern: String.raw`#[^\n]*` };

const PUNCTUATION_RULE: Rule = { kind: "punctuation", pattern: String.raw`[{}[\]().,:;]` };

function wordsRule(kind: TokenKind, words: readonly string[]): Rule {
  return { kind, pattern: String.raw`\b(?:${words.join("|")})\b` };
}

const GRAMMARS: ReadonlyMap<string, readonly Rule[]> = new Map([
  [
    "tera",
    [
      { kind: "comment", pattern: String.raw`//[^\n]*|/\*[\s\S]*?\*/` },
      STRING_RULE,
      wordsRule("keyword", TERA_KEYWORDS),
      NUMBER_RULE,
      { kind: "function", pattern: String.raw`\b[A-Za-z_]\w*(?=\s*\()` },
      PUNCTUATION_RULE
    ]
  ],
  [
    "json",
    [STRING_RULE, wordsRule("keyword", JSON_LITERALS), NUMBER_RULE, PUNCTUATION_RULE]
  ],
  [
    "bash",
    [
      HASH_COMMENT_RULE,
      STRING_RULE,
      wordsRule("keyword", SHELL_KEYWORDS),
      { kind: "function", pattern: String.raw`\$\w+|\$\{[^}]*\}` },
      NUMBER_RULE
    ]
  ]
]);

const ALIASES: ReadonlyMap<string, string> = new Map([
  ["console", "bash"],
  ["js", "json"],
  ["jsonc", "json"],
  ["sh", "bash"],
  ["shell", "bash"],
  ["terra", "tera"],
  ["zsh", "bash"]
]);

const ESCAPES: ReadonlyMap<string, string> = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"]
]);

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES.get(character) ?? character);
}

function grammarFor(language: string): readonly Rule[] | null {
  const key = language.toLowerCase();
  return GRAMMARS.get(ALIASES.get(key) ?? key) ?? null;
}

export function isHighlightable(language: string): boolean {
  return grammarFor(language) !== null;
}

export function highlight(source: string, language: string): string {
  const grammar = grammarFor(language);
  if (grammar === null) return escapeHtml(source);

  const scanner = new RegExp(grammar.map((rule) => `(${rule.pattern})`).join("|"), "g");
  let result = "";
  let last = 0;

  for (const match of source.matchAll(scanner)) {
    const index = match.index;
    const matched = match[0];
    if (matched.length === 0) continue;
    const slot = match.slice(1).findIndex((group) => group !== undefined);
    const rule = grammar[slot];
    if (rule === undefined) continue;
    result += escapeHtml(source.slice(last, index));
    result += `<span class="tok-${rule.kind}">${escapeHtml(matched)}</span>`;
    last = index + matched.length;
  }

  return result + escapeHtml(source.slice(last));
}
