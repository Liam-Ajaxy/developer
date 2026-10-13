import { API_BASE } from "../config.js";
import { h, badge, table, fmtNumber } from "../dom.util.js";
import { icon } from "../icons.js";
import { codeBlock, browserSnippet, serverSnippet, copyButton, pageHead } from "../ui.util.js";

const code = (text) => h("code", {}, text);

const ERRORS = [
  ["missing_key / invalid_key", "401", "The Authorization header is missing, or the key is wrong or revoked."],
  ["pending_approval", "403", "Your account is not approved yet. The key starts working once it is."],
  ["developer_suspended", "403", "Your account is switched off. See the message on your Home page."],
  ["origin_not_allowed", "403", "A public key was used from a site you didn't register. Add the site on the Keys page."],
  ["secret_key_in_browser", "403", "A secret key was used from a browser. Use a public key there, or call from your server."],
  ["scope_not_allowed", "403", "This key type can't use that service (public keys are chat-only)."],
  ["rate_limited", "429", "Too many requests. Wait for the Retry-After header's number of seconds."],
  ["daily_budget_exceeded", "429", "Today's free token budget is used up. It resets at 00:00 UTC."],
  ["bad_request", "400", "The request body is wrong. The message says what to fix."],
  ["ai_busy", "503", "All AI providers are busy. Try again shortly."],
];

const ENDPOINTS = [
  ["/v1/chat", '{ "message": "text" }', '{ "reply", "usage" }', "public or secret"],
  ["/v1/respond", '{ "message", "speak": true, "image": true }', '{ "reply", "audio", "image", "usage" }', "public: chat only. secret: all"],
  ["/v1/image", '{ "prompt": "text" }', '{ "url", "type", "usage" }', "secret"],
  ["/v1/tts", '{ "text": "up to 200 characters" }', '{ "url", "type", "usage" }', "secret"],
];

const SECTIONS = [
  ["base", "Base URL"],
  ["auth", "Authentication"],
  ["endpoints", "Endpoints"],
  ["browser", "Chat from your website"],
  ["server", "Call from your server"],
  ["limits", "Limits"],
  ["errors", "Errors"],
];

const section = (id, title, ...children) => h("section", { class: "doc-section", id: `doc-${id}`, "aria-labelledby": `doc-${id}-h` }, h("h2", { id: `doc-${id}-h` }, title), children);
const yes = (text) => h("span", { class: "perm perm-yes" }, icon("yes", 16), text);
const no = (text) => h("span", { class: "perm perm-no" }, icon("no", 16), text);

export async function render(container, { profile }) {
  const { public: pub, secret } = profile.limits;
  const limitRow = (name, l) => [
    name,
    fmtNumber(l.daily_tokens),
    l.per_visitor_daily_tokens ? fmtNumber(l.per_visitor_daily_tokens) : "-",
    fmtNumber(l.requests_per_minute),
    fmtNumber(l.max_tokens_per_request),
  ];

  const toc = h(
    "nav",
    { class: "docs-toc", "aria-label": "On this page" },
    SECTIONS.map(([id, label]) =>
      h(
        "a",
        {
          href: "#/docs",
          "data-doc": id,
          onclick: (e) => {
            e.preventDefault(); // the router lives in the hash, so scroll in place instead
            document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          },
        },
        label
      )
    )
  );

  const endpointCards = ENDPOINTS.map(([path, send, get, key]) =>
    h(
      "article",
      { class: "endpoint" },
      h("header", {}, h("span", { class: "method" }, "POST"), h("code", { class: "endpoint-path" }, path)),
      h("dl", {}, h("div", {}, h("dt", {}, "You send"), h("dd", {}, code(send))), h("div", {}, h("dt", {}, "You get"), h("dd", {}, code(get))), h("div", {}, h("dt", {}, "Key"), h("dd", {}, key)))
    )
  );

  const page = h(
    "div",
    { class: "page docs" },
    h("div", { class: "docs-head" }, pageHead("Docs", "Everything you need to call the Frank AI API.")),
    h(
      "div",
      { class: "docs-layout" },
      toc,
      h(
        "div",
        { class: "docs-body" },
        section("base", "Base URL", h("div", { class: "base-url" }, h("code", {}, API_BASE), copyButton(API_BASE, { what: "base URL" }))),
        section(
          "auth",
          "Authentication",
          h("p", {}, "Send your key on every request: ", code("Authorization: Bearer YOUR_KEY")),
          h(
            "div",
            { class: "key-kinds" },
            h("article", { class: "panel" }, h("h3", {}, icon("globe", 20), "Public keys"), h("p", { class: "mono small" }, "fk_pub_..."), h("p", { class: "muted" }, "Safe in browser code. They only work from the sites you registered, and only for chat.")),
            h("article", { class: "panel panel-secret" }, h("h3", {}, icon("lock", 20), "Secret keys"), h("p", { class: "mono small" }, "fk_sec_..."), h("p", { class: "muted" }, "For your server only. Never put them in a web page."))
          )
        ),
        section(
          "endpoints",
          "Endpoints (all POST, JSON)",
          h("div", { class: "endpoints" }, endpointCards),
          h("h3", { class: "block-title" }, "What each key can call"),
          table(
            ["Endpoint", "Public key", "Secret key"],
            [
              [code("/v1/chat"), yes("Yes"), yes("Yes")],
              [code("/v1/respond"), yes("Chat only"), yes("All outputs")],
              [code("/v1/image"), no("No"), yes("Yes")],
              [code("/v1/tts"), no("No"), yes("Yes")],
            ]
          )
        ),
        section("browser", "Chat from your website", codeBlock(browserSnippet("YOUR_PUBLIC_KEY"), { title: "browser.js" })),
        section("server", "Call from your server", codeBlock(serverSnippet("YOUR_SECRET_KEY"), { title: "server.js" })),
        section(
          "limits",
          "Limits",
          table(
            ["Key type", "Tokens per key per day", "Per visitor per day", "Requests per minute", "Max tokens per reply"],
            [limitRow("Public", pub), limitRow("Secret", secret)]
          ),
          h("p", { class: "muted small" }, "An image counts as 1,000 tokens and a voice clip as 300. Files from /v1/image and /v1/tts are kept for 24 hours.")
        ),
        section(
          "errors",
          "Errors",
          table(["Code", "HTTP", "Meaning"], ERRORS.map(([c, s, m]) => [code(c), badge(s, Number(s) >= 500 ? "bad" : "warn"), m]))
        )
      )
    )
  );

  container.replaceChildren(page);

  // Highlight the section being read.
  const links = new Map([...toc.querySelectorAll("a")].map((a) => [a.dataset.doc, a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const [id, a] of links) {
          if (`doc-${id}` === e.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        }
      }
    },
    { rootMargin: "-15% 0px -75% 0px" }
  );
  page.querySelectorAll(".doc-section").forEach((s) => io.observe(s));
  links.get("base")?.setAttribute("aria-current", "true");
  return () => io.disconnect();
}
