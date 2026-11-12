/* Loads the large solved-example dataset only when the learner opens its library. */
(() => {
  "use strict";
  const root = document.getElementById("formula-library");
  if (!root) return;

  let section = document.getElementById("solved-examples-library");
  if (!section) {
    section = document.createElement("section");
    section.id = "solved-examples-library";
    section.className = "solved-examples-library";
    section.hidden = true;
    section.setAttribute("aria-labelledby", "solved-examples-title");
    section.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">تعلّم طريقة التفكير</p>
          <h3 id="solved-examples-title">مكتبة الأمثلة المحلولة</h3>
          <p>تُحمّل المسائل عند فتح المكتبة، وتظهر على دفعات لتسريع التصفح.</p>
        </div>
        <strong id="solved-examples-count" aria-live="polite"></strong>
      </div>
      <div id="solved-examples-list" class="solved-examples-list" aria-live="polite" role="status">جارٍ تجهيز مكتبة المسائل المحلولة…</div>`;
    root.insertAdjacentElement("afterend", section);
  }

  let loadPromise = null;
  let loaded = false;

  function loadSolvedExamples() {
    if (loaded || window.solvedExamplesLibrary) {
      loaded = true;
      return Promise.resolve();
    }
    if (loadPromise) return loadPromise;

    section.setAttribute("aria-busy", "true");
    const list = section.querySelector("#solved-examples-list");
    if (list) {
      list.setAttribute("role", "status");
      list.textContent = "جارٍ تحميل المسائل المحلولة لأول مرة…";
    }

    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "solved-examples.js?v=20261112-1";
      script.async = true;
      script.onload = () => {
        loaded = Boolean(window.solvedExamplesLibrary);
        section.removeAttribute("aria-busy");
        if (!loaded) {
          loadPromise = null;
          if (list) list.textContent = "تعذر تهيئة المكتبة. أعد فتحها للمحاولة مرة أخرى.";
          reject(new Error("Solved examples data did not initialize."));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        section.removeAttribute("aria-busy");
        loadPromise = null;
        if (list) list.textContent = "تعذر تحميل المكتبة حالياً. أعد فتحها للمحاولة مرة أخرى.";
        reject(new Error("Unable to load solved examples data."));
      };
      document.head.appendChild(script);
    });
    loadPromise.catch(() => {});
    return loadPromise;
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest('a[data-panel-toggle="solved-examples-library"]');
    if (!link || link.getAttribute("aria-expanded") !== "true") return;
    loadSolvedExamples();
  });
})();
