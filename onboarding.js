(function () {
  "use strict";

  const DISMISSED_KEY = "mathBacSyriaFirstVisitGuideDismissedV1";

  function initializeFirstVisitGuide() {
    const guide = document.getElementById("first-visit-guide");
    const dismissButton = document.getElementById("first-visit-dismiss");
    const startLink = document.getElementById("first-visit-start");
    const topicSearch = document.getElementById("topic-search");
    if (!guide || !dismissButton || !startLink) return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch (error) {
      // Keep the guide usable when browser storage is unavailable.
    }
    guide.hidden = dismissed;

    dismissButton.addEventListener("click", function () {
      guide.hidden = true;
      try {
        window.localStorage.setItem(DISMISSED_KEY, "1");
      } catch (error) {
        // The current view remains dismissed for this page session.
      }
    });

    startLink.addEventListener("click", function () {
      guide.hidden = true;
      try {
        window.localStorage.setItem(DISMISSED_KEY, "1");
      } catch (error) {
        // The guide stays hidden for this view when storage is unavailable.
      }
      if (topicSearch) {
        window.setTimeout(function () {
          topicSearch.focus({ preventScroll: true });
        }, 0);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFirstVisitGuide, { once: true });
  } else {
    initializeFirstVisitGuide();
  }
})();
