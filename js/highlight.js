// A tiny JavaScript highlighter. It only ever creates text nodes and spans, so code samples can never run as HTML.
const KEYWORDS = new Set([
  "async", "await", "function", "const", "let", "var", "return", "if", "else", "throw", "new",
  "try", "catch", "for", "of", "in", "true", "false", "null", "undefined",
]);
const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

export function highlight(code) {
  const out = document.createDocumentFragment();
  const span = (cls, text) => {
    const el = document.createElement("span");
    el.className = cls;
    el.textContent = text;
    out.append(el);
  };
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.append(code.slice(last, m.index));
    const [text, comment, string, number, word] = m;
    if (comment) span("tok-c", text);
    else if (string) span("tok-s", text);
    else if (number) span("tok-n", text);
    else if (KEYWORDS.has(word)) span("tok-k", text);
    else if (code[TOKEN.lastIndex] === "(") span("tok-f", text);
    else out.append(text);
    last = TOKEN.lastIndex;
  }
  if (last < code.length) out.append(code.slice(last));
  return out;
}
