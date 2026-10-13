import { api, session } from "../api.client.js";
import { h } from "../dom.util.js";
import { brand, field, errorLine, setBusy } from "../ui.util.js";

export async function render(box) {
  const contact = h("input", { type: "text", required: true, autocomplete: "username", placeholder: "name@example.com or +250..." });
  const password = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const remember = h("input", { type: "checkbox" });
  const error = errorLine();
  const submit = h("button", { class: "btn btn-lg", type: "submit" }, "Log in");

  const form = h(
    "form",
    { class: "auth-form" },
    field("Email or phone", contact),
    field("Password", password),
    h("label", { class: "check" }, remember, " Keep me logged in on this device"),
    error,
    submit
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    setBusy(submit, true);
    try {
      const out = await api("/login", { method: "POST", auth: false, body: { contact: contact.value, password: password.value } });
      session.save(out.token, remember.checked);
      location.hash = "#/home";
    } catch (err) {
      error.textContent = err.message;
      password.select();
    } finally {
      setBusy(submit, false);
    }
  });

  box.append(
    brand(),
    h("h1", {}, "Developer login"),
    h("p", { class: "muted" }, "Manage your keys, usage and account."),
    form,
    h("p", { class: "muted small auth-links" }, h("a", { href: "#/forgot" }, "Forgot your password?"), h("span", { "aria-hidden": "true" }, " · "), h("a", { href: "#/signup" }, "Request access"), h("span", { "aria-hidden": "true" }, " · "), h("a", { href: "#/" }, "Back to home"))
  );
}
