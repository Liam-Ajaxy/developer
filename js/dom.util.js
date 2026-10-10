// Builds DOM safely: text goes in as text, never as HTML, so nothing a developer types can run as code.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const clear = (el) => el.replaceChildren();
export const fmtNumber = (n) => Number(n ?? 0).toLocaleString();

export function fmtTime(iso) {
  const d = new Date(iso);
  return !iso || Number.isNaN(d.getTime()) ? "-" : d.toLocaleString([], { dateStyle: "short", timeStyle: "medium" });
}

export function fmtAgo(iso) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const badge = (text, kind = "muted") => h("span", { class: `badge badge-${kind}` }, text);

export function card(label, value, sub) {
  return h(
    "div",
    { class: "card" },
    h("div", { class: "card-label" }, label),
    h("div", { class: "card-value" }, value),
    sub ? h("div", { class: "card-sub" }, sub) : null
  );
}

export function table(headers, rows, emptyText = "Nothing here yet.") {
  if (rows.length === 0) return h("p", { class: "empty" }, emptyText);
  return h(
    "div",
    { class: "table-wrap" },
    h(
      "table",
      {},
      h("thead", {}, h("tr", {}, headers.map((t) => h("th", {}, t)))),
      h("tbody", {}, rows.map((cells) => h("tr", {}, cells.map((c) => h("td", {}, c)))))
    )
  );
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}