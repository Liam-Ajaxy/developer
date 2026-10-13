import { api } from "../api.client.js";
import { h, badge, table, fmtNumber, fmtTime } from "../dom.util.js";
import { pageHead, sparkline } from "../ui.util.js";

const statusKind = (s) => (s >= 500 ? "bad" : s >= 400 ? "warn" : "good");

function keyBlock(k) {
  const pct = k.daily_limit ? Math.min(100, (k.today_tokens / k.daily_limit) * 100) : 0;
  const fill = h("div", { class: pct >= 80 ? "bar-fill bar-hot" : "bar-fill" });
  fill.style.width = `${pct}%`;
  const name = k.label || "Untitled key";

  return h(
    "section",
    { class: "panel key-usage", "aria-label": `Usage for ${name}` },
    h(
      "div",
      { class: "bar-head" },
      h("span", {}, h("strong", {}, name), " ", badge(k.type)),
      h("span", { class: "muted" }, k.daily_limit ? `${fmtNumber(k.today_tokens)} / ${fmtNumber(k.daily_limit)} today` : fmtNumber(k.today_tokens))
    ),
    h("div", { class: "bar", role: "progressbar", "aria-label": `${name} daily token budget used`, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(pct)) }, fill),
    sparkline(k.history, `${name}, tokens per day for the last 7 days`),
    h("div", { class: "muted small" }, "Last 7 days, oldest to newest")
  );
}

function view(usage, logs) {
  return h(
    "div",
    { class: "page" },
    pageHead("Usage", "Daily budgets and recent requests. Updates every 20 seconds."),
    usage.keys.length ? h("div", { class: "usage-keys" }, usage.keys.map(keyBlock)) : h("div", { class: "empty-state" }, h("p", {}, "No active keys yet.")),
    h("p", { class: "muted small" }, `Daily budgets reset at ${usage.resets_at}. An image counts as 1,000 tokens and a voice clip as 300.`),
    h("h2", { class: "block-title" }, "Calls in the last 7 days"),
    table(
      ["Service", "Calls", "Errors"],
      usage.calls_7d.map((r) => [r.service, fmtNumber(r.calls), r.errors ? badge(r.errors, "bad") : "0"]),
      "No calls yet."
    ),
    h("h2", { class: "block-title" }, "Recent requests"),
    table(
      ["Time", "Service", "Status", "ms", "Tokens", "Error"],
      logs.map((l) => [
        fmtTime(l.ts),
        l.service,
        badge(l.status, statusKind(l.status)),
        fmtNumber(l.ms),
        l.tokens == null ? "-" : fmtNumber(l.tokens),
        l.error_code ?? "",
      ]),
      "No requests yet."
    )
  );
}

export async function render(container) {
  const load = async () => {
    const [usage, logs] = await Promise.all([api("/usage"), api("/logs?limit=30")]);
    container.replaceChildren(view(usage, logs.logs));
  };
  await load();
  const timer = setInterval(() => {
    if (!document.hidden) load().catch(() => {});
  }, 20000);
  return () => clearInterval(timer);
}
