// A tiny JavaScript highlighter. It only ever creates text nodes and spans, so code samples can never run as HTML.
const KEYWORDS = new Set([
  "async", "await", "function", "const", "let", "var", "return", "if", "else", "throw", "new",
  "try", "catch", "for", "of", "in", "true", "false", "null", "undefined",
]);
const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

// Terminal commands: only "# comments" are coloured (a "#" must start the line or follow a space).
function highlightShell(code) {
  const out = document.createDocumentFragment();
  code.split("\n").forEach((line, i) => {
    if (i) out.append("\n");
    const m = /(^|\s)#/.exec(line);
    const at = m ? m.index + m[1].length : -1;
    if (at < 0) return void out.append(line);
    out.append(line.slice(0, at));
    const span = document.createElement("span");
    span.className = "tok-c";
    span.textContent = line.slice(at);
    out.append(span);
  });
  return out;
}

export function highlight(code, lang = "js") {
  if (lang === "shell") return highlightShell(code);
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