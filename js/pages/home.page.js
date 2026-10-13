import { api } from "../api.client.js";
import { h, card, fmtNumber, fmtAgo } from "../dom.util.js";
import { icon } from "../icons.js";
import { codeBlock, browserSnippet, pageHead, sparkline } from "../ui.util.js";

function banner(dev) {
  const message = dev.status_note ? h("p", {}, h("strong", {}, "Message from the team: "), dev.status_note) : null;
  const make = (kind, iconName, title, ...lines) =>
    h("section", { class: `banner banner-${kind}`, "aria-label": "Account status" }, h("div", { class: "banner-ico" }, icon(iconName, 22)), h("div", { class: "banner-text" }, h("h2", {}, title), lines, message));

  if (dev.status === "approved") return make("good", "shield", "You're approved", h("p", {}, "Your keys are live. Create and manage them on the Keys page."));
  if (dev.status === "pending") {
    return make("warn", "info", "Waiting for approval", h("p", {}, "We review every request by hand. Check back here: this page shows our decision and any message. You can already create a key. It starts working as soon as you're approved."));
  }
  return make("bad", "alert", "Your account is not active", h("p", {}, "Your keys are switched off."), message ? null : h("p", {}, "Contact the Frank AI team if you think this is a mistake."));
}

// Next steps come only from the account's real state.
function nextActions(dev, activeCount) {
  const items = [];
  if (dev.status === "pending") items.push(["Create a key now", "It starts working as soon as you're approved.", "#/keys", "key"]);
  else if (activeCount === 0 && dev.status !== "suspended") items.push(["Create your first key", "A public key lets your website chat with Frank AI.", "#/keys", "key"]);
  if (dev.status === "approved" && !dev.secret_allowed) {
    items.push(
      dev.secret_request
        ? ["Secret key request sent", "It is waiting for review. We'll update your account when we've looked at it.", "#/keys", "lock"]
        : ["Need image or voice?", "Request secret key access to use /v1/image and /v1/tts from your server.", "#/keys", "lock"]
    );
  }
  items.push(["Read the API reference", "Endpoints, limits and error codes.", "#/docs", "book"], ["Check your usage", "Daily budgets and recent requests.", "#/usage", "chart"]);
  return h(
    "ul",
    { class: "action-list" },
    items.map(([title, text, href, ic]) =>
      h("li", {}, h("a", { class: "action-item", href }, h("span", { class: "action-ico" }, icon(ic, 18)), h("span", { class: "action-copy" }, h("strong", {}, title), h("small", {}, text)), icon("arrow", 18)))
    )
  );
}

function keySlots(active, max) {
  const n = Math.min(max, 12);
  return h(
    "div",
    { class: "slots", role: "img", "aria-label": `${active} of ${max} keys in use` },
    Array.from({ length: n }, (_, i) => h("span", { class: i < active ? "slot slot-on" : "slot" }))
  );
}

export async function render(container, { profile }) {
  const dev = profile.developer;
  const [{ keys }, usage] = await Promise.all([api("/keys"), api("/usage")]);
  const active = keys.filter((k) => k.active);
  const today = usage.keys.reduce((sum, k) => sum + k.today_tokens, 0);

  // 7-day total across keys, summed from each key's real history (same days, same order).
  const byDay = new Map();
  for (const k of usage.keys) for (const d of k.history ?? []) byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.tokens);
  const week = [...byDay].map(([day, tokens]) => ({ day, tokens }));

  container.replaceChildren(
    h(
      "div",
      { class: "page" },
      h("div", { class: "welcome" }, pageHead(`Welcome, ${dev.name}`, "Your developer dashboard."), h("span", { class: "welcome-orb", "aria-hidden": "true" })),
      banner(dev),
      h(
        "div",
        { class: "cards" },
        card("Active keys", `${active.length} / ${profile.max_keys}`, null, { icon: "key", extra: keySlots(active.length, profile.max_keys) }),
        card("Tokens used today", fmtNumber(today), "resets at 00:00 UTC", { icon: "chart" }),
        card("Last login", dev.last_login_at ? fmtAgo(dev.last_login_at) : "now", null, { icon: "user" })
      ),
      h(
        "div",
        { class: "split" },
        h(
          "section",
          { class: "panel", "aria-labelledby": "qs-title" },
          h("h2", { id: "qs-title" }, "Quick start"),
          active.length
            ? h(
                "div",
                { class: "stack" },
                h("p", { class: "muted" }, "Paste this in your website's frontend code and replace YOUR_PUBLIC_KEY with a public key from the Keys page. It only works from the site addresses you registered."),
                codeBlock(browserSnippet("YOUR_PUBLIC_KEY"), { title: "browser.js" })
              )
            : h("p", { class: "muted" }, "You have no keys yet. ", h("a", { href: "#/keys" }, "Create your first key"), ".")
        ),
        h(
          "div",
          { class: "stack" },
          h("section", { class: "panel", "aria-labelledby": "next-title" }, h("h2", { id: "next-title" }, "Next steps"), nextActions(dev, active.length)),
          week.length
            ? h(
                "section",
                { class: "panel", "aria-labelledby": "week-title" },
                h("h2", { id: "week-title" }, "Tokens, last 7 days"),
                sparkline(week, "Tokens used per day across all keys"),
                h("p", { class: "muted small" }, week.every((d) => d.tokens === 0) ? "No tokens used in the last 7 days." : "Oldest to newest, all keys combined.")
              )
            : null
        )
      )
    )
  );
}
