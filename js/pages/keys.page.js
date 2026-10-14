import { api } from "../api.client.js";
import { h, badge, table, fmtAgo } from "../dom.util.js";
import { icon } from "../icons.js";
import { field, errorLine, openDialog, showSecret, codeBlock, browserSnippet, serverSnippet, confirmDialog, toast, callout, setBusy, pageHead } from "../ui.util.js";

let flash = null; // a message to show after the page re-renders

const lines = (text) => text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
const isLocalhost = (origin) => origin.endsWith(":*");

export async function render(container, { profile, refresh }) {
  const dev = profile.developer;
  const { keys, max_keys } = await api("/keys");
  const active = keys.filter((k) => k.active);

  const say = (text, kind = "good") => toast(text, kind);
  if (flash) {
    say(flash);
    flash = null;
  }
  const done = (message) => {
    flash = message;
    refresh();
  };

  const keySnippet = (type, key) =>
    type === "public"
      ? codeBlock(browserSnippet(key), { title: "browser.js" })
      : type === "cli"
        ? codeBlock("npm install -g frankai\nfrankai login   # paste the key when asked\nfrankai explain recursion simply", { title: "terminal", lang: "shell" })
        : codeBlock(serverSnippet(key), { title: "server.js" });

  const formButtons = (submitLabel, close) => {
    const submit = h("button", { type: "submit", class: "btn" }, submitLabel);
    return [submit, h("div", { class: "actions actions-end" }, h("button", { type: "button", class: "btn btn-ghost", onclick: () => close() }, "Cancel"), submit)];
  };

  function openCreate() {
    const canSecret = dev.status === "approved" && dev.secret_allowed;
    const choice = (value, title, desc, disabled) =>
      h(
        "label",
        { class: disabled ? "choice is-disabled" : "choice" },
        h("input", { type: "radio", name: "keytype", value, checked: value === "public", disabled }),
        h("span", { class: "choice-body" }, h("strong", {}, title), h("small", {}, desc))
      );
    const types = h(
      "fieldset",
      { class: "choice-group" },
      h("legend", {}, "Type"),
      choice("public", "Public key", "For your website's frontend. Chat only.", false),
      choice("cli", "Terminal key", "The Frank AI command line (chat, image, voice).", false),
      choice("secret", "Secret key", canSecret ? "For your server. Chat, image and voice." : "Needs approval first.", !canSecret)
    );
    const label = h("input", { type: "text", maxlength: 60, placeholder: "e.g. portfolio site" });
    const sites = h("textarea", { rows: 3, placeholder: "https://my-site.vercel.app" });
    const localhost = h("input", { type: "checkbox", checked: true });
    const sitesRow = field("Your site addresses (one per line)", sites, "Only these sites can use the key from a browser.");
    const localRow = h("label", { class: "check" }, localhost, " Also allow http://localhost while I develop");
    const secretNote = callout("warn", "Server use only", "A secret key must never appear in frontend code, a web page, or a URL.");
    secretNote.hidden = true;
    const error = errorLine();
    const kind = () => form.elements.keytype.value;
    types.addEventListener("change", () => {
      const isPublic = kind() === "public";
      sitesRow.hidden = localRow.hidden = !isPublic;
      secretNote.hidden = kind() !== "secret";
    });

    const [submit, buttons] = formButtons("Create key", () => close());
    const form = h("form", { class: "stack" }, h("h3", {}, "Create a key"), types, field("Label (optional)", label), sitesRow, localRow, secretNote, error, buttons);
    const { close } = openDialog(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      setBusy(submit, true);
      try {
        const type = kind();
        const body = { type, label: label.value };
        if (type === "public") {
          body.origins = lines(sites.value);
          body.allow_localhost = localhost.checked;
        }
        const out = await api("/keys", { method: "POST", body });
        close();
        await showSecret({
          title: "Your new key",
          intro: out.usable
            ? "Copy it now. It cannot be shown again."
            : "Copy it now. It cannot be shown again. It starts working once your account is approved.",
          secret: out.key,
          extra: keySnippet(type, out.key),
        });
        done("Key created.");
      } catch (err) {
        error.textContent = err.message;
        setBusy(submit, false);
      }
    });
  }

  function openEdit(k) {
    const label = h("input", { type: "text", maxlength: 60, value: k.label ?? "" });
    const assistant = h("input", { type: "text", maxlength: 40, value: k.assistant_name ?? "", placeholder: "Frank AI" });
    const modelName = h("input", { type: "text", maxlength: 40, value: k.model_name ?? "", placeholder: "Frank AI Sprinta 2" });
    const company = h("input", { type: "text", maxlength: 40, value: k.company_name ?? "", placeholder: "Islle" });
    const sites = h("textarea", { rows: 3 }, k.origins.filter((o) => !isLocalhost(o)).join("\n"));
    const localhost = h("input", { type: "checkbox", checked: k.origins.some(isLocalhost) });
    const error = errorLine();
    const [submit, buttons] = formButtons("Save", () => close());
    const form = h(
      "form",
      { class: "stack" },
      h("h3", {}, "Edit key"),
      field("Label", label),
      h(
        "fieldset",
        { class: "identity" },
        h("legend", {}, "Assistant identity"),
        field("Assistant name", assistant, "What your assistant calls itself. Leave blank for Frank AI."),
        field("Model name", modelName, "Leave blank for Frank AI Sprinta 2."),
        field("Company name", company, "Leave blank for Islle.")
      ),
      k.type === "public" ? field("Your site addresses (one per line)", sites) : null,
      k.type === "public" ? h("label", { class: "check" }, localhost, " Also allow http://localhost while I develop") : null,
      error,
      buttons
    );
    const { close } = openDialog(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      setBusy(submit, true);
      try {
        const body = { label: label.value, assistant_name: assistant.value, model_name: modelName.value, company_name: company.value };
        if (k.type === "public") {
          body.origins = lines(sites.value);
          body.allow_localhost = localhost.checked;
        }
        await api(`/keys/${k.id}`, { method: "PATCH", body });
        close();
        done("Key updated.");
      } catch (err) {
        error.textContent = err.message;
        setBusy(submit, false);
      }
    });
  }

  async function rotate(k) {
    const ok = await confirmDialog({
      title: "Rotate this key?",
      body: "Create a new key and switch this one off. Anything using the old key stops working right away.",
      confirmLabel: "Rotate key",
    });
    if (!ok) return;
    try {
      const out = await api(`/keys/${k.id}/rotate`, { method: "POST" });
      await showSecret({
        title: "Your replacement key",
        intro: "Copy it now. It cannot be shown again. The old key no longer works.",
        secret: out.key,
        extra: keySnippet(k.type, out.key),
      });
      done("Key rotated.");
    } catch (err) {
      say(err.message, "bad");
    }
  }

  async function revoke(k) {
    const ok = await confirmDialog({
      title: "Revoke this key?",
      body: "Apps using it stop working right away. This cannot be undone.",
      confirmLabel: "Revoke key",
    });
    if (!ok) return;
    try {
      await api(`/keys/${k.id}/revoke`, { method: "POST" });
      done("Key revoked.");
    } catch (err) {
      say(err.message, "bad");
    }
  }

  function openSecretRequest() {
    const reason = h("textarea", { rows: 4, maxlength: 300, placeholder: "What are you building, and why does it need a secret key?" });
    const error = errorLine();
    const [submit, buttons] = formButtons("Send request", () => close());
    const form = h(
      "form",
      { class: "stack" },
      h("h3", {}, "Request secret key access"),
      h("p", { class: "muted" }, "Secret keys can use image generation and voice, and are for your server only."),
      field("Your reason", reason),
      error,
      buttons
    );
    const { close } = openDialog(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      setBusy(submit, true);
      try {
        await api("/secret-request", { method: "POST", body: { reason: reason.value } });
        close();
        done("Request sent. We'll update your account when we've reviewed it.");
      } catch (err) {
        error.textContent = err.message;
        setBusy(submit, false);
      }
    });
  }

  function state(k) {
    if (k.usable) return badge("active", "good");
    return badge(dev.status === "pending" ? "waiting for approval" : "switched off", "warn");
  }

  const rows = active.map((k) => [
    h("div", { class: "key-id" }, h("strong", {}, k.label || "Untitled key"), h("div", { class: "muted small mono" }, k.id)),
    badge(k.type),
    k.origins.length ? h("div", { class: "chips" }, k.origins.map((o) => h("span", { class: "chip" }, o))) : "-",
    state(k),
    fmtAgo(k.last_used_at),
    h(
      "div",
      { class: "actions" },
      h("button", { class: "btn btn-small btn-ghost", type: "button", "aria-label": `Edit ${k.label || "key"}`, onclick: () => openEdit(k) }, icon("edit", 16), "Edit"),
      h("button", { class: "btn btn-small btn-ghost", type: "button", "aria-label": `Rotate ${k.label || "key"}`, onclick: () => rotate(k) }, icon("rotate", 16), "Rotate"),
      h("button", { class: "btn btn-small btn-danger", type: "button", "aria-label": `Revoke ${k.label || "key"}`, onclick: () => revoke(k) }, icon("trash", 16), "Revoke")
    ),
  ]);

  const atLimit = active.length >= max_keys;
  const secretBlock =
    dev.status !== "approved" || dev.secret_allowed
      ? null
      : dev.secret_request
        ? h("p", { class: "muted" }, `Your secret key request is waiting for review: "${dev.secret_request}"`)
        : h("button", { class: "btn btn-ghost", type: "button", onclick: openSecretRequest }, icon("lock", 18), "Request secret key access");

  container.replaceChildren(
    h(
      "div",
      { class: "page" },
      pageHead("Keys", "Public keys go in your website. Secret keys stay on your server."),
      dev.status === "pending" ? callout("info", null, "Keys you create now start working as soon as your account is approved.") : null,
      h(
        "div",
        { class: "toolbar" },
        h("button", { class: "btn", type: "button", disabled: dev.status === "suspended" || atLimit, onclick: openCreate }, icon("plus", 18), "Create key"),
        h("span", { class: "muted small" }, `${active.length} of ${max_keys} keys used${atLimit ? ". Revoke one to create another." : ""}`),
        secretBlock
      ),
      table(["Key", "Type", "Allowed sites", "State", "Last used", "Actions"], rows, "No keys yet. Create your first one.")
    )
  );
}