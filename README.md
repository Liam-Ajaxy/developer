# Frank AI Developers

The developer portal for the Frank AI API. Request access, create API keys, register the sites that may use them, and watch your usage.

Live at https://developer.frankapi.workers.dev

The Frank AI API is free. It never asks for a credit card or any payment.

## What the API gives you

One key for chat, images and voice, through plain HTTPS requests you can send from your website or your server.

```
curl https://api.frankai.workers.dev/v1/chat \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Say hello in one sentence"}'
```

- Documentation: https://api.frankai.workers.dev/docs/
- OpenAPI 3.1 description: https://api.frankai.workers.dev/openapi.json
- Plain-text summary for AI assistants: https://api.frankai.workers.dev/llms.txt

## What you can do in the portal

- **Request access.** Every account is reviewed by hand. You can create a key right away, and it goes live once you are approved.
- **Create and manage keys.**
  - Public keys (`fk_pub_...`) are safe in browser code. They work only from the sites you register (localhost works while you develop), and only for chat.
  - Secret keys (`fk_sec_...`) are for your server and can use chat, images and voice.
  - Terminal keys (`fk_cli_...`) are for the `frankai` command line, which signs in through the Connect page.
- **See your usage** against the free daily budget.
- **Manage your account**, including your password.
- **Read the short API reference** once you are signed in.

## How it is built

- A static single-page app: vanilla JavaScript modules and CSS. No framework, no build step, nothing to install.
- Clean URLs (`/keys`, `/usage`) through a small History API router. Any address that is not a file gets `index.html`, which `wrangler.jsonc` sets up.
- A strict Content-Security-Policy: scripts and styles come from the site itself only.
- Light and dark themes that follow the visitor's system setting.
- It calls the API at the address in `js/config.js`. The API server is a separate project.
- Hosted as a Cloudflare Worker with static assets.

## Run it locally

```
node server.mjs
```

Then open http://localhost:8080. The app needs the API running at http://localhost:3000 when it runs on localhost; anywhere else it uses the live API.

`server.mjs` is a tiny static server that sends unknown paths to `index.html`. Use it instead of a plain static server, because pages such as `/keys` are real paths and a reload on one of them must still return the app.

## Deploy

```
npx wrangler deploy
```

`wrangler.jsonc` publishes this folder as static assets, and anything listed in `.assetsignore` is left out. The app must be served from the root of its domain, because its files are linked by root-relative paths such as `/js/app.js`.

## Where things are

- `index.html` is the only page.
- `js/app.js` draws the screen, `js/router.js` owns the URL, `js/config.js` holds the API address.
- `js/pages/` has one file per page.
- `css/` has the design tokens and the styles.
- `robots.txt` and `sitemap.xml` are for search engines.