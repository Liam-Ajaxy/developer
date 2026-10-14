import { h } from "../dom.util.js";
import { icon, logoMark } from "../icons.js";
import { codeBlock, browserSnippet } from "../ui.util.js";
import { themeToggle } from "../theme.js";

export const layout = "full";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
const code = (t) => h("code", {}, t);

// Everything below is taken from the portal's own API reference. Nothing here is invented.
const SERVICES = [
  { id: "chat", name: "Chat", path: "/v1/chat", ic: "chat", key: "Public or secret key", send: '{ "message": "text" }', get: '{ "reply", "usage" }', desc: "Send a message and get a reply. Call it straight from your website with a public key." },
  { id: "respond", name: "Respond", path: "/v1/respond", ic: "layers", key: "Public: chat only. Secret: all outputs", send: '{ "message", "speak": true, "image": true }', get: '{ "reply", "audio", "image", "usage" }', desc: "One call for a reply, plus spoken audio and an image when you ask for them." },
  { id: "image", name: "Image", path: "/v1/image", ic: "image", key: "Secret key", send: '{ "prompt": "text" }', get: '{ "url", "type", "usage" }', desc: "Generate an image from a text prompt. Counts as 1,000 tokens. Files are kept for 24 hours." },
  { id: "speech", name: "Speech", path: "/v1/tts", ic: "wave", key: "Secret key", send: '{ "text": "up to 200 characters" }', get: '{ "url", "type", "usage" }', desc: "Turn up to 200 characters of text into a voice clip. Counts as 300 tokens. Files are kept for 24 hours." },
];

// ---------- service visuals (each its own metaphor, all DOM + CSS) ----------
function chatViz() {
  return h(
    "div",
    { class: "viz viz-chat", "aria-hidden": "true" },
    h("div", { class: "bubble bubble-out" }, "Describe a sunrise in two sentences"),
    h("div", { class: "bubble bubble-in" }, h("span", { class: "typing" }, h("i"), h("i"), h("i")), h("span", { class: "line line-a" }), h("span", { class: "line line-b" })),
    h("div", { class: "viz-key" }, icon("globe", 16), "Public key, registered sites only")
  );
}

function respondViz(onChange) {
  const speak = h("input", { type: "checkbox", checked: true });
  const image = h("input", { type: "checkbox", checked: true });
  const lane = (cls, ic, label) => h("div", { class: `lane lane-${cls}` }, h("span", { class: "lane-line" }), h("span", { class: "lane-out" }, icon(ic, 18), label));
  const audio = lane("audio", "wave", "audio");
  const pic = lane("image", "image", "image");
  const sync = () => {
    audio.classList.toggle("is-off", !speak.checked);
    pic.classList.toggle("is-off", !image.checked);
    onChange(speak.checked, image.checked);
  };
  speak.addEventListener("change", sync);
  image.addEventListener("change", sync);
  const sw = (input, label) => h("label", { class: "switch" }, input, h("span", { class: "switch-ui", "aria-hidden": "true" }), h("span", { class: "mono" }, label));
  return h(
    "div",
    { class: "viz viz-respond" },
    h("div", { class: "respond-map", "aria-hidden": "true" }, h("div", { class: "respond-node" }, icon("layers", 22), h("span", { class: "mono" }, "/v1/respond")), h("div", { class: "lanes" }, lane("reply", "chat", "reply"), audio, pic)),
    h("div", { class: "respond-controls" }, sw(speak, "speak"), sw(image, "image")),
    h("p", { class: "muted small" }, "Public keys receive the chat reply only.")
  );
}

function imageViz() {
  const grid = h("div", { class: "tiles is-run", "aria-hidden": "true" }, Array.from({ length: 49 }, (_, i) => {
    const d = Math.hypot((i % 7) - 3, Math.floor(i / 7) - 3);
    return h("span", { class: "tile", style: { "--d": d.toFixed(2), "--o": Math.max(0.12, 1 - d / 4.6).toFixed(2) } });
  }));
  const replay = h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => { grid.classList.remove("is-run"); void grid.offsetWidth; grid.classList.add("is-run"); } }, icon("replay", 16), "Replay preview");
  return h("div", { class: "viz viz-image" }, grid, replay);
}

