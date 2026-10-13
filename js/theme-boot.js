// Runs before first paint (classic script, allowed by the CSP) so the page never flashes the wrong theme.
(function () {
  var theme = "dark";
  try {
    var saved = localStorage.getItem("frankai_theme");
    if (saved === "light" || saved === "dark") theme = saved;
    else if (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches) theme = "light";
  } catch (e) {}
  document.documentElement.setAttribute("data-theme", theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#F6F7F9" : "#0B0D12");
})();
