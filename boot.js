(() => {
  "use strict";

  const VERSION_FILE = "version.json";

  async function getVersion() {
    try {
      const res = await fetch(`${VERSION_FILE}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) throw new Error("version fetch failed");
      const data = await res.json();
      return String(data.version || Date.now());
    } catch (e) {
      return String(Date.now());
    }
  }

  function setStylesheetVersion(version) {
    const mainCss = document.querySelector('link[rel="stylesheet"][href^="styles.css"]');
    if (mainCss) mainCss.href = `styles.css?v=${encodeURIComponent(version)}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.defer = false;
      el.onload = resolve;
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(el);
    });
  }

  async function boot() {
    const version = await getVersion();
    window.MANJAZ_BUILD_VERSION = version;

    setStylesheetVersion(version);

    // Preserve required execution order.
    await loadScript(`app.js?v=${encodeURIComponent(version)}`);
    await loadScript(`certificates-data.js?v=${encodeURIComponent(version)}`);
    await loadScript(`certificates.js?v=${encodeURIComponent(version)}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
