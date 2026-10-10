import { h, copyText } from "./dom.util.js";
import { API_BASE } from "./config.js";

export const brand = () => h("div", { class: "brand" }, "Frank", h("span", {}, "AI"), " ", h("small", {}, "Developers"));

export const field = (label, input, hint) =>
  h("label", { class: "field" }, h("span", {}, label), input, hint ? h("small", { class: "muted" }, hint) : null);

export const errorLine = () => h("p", { class: "error", role: "alert" });
export const snippetBlock = (text) => h("pre", { class: "snippet" }, text);

// A modal dialog. close() shuts it; it removes itself from the page when closed.
export function openDialog(...children) {
  const dialog = h("dialog", { class: "dialog" }, children);
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
  return { dialog, close: () => dialog.open && dialog.close() };
}

// Shows something that can be seen only once (a key or a recovery code). Resolves when closed.
export function showSecret({ title, intro, secret, extra = null, confirmText = null }) {
  return new Promise((resolve) => {
    const status = h("span", { class: "muted small" });
    const done = h("button", { class: "btn", type: "button", disabled: Boolean(confirmText) }, "Done");
    const confirm = confirmText
      ? h("input", { type: "checkbox", onchange: (e) => (done.disabled = !e.target.checked) })
      : null;

    const { dialog, close } = openDialog(
      h(
        "div",
        { class: "stack" },
        h("h3", {}, title),
        h("p", {}, intro),
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
            "Copy"
          ),
          status
        ),
        extra,
        confirm ? h("label", { class: "check" }, confirm, ` ${confirmText}`) : null,
        done
      )
    );
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