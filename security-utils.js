/* Security helpers shared by the static app and its optional AI endpoint. */
(() => {
  "use strict";
  const safeAssistantApiBase = value => {
    const raw = String(value ?? "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    try {
      const url = new URL(raw);
      const localDevelopmentHost = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
      if (url.username || url.password || url.search || url.hash) return "";
      if (url.protocol !== "https:" && !localDevelopmentHost) return "";
      return raw;
    } catch (_) {
      return "";
    }
  };
  const safeHttpsUrl = value => {
    try {
      const url = new URL(String(value ?? ""));
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch (_) {
      return "";
    }
  };
  window.MathBacSecurity = Object.freeze({ safeAssistantApiBase, safeHttpsUrl });
})();
