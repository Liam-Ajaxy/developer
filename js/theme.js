import { h } from "./dom.util.js";
import { icon } from "./icons.js";

const KEY = "frankai_theme";
const root = document.documentElement;
const toggles = new Set();

const saved = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
};
const systemTheme = () => (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

export const currentTheme = () => (root.getAttribute("data-theme") === "light" ? "light" : "dark");

function apply(theme, { animate = false } = {}) {
  if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-anim");
    setTimeout(() => root.classList.remove("theme-anim"), 360);
  }
  root.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#F6F7F9" : "#0B0D12");
  for (const btn of toggles) {
    if (!btn.isConnected) toggles.delete(btn);
    else btn.sync();
  }
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
  apply(theme, { animate: true });
}

// Follows the operating system until the person picks a theme themselves.
export function initTheme() {
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (!saved()) apply(systemTheme());
  });
  if (currentTheme() !== (saved() ?? systemTheme())) apply(saved() ?? systemTheme());
}

export function themeToggle() {
  const btn = h("button", { class: "icon-btn theme-toggle", type: "button" });
  btn.sync = () => {
    const dark = currentTheme() === "dark";
    btn.replaceChildren(icon(dark ? "sun" : "moon", 20));
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    btn.title = dark ? "Light theme" : "Dark theme";
  };
  btn.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
  btn.sync();
  toggles.add(btn);
  return btn;
}
