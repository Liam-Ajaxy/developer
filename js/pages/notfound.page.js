import { h } from "../dom.util.js";
import { brand } from "../ui.util.js";
import { session } from "../api.client.js";

// Shown for any address that is not a page. The URL is left exactly as typed; we never guess a different page.
export async function render(box) {
  const shown = location.pathname.length > 80 ? `${location.pathname.slice(0, 80)}...` : location.pathname;
  const signedIn = Boolean(session.token);
  box.append(
    brand(),
    h("h1", {}, "Page not found"),
    h("p", { class: "muted" }, "There is no page at ", h("code", {}, shown), "."),
    h("div", { class: "actions" }, h("a", { class: "btn", href: signedIn ? "/home" : "/" }, signedIn ? "Go to your dashboard" : "Back to home"), signedIn ? null : h("a", { class: "btn btn-ghost", href: "/login" }, "Log in"))
  );
}
