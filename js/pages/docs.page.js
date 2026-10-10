import { API_BASE } from "../config.js";
import { h, table, fmtNumber } from "../dom.util.js";
import { snippetBlock, browserSnippet } from "../ui.util.js";

const code = (text) => h("code", {}, text);
const section = (title, ...children) => h("section", { class: "section" }, h("h2", {}, title), children);

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

export async function render(container, { profile }) {
  const { public: pub, secret } = profile.limits;
  const limitRow = (name, l) => [
    name,
    fmtNumber(l.daily_tokens),
    l.per_visitor_daily_tokens ? fmtNumber(l.per_visitor_daily_tokens) : "-",
    fmtNumber(l.requests_per_minute),
    fmtNumber(l.max_tokens_per_request),
  ];

  container.replaceChildren(
    h("h1", {}, "Docs"),
    section("Base URL", h("p", {}, code(API_BASE))),
    section(
      "Authentication",
      h("p", {}, "Send your key on every request: ", code("Authorization: Bearer YOUR_KEY")),
      h("p", { class: "muted" }, "Public keys (fk_pub_...) are safe in browser code and only work from the sites you registered. Secret keys (fk_sec_...) are for your server only. Never put them in a web page.")
    ),
    section(
      "Endpoints (all POST, JSON)",
      table(
        ["Path", "You send", "You get", "Key"],
        [
          [code("/v1/chat"), code('{ "message": "text" }'), code('{ "reply", "usage" }'), "public or secret"],
          [code("/v1/respond"), code('{ "message", "speak": true, "image": true }'), code('{ "reply", "audio", "image", "usage" }'), "public: chat only. secret: all"],
          [code("/v1/image"), code('{ "prompt": "text" }'), code('{ "url", "type", "usage" }'), "secret"],
          [code("/v1/tts"), code('{ "text": "up to 200 characters" }'), code('{ "url", "type", "usage" }'), "secret"],
        ]
      )
    ),
    section("Chat from your website", snippetBlock(browserSnippet("YOUR_PUBLIC_KEY"))),
    section(
      "Limits",
      table(
        ["Key type", "Tokens per key per day", "Per visitor per day", "Requests per minute", "Max tokens per reply"],
        [limitRow("Public", pub), limitRow("Secret", secret)]
      ),
      h("p", { class: "muted small" }, "An image counts as 1,000 tokens and a voice clip as 300. Files from /v1/image and /v1/tts are kept for 24 hours.")
    ),
    section("Errors", table(["Code", "HTTP", "Meaning"], ERRORS.map(([c, s, m]) => [code(c), s, m])))
  );
}