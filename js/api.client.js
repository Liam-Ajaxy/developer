import { API_BASE } from "./config.js";
import { redirectToLogin } from "./router.js";

const KEY = "frankai_portal_token";

// "Keep me logged in" stores the token in localStorage; otherwise it lives only as long as the tab.
export const session = {
  get token() {
    return sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
  },
  save(token, remember) {
    this.clear();
    (remember ? localStorage : sessionStorage).setItem(KEY, token);
  },
  replace(token) {
    const store = localStorage.getItem(KEY) ? localStorage : sessionStorage;
    store.setItem(KEY, token);
  },
  clear() {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  },
};

export class ApiError extends Error {
  constructor(message, code, status, retryAfter) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}/portal${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the Frank AI server. Check your connection and try again.", "network", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new ApiError(
      data?.error?.message || `Something went wrong (${res.status})`,
      data?.error?.code || `http_${res.status}`,
      res.status,
      res.headers.get("retry-after")
    );
    if (auth && err.code === "login_required") {
      session.clear();
      redirectToLogin();
    }
    throw err;
  }
  return data;
}