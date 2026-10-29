/* أدوات الطالب: مراجعة متباعدة، علامات، نسخ احتياطي، وضع ليلي وشرح قابل للتوسع. */
(() => {
  "use strict";
  const EXTRA_KEY = "mathBacSyriaStudentToolsV1";
  const intervalsDays = [1, 3, 7, 14, 30];
  const safeParse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const loadExtras = () => {
    const x = safeParse(localStorage.getItem(EXTRA_KEY), {});
    return { bookmarks: Array.isArray(x.bookmarks) ? x.bookmarks : [], schedule: x.schedule && typeof x.schedule === "object" ? x.schedule : {}, reviewQuestions: x.reviewQuestions && typeof x.reviewQuestions === "object" ? x.reviewQuestions : {}, examHistory: Array.isArray(x.examHistory) ? x.examHistory.slice(0, 20) : [], darkMode: Boolean(x.darkMode) };
  };
  let extras = loadExtras();
  const persistExtras = () => { try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extras)); } catch (_) { alert("تعذر حفظ الإعدادات؛ قد تكون مساحة التخزين ممتلئة."); } };
  const keyOf = q => `${q.topic}::${q.q}`;
  const byKey = key => (typeof questions !== "undefined" ? questions : []).find(q => keyOf(q) === key);
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  const typesetMath = target => {
    const mathJax = window.MathJax;
    if (!target || !mathJax?.typesetPromise) return;
    try { mathJax.typesetClear?.([target]); } catch (_) {}
    Promise.resolve(mathJax.startup?.promise)
      .then(() => mathJax.typesetPromise([target]))
      .catch(error => console.warn("تعذر تنسيق المعادلات في هذا القسم", error));
  };
  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      .student-tools{margin:18px 0 26px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--card-bg,white)}
      .student-tools h3{margin:0 0 8px;font-size:18px}.student-tools p{margin:0 0 12px;color:var(--muted);font-size:13px}
      .tools-actions{display:flex;flex-wrap:wrap;gap:8px}.tools-actions button,.bookmark-toggle{font:inherit;font-size:13px;padding:9px 13px;border:1px solid var(--line);border-radius:10px;background:var(--card-bg,white);color:var(--ink);cursor:pointer;min-height:42px}
      .tools-actions button:focus-visible,.bookmark-toggle:focus-visible{outline:3px solid var(--focus-ring,#8aa8ff);outline-offset:2px}
      .bookmark-toggle{margin:0 0 12px}.bookmark-toggle.active{background:#fff3cd;border-color:#d8a62c;color:#694f00}
      .bookmark-list{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:7px}.bookmark-list button{width:100%;text-align:right;white-space:normal}
      .guided-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .guided-list button{height:100%;font-size:12px;line-height:1.8}
      .progress-report{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:12px}
      .progress-recommendations{margin:12px 0 16px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card-bg,white)}
      .progress-recommendations>h4{margin:0 0 5px;font-size:15px}.progress-recommendations>p{margin:0 0 10px;color:var(--muted);font-size:12px;line-height:1.8}
      .progress-recommendation-list{display:grid;gap:8px;list-style:none;margin:0;padding:0}
      .progress-recommendation{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--bg,#f7f9fc)}
      .progress-recommendation strong{font-size:13px}.progress-recommendation p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.8}
      .progress-recommendation-actions{display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}
      .progress-recommendation-actions button{font:inherit;font-size:12px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card-bg,white);color:var(--ink);cursor:pointer}
      .progress-recommendation-actions button:last-child{background:var(--primary,#315edb);color:white;border-color:transparent}
      .progress-recommendation-empty{padding:12px;border:1px dashed var(--line);border-radius:9px;color:var(--muted);font-size:13px;line-height:1.8}
      body.dark-mode .progress-recommendation{background:var(--card-bg)}
      @media(max-width:640px){.progress-recommendation{align-items:stretch;flex-direction:column}.progress-recommendation-actions{display:grid;grid-template-columns:1fr 1fr}.progress-recommendation-actions button{min-height:40px}}
      .review-plan{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:12px}
      .review-plan h4{margin:0 0 8px;font-size:15px}.review-plan>p{line-height:1.8}
      .review-plan-group{margin-top:12px}.review-plan-group h4{display:flex;justify-content:space-between;gap:8px}
      .review-plan-group h4 span{font-size:12px;color:var(--muted)}
      .review-plan-list{display:grid;gap:7px;list-style:none;margin:8px 0;padding:0}
      .review-plan-item{padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--bg,#f7f9fc)}
      .review-plan-item p{margin:5px 0;line-height:1.8;overflow-wrap:anywhere}
      .review-plan-item small,.review-plan-empty{color:var(--muted);font-size:12px}
      body.dark-mode .review-plan-item{background:var(--card-bg);border-color:var(--line)}
      .progress-report h4{margin:0 0 10px;font-size:15px}.progress-report-list{display:grid;gap:8px;list-style:none;margin:0;padding:0}
      .progress-report-item{padding:10px;border-radius:9px;background:var(--bg,#f7f9fc)}.progress-report-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px}
      .topic-mastery-status{display:inline-flex;align-items:center;width:fit-content;margin-top:8px;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid var(--line)}
      .topic-mastery-status.is-new{color:var(--muted)}.topic-mastery-status.is-review{color:#b45309;background:#fff7ed;border-color:#fed7aa}
      .topic-mastery-status.is-progress{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}.topic-mastery-status.is-mastered{color:#166534;background:#f0fdf4;border-color:#bbf7d0}
      .topic-review-button{font:inherit;font-size:12px;margin-top:8px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card-bg,white);color:var(--ink);cursor:pointer}
      body.dark-mode .topic-mastery-status.is-review{color:#fed7aa;background:#431407;border-color:#9a3412}
      body.dark-mode .topic-mastery-status.is-progress{color:#bfdbfe;background:#172554;border-color:#1d4ed8}
      body.dark-mode .topic-mastery-status.is-mastered{color:#bbf7d0;background:#052e16;border-color:#166534}
      .progress-report-track{height:7px;margin-top:7px;border-radius:99px;background:var(--line);overflow:hidden}.progress-report-track span{display:block;height:100%;background:var(--success,#2f9e72)}
      .progress-coverage-caption{display:block;margin-top:5px;color:var(--muted);font-size:12px}
      .progress-coverage-caption{display:block;margin-top:5px;color:var(--muted);font-size:12px}
      .recent-activity{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
      .recent-activity h4{margin:0 0 6px;font-size:15px}.recent-attempt-list{display:grid;gap:7px;list-style:none;margin:10px 0 0;padding:0}
      .recent-attempt-item{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:10px;border:1px solid var(--line);border-radius:9px}
      .recent-attempt-status{font-size:12px;font-weight:700;white-space:nowrap}.recent-attempt-status.is-correct{color:var(--success,#2f9e72)}.recent-attempt-status.is-wrong{color:#c2410c}
      .recent-attempt-item strong{font-size:13px;overflow-wrap:anywhere}.recent-attempt-item time{font-size:12px;color:var(--muted);text-align:left}
      .recent-attempt-empty{padding:12px;border:1px dashed var(--line);border-radius:9px;color:var(--muted)}
      body.dark-mode .recent-attempt-item{border-color:var(--line)}
      @media(max-width:640px){.recent-attempt-item{grid-template-columns:1fr;gap:5px}.recent-attempt-item time{text-align:right}}
      .mistake-log{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:12px}
      .mistake-log h4{margin:0 0 6px;font-size:15px}.mistake-log-list{display:grid;gap:8px;list-style:none;margin:10px 0 0;padding:0}
      .mistake-log-item{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--bg,#f7f9fc)}
      .mistake-log-meta{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-bottom:6px}
      .mistake-log-question{line-height:1.8;overflow-wrap:anywhere;margin-bottom:8px}
      .mistake-log-item button{font:inherit;font-size:13px;min-height:38px;padding:7px 11px;border:1px solid var(--line);border-radius:8px;background:var(--card-bg,white);color:var(--ink);cursor:pointer}
      body.dark-mode .mistake-log-item{background:var(--card-bg);border-color:var(--line)}
      body.dark-mode .mistake-log-item button{background:var(--bg);color:var(--ink);border-color:var(--line)}
      .key-idea{margin:10px 0;padding:10px 12px;border-right:4px solid #d5a32b;background:#fff8e6;border-radius:8px}
      .solution-steps{padding-right:22px}.offline-status{font-size:12px;margin-top:10px;color:var(--muted)}
      .footer-disclaimer{font-size:12px;color:var(--muted);max-width:800px;margin:8px auto}
      body.dark-mode{--ink:#e7edf8;--muted:#aab8cc;--line:#34445d;--bg:#101827;--card-bg:#182438;--cyan:#243657;background:var(--bg);color:var(--ink)}
      body.dark-mode .top,body.dark-mode .topic-card,body.dark-mode .question-card,body.dark-mode .result-card,body.dark-mode .student-tools,body.dark-mode .option,body.dark-mode .tools-actions button,body.dark-mode .bookmark-toggle{background:var(--card-bg);color:var(--ink);border-color:var(--line)}
      body.dark-mode .tag,body.dark-mode .filter-panel,body.dark-mode .progress-track{background:#24334a;color:var(--ink)}
      body.dark-mode .notice,body.dark-mode .key-idea{background:#3a321d;color:#f8e7b4;border-color:#75602c}
      body.dark-mode footer{background:#0c1320;color:var(--muted)}
      @media(max-width:640px){.student-tools{padding:14px}.tools-actions button{flex:1 1 145px}.bookmark-toggle{width:100%}.question-text{overflow-wrap:anywhere}.options .option{min-height:52px}.actions button{min-height:46px}}
      @media(max-width:640px){.student-tools{padding:14px}.tools-actions button{flex:1 1 145px}.bookmark-toggle{width:100%}.guided-list{grid-template-columns:1fr}.question-text{overflow-wrap:anywhere}.options .option{min-height:52px}.actions button{min-height:46px}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
    `;
    document.head.appendChild(style);
  };
  const addHomeTools = () => {
    const home = document.getElementById("home");
    const topicSection = document.getElementById("topic-section");
    if (!home || !topicSection) return;
    let panel = document.getElementById("student-tools");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "student-tools";
      panel.className = "student-tools";
      panel.innerHTML = `
        <h3>أدوات المراجعة والحفظ</h3>
        <p>صدّر نسخة احتياطية من تقدمك، أو استوردها على جهاز آخر. المراجعة الذكية تعتمد على الأسئلة التي أخطأت بها ومواعيد مراجعتها.</p>
        <div class="tools-actions">
          <button type="button" id="smart-review">المراجعة الذكية المستحقة</button>
          <button type="button" id="review-plan-toggle" aria-expanded="false">خطة المراجعة</button>
          <button type="button" id="bookmark-review">مراجعة المسائل المحفوظة (<span id="bookmark-count">0</span>)</button>
          <button type="button" id="guided-review" aria-expanded="false">الأسئلة ذات الحل التفصيلي (<span id="guided-count">0</span>)</button>
          <button type="button" id="progress-report-toggle" aria-expanded="false">تقرير تقدّمي حسب البحث</button>
          <button type="button" id="export-progress">تصدير التقدم JSON</button>
          <button type="button" id="import-progress-button">استيراد نسخة احتياطية</button>
          <button type="button" id="toggle-dark-mode" aria-pressed="false">تفعيل الوضع الليلي</button>
          <input id="import-progress-file" type="file" accept="application/json,.json" hidden>
        </div>
        <ul class="bookmark-list guided-list" id="guided-question-list" hidden></ul>
        <section class="progress-report" id="progress-report" aria-live="polite" hidden></section>
        <section class="review-plan" id="review-plan" aria-live="polite" hidden></section>
        <div class="offline-status" id="offline-status" aria-live="polite">جارٍ التحقق من حالة الاتصال...</div>
        <ul class="bookmark-list" id="bookmark-list" hidden></ul>
      `;
      home.insertBefore(panel, topicSection);
    }
    // Existing HTML may already contain the panel but omit newer controls.
    // Ensure required nodes exist before binding; a missing node must never abort all tools.
    const actions = panel.querySelector(".tools-actions");
    if (actions && !document.getElementById("review-plan-toggle")) {
      const planButton = document.createElement("button");
      planButton.type = "button";
      planButton.id = "review-plan-toggle";
      planButton.setAttribute("aria-expanded", "false");
      planButton.textContent = "خطة المراجعة";
      const smartButton = document.getElementById("smart-review");
      if (smartButton && smartButton.nextSibling) actions.insertBefore(planButton, smartButton.nextSibling);
      else actions.appendChild(planButton);
    }
    if (!document.getElementById("review-plan")) {
      const plan = document.createElement("section");
      plan.className = "review-plan"; plan.id = "review-plan";
      plan.setAttribute("aria-live", "polite"); plan.hidden = true;
      const report = document.getElementById("progress-report");
      if (report && report.parentNode) report.insertAdjacentElement("afterend", plan);
      else panel.appendChild(plan);
    }
    const bindClick = (id, handler) => {
      const element = document.getElementById(id);
      if (!element || element.dataset.enhancementBound === "true") return;
      element.addEventListener("click", handler);
      element.dataset.enhancementBound = "true";
    };
    bindClick("smart-review", startSmartReview);
    bindClick("review-plan-toggle", toggleReviewPlan);
    bindClick("bookmark-review", toggleBookmarkList);
    bindClick("guided-review", toggleGuidedQuestionList);
    bindClick("progress-report-toggle", toggleProgressReport);
    bindClick("export-progress", exportProgress);
    bindClick("import-progress-button", () => document.getElementById("import-progress-file")?.click());
    const importFile = document.getElementById("import-progress-file");
    if (importFile && importFile.dataset.enhancementBound !== "true") {
      importFile.addEventListener("change", importProgress);
      importFile.dataset.enhancementBound = "true";
    }
    bindClick("toggle-dark-mode", toggleDarkMode);
    updateBookmarkUI();
    updateGuidedQuestionList();
    applyDarkMode();
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  };
  const renderProgressReport = () => {
    const report = document.getElementById("progress-report");
    if (!report) return;
    const topicNames = Array.isArray(topics) ? topics : [...new Set((typeof questions !== "undefined" ? questions : []).map(q => q.topic))];
    const questionBank = typeof questions !== "undefined" ? questions : [];
    const stats = typeof progressData !== "undefined" && progressData.topicStats && typeof progressData.topicStats === "object" ? progressData.topicStats : {};
    const mistakeValues = progressData && progressData.mistakes && typeof progressData.mistakes === "object" ? Object.values(progressData.mistakes) : [];
    const rows = topicNames.map(topic => {
      const stat = stats[topic] || { answered: 0, correct: 0 };
      const answered = Number.isFinite(stat.answered) && stat.answered > 0 ? Math.floor(stat.answered) : 0;
      const correct = Number.isFinite(stat.correct) && stat.correct > 0 ? Math.min(Math.floor(stat.correct), answered) : 0;
      const rate = answered ? Math.round(correct / answered * 100) : 0;
      const topicQuestions = questionBank.filter(q => q.topic === topic);
      const count = topicQuestions.length;
      const seenCount = topicQuestions.reduce((sum, q) => sum + (progressData && progressData.seenQuestions && progressData.seenQuestions[questionKey(q)] ? 1 : 0), 0);
      const remainingCount = Math.max(0, count - seenCount);
      const coverageRate = count ? Math.min(100, Math.round(seenCount / count * 100)) : 0;
      const mistakeCount = mistakeValues.filter(q => q && q.topic === topic).length;
      let masteryLabel = "لم يبدأ بعد";
      let masteryClass = "is-new";
      if (answered > 0 && mistakeCount > 0) {
        masteryLabel = `لديه ${mistakeCount.toLocaleString("ar")} من الأخطاء للمراجعة`;
        masteryClass = "is-review";
      } else if (answered >= 5 && rate >= 85) {
        masteryLabel = "متقن مبدئياً";
        masteryClass = "is-mastered";
      } else if (answered > 0 && rate >= 70) {
        masteryLabel = "يتقدم جيداً";
        masteryClass = "is-progress";
      } else if (answered > 0) {
        masteryLabel = "يحتاج إلى تدريب";
        masteryClass = "is-review";
      }
      return { topic, answered, correct, rate, count, seenCount, remainingCount, coverageRate, mistakeCount, masteryLabel, masteryClass };
    });
    const totalAttempts = rows.reduce((sum, row) => sum + row.answered, 0);
    const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
    // توصيات مبنية على الأداء الفعلي: الأخطاء أولاً، ثم الأبحاث ذات الأداء المنخفض، ثم الأبحاث التي لم تبدأ.
    const recommendations = [...rows].sort((a, b) => {
      const priority = row => row.mistakeCount > 0 ? 0 : row.answered > 0 && row.rate < 70 ? 1 : row.answered === 0 ? 2 : row.rate < 85 ? 3 : row.remainingCount > 0 ? 4 : 5;
      return priority(a) - priority(b)
        || b.mistakeCount - a.mistakeCount
        || (a.answered ? a.rate : 101) - (b.answered ? b.rate : 101)
        || b.remainingCount - a.remainingCount
        || a.topic.localeCompare(b.topic, "ar");
    }).filter(row => row.mistakeCount > 0 || row.answered === 0 || row.rate < 85 || row.remainingCount > 0).slice(0, 3);
    const recommendationMarkup = recommendations.length ? recommendations.map(row => {
      const reason = row.mistakeCount > 0
        ? `لديك ${row.mistakeCount.toLocaleString("ar")} أخطاء محفوظة؛ ابدأ بمراجعتها.`
        : row.answered === 0
          ? "لم تبدأ هذا البحث بعد؛ خصص له جلسة تدريب قصيرة."
          : row.rate < 70
            ? `نسبة الإجابات الصحيحة ${row.rate.toLocaleString("ar")}٪؛ يُنصح بإعادة التدريب.`
            : row.rate < 85
              ? `نسبة الإجابات الصحيحة ${row.rate.toLocaleString("ar")}٪؛ راجع الأفكار التي أخطأت فيها.`
              : `جرّبت ${row.seenCount.toLocaleString("ar")} من ${row.count.toLocaleString("ar")} سؤالاً مختلفاً؛ بقي ${row.remainingCount.toLocaleString("ar")} للتجربة.`;
      return `<li class="progress-recommendation">
        <div><strong>${escapeHtml(row.topic)}</strong><p>${escapeHtml(reason)}</p></div>
        <div class="progress-recommendation-actions">
          ${row.mistakeCount ? `<button type="button" data-recommend-review="${escapeHtml(row.topic)}">مراجعة الأخطاء</button>` : ""}
          <button type="button" data-recommend-train="${escapeHtml(row.topic)}">ابدأ التدريب</button>
        </div>
      </li>`;
    }).join("") : '<li class="progress-recommendation-empty">ممتاز! لا توجد أبحاث تحتاج إلى أولوية خاصة حالياً. واصل التدريب للمحافظة على مستواك.</li>';
    const examHistory = Array.isArray(extras.examHistory) ? extras.examHistory.slice(0, 10) : [];
    const examHistoryMarkup = examHistory.length ? examHistory.map((exam, i) => {
      const date = new Date(exam.date);
      const when = Number.isNaN(date.getTime()) ? "تاريخ غير متاح" : date.toLocaleString("ar-SY", { dateStyle:"medium", timeStyle:"short" });
      const rate = exam.total ? Math.round(exam.correct / exam.total * 100) : 0;
      const previous = examHistory[i + 1];
      const previousRate = previous && previous.total ? Math.round(previous.correct / previous.total * 100) : null;
      const change = previousRate === null ? "" : ` · ${rate > previousRate ? "تحسن" : rate < previousRate ? "تراجع" : "ثبات"} ${Math.abs(rate - previousRate).toLocaleString("ar")} نقطة مئوية مقارنة بالمحاولة السابقة`;
      return `<li class="exam-history-item"><div><strong>محاكاة ${(examHistory.length - i).toLocaleString("ar")}</strong><span>${rate.toLocaleString("ar")}٪</span></div><p>${exam.correct.toLocaleString("ar")} صحيحة من ${exam.total.toLocaleString("ar")} سؤالاً · ${escapeHtml(when)}</p>${change ? `<small>${escapeHtml(change.trim())}</small>` : ""}</li>`;
    }).join("") : '<li class="recent-attempt-empty">لم تُسجّل محاكاة سابقة بعد. بعد إنهاء أول محاكاة ستظهر نتائجها هنا.</li>';
    const attempts = Array.isArray(progressData.attempts) ? progressData.attempts.slice(0, 10) : [];
    const recentActivity = attempts.length ? attempts.map(attempt => {
      const date = new Date(attempt.date);
      const when = Number.isNaN(date.getTime()) ? "تاريخ غير متاح" : date.toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" });
      const isCorrect = attempt.correct === true;
      return `<li class="recent-attempt-item">
        <span class="recent-attempt-status ${isCorrect ? "is-correct" : "is-wrong"}">${isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}</span>
        <strong>${escapeHtml(attempt.topic || "بحث غير محدد")}</strong>
        <time>${escapeHtml(when)}</time>
      </li>`;
    }).join("") : '<li class="recent-attempt-empty">لا توجد محاولات مسجّلة بعد. ابدأ التدريب لتظهر نتائجك هنا.</li>';
    report.innerHTML = `
      <h4>تقرير تقدّمك</h4>
      <p>إجمالي المحاولات المسجّلة: <strong>${totalAttempts.toLocaleString("ar")}</strong> · الإجابات الصحيحة: <strong>${totalCorrect.toLocaleString("ar")}</strong></p>
      <section class="progress-recommendations" aria-labelledby="progress-recommendations-title">
        <h4 id="progress-recommendations-title">الأبحاث التي تستحق المراجعة أولاً</h4>
        <p>تتغير هذه الاقتراحات تلقائياً وفق إجاباتك وأخطائك المحفوظة على هذا الجهاز.</p>
        <ul class="progress-recommendation-list">${recommendationMarkup}</ul>
      </section>
      <ul class="progress-report-list">${rows.map(row => `
        <li class="progress-report-item">
          <div class="progress-report-top"><strong>${escapeHtml(row.topic)}</strong><span>${row.answered ? `${row.correct.toLocaleString("ar")} صحيحة من ${row.answered.toLocaleString("ar")} محاولة · ${row.rate.toLocaleString("ar")}%` : "لم تبدأ بعد"}</span></div>
          <div class="progress-report-top"><span>${row.count.toLocaleString("ar")} سؤالاً متاحاً</span><span>جرّبت ${row.seenCount.toLocaleString("ar")} · بقي ${row.remainingCount.toLocaleString("ar")}</span></div>
          <div class="progress-report-track" role="progressbar" aria-label="نسبة الأسئلة التي جرى تجربتها في ${escapeHtml(row.topic)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.coverageRate}"><span style="width:${row.coverageRate}%"></span></div>
          <small class="progress-coverage-caption">${row.coverageRate.toLocaleString("ar")}٪ من أسئلة هذا البحث جرى تجربتها</small>
          <span class="topic-mastery-status ${row.masteryClass}">${escapeHtml(row.masteryLabel)}</span>
          <div class="progress-report-track" role="progressbar" aria-label="نسبة الإجابات الصحيحة في ${escapeHtml(row.topic)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.rate}"><span style="width:${row.rate}%"></span></div>
          ${row.mistakeCount ? `<button type="button" class="topic-review-button" data-review-topic="${escapeHtml(row.topic)}">راجع أخطاء هذا البحث (${row.mistakeCount.toLocaleString("ar")})</button>` : ""}
        </li>`).join("")}</ul>
      <section class="exam-history"><h4>سجل محاكاة الامتحان</h4><p>تُحفظ النتائج على هذا الجهاز لمقارنة أدائك عبر الوقت.</p><ul class="exam-history-list">${examHistoryMarkup}</ul></section>
      <section class="recent-activity">
        <h4>آخر المحاولات</h4>
        <p>آخر ${Math.min(attempts.length, 10).toLocaleString("ar")} محاولات مسجّلة على هذا الجهاز.</p>
        <ul class="recent-attempt-list">${recentActivity}</ul>
      </section>`;
    report.querySelectorAll("[data-review-topic], [data-recommend-review]").forEach(button => {
      button.addEventListener("click", () => {
        const topic = button.dataset.reviewTopic || button.dataset.recommendReview;
        const qs = mistakeValues.filter(q => q && q.topic === topic && q.q && Array.isArray(q.options));
        if (qs.length) startTargetedQuiz(qs, "مراجعة أخطاء — " + topic);
      });
    });
    report.querySelectorAll("[data-recommend-train]").forEach(button => {
      button.addEventListener("click", () => {
        const topic = button.dataset.recommendTrain;
        if (typeof startQuiz === "function") startQuiz(topic);
      });
    });
    typesetMath(report);
  };
  const toggleProgressReport = () => {
    const report = document.getElementById("progress-report");
    const button = document.getElementById("progress-report-toggle");
    if (!report || !button) return;
    const opening = report.hidden;
    report.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    if (opening) renderProgressReport();
  };
  const ensureMistakeLog = () => {
    const actions = document.querySelector("#student-tools .tools-actions");
    const report = document.getElementById("progress-report");
    if (!actions || !report) return;
    if (!document.getElementById("mistake-log-toggle")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "mistake-log-toggle";
      button.textContent = "سجل الأخطاء (0)";
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", toggleMistakeLog);
      actions.appendChild(button);
    }
    if (!document.getElementById("mistake-log")) {
      const section = document.createElement("section");
      section.id = "mistake-log";
      section.className = "mistake-log";
      section.setAttribute("aria-live", "polite");
      section.hidden = true;
      report.insertAdjacentElement("afterend", section);
    }
    renderMistakeLog();
  };
  const renderMistakeLog = () => {
    const section = document.getElementById("mistake-log");
    const button = document.getElementById("mistake-log-toggle");
    if (!section || typeof progressData === "undefined") return;
    const mistakes = progressData.mistakes && typeof progressData.mistakes === "object" && !Array.isArray(progressData.mistakes) ? progressData.mistakes : {};
    const rows = Object.keys(mistakes).map(key => {
      const q = byKey(key);
      if (!q || typeof q.q !== "string" || !Array.isArray(q.options) || q.options.length !== 4) return null;
      return { key, q };
    }).filter(Boolean).sort((a,b) => String(a.q.topic || "").localeCompare(String(b.q.topic || ""), "ar"));
    if (button) {
      button.textContent = `سجل الأخطاء (${rows.length.toLocaleString("ar")})`;
      button.disabled = rows.length === 0;
      button.setAttribute("aria-expanded", String(!section.hidden));
    }
    if (!rows.length) {
      section.innerHTML = '<h4>سجل الأخطاء</h4><p>لا توجد أسئلة صالحة للمراجعة حالياً. قد تكون بعض العلامات من نسخة قديمة من بنك الأسئلة.</p>';
      return;
    }
    section.innerHTML = `
      <h4>سجل الأخطاء</h4>
      <p>هذه الأسئلة أخطأتَ في الإجابة عنها. افتح أي سؤال لتتدرّب عليه منفرداً؛ وتُحذف علامة الخطأ عند الإجابة الصحيحة في المراجعة.</p>
      <ul class="mistake-log-list">${rows.map(({key,q}) => `
        <li class="mistake-log-item">
          <div class="mistake-log-meta"><strong>${escapeHtml(q.topic || "بحث غير محدد")}</strong><span>${escapeHtml(q.level || "مستوى غير محدد")}</span></div>
          <div class="mistake-log-question">${escapeHtml(String(q.q).replace(/<[^>]*>/g, " "))}</div>
          <button type="button" data-mistake-key="${escapeHtml(key)}">تدرّب على هذا السؤال ←</button>
        </li>`).join("")}</ul>`;
    section.querySelectorAll("[data-mistake-key]").forEach(item => item.addEventListener("click", () => {
      const q = byKey(item.dataset.mistakeKey) || progressData.mistakes[item.dataset.mistakeKey];
      if (q) startTargetedQuiz([q], "مراجعة خطأ — " + (q.topic || ""));
    }));
    typesetMath(section);
  };
  const toggleMistakeLog = () => {
    const section = document.getElementById("mistake-log");
    const button = document.getElementById("mistake-log-toggle");
    if (!section || !button) return;
    section.hidden = !section.hidden;
    button.setAttribute("aria-expanded", String(!section.hidden));
    renderMistakeLog();
  };
  const originalRefreshDashboard = window.refreshDashboard;
  if (typeof originalRefreshDashboard === "function") {
    window.refreshDashboard = function () {
      originalRefreshDashboard();
      renderMistakeLog();
      const report = document.getElementById("progress-report");
      if (report && !report.hidden) renderProgressReport();
    };
  }
  const applyDarkMode = () => {
    document.body.classList.toggle("dark-mode", extras.darkMode);
    const btn = document.getElementById("toggle-dark-mode");
    if (btn) { btn.textContent = extras.darkMode ? "إيقاف الوضع الليلي" : "تفعيل الوضع الليلي"; btn.setAttribute("aria-pressed", String(extras.darkMode)); }
  };
  const toggleDarkMode = () => { extras.darkMode = !extras.darkMode; persistExtras(); applyDarkMode(); };
  window.addEventListener("mathBacSyria:reset-progress", () => {
    extras.bookmarks = [];
    extras.schedule = {};
    extras.reviewQuestions = {};
    extras.examHistory = [];
    persistExtras();
    updateBookmarkUI();
    updateBookmarkButton();
    renderExamHistory();
  });
  const updateOnlineStatus = () => {
    const el = document.getElementById("offline-status");
    if (el) el.textContent = navigator.onLine ? "متصل بالإنترنت · يجري تجهيز الموارد المتاحة للاستخدام دون اتصال." : "غير متصل · ستعمل الأسئلة المحفوظة محلياً، وقد لا تُعرض المعادلات منسّقة إذا لم تكن MathJax مخزّنة.";
  };
  const generalTopicHint = q => {
    const topic = String(q.topic || "");
    if (topic.includes("الجداء السلمي")) return "تذكير عام: احسب جداء المركبات المناظرة أولاً؛ واستخدم كونه صفراً لاختبار التعامد، أو صيغة الجداء السلمي لإيجاد الزاوية عند الحاجة.";
    if (topic.includes("المستقيمات") || topic.includes("المستويات")) return "تذكير عام: حدّد شعاع التوجيه للمستقيم والشعاع الناظم للمستوى، ثم استخدم المعادلة أو شرط التعامد/التوازي المناسب.";
    if (topic.includes("الأشعة")) return "تذكير عام: اكتب مركبات الشعاع بطرح إحداثيات نقطة البداية من النهاية، ثم طبّق علاقة شال أو قانون الطول وفق المطلوب.";
    if (topic.includes("احتمال")) return "تذكير عام: عرّف الحوادث أولاً، ثم ميّز بين الاتحاد والتقاطع والاحتمال الشرطي والاستقلال قبل اختيار القانون.";
    if (topic.includes("عقدي") || topic.includes("العقدية")) return "تذكير عام: عند وجود مساواة عقدية، اكتب العدد على الصورة a+bi وقارن الجزأين الحقيقي والتخيلي؛ استخدم الطول أو السعة فقط عندما يتطلب السؤال ذلك.";
    if (topic.includes("اشتقاق") || topic.includes("التوابع") || topic.includes("التابع")) return "تذكير عام: حدّد مجال التعريف ونوع المطلوب، ثم اختر قاعدة الاشتقاق أو دراسة التغيّر المناسبة وتحقّق من شروط تطبيقها.";
    if (topic.includes("احتمالات")) return "تذكير عام: عرّف الحوادث وحدّد هل المطلوب اتحاد أم تقاطع أم احتمال شرطي، ثم طبّق القانون الموافق.";
    return "تذكير عام: حدّد المعطيات والمطلوب، واكتب القانون المناسب قبل التعويض، ثم تحقّق من الإشارة والوحدات أو شروط المجال إن وجدت.";
  };
  const updateGuidedQuestionList = () => {
    const list = document.getElementById("guided-question-list");
    const count = document.getElementById("guided-count");
    const btn = document.getElementById("guided-review");
    if (!list || typeof questions === "undefined") return;
    const guided = questions.filter(q => Array.isArray(q.steps) && q.steps.length > 0);
    if (count) count.textContent = guided.length.toLocaleString("ar");
    list.innerHTML = guided.map(q => {
      const key = keyOf(q);
      return `<li><button type="button" data-guided-key="${escapeHtml(key)}"><strong>${escapeHtml(q.topic)}</strong><br>${escapeHtml(String(q.q || "").replace(/<[^>]*>/g, "").slice(0,180))}</button></li>`;
    }).join("");
    list.querySelectorAll("[data-guided-key]").forEach(item => item.addEventListener("click", () => {
      const q = byKey(item.dataset.guidedKey);
      if (q) startGuidedQuestion(q);
    }));
    if (btn) btn.setAttribute("aria-expanded", String(!list.hidden));
    typesetMath(list);
  };
  const toggleGuidedQuestionList = () => {
    const list = document.getElementById("guided-question-list");
    if (!list) return;
    list.hidden = !list.hidden;
    updateGuidedQuestionList();
  };
  const startGuidedQuestion = q => {
    currentTopic = q.topic;
    reviewMode = false;
    quizQuestions = [q];
    index = 0;
    correctCount = 0;
    answered = false;
    document.getElementById("home").classList.add("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("quiz").classList.remove("hidden");
    document.getElementById("quiz-title").textContent = "تدريب بحل تفصيلي — " + q.topic;
    showQuestion();
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const updateBookmarkUI = () => {
    const count = document.getElementById("bookmark-count");
    if (count) count.textContent = extras.bookmarks.length.toLocaleString("ar");
    const list = document.getElementById("bookmark-list");
    if (!list) return;
    list.innerHTML = extras.bookmarks.map(k => {
      const q = byKey(k);
      return q ? `<li><button type="button" data-bookmark-key="${escapeHtml(k)}">${escapeHtml(q.topic)} — ${escapeHtml(q.q.replace(/<[^>]*>/g,"").slice(0,110))}</button></li>` : "";
    }).join("");
    // لا تُظهر المحفوظات تلقائياً عند تحميل الصفحة؛ زر المحفوظات هو المتحكم الوحيد بفتحها.
    if (extras.bookmarks.length === 0) list.hidden = true;
    const bookmarkButton = document.getElementById("bookmark-review");
    if (bookmarkButton) {
      bookmarkButton.setAttribute("aria-expanded", String(!list.hidden));
      bookmarkButton.firstChild && (bookmarkButton.firstChild.textContent = !list.hidden ? "إخفاء المسائل المحفوظة (" : "عرض المسائل المحفوظة (");
    }
    list.querySelectorAll("[data-bookmark-key]").forEach(btn => btn.addEventListener("click", () => {
      const q = byKey(btn.dataset.bookmarkKey);
      if (q) startTargetedQuiz([q], "المسائل المحفوظة");
    }));
    typesetMath(list);
  };
  const toggleBookmark = () => {
    const q = typeof quizQuestions !== "undefined" ? quizQuestions[index] : null;
    if (!q) return;
    const key = keyOf(q);
    if (extras.bookmarks.includes(key)) extras.bookmarks = extras.bookmarks.filter(k => k !== key);
    else extras.bookmarks.push(key);
    persistExtras(); updateBookmarkUI(); updateBookmarkButton();
  };
  const updateBookmarkButton = () => {
    const q = typeof quizQuestions !== "undefined" ? quizQuestions[index] : null;
    const btn = document.getElementById("bookmark-current");
    if (!btn || !q) return;
    const saved = extras.bookmarks.includes(keyOf(q));
    btn.classList.toggle("active", saved);
    btn.textContent = saved ? "★ أزل العلامة عن هذه المسألة" : "☆ احفظ هذه المسألة للمراجعة";
    btn.setAttribute("aria-pressed", String(saved));
  };
  const addQuestionBookmark = () => {
    const card = document.querySelector(".question-card");
    const actions = card && card.querySelector(".actions");
    if (!actions || document.getElementById("bookmark-current")) return;
    const btn = document.createElement("button");
    btn.id = "bookmark-current"; btn.type = "button"; btn.className = "bookmark-toggle";
    btn.addEventListener("click", toggleBookmark);
    card.insertBefore(btn, actions);
  };
  const startTargetedQuiz = (qs, title) => {
    if (!qs.length) { alert("لا توجد أسئلة محفوظة متاحة. تحقق من النسخة الاحتياطية أو احفظ سؤالاً أولاً."); return; }
    currentTopic = title; reviewMode = true; quizQuestions = [...qs]; index = 0; correctCount = 0; answered = false;
    document.getElementById("home").classList.add("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("quiz").classList.remove("hidden");
    document.getElementById("quiz-title").textContent = title;
    showQuestion(); window.scrollTo({top:0,behavior:"smooth"});
  };
  const toggleBookmarkList = () => {
    const list = document.getElementById("bookmark-list");
    const button = document.getElementById("bookmark-review");
    if (!list || !button) return;
    if (!extras.bookmarks.length) {
      list.hidden = true;
      button.setAttribute("aria-expanded", "false");
      return;
    }
    list.hidden = !list.hidden;
    button.setAttribute("aria-expanded", String(!list.hidden));
    updateBookmarkUI();
    if (!list.hidden) list.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const getScheduledReviews = () => {
    const now = Date.now();
    const mistakes = progressData && progressData.mistakes && typeof progressData.mistakes === "object" ? progressData.mistakes : {};
    const scheduleMap = extras && extras.schedule && typeof extras.schedule === "object" && !Array.isArray(extras.schedule) ? extras.schedule : {};
    const reviewMap = extras && extras.reviewQuestions && typeof extras.reviewQuestions === "object" && !Array.isArray(extras.reviewQuestions) ? extras.reviewQuestions : {};
    return [...new Set([...Object.keys(mistakes), ...Object.keys(scheduleMap), ...Object.keys(reviewMap)])]
      .map(key => {
        // A review entry is usable only while its key still exists in the current bank.
        const q = byKey(key);
        if (!q) return null;
        const schedule = scheduleMap[key] && typeof scheduleMap[key] === "object" && !Array.isArray(scheduleMap[key]) ? scheduleMap[key] : {};
        const rawDue = schedule.due;
        const parsedDue = rawDue !== null && rawDue !== "" && rawDue !== undefined ? Number(rawDue) : NaN;
        const due = Number.isFinite(parsedDue) && parsedDue > 0 ? parsedDue : now;
        const rawStage = Number(schedule.stage);
        const stage = Number.isFinite(rawStage) ? Math.max(0, Math.min(intervalsDays.length - 1, Math.floor(rawStage))) : 0;
        return { key, q, due, stage, lastResult: typeof schedule.lastResult === "string" ? schedule.lastResult : "pending" };
      })
      .filter(Boolean)
      .sort((a, b) => a.due - b.due);
  };
  const startSmartReview = () => {
    const now = Date.now();
    const dueItems = getScheduledReviews().filter(item => item.due <= now);
    const qs = dueItems.map(item => item.q);
    if (!qs.length) { alert("لا توجد أسئلة مستحقة للمراجعة الآن. افتح خطة المراجعة لمعرفة المواعيد القادمة."); return; }
    startTargetedQuiz(qs, "المراجعة الذكية");
  };
  const renderReviewPlan = () => {
    const panel = document.getElementById("review-plan");
    if (!panel) return;
    const now = Date.now();
    const week = now + 7 * 86400000;
    const items = getScheduledReviews();
    const due = items.filter(item => item.due <= now);
    const upcoming = items.filter(item => item.due > now && item.due <= week);
    const later = items.filter(item => item.due > week);
    const fmt = value => new Date(value).toLocaleString("ar-SY", { dateStyle:"medium", timeStyle:"short" });
    const renderGroup = (title, list, emptyText) => `
      <div class="review-plan-group">
        <h4>${title} <span>${list.length.toLocaleString("ar")}</span></h4>
        ${list.length ? `<ul class="review-plan-list">${list.slice(0, 8).map(item => `
          <li class="review-plan-item">
            <strong>${escapeHtml(item.q.topic || "بحث غير محدد")}</strong>
            <p>${escapeHtml(String(item.q.q || "").slice(0, 180))}</p>
            <small>${item.due <= now ? "مستحق الآن" : "موعد المراجعة: " + escapeHtml(fmt(item.due))}</small>
          </li>`).join("")}</ul>${list.length > 8 ? `<p class="muted">وتوجد ${(list.length - 8).toLocaleString("ar")} أسئلة أخرى في هذه الفئة.</p>` : ""}` : `<p class="review-plan-empty">${emptyText}</p>`}
      </div>`;
    panel.innerHTML = `
      <h4>خطة المراجعة المتباعدة</h4>
      <p>تعتمد المواعيد على إجاباتك في المراجعة الذكية، وتُحفظ على هذا الجهاز. الأسئلة التي أخطأت بها ولم تُجدول بعد تظهر ضمن المستحق الآن.</p>
      ${renderGroup("مستحق اليوم", due, "لا توجد مراجعات مستحقة الآن. أحسنت!") }
      ${renderGroup("خلال الأيام السبعة القادمة", upcoming, "لا توجد مراجعات مجدولة خلال الأسبوع القادم.") }
      ${renderGroup("بعد أسبوع", later, "لا توجد مواعيد أبعد من أسبوع.") }`;
    typesetMath(panel);
  };
  const toggleReviewPlan = () => {
    const panel = document.getElementById("review-plan");
    const button = document.getElementById("review-plan-toggle");
    if (!panel || !button) return;
    const opening = panel.hidden;
    panel.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    if (opening) renderReviewPlan();
  };
  const exportProgress = () => {
    const payload = { format:"math-bac-syria-progress", version:1, exportedAt:new Date().toISOString(), progress:progressData, studentTools:extras };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="math-bac-syria-progress.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importProgress = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("حجم الملف أكبر من الحد المسموح (2 ميغابايت).");
      const data = JSON.parse(await file.text());
      if (!data || data.format !== "math-bac-syria-progress" || !data.progress || typeof data.progress !== "object" || Array.isArray(data.progress)) {
        throw new Error("هذا الملف ليس نسخة احتياطية صالحة للمنصة.");
      }
      if (!confirm("سيتم استبدال التقدم والعلامات الحالية بالبيانات الموجودة في النسخة الاحتياطية. هل تريد المتابعة؟")) return;
      const source = data.progress;
      const toCount = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
      const nextProgress = {
        answered: toCount(source.answered),
        correct: Math.min(toCount(source.correct), toCount(source.answered)),
        mistakes: {},
        topicStats: {},
        attempts: Array.isArray(source.attempts) ? source.attempts.slice(0, 100) : [],
        seenQuestions: {}
      };
      // Restore only keys that still belong to the current question bank; ignore malformed or obsolete entries.
      const sourceSeen = source.seenQuestions && typeof source.seenQuestions === "object" && !Array.isArray(source.seenQuestions) ? source.seenQuestions : {};
      for (const key of Object.keys(sourceSeen)) {
        if (sourceSeen[key] && byKey(key)) nextProgress.seenQuestions[key] = true;
      }
      const sourceMistakes = source.mistakes && typeof source.mistakes === "object" && !Array.isArray(source.mistakes) ? source.mistakes : {};
      for (const key of Object.keys(sourceMistakes)) {
        const q = byKey(key);
        if (q) nextProgress.mistakes[key] = { topic:q.topic, q:q.q, options:q.options, answer:q.answer, solution:q.solution, level:q.level };
      }
      const sourceStats = source.topicStats && typeof source.topicStats === "object" && !Array.isArray(source.topicStats) ? source.topicStats : {};
      for (const topic of (typeof topics !== "undefined" ? topics : [])) {
        const stat = sourceStats[topic];
        if (!stat || typeof stat !== "object") continue;
        const answered = toCount(stat.answered);
        nextProgress.topicStats[topic] = { answered, correct:Math.min(toCount(stat.correct), answered) };
      }
      let nextExtras = { bookmarks:[], schedule:{}, reviewQuestions:{}, darkMode:false };
      const sourceTools = data.studentTools && typeof data.studentTools === "object" && !Array.isArray(data.studentTools) ? data.studentTools : {};
      nextExtras.darkMode = Boolean(sourceTools.darkMode);
      nextExtras.examHistory = Array.isArray(sourceTools.examHistory) ? sourceTools.examHistory.filter(e => e && Number.isFinite(e.correct) && Number.isFinite(e.total) && e.total > 0).slice(0, 20) : [];
      nextExtras.bookmarks = Array.isArray(sourceTools.bookmarks) ? [...new Set(sourceTools.bookmarks.filter(k => typeof k === "string" && byKey(k)))] : [];
      const sourceSchedule = sourceTools.schedule && typeof sourceTools.schedule === "object" && !Array.isArray(sourceTools.schedule) ? sourceTools.schedule : {};
      for (const key of Object.keys(sourceSchedule)) {
        const q = byKey(key);
        const item = sourceSchedule[key];
        const due = Number(typeof item === "object" && item ? item.due : item);
        if (q && Number.isFinite(due) && due > 0) {
          nextExtras.schedule[key] = typeof item === "object" && item ? { stage:Math.max(0, Math.min(4, Number(item.stage) || 0)), due, lastResult:item.lastResult || "" } : { stage:0, due };
          nextExtras.reviewQuestions[key] = q;
        }
      }
      progressData = nextProgress;
      extras = nextExtras;
      saveProgress();
      persistExtras();
      if (typeof refreshDashboard === "function") refreshDashboard();
      if (typeof renderTopics === "function") renderTopics();
      updateBookmarkUI();
      updateGuidedQuestionList();
      applyDarkMode();
      alert("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch (err) {
      alert("تعذر استيراد الملف: " + (err && err.message ? err.message : "صيغة الملف غير صالحة."));
    } finally {
      event.target.value = "";
    }
  };
  const addDays = days => Date.now() + days * 86400000;
  const originalShowQuestion = window.showQuestion;
  if (typeof originalShowQuestion === "function") {
    window.showQuestion = function () {
      originalShowQuestion();
      addQuestionBookmark();
      updateBookmarkButton();
    };
  }
  const originalChooseAnswer = window.chooseAnswer;
  if (typeof originalChooseAnswer === "function") {
    window.chooseAnswer = function (choice) {
      const q = typeof quizQuestions !== "undefined" ? quizQuestions[index] : null;
      const qKeyBefore = q ? keyOf(q) : null;
      const previousMistake = qKeyBefore ? progressData.mistakes[qKeyBefore] : null;
      const wasSmartReview = document.getElementById("quiz-title")?.textContent === "المراجعة الذكية";
      const wasBookmarkReview = document.getElementById("quiz-title")?.textContent === "المسائل المحفوظة";
      originalChooseAnswer(choice);
      if (!q) return;
      const key = keyOf(q);
      const isCorrect = choice === q.answer;
      if (wasBookmarkReview && isCorrect && previousMistake) { progressData.mistakes[key] = previousMistake; saveProgress(); if (typeof refreshDashboard === "function") refreshDashboard(); }
      if (!isCorrect) {
        extras.reviewQuestions[key] = q;
        progressData.mistakes[key] = { topic:q.topic, q:q.q, options:q.options, answer:q.answer, solution:q.solution, level:q.level };
        saveProgress();
        if (typeof refreshDashboard === "function") refreshDashboard();
        const previous = extras.schedule[key] || { stage:0 };
        extras.schedule[key] = { stage:0, due:addDays(1), lastResult:"wrong", updatedAt:new Date().toISOString() };
      } else if (wasSmartReview) {
        extras.reviewQuestions[key] = q;
        const previous = extras.schedule[key] || { stage:0 };
        const stage = Math.min((Number(previous.stage) || 0) + 1, intervalsDays.length - 1);
        extras.schedule[key] = { stage, due:addDays(intervalsDays[stage]), lastResult:"correct", updatedAt:new Date().toISOString() };
      } else if (wasBookmarkReview) {
        // Bookmark reviews do not alter the spaced-repetition schedule.
      }
      persistExtras();
      const feedback = document.getElementById("feedback");
      if (feedback && !feedback.classList.contains("hidden")) {
        const solution = feedback.querySelector(".solution");
        if (solution) {
          if (Array.isArray(q.steps) && q.steps.length) {
            const idea = q.keyIdea ? `<div class="key-idea"><strong>الفكرة الأساسية:</strong> ${escapeHtml(q.keyIdea)}</div>` : "";
            solution.innerHTML = `<strong>خطوات الحل:</strong>${idea}<ol class="solution-steps">${q.steps.map(step => `<li>${step}</li>`).join("")}</ol>`;
          } else {
            const idea = q.keyIdea || generalTopicHint(q);
            solution.insertAdjacentHTML("afterbegin", `<div class="key-idea"><strong>${q.keyIdea ? "مفتاح الحل:" : "تذكير بالفكرة العامة:"}</strong> ${escapeHtml(idea)}</div>`);
          }
          if (!Array.isArray(q.steps) || !q.steps.length) {
            const note = document.createElement("p"); note.className="muted"; note.textContent="الشرح التفصيلي لهذا السؤال يحتاج إلى مراجعة تعليمية إضافية؛ المعروض أدناه هو الحل المختصر المتاح حالياً.";
            solution.appendChild(note);
          }
          typesetMath(solution);
        }
      }
    };
  }
  const originalStartQuiz = window.startQuiz;
  if (typeof originalStartQuiz === "function") {
    window.startQuiz = function (topic) { originalStartQuiz(topic); addQuestionBookmark(); updateBookmarkButton(); };
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(err => console.warn("تعذر تسجيل Service Worker", err)));
  }

  // محاكاة امتحان شاملة: اختيار متوازن من الأبحاث مع مؤقت ومراجعة بعد التسليم.
  const examState = { active:false, remaining:0, timer:null, answers:[], resultVisible:false };
  const shuffle = list => [...list].sort(() => Math.random() - 0.5);
  const buildBalancedExam = (count, difficulty = "الكل") => {
    const allQuestions = typeof questions !== "undefined" && Array.isArray(questions) ? questions : [];
    const bank = difficulty === "الكل" ? allQuestions : allQuestions.filter(q => q.level === difficulty);
    const names = typeof topics !== "undefined" && Array.isArray(topics) ? topics : [...new Set(bank.map(q => q.topic))];
    const pools = names.map(topic => shuffle(bank.filter(q => q.topic === topic)));
    const picked = [];
    let cursor = 0;
    while (picked.length < Math.min(count, bank.length)) {
      let added = false;
      for (let i = 0; i < pools.length && picked.length < count; i++) {
        if (pools[i].length) { picked.push(pools[i].pop()); added = true; }
      }
      if (!added) break;
      cursor++;
      if (cursor > count + 1) break;
    }
    return shuffle(picked);
  };
  const renderExamHistory = () => {
    const panel = document.getElementById("exam-history");
    if (!panel) return;
    const history = Array.isArray(extras.examHistory) ? extras.examHistory.slice(0, 5) : [];
    if (!history.length) {
      panel.innerHTML = "<h4>سجل المحاكاة السابقة</h4><p>ستظهر هنا نتائج آخر المحاكاة بعد إنهاء أول امتحان تجريبي. يُحفظ السجل على هذا الجهاز فقط.</p>";
      return;
    }
    const rows = history.map((entry, index) => {
      const total = Math.max(0, Number(entry.total) || 0);
      const correct = Math.min(total, Math.max(0, Number(entry.correct) || 0));
      const rate = total ? Math.round(correct / total * 100) : 0;
      const parsedDate = Date.parse(entry.date || "");
      const dateLabel = Number.isFinite(parsedDate)
        ? new Date(parsedDate).toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" })
        : "تاريخ غير متاح";
      const topics = entry.topicResults && typeof entry.topicResults === "object" ? Object.entries(entry.topicResults) : [];
      const weakest = topics
        .filter(([, stat]) => stat && Number(stat.total) > 0)
        .sort((a, b) => (Number(a[1].correct) / Number(a[1].total)) - (Number(b[1].correct) / Number(b[1].total)))[0];
      const weakLabel = weakest
        ? `أولوية المراجعة: ${escapeHtml(weakest[0])} (${Math.round(Math.max(0, Number(weakest[1].correct) || 0) / Number(weakest[1].total) * 100).toLocaleString("ar")}٪)`
        : "لا يتوفر تفصيل حسب البحث لهذه المحاولة.";
      return `<li class="exam-history-item">
        <div><strong>${index === 0 ? "أحدث محاكاة" : `محاكاة سابقة ${index.toLocaleString("ar")}`}</strong><span>${rate.toLocaleString("ar")}٪</span></div>
        <p>${correct.toLocaleString("ar")} صحيحة من ${total.toLocaleString("ar")}</p>
        <small>${escapeHtml(dateLabel)}</small>
        <p>${weakLabel}</p>
      </li>`;
    }).join("");
    panel.innerHTML = `<h4>سجل المحاكاة السابقة</h4><p>آخر خمس محاكاة محفوظة على هذا الجهاز، مع اقتراح البحث الذي يستحق المراجعة أولاً.</p><ol class="exam-history-list">${rows}</ol>`;
  };
  const ensureExamControls = () => {
    const panel = document.querySelector(".student-tools");
    if (panel && !document.getElementById("exam-tools")) {
      const section = document.createElement("section");
      section.id = "exam-tools";
      section.className = "exam-tools";
      section.innerHTML = `
        <div class="exam-tools-heading"><div><p class="eyebrow">تدريب قريب من أجواء الامتحان</p><h3>محاكاة امتحان البكالوريا</h3><p class="muted">أسئلة متنوعة من أبحاث المنهاج، مع توقيت ونتيجة ومراجعة الحلول بعد التسليم.</p></div></div>
        <div class="exam-config">
          <label>عدد الأسئلة<select id="exam-question-count"><option value="20">20 سؤالاً</option><option value="30" selected>30 سؤالاً</option><option value="50">50 سؤالاً</option></select></label>
          <label>مستوى الأسئلة<select id="exam-difficulty"><option value="الكل" selected>جميع المستويات</option><option value="أساسي">أساسي</option><option value="متوسط">متوسط</option><option value="متقدم">متقدم</option></select></label>
          <label>المدة<select id="exam-duration"><option value="30">30 دقيقة</option><option value="60" selected>60 دقيقة</option><option value="90">90 دقيقة</option></select></label>
          <button type="button" id="start-exam" class="primary">ابدأ المحاكاة ←</button>
        </div>
        <p class="exam-note">تُختار الأسئلة من الأبحاث المتاحة في بنك المنصة. هذه محاكاة تدريبية وليست نموذجاً رسمياً معتمداً.</p>`;
      panel.appendChild(section);
    }
    const examPanel = document.getElementById("exam-tools");
    if (examPanel && !document.getElementById("exam-history")) {
      const historyPanel = document.createElement("section");
      historyPanel.id = "exam-history";
      historyPanel.className = "exam-history";
      historyPanel.setAttribute("aria-live", "polite");
      const note = examPanel.querySelector(".exam-note");
      if (note) note.insertAdjacentElement("afterend", historyPanel);
      else examPanel.appendChild(historyPanel);
    }
    renderExamHistory();
    const startButton = document.getElementById("start-exam");
    if (startButton) {
      // Use the button's direct handler so stale/duplicate listeners cannot leave the
      // page in a blank state if the exam setup throws.
      startButton.onclick = () => {
        try {
          startExam();
        } catch (error) {
          console.error("تعذر بدء محاكاة الامتحان:", error);
          examState.active = false;
          stopExamTimer();
          const home = document.getElementById("home");
          const quiz = document.getElementById("quiz");
          const results = document.getElementById("results");
          if (home) home.classList.remove("hidden");
          if (quiz) quiz.classList.add("hidden");
          if (results) results.classList.add("hidden");
          alert("تعذر بدء المحاكاة بسبب خطأ أثناء تجهيز الأسئلة. أعد تحميل الصفحة، وإذا تكرر الخطأ فأبلغنا لنحدد الخطأ بدقة.");
        }
      };
      startButton.dataset.bound = "true";
    }
    const head = document.querySelector(".quiz-head");
    if (head && !document.getElementById("exam-clock")) {
      const clock = document.createElement("span");
      clock.id = "exam-clock"; clock.className = "exam-clock"; clock.hidden = true;
      clock.setAttribute("role","timer"); clock.setAttribute("aria-live","off");
      head.appendChild(clock);
    }
    const actions = document.querySelector("#quiz .actions");
    if (actions && !document.getElementById("exam-submit")) {
      const submit = document.createElement("button");
      submit.id = "exam-submit"; submit.type = "button"; submit.className = "secondary";
      submit.textContent = "إنهاء وتسليم الامتحان"; submit.hidden = true;
      submit.addEventListener("click", () => finishExam(false));
      actions.insertBefore(submit, actions.firstChild);
    }
  };
  const updateExamChrome = () => {
    const clock = document.getElementById("exam-clock");
    const submit = document.getElementById("exam-submit");
    if (clock) {
      clock.hidden = !examState.active;
      clock.classList.toggle("exam-clock-low", examState.active && examState.remaining <= 300);
      if (examState.active) {
        const minutes = Math.floor(examState.remaining / 60);
        const seconds = examState.remaining % 60;
        clock.textContent = `الوقت المتبقي ${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
      }
    }
    if (submit) submit.hidden = !examState.active;
  };
  const stopExamTimer = () => {
    if (examState.timer) clearInterval(examState.timer);
    examState.timer = null;
  };
  const startExam = () => {
    const bank = typeof questions !== "undefined" && Array.isArray(questions) ? questions : [];
    if (!bank.length) { alert("لا يوجد بنك أسئلة متاح لبدء المحاكاة."); return; }
    const wanted = Number(document.getElementById("exam-question-count")?.value || 30);
    const duration = Number(document.getElementById("exam-duration")?.value || 60);
    const difficulty = document.getElementById("exam-difficulty")?.value || "الكل";
    const picked = buildBalancedExam(wanted, difficulty);
    if (!picked.length) { alert("تعذر تجهيز أسئلة المحاكاة."); return; }
    stopExamTimer();
    examState.active = true;
    examState.resultVisible = false;
    examState.remaining = duration * 60;
    examState.answers = Array(picked.length).fill(null);
    currentTopic = "محاكاة الامتحان";
    reviewMode = false;
    quizQuestions = picked;
    index = 0; correctCount = 0; answered = false;
    document.getElementById("results")?.classList.add("hidden");
    document.getElementById("home")?.classList.add("hidden");
    document.getElementById("quiz")?.classList.remove("hidden");
    document.getElementById("quiz-title").textContent = "محاكاة امتحان البكالوريا";
    document.getElementById("exam-review")?.remove();
    ensureExamControls();
    updateExamChrome();
    showQuestion();
    window.scrollTo({top:0,behavior:"smooth"});
    examState.timer = setInterval(() => {
      if (!examState.active) return;
      examState.remaining = Math.max(0, examState.remaining - 1);
      updateExamChrome();
      if (examState.remaining <= 0) finishExam(true);
    }, 1000);
  };
  const recordExamResult = () => {
    const total = quizQuestions.length;
    const correct = quizQuestions.reduce((sum, q, i) => sum + (examState.answers[i] === q.answer ? 1 : 0), 0);
    const topicResults = {};
    quizQuestions.forEach((q, i) => {
      const topic = q.topic || "أبحاث متنوعة";
      if (!topicResults[topic]) topicResults[topic] = { total:0, correct:0 };
      topicResults[topic].total++;
      if (examState.answers[i] === q.answer) topicResults[topic].correct++;
    });
    extras.examHistory = [{ date:new Date().toISOString(), correct, total, topicResults }, ...(extras.examHistory || [])].slice(0, 20);
    persistExtras();
    renderExamHistory();
  };
  const renderExamReview = () => {
    const card = document.querySelector("#results .result-card");
    if (!card) return;
    document.getElementById("exam-review")?.remove();
    const review = document.createElement("section");
    review.id = "exam-review"; review.className = "exam-review";
    const topicResults = new Map();
    quizQuestions.forEach((q, i) => {
      const topic = q.topic || "أبحاث متنوعة";
      const item = topicResults.get(topic) || { total: 0, correct: 0 };
      item.total++;
      if (examState.answers[i] === q.answer) item.correct++;
      topicResults.set(topic, item);
    });
    const totalQuestions = quizQuestions.length;
    const correctAnswers = quizQuestions.reduce((sum, q, i) => sum + (examState.answers[i] === q.answer ? 1 : 0), 0);
    const answeredQuestions = examState.answers.filter(answer => Number.isInteger(answer) && answer >= 0).length;
    const skippedQuestions = Math.max(0, totalQuestions - answeredQuestions);
    const wrongAnswered = Math.max(0, answeredQuestions - correctAnswers);
    const overallRate = totalQuestions ? Math.round(correctAnswers / totalQuestions * 100) : 0;
    const weakestTopic = [...topicResults.entries()]
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))[0]?.[0];
    const resultSummary = `<div class="exam-result-summary" aria-label="ملخص نتيجة المحاكاة">
      <div class="exam-result-summary-main"><span>النتيجة النهائية</span><strong>${correctAnswers.toLocaleString("ar")} / ${totalQuestions.toLocaleString("ar")}</strong><b>${overallRate.toLocaleString("ar")}٪ إجابات صحيحة</b></div>
      <div class="exam-result-metrics">
        <div><span>إجابات صحيحة</span><strong>${correctAnswers.toLocaleString("ar")}</strong></div>
        <div><span>إجابات خاطئة</span><strong>${wrongAnswered.toLocaleString("ar")}</strong></div>
        <div><span>أسئلة متروكة</span><strong>${skippedQuestions.toLocaleString("ar")}</strong></div>
      </div>
      ${weakestTopic ? `<div class="exam-result-next-step"><div><strong>خطوتك التالية</strong><p>ابدأ بالبحث الذي حققت فيه أدنى نسبة: ${escapeHtml(weakestTopic)}.</p></div><button type="button" class="exam-topic-practice" data-exam-topic="${escapeHtml(weakestTopic)}">تدرّب على أضعف بحث <span aria-hidden="true">←</span></button></div>` : ""}
    </div>`;
    const topicSummary = [...topicResults.entries()]
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .map(([topic, stat]) => {
        const rate = Math.round(stat.correct / stat.total * 100);
        const status = rate >= 80 ? "مستوى جيد" : rate >= 50 ? "يحتاج بعض التدريب" : "أولوية للمراجعة";
        const statusClass = rate >= 80 ? "exam-answer-good" : "exam-answer-bad";
        return `<li class="exam-topic-result"><div class="exam-topic-result-heading"><strong>${escapeHtml(topic)}</strong><span class="${statusClass}">${status}</span></div><div class="exam-topic-track" role="progressbar" aria-label="نسبة الإجابات الصحيحة في ${escapeHtml(topic)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${rate}"><span style="width:${rate}%"></span></div><small>${stat.correct.toLocaleString("ar")} صحيحة من ${stat.total.toLocaleString("ar")} · ${rate.toLocaleString("ar")}٪</small><button type="button" class="exam-topic-practice" data-exam-topic="${escapeHtml(topic)}">تدرّب على هذا البحث <span aria-hidden="true">←</span></button></li>`;
      }).join("");
    const rows = quizQuestions.map((q, i) => {
      const chosen = examState.answers[i];
      const correct = chosen === q.answer;
      const chosenText = Number.isInteger(chosen) && chosen >= 0 ? q.options[chosen] : "لم تتم الإجابة";
      return `<li class="exam-review-item">
        <div class="exam-review-title"><strong>السؤال ${i+1} — ${escapeHtml(q.topic || "")}</strong><span class="${correct ? "exam-answer-good" : "exam-answer-bad"}">${correct ? "إجابة صحيحة" : "إجابة غير صحيحة"}</span></div>
        <div class="exam-review-question">${escapeHtml(String(q.q || ""))}</div>
        <p><strong>إجابتك:</strong> ${escapeHtml(String(chosenText))}</p>
        <p><strong>الإجابة الصحيحة:</strong> ${escapeHtml(String(q.options?.[q.answer] ?? ""))}</p>
        <div class="exam-review-solution"><strong>الحل:</strong> ${escapeHtml(String(q.solution || "لا يتوفر شرح لهذا السؤال."))}</div>
      </li>`;
    }).join("");
    review.innerHTML = `${resultSummary}<h3>تحليل نتيجتك حسب البحث</h3><p class="muted">رتّبنا الأبحاث من الأقل أداءً إلى الأعلى لتعرف أين تبدأ المراجعة.</p><ul class="exam-topic-results">${topicSummary}</ul><h3>مراجعة الإجابات والحلول</h3><p class="muted">يمكنك مراجعة إجابتك والإجابة الصحيحة والحل بعد انتهاء المحاكاة.</p><ol class="exam-review-list">${rows}</ol>`;
    const actions = card.querySelector(".actions");
    card.insertBefore(review, actions || null);
    review.querySelectorAll(".exam-topic-practice").forEach(button => {
      button.addEventListener("click", () => {
        const topic = button.dataset.examTopic;
        if (!topic || typeof window.startQuiz !== "function") return;
        document.getElementById("exam-review")?.remove();
        window.startQuiz(topic);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
    typesetMath(review);
  };
  const finishExam = timedOut => {
    if (!examState.active) return;
    if (!timedOut && !confirm("هل تريد تسليم الامتحان الآن؟ ستُحسب الأسئلة غير المجابة إجابات خاطئة.")) return;
    // تُسجل الأسئلة المتروكة عبر مسار التصحيح نفسه لضمان تحديث التقدم والمراجعة.
    for (let i = 0; i < quizQuestions.length; i++) {
      if (examState.answers[i] !== null) continue;
      index = i;
      showQuestion();
      chooseAnswer(-1);
    }
    examState.active = false;
    stopExamTimer();
    examState.resultVisible = true;
    recordExamResult();
    updateExamChrome();
    showResults();
    const detail = document.getElementById("score-detail");
    if (detail) detail.textContent += timedOut ? " · انتهى الوقت، وسُلّمت الإجابات تلقائياً." : " · تم تسليم المحاكاة.";
    renderExamReview();
    const progressReport = document.getElementById("progress-report");
    if (progressReport && !progressReport.hidden) renderProgressReport();
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const originalExamChooseAnswer = window.chooseAnswer;
  if (typeof originalExamChooseAnswer === "function") {
    window.chooseAnswer = function(choice) {
      if (examState.active && examState.answers[index] === null) {
        examState.answers[index] = Number.isInteger(choice) && choice >= 0 ? choice : -1;
      }
      originalExamChooseAnswer(choice);
      if (examState.active) {
        // إخفاء التصحيح الفوري أثناء المحاكاة؛ تظهر الحلول بعد التسليم فقط.
        const feedback = document.getElementById("feedback");
        if (feedback) { feedback.className = "feedback hidden"; feedback.innerHTML = ""; }
        document.querySelectorAll("#options .option").forEach(btn => btn.classList.remove("correct","wrong"));
      }
    };
  }
  const originalExamShowResults = window.showResults;
  if (typeof originalExamShowResults === "function") {
    window.showResults = function() {
      if (examState.active) {
        // The last-question "Next" button reaches showResults() directly rather
        // than finishExam(); record this successful completion path as well.
        examState.active = false;
        stopExamTimer();
        examState.resultVisible = true;
        recordExamResult();
        updateExamChrome();
        originalExamShowResults();
        renderExamReview();
        return;
      }
      originalExamShowResults();
    };
  }
  const originalExamStartQuiz = window.startQuiz;
  if (typeof originalExamStartQuiz === "function") {
    window.startQuiz = function(topic) {
      if (examState.active) { examState.active = false; stopExamTimer(); updateExamChrome(); }
      examState.resultVisible = false;
      document.getElementById("exam-review")?.remove();
      return originalExamStartQuiz(topic);
    };
  }
  document.getElementById("retry")?.addEventListener("click", event => {
    if (!examState.resultVisible) return;
    event.preventDefault(); event.stopImmediatePropagation();
    examState.resultVisible = false;
    startExam();
  }, true);
  document.getElementById("to-home")?.addEventListener("click", () => {
    examState.resultVisible = false;
    examState.active = false;
    stopExamTimer();
    updateExamChrome();
  }, true);
  document.getElementById("back")?.addEventListener("click", event => {
    if (!examState.active) return;
    if (!confirm("المحاكاة ما زالت جارية. هل تريد الخروج دون تسليم؟")) {
      event.preventDefault(); event.stopImmediatePropagation();
      return;
    }
    examState.active = false;
    stopExamTimer();
    updateExamChrome();
  }, true);
  const addExamStyles = () => {
    if (document.getElementById("exam-simulation-styles")) return;
    const style = document.createElement("style");
    style.id = "exam-simulation-styles";
    style.textContent = `
      .exam-tools{margin:14px 0 18px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--card-bg,white)}
      .exam-tools h3{margin:0 0 6px;font-size:20px}.exam-tools .muted,.exam-note{margin:6px 0 0}
      .exam-config{display:flex;align-items:end;gap:12px;flex-wrap:wrap;margin-top:14px}
      .exam-config label{display:grid;gap:6px;min-width:130px;flex:1;font-size:13px;font-weight:600}
      .exam-config select{font:inherit;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--bg,#f7f9fc);color:var(--ink);min-height:42px}
      .exam-config button{min-height:42px}.exam-note{font-size:12px;color:var(--muted)}
      .exam-clock{align-self:center;border:1px solid var(--line);border-radius:10px;padding:8px 11px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;background:var(--card-bg,white);color:var(--ink)}
      .exam-clock-low{border-color:#c2410c;color:#c2410c}
      #exam-submit{margin-inline-end:8px}#exam-submit[hidden],#exam-clock[hidden]{display:none}
      .exam-history{margin:16px 0;padding:14px;border:1px solid var(--line);border-radius:12px}.exam-history>h4{margin:0 0 5px}.exam-history>p{font-size:12px;color:var(--muted)}\n      .exam-history-list{list-style:none;padding:0;margin:10px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}\n      .exam-history-item{padding:12px;border:1px solid var(--line);border-radius:10px}.exam-history-item>div{display:flex;justify-content:space-between;gap:8px}.exam-history-item>div span{font-weight:700}.exam-history-item p,.exam-history-item small{font-size:12px;color:var(--muted);margin:6px 0 0}\n      .exam-review{margin-top:24px;text-align:right}.exam-review h3{font-size:20px;margin:20px 0 6px}
      .exam-result-summary{margin:16px 0 24px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--bg,#f7f9fc)}
      .exam-result-summary-main{display:grid;gap:5px}.exam-result-summary-main>span,.exam-result-metrics>div>span{font-size:12px;color:var(--muted)}
      .exam-result-summary-main>strong{font-size:clamp(24px,4vw,34px);font-variant-numeric:tabular-nums}.exam-result-summary-main>b{font-size:14px;color:var(--success,#2f9e72)}
      .exam-result-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:14px}
      .exam-result-metrics>div{display:grid;gap:5px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card-bg,white)}
      .exam-result-metrics strong{font-size:20px;font-variant-numeric:tabular-nums}
      .exam-result-next-step{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
      .exam-result-next-step p{margin:4px 0 0;font-size:13px;line-height:1.8;color:var(--muted)}
      .exam-result-next-step .exam-topic-practice{margin-top:0;flex-shrink:0}
      body.dark-mode .exam-result-summary{background:var(--card-bg);border-color:var(--line)}
      @media(max-width:600px){.exam-result-summary{padding:13px}.exam-result-metrics{gap:6px}.exam-result-metrics>div{padding:9px 7px}.exam-result-metrics strong{font-size:18px}.exam-result-metrics>div>span{font-size:11px}.exam-result-next-step{align-items:stretch;flex-direction:column}.exam-result-next-step .exam-topic-practice{width:100%}}
      .exam-topic-results{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:14px 0 24px}
      .exam-topic-result{padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card-bg,white)}
      .exam-topic-result>div:first-child{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:13px}
      .exam-topic-result small{display:block;margin-top:7px;color:var(--muted,#718096);font-size:12px}
      .exam-topic-track{height:7px;margin-top:10px;overflow:hidden;border-radius:999px;background:var(--line)}
      .exam-topic-track span{display:block;height:100%;border-radius:inherit;background:var(--success,#2f9e72)}
      .exam-review-list{padding-inline-start:24px;display:grid;gap:12px}.exam-review-item{padding:14px;border:1px solid var(--line);border-radius:12px;overflow-wrap:anywhere}
      .exam-review-title{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}
      .exam-review-question{margin:8px 0;font-size:16px}.exam-review-item p{margin:6px 0}
      .exam-review-solution{padding-top:8px;border-top:1px solid var(--line);margin-top:10px}
      .exam-answer-good{color:var(--success,#2f9e72);font-weight:700}.exam-answer-bad{color:#c2410c;font-weight:700}
      body.dark-mode .exam-tools,body.dark-mode .exam-clock{background:var(--card-bg);color:var(--ink);border-color:var(--line)}
      @media(max-width:640px){.exam-tools{padding:14px}.exam-config{align-items:stretch}.exam-config label{min-width:100%;}.exam-config button{width:100%}.exam-clock{font-size:12px;padding:6px 8px}.exam-review-item{padding:10px}}
    `;
    document.head.appendChild(style);
  };
  addExamStyles();
  addStyles();
  addHomeTools();
  ensureMistakeLog();
  // أنشئ أدوات المحاكاة بعد إنشاء لوحة أدوات الطالب، ولا تعتمد على حدث load وحده.
  ensureExamControls();

  // لا تعرض لوحات المراجعة أو محاكاة الامتحان إلا عند اختيارها من الاختصارات.
  const bindHomePanelToggles = () => {
    document.querySelectorAll("[data-panel-toggle]").forEach(link => {
      if (link.dataset.panelToggleBound === "true") return;
      link.addEventListener("click", event => {
        event.preventDefault();
        const panelId = link.dataset.panelToggle;
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const opening = panel.hidden;
        ["student-tools", "exam-tools"].forEach(id => {
          const other = document.getElementById(id);
          if (other && other !== panel) other.hidden = true;
        });
        document.querySelectorAll("[data-panel-toggle]").forEach(item => {
          item.setAttribute("aria-expanded", String(item === link && opening));
        });
        panel.hidden = !opening;
        if (opening) {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      link.dataset.panelToggleBound = "true";
    });
  };
  bindHomePanelToggles();
  window.addEventListener("load", () => {
    ensureExamControls();
    bindHomePanelToggles();
  });
})();
