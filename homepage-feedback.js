(() => {
  "use strict";
  let toastRoot = null;
  let dismissTimer = 0;
  function ensureToastRoot() {
    if (toastRoot && toastRoot.isConnected) return toastRoot;
    toastRoot = document.createElement("div");
    toastRoot.id = "homepage-feedback";
    toastRoot.className = "homepage-feedback";
    toastRoot.setAttribute("role", "status");
    toastRoot.setAttribute("aria-live", "polite");
    toastRoot.setAttribute("aria-atomic", "true");
    toastRoot.hidden = true;
    document.body.appendChild(toastRoot);
    return toastRoot;
  }
  function showHomepageFeedback(message, options = {}) {
    const text = String(message ?? "").trim();
    if (!text) return false;
    const root = ensureToastRoot();
    const kind = ["success", "error", "info"].includes(options.kind) ? options.kind : "info";
    const duration = Number.isFinite(options.duration) ? Math.min(8000, Math.max(1200, options.duration)) : 3600;
    window.clearTimeout(dismissTimer);
    root.textContent = text;
    root.dataset.kind = kind;
    root.hidden = false;
    root.classList.remove("is-visible");
    void root.offsetWidth;
    root.classList.add("is-visible");
    dismissTimer = window.setTimeout(() => {
      root.classList.remove("is-visible");
      window.setTimeout(() => { if (!root.classList.contains("is-visible")) root.hidden = true; }, 180);
    }, duration);
    return true;
  }
  window.showHomepageFeedback = showHomepageFeedback;
  document.addEventListener("click", event => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-feedback-message]") : null;
    if (!trigger || trigger.hasAttribute("disabled") || trigger.getAttribute("aria-disabled") === "true") return;
    showHomepageFeedback(trigger.dataset.feedbackMessage, { kind: trigger.dataset.feedbackKind || "info" });
  });
  document.addEventListener("mathBacSyria:reset-progress", () => {
    showHomepageFeedback("تم مسح تقدمك المحفوظ على هذا الجهاز.", { kind: "success" });
  });
  document.addEventListener("mathBacSyria:feedback", event => {
    const detail = event.detail || {};
    showHomepageFeedback(detail.message, { kind: detail.kind, duration: detail.duration });
  });
})();