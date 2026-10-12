// The only place that knows where the API lives. Change it when the API moves.
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
export const API_BASE = local ? "http://localhost:3000" : "https://api.frankai.workers.dev";