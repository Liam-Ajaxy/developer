import { api, session } from "../api.client.js";
import { navigate } from "../router.js";
import { h } from "../dom.util.js";
import { brand, field, errorLine, showSecret, setBusy } from "../ui.util.js";

export async function render(box) {
  const contact = h("input", { type: "text", required: true, autocomplete: "username" });
  const code = h("input", { type: "text", required: true, autocomplete: "off", placeholder: "XXXX-XXXX-XXXX-XXXX-XXXX" });
  const password = h("input", { type: "password", minlength: 10, maxlength: 200, required: true, autocomplete: "new-password" });
  const again = h("input", { type: "password", maxlength: 200, required: true, autocomplete: "new-password" });
  const error = errorLine();
  const submit = h("button", { class: "btn btn-lg", type: "submit" }, "Set new password");

  const form = h(
    "form",
    { class: "auth-form" },
    field("Email or phone", contact),
    field("Recovery code", code, "The code you saved when you signed up, or a reset code from the Frank AI team."),
    field("New password", password, "At least 10 characters."),
    field("Repeat new password", again),
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
      const out = await api("/reset", {
        method: "POST",
        auth: false,
        body: { contact: contact.value, code: code.value, new_password: password.value },
      });
      session.save(out.token, false);
      await showSecret({
        title: "Your new recovery code",
        intro: "The old code no longer works. Save this one. It will not be shown again.",
        secret: out.recovery_code,
        confirmText: "I have saved my new recovery code",
      });
      navigate("/home", { replace: true });
    } catch (err) {
      error.textContent = err.message;
    } finally {
      setBusy(submit, false);
    }
  });

  box.append(
    brand(),
    h("h1", {}, "Reset your password"),
    h("p", { class: "muted" }, "Use your recovery code to set a new password."),
    form,
    h("p", { class: "muted small auth-links" }, h("a", { href: "/login" }, "Back to login"))
  );
}
