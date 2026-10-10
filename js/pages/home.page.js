import { api } from "../api.client.js";
import { h, card, fmtNumber, fmtAgo } from "../dom.util.js";
import { snippetBlock, browserSnippet } from "../ui.util.js";

function banner(dev) {
  const message = dev.status_note ? h("p", {}, h("strong", {}, "Message from the team: "), dev.status_note) : null;
  if (dev.status === "approved") {
    return h("div", { class: "banner banner-good" }, h("h2", {}, "You're approved"), h("p", {}, "Your keys are live. Create and manage them on the Keys page."), message);
  }
  if (dev.status === "pending") {
    return h(
      "div",
      { class: "banner banner-warn" },
      h("h2", {}, "Waiting for approval"),
      h("p", {}, "We review every request by hand. Check back here: this page shows our decision and any message. You can already create a key. It starts working as soon as you're approved."),
      message
    );
  }
  return h(
    "div",
    { class: "banner banner-bad" },
    h("h2", {}, "Your account is not active"),
    h("p", {}, "Your keys are switched off."),
    message ?? h("p", {}, "Contact the Frank AI team if you think this is a mistake.")
  );
}

export async function render(container, { profile }) {
  const dev = profile.developer;
  const [{ keys }, usage] = await Promise.all([api("/keys"), api("/usage")]);
  const active = keys.filter((k) => k.active);
  const today = usage.keys.reduce((sum, k) => sum + k.today_tokens, 0);

  container.replaceChildren(
    h("h1", {}, `Welcome, ${dev.name}`),
    banner(dev),
    h(
      "div",
      { class: "cards" },
      card("Active keys", `${active.length} / ${profile.max_keys}`),
      card("Tokens used today", fmtNumber(today), "resets at 00:00 UTC"),
      card("Last login", dev.last_login_at ? fmtAgo(dev.last_login_at) : "now")
    ),
    h("h2", {}, "Quick start"),
    active.length
      ? h(
          "div",
          {},
          h("p", { class: "muted" }, "Paste this in your website's frontend code and replace YOUR_PUBLIC_KEY with a public key from the Keys page. It only works from the site addresses you registered."),
          snippetBlock(browserSnippet("YOUR_PUBLIC_KEY"))
        )
      : h("p", {}, "You have no keys yet. ", h("a", { href: "#/keys" }, "Create your first key"), ".")
  );
}