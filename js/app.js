import { session, api } from "./api.client.js";
import { h, clear, badge } from "./dom.util.js";
import { brand } from "./ui.util.js";
import { icon } from "./icons.js";
import { initTheme, themeToggle } from "./theme.js";
import * as login from "./pages/login.page.js";
import * as signup from "./pages/signup.page.js";
import * as forgot from "./pages/forgot.page.js";
import * as home from "./pages/home.page.js";
import * as keys from "./pages/keys.page.js";
import * as usage from "./pages/usage.page.js";
import * as docs from "./pages/docs.page.js";
import * as account from "./pages/account.page.js";

initTheme();

// The landing page (and its WebGL scene) loads only for visitors who are not logged in.
const loadLanding = () => import("./pages/landing.page.js");
const PUBLIC = { "": loadLanding, welcome: loadLanding, login, signup, forgot };
const PRIVATE = { home, keys, usage, docs, account };
const LINKS = [["home", "Home", "home"], ["keys", "Keys", "key"], ["usage", "Usage", "chart"], ["docs", "Docs", "book"], ["account", "Account", "user"]];
const TITLES = { "": "Frank AI · Developers", welcome: "Frank AI · Developers", login: "Log in", signup: "Request access", forgot: "Reset password", home: "Home", keys: "Keys", usage: "Usage", docs: "Docs", account: "Account" };
const STATUS_KIND = { approved: "good", pending: "warn", suspended: "bad" };

const root = document.getElementById("app");
let stopPage = null;
let renderId = 0;
let lastRoute = null;

const routeName = () => location.hash.replace(/^#\/?/, "").split("?")[0];

function logout() {
  session.clear();
  location.hash = "#/login";
}

// A calm stack of dimensional plates for the side of the login screens. Purely decorative.
function plateStack() {
  return h("div", { class: "plate-scene", "aria-hidden": "true" }, h("div", { class: "plates" }, [0, 1, 2, 3].map((i) => h("span", { class: `plate plate-${i}` }))), h("span", { class: "plate-orb" }));
}

function authShell(box) {
  return h(
    "div",
    { class: "auth" },
    h(
      "aside",
      { class: "auth-aside" },
      brand(),
      plateStack(),
      h("div", { class: "auth-pitch" }, h("h2", {}, "Chat, images and voice behind one key."), h("p", { class: "muted" }, "Public keys keep chat safe in the browser. Secret keys unlock image and speech on your server."))
    ),
    h("div", { class: "auth-main" }, h("div", { class: "auth-tools" }, themeToggle()), box)
  );
}

function fatal(err, id) {
  if (id !== renderId) return;
  clear(root);
  root.append(
    authShell(
      h("div", { class: "login-card portal-card" }, brand(), h("h1", {}, "Something went wrong"), h("p", { class: "error", role: "alert" }, err.message), h("div", { class: "actions" }, h("button", { class: "btn", onclick: () => show() }, "Try again")))
    )
  );
}

function sidebar(dev, active) {
  return h(
    "nav",
    { class: "sidebar", "aria-label": "Portal" },
    brand(),
    h(
      "div",
      { class: "nav-links" },
      LINKS.map(([name, label, ic]) =>
        h("a", { href: `#/${name}`, class: name === active ? "nav-link active" : "nav-link", "aria-current": name === active ? "page" : null }, icon(ic, 20), h("span", {}, label))
      )
    ),
    h(
      "div",
      { class: "side-foot" },
      h("div", { class: "side-status" }, h("span", { class: "muted small" }, "Account"), badge(dev.status, STATUS_KIND[dev.status] ?? "muted")),
      h("div", { class: "actions" }, themeToggle(), h("button", { class: "btn btn-ghost btn-small side-logout", type: "button", onclick: logout }, icon("logout", 16), "Log out"))
    )
  );
}

function topbar(dev) {
  return h(
    "header",
    { class: "topbar" },
    brand(),
    h("div", { class: "topbar-tools" }, badge(dev.status, STATUS_KIND[dev.status] ?? "muted"), themeToggle(), h("button", { class: "icon-btn", type: "button", "aria-label": "Log out", onclick: logout }, icon("logout", 20)))
  );
}

const loading = () =>
  h("div", { class: "page", "aria-busy": "true" }, h("span", { class: "skel skel-title" }), h("div", { class: "skel-grid" }, h("span", { class: "skel skel-card" }), h("span", { class: "skel skel-card" }), h("span", { class: "skel skel-card" })));

// After a real route change: back to the top, a fitting title, and focus moved to the new content.
function arrive(name, target) {
  document.title = TITLES[name] === "Frank AI · Developers" ? TITLES[name] : `${TITLES[name] ?? "Developers"} · Frank AI`;
  if (name === lastRoute) return;
  lastRoute = name;
  window.scrollTo(0, 0);
  target?.focus?.({ preventScroll: true });
}

async function show() {
  const id = ++renderId;
  stopPage?.(); // stop the previous page's refresh timer
  stopPage = null;
  const name = routeName();

  if (Object.hasOwn(PUBLIC, name)) {
    if (session.token) {
      location.hash = "#/home";
      return;
    }
    let mod = PUBLIC[name];
    if (typeof mod === "function") {
      try {
        mod = await mod();
      } catch (err) {
        fatal(err, id);
        return;
      }
      if (id !== renderId) return;
    }
    const full = mod.layout === "full";
    const box = h("div", full ? { class: "landing" } : { class: "login-card portal-card" });
    clear(root);
    root.append(full ? box : authShell(box));
    arrive(name, null);
    try {
      const stop = await mod.render(box);
      if (id === renderId) stopPage = stop ?? null;
      else stop?.();
    } catch (err) {
      fatal(err, id);
    }
    return;
  }

  if (!session.token) {
    location.hash = "#/login";
    return;
  }
  const pageName = Object.hasOwn(PRIVATE, name) ? name : "home";

  let profile;
  try {
    profile = await api("/me"); // fresh status on every page
  } catch (err) {
    if (err.code !== "login_required") fatal(err, id);
    return;
  }
  if (id !== renderId) return;

  const body = h("main", { class: "main page-enter", id: "main", tabindex: "-1" }, loading());
  const skip = h("button", { class: "skip-link", type: "button", onclick: () => body.focus() }, "Skip to content");
  clear(root);
  root.append(h("div", { class: "shell" }, skip, topbar(profile.developer), sidebar(profile.developer, pageName), body));
  arrive(pageName, body);

  try {
    const stop = await PRIVATE[pageName].render(body, { profile, refresh: show });
    if (id === renderId) stopPage = stop ?? null;
    else stop?.();
  } catch (err) {
    if (id !== renderId || err.code === "login_required") return;
    clear(body);
    body.append(h("div", { class: "page" }, h("div", { class: "callout callout-bad", role: "alert" }, icon("alert", 20), h("div", {}, h("strong", {}, "This page could not load"), h("span", {}, err.message))), h("div", { class: "actions retry" }, h("button", { class: "btn btn-ghost", type: "button", onclick: () => show() }, "Try again"))));
  }
}

window.addEventListener("hashchange", () => show());
show();
