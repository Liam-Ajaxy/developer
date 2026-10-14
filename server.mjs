// Local server with the one rule a path-routed single-page app needs: any address that is not a real file serves index.html.
// Zero dependencies.   node server.mjs   (PORT=3001 node server.mjs to change the port)
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 8080;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };
const SERVED = /^\/(index\.html|css\/[\w.-]+|js\/[\w./-]+)$/; // only the app's own files are ever readable

http
  .createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405, { Allow: "GET, HEAD" }).end();
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      return res.writeHead(400).end("Bad request");
    }
    const isFile = path.basename(pathname).includes("."); // "keys" is a route; "app.js" and ".gitignore" are files
    // A file-looking path is an asset: serve it or say 404. Anything else is an app route: serve the app.
    const file = isFile ? (SERVED.test(pathname) && !pathname.includes("..") ? pathname : null) : "/index.html";
    try {
      if (!file) throw new Error("not served");
      const body = await readFile(path.join(root, file));
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    }
  })
  .listen(port, () => console.log(`Frank AI Developers on http://localhost:${port}`));
