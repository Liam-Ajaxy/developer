import { api } from "../api.client.js";
import { h, badge, table, fmtNumber, fmtTime } from "../dom.util.js";

const statusKind = (s) => (s >= 500 ? "bad" : s >= 400 ? "warn" : "good");

function keyBlock(k) {
  const pct = k.daily_limit ? Math.min(100, (k.today_tokens / k.daily_limit) * 100) : 0;
  const fill = h("div", { class: pct >= 80 ? "bar-fill bar-hot" : "bar-fill" });
  fill.style.width = `${pct}%`;

  const max = Math.max(1, ...k.history.map((d) => d.tokens));
  const spark = h(
    "div",
    { class: "sparkline" },
    k.history.map((d) => {
      const bar = h("div", { class: "spark", title: `${d.day}: ${fmtNumber(d.tokens)} tokens` });
      bar.style.height = `${Math.max(4, (d.tokens / max) * 100)}%`;
      return bar;
    })
  );

  return h(
    "div",
    { class: "card section" },
    h(
      "div",
      { class: "bar-head" },
      h("span", {}, h("strong", {}, k.label || "Untitled key"), " ", badge(k.type)),
      h("span", { class: "muted" }, k.daily_limit ? `${fmtNumber(k.today_tokens)} / ${fmtNumber(k.daily_limit)} today` : fmtNumber(k.today_tokens))
    ),
    h("div", { class: "bar" }, fill),
    spark,
    h("div", { class: "muted small" }, "Last 7 days, oldest to newest")
  );
}

function view(usage, logs) {
  return h(
    "div",
    {},
    h("h1", {}, "Usage"),
    usage.keys.length ? usage.keys.map(keyBlock) : h("p", { class: "empty" }, "No active keys yet."),
    h("p", { class: "muted small" }, `Daily budgets reset at ${usage.resets_at}. An image counts as 1,000 tokens and a voice clip as 300.`),
    h("h2", {}, "Calls in the last 7 days"),
    table(
      ["Service", "Calls", "Errors"],
      usage.calls_7d.map((r) => [r.service, fmtNumber(r.calls), r.errors ? badge(r.errors, "bad") : "0"]),
      "No calls yet."
    ),
    h("h2", {}, "Recent requests"),
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