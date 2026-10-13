import { api } from "../api.client.js";
import { h, badge, table, fmtAgo } from "../dom.util.js";
import { field, errorLine, openDialog, showSecret, snippetBlock, browserSnippet, serverSnippet } from "../ui.util.js";

let flash = null; // a message to show after the page re-renders

const lines = (text) => text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
const isLocalhost = (origin) => origin.endsWith(":*");

export async function render(container, { profile, refresh }) {
  const dev = profile.developer;
  const { keys, max_keys } = await api("/keys");
  const active = keys.filter((k) => k.active);

  const notice = h("p", { class: "notice", hidden: true });
  function say(text, kind = "good") {
    notice.hidden = false;
    notice.className = `notice notice-${kind}`;
    notice.textContent = text;
  }
  if (flash) {
    say(flash);
    flash = null;
  }
  const done = (message) => {
    flash = message;
    refresh();
  };

  const keySnippet = (type, key) => snippetBlock(type === "public" ? browserSnippet(key) : serverSnippet(key));

  function openCreate() {
    const canSecret = dev.status === "approved" && dev.secret_allowed;
    const type = h(
      "select",
      {},
      h("option", { value: "public" }, "Public key: your website's frontend (chat only)"),
      h("option", { value: "secret", disabled: !canSecret }, canSecret ? "Secret key: your server (chat, image, voice)" : "Secret key: needs approval first")
    );
    const label = h("input", { type: "text", maxlength: 60, placeholder: "e.g. portfolio site" });
    const sites = h("textarea", { rows: 3, placeholder: "https://my-site.vercel.app" });
    const localhost = h("input", { type: "checkbox", checked: true });
    const sitesRow = field("Your site addresses (one per line)", sites, "Only these sites can use the key from a browser.");
    const localRow = h("label", { class: "check" }, localhost, " Also allow http://localhost while I develop");
    const error = errorLine();
    type.addEventListener("change", () => {
      sitesRow.hidden = localRow.hidden = type.value !== "public";
    });

    const form = h(
      "form",
      { class: "stack" },
      h("h3", {}, "Create a key"),
      field("Type", type),
      field("Label (optional)", label),
      sitesRow,
      localRow,
      error,
      h(
        "div",
        { class: "actions" },
        h("button", { type: "button", class: "btn btn-ghost", onclick: () => close() }, "Cancel"),
        h("button", { type: "submit", class: "btn" }, "Create key")
      )
    );
    const { close } = openDialog(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      try {
        const body = { type: type.value, label: label.value };
        if (type.value === "public") {
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
          extra: keySnippet(type.value, out.key),
        });
        done("Key created.");
      } catch (err) {
        error.textContent = err.message;
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
    const form = h(
      "form",
      { class: "stack" },
      h("h3", {}, "Edit key"),
      field("Label", label),
      field("Assistant name", assistant, "What your assistant calls itself. Leave blank for Frank AI."),
      field("Model name", modelName, "Leave blank for Frank AI Sprinta 2."),
      field("Company name", company, "Leave blank for Islle."),
      k.type === "public" ? field("Your site addresses (one per line)", sites) : null,
      k.type === "public" ? h("label", { class: "check" }, localhost, " Also allow http://localhost while I develop") : null,
      error,
      h(
        "div",
        { class: "actions" },
        h("button", { type: "button", class: "btn btn-ghost", onclick: () => close() }, "Cancel"),
        h("button", { type: "submit", class: "btn" }, "Save")
      )
    );
    const { close } = openDialog(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
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
      }
    });
  }

  async function rotate(k) {
    if (!confirm("Create a new key and switch this one off? Anything using the old key stops working right away.")) return;
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
    if (!confirm("Revoke this key? Apps using it stop working right away.")) return;
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
    const form = h(
      "form",
      { class: "stack" },
      h("h3", {}, "Request secret key access"),
      h("p", { class: "muted" }, "Secret keys can use image generation and voice, and are for your server only."),
      field("Your reason", reason),
      error,
      h(
        "div",
        { class: "actions" },
        h("button", { type: "button", class: "btn btn-ghost", onclick: () => close() }, "Cancel"),
        h("button", { type: "submit", class: "btn" }, "Send request")
      )
    );
    const { close } = openDialog(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      try {
        await api("/secret-request", { method: "POST", body: { reason: reason.value } });
        close();
        done("Request sent. We'll update your account when we've reviewed it.");
      } catch (err) {
        error.textContent = err.message;
      }
    });
  }

  function state(k) {
    if (k.usable) return badge("active", "good");
    return badge(dev.status === "pending" ? "waiting for approval" : "switched off", "warn");
  }

  const rows = active.map((k) => [
    h("div", {}, h("strong", {}, k.label || "Untitled key"), h("div", { class: "muted small mono" }, k.id)),
    badge(k.type),
    k.origins.length ? k.origins.join(", ") : "-",
    state(k),
    fmtAgo(k.last_used_at),
    h(
      "div",
      { class: "actions" },
      h("button", { class: "btn btn-small btn-ghost", onclick: () => openEdit(k) }, "Edit"),
      h("button", { class: "btn btn-small btn-ghost", onclick: () => rotate(k) }, "Rotate"),
      h("button", { class: "btn btn-small btn-danger", onclick: () => revoke(k) }, "Revoke")
    ),
  ]);

  const secretBlock =
    dev.status !== "approved" || dev.secret_allowed
      ? null
      : dev.secret_request
        ? h("p", { class: "muted" }, `Your secret key request is waiting for review: "${dev.secret_request}"`)
        : h("button", { class: "btn btn-ghost", onclick: openSecretRequest }, "Request secret key access");

  container.replaceChildren(
    h("h1", {}, "Keys"),
    notice,
    dev.status === "pending" ? h("p", { class: "notice notice-good" }, "Keys you create now start working as soon as your account is approved.") : null,
    h(
      "div",
      { class: "toolbar" },
      h(
        "button",
        { class: "btn", disabled: dev.status === "suspended" || active.length >= max_keys, onclick: openCreate },
        "Create key"
      ),
      h("span", { class: "muted small" }, `${active.length} of ${max_keys} keys used`),
      secretBlock
    ),
    table(["Key", "Type", "Allowed sites", "State", "Last used", ""], rows, "No keys yet. Create your first one.")
  );
}