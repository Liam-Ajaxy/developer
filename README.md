# Frank AI Developers

Static single-page app (no build step). One HTML file with `<div id="app">`; everything else is JS modules and CSS.

```
index.html              the only HTML file
server.mjs              local server with the SPA fallback (node server.mjs)
vercel.json, _redirects, .htaccess   the same fallback rule for Vercel, Netlify/Cloudflare, Apache
css/tokens.css          design tokens for both themes (colour, type, space, motion, 3D scene colours)
css/base.css            reset + shared primitives (buttons, forms, tables, dialogs, toasts, code)
css/portal.css          app shell, auth screens, dashboard, keys, usage, docs, account
css/landing.css         landing page
css/knot-streamer.css   knot logo + streamer styles (supplied, unchanged)
js/theme-boot.js        sets the theme before first paint (no flash)
js/router.js            History API router: clean paths, guards, redirects, scroll restoration
js/app.js               app shell + the "commit first" glue between the URL and the screen
js/api.client.js        UNCHANGED  (all requests, session handling, error mapping)
js/config.js            UNCHANGED  (API base URL)
js/dom.util.js          safe DOM builder + helpers
js/ui.util.js           dialogs, toasts, code blocks, secret display
js/icons.js, highlight.js, theme.js
js/knot-streamer.js     the Frank AI knot paths + loading streamer (supplied, unchanged)
js/scene/hero-scene.js  dependency-free WebGL hero (lazy-loaded, with static fallback)
js/pages/*.page.js      landing, login, signup, forgot, home, keys, usage, docs, account, notfound
```

## Run locally

    node server.mjs                  # then http://localhost:8080   (PORT=3001 node server.mjs to change it)

Use this server, not `python3 -m http.server`: URLs are real paths (`/keys`), so a reload or a shared link to
`/keys` must still return the app. Any plain static server will answer 404 there.

On `localhost` the app talks to `http://localhost:3000`; elsewhere to the URL in `js/config.js`.

## Notes

- The Content-Security-Policy in `index.html` is unchanged: scripts and styles from `self` only, no inline styles or scripts, no web fonts. Dynamic styling goes through the CSSOM.
- Themes: dark (burnt orange on graphite) and light (navy on ivory). Choice is stored in `localStorage` under `frankai_theme`; with no choice it follows the system.
- Routing: see below.
- Secret values are shown only in the one-time dialog and removed from the page when it closes. Nothing secret is stored or logged.

## Routing

URLs are plain paths. There are no `#` fragments anywhere.

| URL | Page | Access |
| --- | --- | --- |
| `/` | landing | public (signed-in visitors go to `/home`) |
| `/login`, `/signup`, `/forgot` | auth screens | public (signed-in visitors go to `/home`) |
| `/home`, `/keys`, `/usage`, `/docs`, `/account` | portal | private (signed-out visitors go to `/login?next=<page>`) |
| anything else | "Page not found" (URL left as typed, `noindex`) | any |

- **The screen always matches the URL.** When the URL changes, the page for that URL is drawn in the same tick (a loading frame
  or the page shell); data then fills it in. Answers that arrive for an older URL are discarded.
- **Redirects replace, they don't push**, so Back never loops: signed-out guard, signed-in bounce from `/login`, login, logout, session expiry.
- **Login returns you to the page you wanted** via `?next=`. Only a private page's bare path is accepted, so it cannot be used as an open redirect.
- **Canonical URLs:** `/Keys/`, `//keys`, `/welcome`, `/index.html` and old `/#/keys` bookmarks are tidied in place.
- Back/forward and reloads restore the scroll position. Ctrl/Cmd/middle-click open real tabs. Title and a screen-reader announcement update on every route change.
- The same-origin link handling lives in `js/router.js`; use `navigate("/keys")` in code and plain `<a href="/keys">` in markup.

### Deploying

Every host must send unknown paths to `index.html` while still serving real files (`/css/*`, `/js/*`):

- Vercel: `vercel.json` (included). Netlify / Cloudflare Pages: `_redirects` (included). Apache: `.htaccess` (included).
- nginx: `location / { try_files $uri $uri/ /index.html; }`
- Serve the app from the domain root. Asset URLs in `index.html` are root-relative (`/js/app.js`) so deep paths load correctly.
