import { session, api } from "./api.client.js";
import { h, clear, badge } from "./dom.util.js";
import { brand } from "./ui.util.js";
import * as login from "./pages/login.page.js";
import * as signup from "./pages/signup.page.js";
import * as forgot from "./pages/forgot.page.js";
import * as home from "./pages/home.page.js";
import * as keys from "./pages/keys.page.js";
import * as usage from "./pages/usage.page.js";
import * as docs from "./pages/docs.page.js";
import * as account from "./pages/account.page.js";

const PUBLIC = { login, signup, forgot };
const PRIVATE = { home, keys, usage, docs, account };
const LINKS = [["home", "Home"], ["keys", "Keys"], ["usage", "Usage"], ["docs", "Docs"], ["account", "Account"]];
const STATUS_KIND = { approved: "good", pending: "warn", suspended: "bad" };

const root = document.getElementById("app");
let stopPage = null;
let renderId = 0;

const routeName = () => location.hash.replace(/^#\/?/, "").split("?")[0];

function fatal(err, id) {
  if (id !== renderId) return;
  clear(root);
  root.append(
    h(
      "div",
      { class: "login-wrap" },
      h("div", { class: "login-card portal-card" }, brand(), h("p", { class: "error" }, err.message), h("button", { class: "btn", onclick: () => show() }, "Try again"))
    )
  );
}

function sidebar(dev, active) {
  return h(
    "nav",
    { class: "sidebar" },
    brand(),
    LINKS.map(([name, label]) => h("a", { href: `#/${name}`, class: name === active ? "active" : null }, label)),
    h("div", { class: "side-status" }, badge(dev.status, STATUS_KIND[dev.status] ?? "muted")),
    h(
      "button",
      {
        class: "link-btn",
        type: "button",
        onclick: () => {
          session.clear();
          location.hash = "#/login";
        },
      },
      "Log out"
    )
  );
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
    const box = h("div", { class: "login-card portal-card" });
    clear(root);
    root.append(h("div", { class: "login-wrap" }, box));
    try {
      const stop = await PUBLIC[name].render(box);
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

  const body = h("main", { class: "main" }, h("p", { class: "empty" }, "Loading..."));
  clear(root);
  root.append(h("div", { class: "shell" }, sidebar(profile.developer, pageName), body));

  try {
    const stop = await PRIVATE[pageName].render(body, { profile, refresh: show });
    if (id === renderId) stopPage = stop ?? null;
    else stop?.();
  } catch (err) {
    if (id !== renderId || err.code === "login_required") return;
    clear(body);
    body.append(h("p", { class: "error" }, err.message));
  }
}

window.addEventListener("hashchange", () => show());
show();