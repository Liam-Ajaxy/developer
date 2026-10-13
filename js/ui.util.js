import { h, copyText } from "./dom.util.js";
import { API_BASE } from "./config.js";
import { icon, logoMark } from "./icons.js";
import { highlight } from "./highlight.js";

export const brand = () =>
  h("div", { class: "brand" }, logoMark(28), h("span", { class: "brand-name" }, "Frank", h("span", {}, "AI")), h("small", {}, "Developers"));

export const field = (label, input, hint) =>
  h("label", { class: "field" }, h("span", {}, label), input, hint ? h("small", {}, hint) : null);

export const errorLine = () => h("p", { class: "error", role: "alert" });

export const pageHead = (title, lede, ...actions) =>
  h("header", { class: "page-head" }, h("div", {}, h("h1", {}, title), lede ? h("p", { class: "lede" }, lede) : null), actions.length ? h("div", { class: "actions" }, actions) : null);

export const callout = (kind, title, text) =>
  h(
    "div",
    { class: `callout callout-${kind}`, role: kind === "bad" ? "alert" : null },
    icon(kind === "good" ? "check" : kind === "info" ? "info" : "alert", 20),
    h("div", {}, title ? h("strong", {}, title) : null, text ? h("span", {}, text) : null)
  );

// Marks a submit button as working. Sets disabled too, so a form cannot be sent twice.
export function setBusy(button, busy) {
  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
  if (busy) button.setAttribute("aria-busy", "true");
  else button.removeAttribute("aria-busy");
}

// ----- notifications -----
const toastRegion = h("div", { class: "toasts", "aria-live": "polite" });
document.body.append(toastRegion);

export function toast(text, kind = "good") {
  const remove = () => {
    t.classList.add("is-leaving");
    setTimeout(() => t.remove(), 200);
  };
  const close = h("button", { type: "button", "aria-label": "Dismiss message", onclick: remove }, icon("x", 16));
  const t = h("div", { class: `toast toast-${kind}`, role: kind === "bad" ? "alert" : "status" }, icon(kind === "good" ? "check" : "alert", 18), h("span", {}, text), close);
  toastRegion.append(t);
  setTimeout(remove, kind === "bad" ? 8000 : 4500);
}

// ----- copy + code -----
export function copyButton(text, { label = "Copy", what = "text" } = {}) {
  const status = h("span", { class: "sr-only", role: "status" });
  const word = h("span", {}, label);
  const btn = h("button", { class: "code-copy", type: "button", "aria-label": `Copy ${what}` }, icon("copy", 16), word);
  let timer;
  btn.addEventListener("click", async () => {
    const ok = await copyText(text);
    word.textContent = ok ? "Copied" : "Copy failed";
    btn.classList.toggle("is-done", ok);
    status.textContent = ok ? `${what} copied to clipboard` : "Copy failed. Select the text manually.";
    clearTimeout(timer);
    timer = setTimeout(() => {
      word.textContent = label;
      btn.classList.remove("is-done");
      status.textContent = "";
    }, 1800);
  });
  return h("span", {}, btn, status);
}

export function codeBlock(text, { title = "javascript" } = {}) {
  return h(
    "figure",
    { class: "code" },
    h("figcaption", { class: "code-head" }, h("span", {}, title), copyButton(text, { what: "code" })),
    h("pre", { tabindex: "0", role: "region", "aria-label": `${title} code sample` }, h("code", {}, highlight(text)))
  );
}
export const snippetBlock = (text) => codeBlock(text);

// 7-day token bars drawn from real history data. Bars are CSS-sized through the CSSOM.
export function sparkline(history, label) {
  const total = history.reduce((s, d) => s + d.tokens, 0);
  const max = Math.max(1, ...history.map((d) => d.tokens));
  const summary = history.map((d) => `${d.day}: ${Number(d.tokens).toLocaleString()}`).join(", ");
  return h(
    "div",
    { class: "sparkline", role: "img", "aria-label": `${label}. ${total === 0 ? "No tokens used." : summary}` },
    history.map((d) => {
      const bar = h("div", { class: total === 0 ? "spark spark-empty" : "spark", title: `${d.day}: ${Number(d.tokens).toLocaleString()} tokens` });
      bar.style.height = `${Math.max(4, (d.tokens / max) * 100)}%`;
      return bar;
    })
  );
}

