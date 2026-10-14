import { api, session } from "../api.client.js";
import { navigate } from "../router.js";
import { h, badge } from "../dom.util.js";
import { icon } from "../icons.js";
import { field, errorLine, toast, confirmDialog, noticeDialog, setBusy, pageHead } from "../ui.util.js";

const STATUS_KIND = { approved: "good", pending: "warn", suspended: "bad" };

export async function render(container, { profile }) {
  const dev = profile.developer;
  const say = (text, kind = "good") => toast(text, kind);

  // ----- profile -----
  const name = h("input", { type: "text", maxlength: 80, required: true, value: dev.name });
  const contact = h("input", { type: "text", maxlength: 120, required: true, value: dev.contact ?? "" });
  const note = h("input", { type: "text", maxlength: 300, value: dev.note ?? "" });
  const profileError = errorLine();
  const profileSubmit = h("button", { class: "btn", type: "submit" }, "Save profile");
  const profileForm = h("form", { class: "stack" }, field("Name", name), field("Email or phone", contact), field("What you're building", note), profileError, h("div", { class: "actions" }, profileSubmit));
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileError.textContent = "";
    setBusy(profileSubmit, true);
    try {
      await api("/me", { method: "PATCH", body: { name: name.value, contact: contact.value, note: note.value } });
      say("Profile saved.");
    } catch (err) {
      profileError.textContent = err.message;
    } finally {
      setBusy(profileSubmit, false);
    }
  });

  // ----- password -----
  const current = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const next = h("input", { type: "password", minlength: 10, maxlength: 200, required: true, autocomplete: "new-password" });
  const passwordError = errorLine();
  const passwordSubmit = h("button", { class: "btn", type: "submit" }, "Change password");
  const passwordForm = h(
    "form",
    { class: "stack" },
    field("Current password", current),
    field("New password", next, "At least 10 characters. Other devices are logged out."),
    passwordError,
    h("div", { class: "actions" }, passwordSubmit)
  );
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordError.textContent = "";
    setBusy(passwordSubmit, true);
    try {
      const out = await api("/password", { method: "POST", body: { current_password: current.value, new_password: next.value } });
      session.replace(out.token);
      current.value = next.value = "";
      say("Password changed.");
    } catch (err) {
      passwordError.textContent = err.message;
    } finally {
      setBusy(passwordSubmit, false);
    }
  });

  // ----- delete -----
  const confirmPassword = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const deleteError = errorLine();
  const deleteSubmit = h("button", { class: "btn btn-danger-solid", type: "submit" }, icon("trash", 18), "Delete my account");
  const deleteForm = h(
    "form",
    { class: "stack" },
    h("p", {}, "This switches off all your keys and erases your name and contact. It cannot be undone."),
    field("Your password", confirmPassword),
    deleteError,
    h("div", { class: "actions" }, deleteSubmit)
  );
  deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    deleteError.textContent = "";
    const ok = await confirmDialog({ title: "Delete your account for good?", body: "All your keys stop working and your details are erased. This cannot be undone.", confirmLabel: "Delete account" });
    if (!ok) return;
    setBusy(deleteSubmit, true);
    try {
      await api("/delete-account", { method: "POST", body: { password: confirmPassword.value } });
      session.clear();
      await noticeDialog({ title: "Account deleted", body: "Your account was deleted." });
      navigate("/login", { replace: true });
    } catch (err) {
      deleteError.textContent = err.message;
      setBusy(deleteSubmit, false);
    }
  });

  const group = (id, title, lede, ...children) =>
    h("section", { class: "panel account-block", "aria-labelledby": id }, h("div", { class: "account-copy" }, h("h2", { id }, title), h("p", { class: "muted" }, lede)), h("div", { class: "account-form" }, children));

  container.replaceChildren(
    h(
      "div",
      { class: "page" },
      pageHead("Account", "Your profile, password and account status.", badge(dev.status, STATUS_KIND[dev.status] ?? "muted")),
      group("acc-profile", "Profile", "How we reach you and what you're building.", profileForm),
      group("acc-password", "Password", "Change it any time. Other devices are logged out.", passwordForm),
      h("section", { class: "panel danger-zone account-block", "aria-labelledby": "acc-delete" }, h("div", { class: "account-copy" }, h("h2", { id: "acc-delete" }, "Delete account"), h("p", { class: "muted" }, "Permanent. Asks for your password and a final confirmation.")), h("div", { class: "account-form" }, deleteForm))
    )
  );
}
