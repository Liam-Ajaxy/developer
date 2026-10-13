import { api, session } from "../api.client.js";
import { h } from "../dom.util.js";
import { brand, field, errorLine, showSecret, setBusy } from "../ui.util.js";

export async function render(box) {
  const name = h("input", { type: "text", maxlength: 80, required: true, autocomplete: "name" });
  const contact = h("input", { type: "text", maxlength: 120, required: true, autocomplete: "username", placeholder: "name@example.com or +250..." });
  const password = h("input", { type: "password", minlength: 10, maxlength: 200, required: true, autocomplete: "new-password" });
  const again = h("input", { type: "password", maxlength: 200, required: true, autocomplete: "new-password" });
  const note = h("input", { type: "text", maxlength: 300, placeholder: "e.g. a chatbot for my portfolio" });
  const trap = h("input", { type: "text", tabindex: "-1", autocomplete: "off" }); // honeypot for bots
  const accept = h("input", { type: "checkbox", required: true });
  const error = errorLine();
  const submit = h("button", { class: "btn btn-lg", type: "submit" }, "Request access");

  const form = h(
    "form",
    { class: "auth-form" },
    field("Your name", name),
    field("Email or phone", contact, "We reply here in the portal. Use something you can be reached on."),
    field("Password", password, "At least 10 characters."),
    field("Repeat password", again),
    field("What are you building? (optional)", note),
    h("label", { class: "hp", "aria-hidden": "true" }, "Leave this empty ", trap),
    h("label", { class: "check" }, accept, " I agree to the usage rules: no abuse, no illegal content, and I won't share my keys."),
    error,
    submit
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    if (password.value !== again.value) {
      error.textContent = "The two passwords don't match.";
      return;
    }
    setBusy(submit, true);
    try {
      const out = await api("/signup", {
        method: "POST",
        auth: false,
        body: {
          name: name.value,
          contact: contact.value,
          password: password.value,
          note: note.value,
          website: trap.value,
          accept_rules: accept.checked,
        },
      });
      session.save(out.token, false);
      await showSecret({
        title: "Save your recovery code",
        intro: "If you forget your password, this code is how you get back in without asking us. It will not be shown again.",
        secret: out.recovery_code,
        confirmText: "I have saved my recovery code",
      });
      location.hash = "#/home";
    } catch (err) {
      error.textContent = err.message;
    } finally {
      setBusy(submit, false);
    }
  });

  box.append(
    brand(),
    h("h1", {}, "Request access"),
    h("p", { class: "muted" }, "Free AI for your apps. Create your account and we'll review your request. You can check its status here any time."),
    form,
    h("p", { class: "muted small auth-links" }, "Already have an account? ", h("a", { href: "#/login" }, "Log in"))
  );
}