function speechViz() {
  let playing = !reduced();
  const wave = h("div", { class: playing ? "wave is-playing" : "wave", "aria-hidden": "true" }, Array.from({ length: 32 }, (_, i) => h("span", { class: "wv", style: { "--i": i, "--h": (0.2 + 0.8 * Math.abs(Math.sin(i * 1.7))).toFixed(2) } })));
  const toggle = h("button", { class: "btn btn-ghost btn-small", type: "button", "aria-pressed": String(playing) });
  const paint = () => { toggle.replaceChildren(icon(playing ? "pause" : "play", 16), playing ? "Pause waveform" : "Animate waveform"); toggle.setAttribute("aria-pressed", String(playing)); wave.classList.toggle("is-playing", playing); };
  toggle.addEventListener("click", () => { playing = !playing; paint(); });
  paint();
  return h("div", { class: "viz viz-speech" }, wave, toggle);
}

// ---------- sections ----------
function nav(cleanups) {
  const root = h("header", { class: "l-nav" });
  const close = () => { root.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Open menu"); };
  const burger = h("button", { class: "icon-btn l-burger", type: "button", "aria-expanded": "false", "aria-controls": "l-menu", "aria-label": "Open menu" }, icon("menu", 22));
  burger.addEventListener("click", () => {
    const open = root.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  const onKey = (e) => { if (e.key === "Escape" && root.classList.contains("is-open")) { close(); burger.focus(); } };
  document.addEventListener("keydown", onKey);
  cleanups.push(() => document.removeEventListener("keydown", onKey));

  const link = (id, label) => h("a", { href: "/", onclick: (e) => { e.preventDefault(); close(); scrollToId(id); } }, label);
  root.append(
    h(
      "div",
      { class: "l-wrap l-nav-inner" },
      h("a", { class: "l-brand", href: "/", "aria-label": "Frank AI Developers, home" }, logoMark(30), h("span", { class: "brand-name" }, "Frank", h("span", {}, "AI"))),
      h("nav", { class: "l-menu", id: "l-menu", "aria-label": "Main" }, link("services", "Services"), link("integration", "Documentation"), h("a", { class: "btn btn-ghost", href: "/login" }, "Log in"), h("a", { class: "btn", href: "/signup" }, "Get your API key")),
      h("div", { class: "l-tools" }, themeToggle(), burger)
    )
  );
  const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  cleanups.push(() => window.removeEventListener("scroll", onScroll));
  return root;
}

function hero(onPick) {
  const canvas = h("canvas", { class: "scene-canvas", "aria-hidden": "true" });
  const stage = h(
    "div",
    { class: "scene-stage" },
    h("div", { class: "scene-glow", "aria-hidden": "true" }),
    h("div", { class: "scene-fallback", "aria-hidden": "true" }, h("span", { class: "fb-ring fb-ring-a" }), h("span", { class: "fb-ring fb-ring-b" }), h("span", { class: "fb-plates" }, h("i"), h("i"), h("i"), h("i")), h("span", { class: "fb-orb" })),
    canvas
  );
  const chips = h(
    "ul",
    { class: "cap-chips", "aria-label": "API endpoints" },
    SERVICES.map((s) => h("li", { class: `cap cap-${s.id}` }, h("button", { type: "button", onclick: () => onPick(s.id), "aria-label": `${s.name}, ${s.path}. Jump to this service` }, icon(s.ic, 18), h("span", { class: "mono" }, s.path))))
  );
  const el = h(
    "section",
    { class: "l-hero", "aria-labelledby": "hero-title" },
    h("div", { class: "l-hero-bg", "aria-hidden": "true" }),
    h(
      "div",
      { class: "l-wrap l-hero-inner" },
      h(
        "div",
        { class: "l-hero-copy" },
        h("h1", { id: "hero-title" }, "One key for chat, images and voice."),
        h("p", { class: "l-lead" }, "Four REST endpoints you can call from your website or your server. Public keys keep chat safe in the browser. Secret keys unlock image and speech on your backend."),
        h("div", { class: "l-cta" }, h("a", { class: "btn btn-lg", href: "/signup" }, "Get Your API Key"), h("button", { class: "btn btn-lg btn-ghost", type: "button", onclick: () => scrollToId("integration") }, "Explore Documentation")),
        h("p", { class: "l-note" }, icon("shield", 18), "Every account is reviewed by hand. You can create a key right away and it goes live once you're approved.")
      ),
      h("div", { class: "scene-wrap" }, stage, chips)
    )
  );
  return { el, canvas, stage };
}

function services() {
  const tabs = [], panels = [];
  const select = (id, { focus = false } = {}) => {
    SERVICES.forEach((s, i) => {
      const on = s.id === id;
      tabs[i].setAttribute("aria-selected", String(on));
      tabs[i].tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      if (on && focus) tabs[i].focus();
    });
  };
  SERVICES.forEach((s, i) => {
    tabs.push(
      h(
        "button",
        { class: "svc-tab", type: "button", role: "tab", id: `tab-${s.id}`, "aria-controls": `panel-${s.id}`, "aria-selected": String(i === 0), tabindex: i === 0 ? "0" : "-1", onclick: () => select(s.id) },
        h("span", { class: "svc-tab-ico" }, icon(s.ic, 20)),
        h("span", { class: "svc-tab-copy" }, h("strong", {}, s.name), h("small", { class: "mono" }, s.path))
      )
    );
    const sendEl = h("dd", {}, code(s.send));
    const getEl = h("dd", {}, code(s.get));
    const row = (k, v) => h("div", {}, h("dt", {}, k), v);
    const viz = s.id === "chat" ? chatViz() : s.id === "respond"
      ? respondViz((speak, image) => {
          sendEl.replaceChildren(code(`{ "message", "speak": ${speak}, "image": ${image} }`));
          getEl.replaceChildren(code(`{ ${["reply", speak && "audio", image && "image", "usage"].filter(Boolean).map((x) => `"${x}"`).join(", ")} }`));
        })
      : s.id === "image" ? imageViz() : speechViz();
    panels.push(
      h(
        "div",
        { class: `svc-panel svc-${s.id}`, role: "tabpanel", id: `panel-${s.id}`, "aria-labelledby": `tab-${s.id}`, hidden: i !== 0, tabindex: "0" },
        h("div", { class: "svc-info" }, h("h3", {}, s.name), h("p", {}, s.desc), h("dl", { class: "svc-io" }, row("Endpoint", h("dd", {}, code(`POST ${s.path}`))), row("You send", sendEl), row("You get", getEl), row("Key", h("dd", {}, s.key))), h("a", { class: "svc-link", href: "/docs" }, "Full reference in the portal", icon("arrow", 16))),
        viz
      )
    );
  });
  const list = h("div", { class: "svc-tabs", role: "tablist", "aria-label": "Frank AI services", "aria-orientation": "vertical" }, tabs);
  list.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next == null) return;
    e.preventDefault();
    select(SERVICES[(next + tabs.length) % tabs.length].id, { focus: true });
  });
  const el = h(
    "section",
    { class: "l-section", id: "services", "aria-labelledby": "services-title" },
    h("div", { class: "l-wrap" }, h("h2", { id: "services-title", class: "l-h2" }, "Four endpoints. One Bearer key."), h("p", { class: "l-sub" }, "Pick a service to see what you send, what you get back, and which key can call it."), h("div", { class: "svc", "data-reveal": "" }, list, h("div", { class: "svc-stage" }, panels)))
  );
  return { el, select };
}