// ----- dialogs -----
// A modal dialog. close() shuts it; it removes itself from the page when closed.
export function openDialog(...children) {
  const dialog = h("dialog", { class: "dialog" }, h("div", { class: "dialog-body" }, children));
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
  return { dialog, close: () => dialog.open && dialog.close() };
}

// Resolves true only when the person presses the confirm button. Focus starts on Cancel.
export function confirmDialog({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = true }) {
  return new Promise((resolve) => {
    let result = false;
    const cancel = h("button", { class: "btn btn-ghost", type: "button", autofocus: true }, cancelLabel);
    const ok = h("button", { class: danger ? "btn btn-danger-solid" : "btn", type: "button" }, confirmLabel);
    const { dialog, close } = openDialog(
      h(
        "div",
        { class: "stack", role: "alertdialog" },
        h("div", { class: `dialog-icon dialog-icon-${danger ? "bad" : "info"}` }, icon(danger ? "alert" : "info", 22)),
        h("h3", {}, title),
        h("p", { class: "muted" }, body),
        h("div", { class: "actions actions-end" }, cancel, ok)
      )
    );
    cancel.addEventListener("click", close);
    ok.addEventListener("click", () => {
      result = true;
      close();
    });
    dialog.addEventListener("close", () => resolve(result));
  });
}

export function noticeDialog({ title, body, okLabel = "OK" }) {
  return new Promise((resolve) => {
    const ok = h("button", { class: "btn", type: "button", autofocus: true }, okLabel);
    const { dialog, close } = openDialog(
      h("div", { class: "stack" }, h("div", { class: "dialog-icon dialog-icon-info" }, icon("info", 22)), h("h3", {}, title), h("p", { class: "muted" }, body), h("div", { class: "actions actions-end" }, ok))
    );
    ok.addEventListener("click", close);
    dialog.addEventListener("close", resolve);
  });
}

// Shows something that can be seen only once (a key or a recovery code). Resolves when closed.
export function showSecret({ title, intro, secret, extra = null, confirmText = null }) {
  return new Promise((resolve) => {
    const status = h("span", { class: "muted small", role: "status" });
    const done = h("button", { class: "btn", type: "button", disabled: Boolean(confirmText) }, "Done");
    const confirm = confirmText ? h("input", { type: "checkbox", onchange: (e) => (done.disabled = !e.target.checked) }) : null;

    const { dialog, close } = openDialog(
      h(
        "div",
        { class: "stack" },
        h("h3", {}, title),
        h("p", { class: "muted" }, intro),
        h("p", { class: "once-note" }, icon("lock", 18), "Shown once. Frank AI cannot show it again."),
        h("code", { class: "keybox" }, secret),
        h(
          "div",
          { class: "actions" },
          h(
            "button",
            {
              class: "btn btn-ghost",
              type: "button",
              onclick: async () => {
                status.textContent = (await copyText(secret)) ? "Copied" : "Copy failed: select the text manually";
              },
            },
            icon("copy", 18),
            "Copy"
          ),
          status
        ),
        extra,
        confirm ? h("label", { class: "check" }, confirm, ` ${confirmText}`) : null,
        done
      )
    );
    dialog.classList.add("dialog-wide");
    done.addEventListener("click", close);
    if (confirmText) dialog.addEventListener("cancel", (e) => e.preventDefault()); // Esc can't skip the confirmation
    dialog.addEventListener("close", resolve);
  });
}

export const browserSnippet = (key) => `async function askFrank(message) {
  const res = await fetch("${API_BASE}/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer ${key}" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Something went wrong");
  return data.reply;
}`;

export const serverSnippet = (key) => `// Run this on your SERVER only. Never put a secret key in frontend code.
const res = await fetch("${API_BASE}/v1/respond", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer ${key}" },
  body: JSON.stringify({ message: "Describe a sunrise in two sentences", speak: true, image: true }),
});
console.log(await res.json());`;
