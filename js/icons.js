// Inline SVG icons. Markup below is static and trusted; it is parsed once per icon, never built from user text.
const NS = "http://www.w3.org/2000/svg";

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l3 3M14 9l2 2"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-7"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h13v-3M9 8h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.3v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  logout: '<path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  terminal: '<path d="m5 8 4 4-4 4M12 17h7"/>',
  play: '<path d="M7 5v14l12-7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
  yes: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  no: '<path d="M6 6l12 12M18 6 6 18"/>',
};

export function icon(name, size = 20) {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] ?? ""}</svg>`,
    "image/svg+xml"
  );
  const svg = document.importNode(doc.documentElement, true);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  return svg;
}

// The Frank AI mark: a faceted core inside a hexagon. Colours come from CSS (.logo-*), so it follows the theme.
export function logoMark(size = 28) {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${NS}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path class="logo-hex" d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25z"/><path class="logo-in" d="M16 9l6.5 3.75v6.5L16 23l-6.5-3.75v-6.5z"/><circle class="logo-dot" cx="16" cy="16" r="2.4"/></svg>`,
    "image/svg+xml"
  );
  const svg = document.importNode(doc.documentElement, true);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  return svg;
}