function integration() {
  const wrap = h("div", { class: "keystack-wrap" });
  const stack = h(
    "div",
    { class: "keystack" },
    h("article", { class: "kcard kcard-pub" }, h("div", { class: "kcard-top" }, icon("globe", 22), h("span", { class: "mono" }, "fk_pub_...")), h("h3", {}, "Public key"), h("p", {}, "Safe in browser code. Works only from the sites you register, and only for chat."), h("span", { class: "badge badge-good" }, "Browser safe")),
    h("article", { class: "kcard kcard-sec" }, h("div", { class: "kcard-top" }, icon("lock", 22), h("span", { class: "mono" }, "fk_sec_...")), h("h3", {}, "Secret key"), h("p", {}, "For your server only. Chat, image and voice. Never put it in a web page."), h("span", { class: "badge badge-warn" }, "Server only"))
  );
  wrap.append(stack, h("p", { class: "kstack-err" }, icon("alert", 18), h("span", {}, "A secret key used from a browser is rejected: ", code("secret_key_in_browser"), " (HTTP 403).")));
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced()) {
    wrap.addEventListener("pointermove", (e) => {
      const r = wrap.getBoundingClientRect();
      stack.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) - 0.5) * 12}deg`);
      stack.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height) + 0.5) * 8}deg`);
    });
    wrap.addEventListener("pointerleave", () => { stack.style.setProperty("--ry", "0deg"); stack.style.setProperty("--rx", "0deg"); });
  }
  return h(
    "section",
    { class: "l-section", id: "integration", "aria-labelledby": "int-title" },
    h(
      "div",
      { class: "l-wrap" },
      h("h2", { id: "int-title", class: "l-h2" }, "Chat from your website in one fetch."),
      h("p", { class: "l-sub" }, "Use a public key in the browser. It works only from the sites you register. Limits, error codes and the full reference are in the portal docs once you're logged in."),
      h(
        "div",
        { class: "int-grid", "data-reveal": "" },
        h(
          "div",
          { class: "int-code" },
          codeBlock(browserSnippet("YOUR_PUBLIC_KEY"), { title: "browser.js" }),
          h("ol", { class: "int-steps" }, h("li", {}, "Request access and create a public key."), h("li", {}, "Add the sites that may use it. Localhost works while you develop."), h("li", {}, "Paste the snippet and replace ", code("YOUR_PUBLIC_KEY"), "."))
        ),
        wrap
      )
    )
  );
}

