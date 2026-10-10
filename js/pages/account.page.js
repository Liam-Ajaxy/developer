import { api, session } from "../api.client.js";
import { h } from "../dom.util.js";
import { field, errorLine } from "../ui.util.js";

export async function render(container, { profile, refresh }) {
  const dev = profile.developer;
  const notice = h("p", { class: "notice", hidden: true });
  const say = (text, kind = "good") => {
    notice.hidden = false;
    notice.className = `notice notice-${kind}`;
    notice.textContent = text;
  };

  // ----- profile -----
  const name = h("input", { type: "text", maxlength: 80, required: true, value: dev.name });
  const contact = h("input", { type: "text", maxlength: 120, required: true, value: dev.contact ?? "" });
  const note = h("input", { type: "text", maxlength: 300, value: dev.note ?? "" });
  const profileError = errorLine();
  const profileForm = h(
    "form",
    { class: "stack" },
    field("Name", name),
    field("Email or phone", contact),
    field("What you're building", note),
    profileError,
    h("button", { class: "btn", type: "submit" }, "Save profile")
  );
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileError.textContent = "";
    try {
      await api("/me", { method: "PATCH", body: { name: name.value, contact: contact.value, note: note.value } });
      say("Profile saved.");
    } catch (err) {
      profileError.textContent = err.message;
    }
  });

  // ----- password -----
  const current = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const next = h("input", { type: "password", minlength: 10, maxlength: 200, required: true, autocomplete: "new-password" });
  const passwordError = errorLine();
  const passwordForm = h(
    "form",
    { class: "stack" },
    field("Current password", current),
    field("New password", next, "At least 10 characters. Other devices are logged out."),
    passwordError,
    h("button", { class: "btn", type: "submit" }, "Change password")
  );
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordError.textContent = "";
    try {
      const out = await api("/password", { method: "POST", body: { current_password: current.value, new_password: next.value } });
      session.replace(out.token);
      current.value = next.value = "";
      say("Password changed.");
    } catch (err) {
      passwordError.textContent = err.message;
    }
  });

  // ----- delete -----
  const confirmPassword = h("input", { type: "password", required: true, autocomplete: "current-password" });
  const deleteError = errorLine();
  const deleteForm = h(
    "form",
    { class: "stack" },
    h("p", {}, "This switches off all your keys and erases your name and contact. It cannot be undone."),
    field("Your password", confirmPassword),
    deleteError,
    h("button", { class: "btn btn-danger", type: "submit" }, "Delete my account")
  );
  deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    deleteError.textContent = "";
    if (!confirm("Delete your account for good?")) return;
    try {
      await api("/delete-account", { method: "POST", body: { password: confirmPassword.value } });
      session.clear();
      alert("Your account was deleted.");
      location.hash = "#/login";
    } catch (err) {
      deleteError.textContent = err.message;
    }
  });

  container.replaceChildren(
    h("h1", {}, "Account"),
    notice,
    h("section", { class: "section" }, h("h2", {}, "Profile"), profileForm),
    h("section", { class: "section" }, h("h2", {}, "Password"), passwordForm),
    h("section", { class: "danger-zone" }, h("h2", {}, "Delete account"), deleteForm)
  );
}