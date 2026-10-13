# Frank AI Developers

Static single-page app (no build step). One HTML file with `<div id="app">`; everything else is JS modules and CSS.

```
index.html              the only HTML file
css/tokens.css          design tokens for both themes (colour, type, space, motion, 3D scene colours)
css/base.css            reset + shared primitives (buttons, forms, tables, dialogs, toasts, code)
css/portal.css          app shell, auth screens, dashboard, keys, usage, docs, account
css/landing.css         landing page
js/theme-boot.js        sets the theme before first paint (no flash)
js/app.js               hash router + shell (unchanged routing/auth semantics)
js/api.client.js        UNCHANGED  (all requests, session handling, error mapping)
js/config.js            UNCHANGED  (API base URL)
js/dom.util.js          safe DOM builder + helpers
js/ui.util.js           dialogs, toasts, code blocks, secret display
js/icons.js, highlight.js, theme.js
js/scene/hero-scene.js  dependency-free WebGL hero (lazy-loaded, with static fallback)
js/pages/*.page.js      landing, login, signup, forgot, home, keys, usage, docs, account
```

## Run locally

Serve the folder with any static server and open it:

    python3 -m http.server 8080      # then http://localhost:8080

On `localhost` the app talks to `http://localhost:3000`; elsewhere to the URL in `js/config.js`.

## Notes

- The Content-Security-Policy in `index.html` is unchanged: scripts and styles from `self` only, no inline styles or scripts, no web fonts. Dynamic styling goes through the CSSOM.
- Themes: dark (burnt orange on graphite) and light (navy on ivory). Choice is stored in `localStorage` under `frankai_theme`; with no choice it follows the system.
- The landing page is the public route (`#/`). Logged-in visitors are sent to `#/home`, as before.
- Secret values are shown only in the one-time dialog and removed from the page when it closes. Nothing secret is stored or logged.