function closing() {
  return h(
    "section",
    { class: "l-closing", "aria-labelledby": "close-title" },
    h("div", { class: "closing-art", "aria-hidden": "true" }, h("span", { class: "c-ring c-ring-a" }), h("span", { class: "c-ring c-ring-b" }), h("span", { class: "c-orb" })),
    h("div", { class: "l-wrap closing-inner", "data-reveal": "" }, h("h2", { id: "close-title" }, "Start building with Frank AI."), h("p", { class: "l-sub" }, "Request access, create a key, and make your first call."), h("div", { class: "l-cta l-cta-center" }, h("a", { class: "btn btn-lg", href: "/signup" }, "Get Your API Key"), h("a", { class: "btn btn-lg btn-ghost", href: "/login" }, "Log in")))
  );
}

function footer() {
  return h("footer", { class: "l-footer" }, h("div", { class: "l-wrap l-footer-inner" }, h("a", { class: "l-brand", href: "/", "aria-label": "Frank AI Developers, home" }, logoMark(24), h("span", { class: "brand-name" }, "Frank", h("span", {}, "AI"))), h("nav", { "aria-label": "Footer" }, h("a", { href: "/login" }, "Log in"), h("a", { href: "/signup" }, "Request access"), h("a", { href: "/forgot" }, "Reset password"))));
}

export async function render(box) {
  const cleanups = [];
  let disposed = false;
  let scene = null;

  const svc = services();
  const hr = hero((id) => { svc.select(id); scrollToId("services"); });
  box.append(nav(cleanups), h("main", {}, hr.el, svc.el, integration(), closing()), footer());

  // Reveal key blocks once, only when motion is welcome. Content is visible without it.
  if (!reduced() && "IntersectionObserver" in window) {
    box.classList.add("reveal-ready");
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    box.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  }

  // The 3D scene loads after first paint. If WebGL is missing or fails, the static CSS visual stays.
  const live = (on) => hr.stage.classList.toggle("is-live", on);
  const startScene = async () => {
    try {
      const { createHeroScene } = await import("../scene/hero-scene.js");
      if (disposed) return;
      scene = createHeroScene(hr.canvas, { section: hr.el, stage: hr.stage, onFallback: () => { live(false); scene = null; } });
      live(Boolean(scene));
    } catch (err) {
      console.warn("3D scene unavailable; showing the static visual.", err);
    }
  };
  requestAnimationFrame(() => setTimeout(startScene, 0));

  return () => {
    disposed = true;
    scene?.destroy();
    cleanups.forEach((fn) => fn());
  };
}
