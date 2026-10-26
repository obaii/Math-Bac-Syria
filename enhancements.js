/* أدوات الطالب: مراجعة متباعدة، علامات، نسخ احتياطي، وضع ليلي وشرح قابل للتوسع. */
(() => {
  "use strict";
  const EXTRA_KEY = "mathBacSyriaStudentToolsV1";
  const intervalsDays = [1, 3, 7, 14, 30];
  const safeParse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const loadExtras = () => {
    const x = safeParse(localStorage.getItem(EXTRA_KEY), {});
    return { bookmarks: Array.isArray(x.bookmarks) ? x.bookmarks : [], schedule: x.schedule && typeof x.schedule === "object" ? x.schedule : {}, reviewQuestions: x.reviewQuestions && typeof x.reviewQuestions === "object" ? x.reviewQuestions : {}, darkMode: Boolean(x.darkMode) };
  };
  let extras = loadExtras();
  const persistExtras = () => { try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extras)); } catch (_) { alert("تعذر حفظ الإعدادات؛ قد تكون مساحة التخزين ممتلئة."); } };
  const keyOf = q => `${q.topic}::${q.q}`;
  const byKey = key => (typeof questions !== "undefined" ? questions : []).find(q => keyOf(q) === key);
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
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
      .progress-report h4{margin:0 0 10px;font-size:15px}.progress-report-list{display:grid;gap:8px;list-style:none;margin:0;padding:0}
      .progress-report-item{padding:10px;border-radius:9px;background:var(--bg,#f7f9fc)}.progress-report-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px}
      .progress-report-track{height:7px;margin-top:7px;border-radius:99px;background:var(--line);overflow:hidden}.progress-report-track span{display:block;height:100%;background:var(--success,#2f9e72)}
      .key-idea{margin:10px 0;padding:10px 12px;border-right:4px solid #d5a32b;background:#fff8e6;border-radius:8px}
      .solution-steps{padding-right:22px}.offline-status{font-size:12px;margin-top:10px;color:var(--muted)}
      .footer-disclaimer{font-size:12px;color:var(--muted);max-width:800px;margin:8px auto}
      body.dark-mode{--ink:#e7edf8;--muted:#aab8cc;--line:#34445d;--bg:#101827;--card-bg:#182438;--cyan:#243657;background:var(--bg);color:var(--ink)}
      body.dark-mode .top,body.dark-mode .topic-card,body.dark-mode .question-card,body.dark-mode .result-card,body.dark-mode .student-tools,body.dark-mode .option,body.dark-mode .tools-actions button,body.dark-mode .bookmark-toggle{background:var(--card-bg);color:var(--ink);border-color:var(--line)}
      body.dark-mode .tag,body.dark-mode .filter-panel,body.dark-mode .progress-track{background:#24334a;color:var(--ink)}
      body.dark-mode .notice,body.dark-mode .key-idea{background:#3a321d;color:#f8e7b4;border-color:#75602c}
      body.dark-mode footer{background:#0c1320;color:var(--muted)}
      @media(max-width:640px){.student-tools{padding:14px}.tools-actions button{flex:1 1 145px}.bookmark-toggle{width:100%}.guided-list{grid-template-columns:1fr}.question-text{overflow-wrap:anywhere}.options .option{min-height:52px}.actions button{min-height:46px}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
    `;
    document.head.appendChild(style);
  };
  const addHomeTools = () => {
    const home = document.getElementById("home");
    const topicSection = document.getElementById("topic-section");
    if (!home || !topicSection) return;
    const panel = document.createElement("section");
    panel.className = "student-tools";
    panel.innerHTML = `
      <h3>أدوات المراجعة والحفظ</h3>
      <p>صدّر نسخة احتياطية من تقدمك، أو استوردها على جهاز آخر. المراجعة الذكية تعتمد على الأسئلة التي أخطأت بها ومواعيد مراجعتها.</p>
      <div class="tools-actions">
        <button type="button" id="smart-review">المراجعة الذكية المستحقة</button>
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
      <div class="offline-status" id="offline-status" aria-live="polite">جارٍ التحقق من حالة الاتصال...</div>
      <ul class="bookmark-list" id="bookmark-list" hidden></ul>
    `;
    home.insertBefore(panel, topicSection);
    document.getElementById("smart-review").addEventListener("click", startSmartReview);
    document.getElementById("bookmark-review").addEventListener("click", startBookmarkReview);
    document.getElementById("guided-review").addEventListener("click", toggleGuidedQuestionList);
    document.getElementById("progress-report-toggle").addEventListener("click", toggleProgressReport);
    document.getElementById("export-progress").addEventListener("click", exportProgress);
    document.getElementById("import-progress-button").addEventListener("click", () => document.getElementById("import-progress-file").click());
    document.getElementById("import-progress-file").addEventListener("change", importProgress);
    document.getElementById("toggle-dark-mode").addEventListener("click", toggleDarkMode);
    updateBookmarkUI();
    updateGuidedQuestionList();
    applyDarkMode();
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  };
  const toggleProgressReport = () => {
    const report = document.getElementById("progress-report");
    const button = document.getElementById("progress-report-toggle");
    if (!report || !button) return;
    const opening = report.hidden;
    report.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
    if (!opening) return;
    const topicNames = Array.isArray(topics) ? topics : [...new Set((typeof questions !== "undefined" ? questions : []).map(q => q.topic))];
    const questionBank = typeof questions !== "undefined" ? questions : [];
    const stats = typeof progressData !== "undefined" && progressData.topicStats && typeof progressData.topicStats === "object" ? progressData.topicStats : {};
    const rows = topicNames.map(topic => {
      const stat = stats[topic] || { answered: 0, correct: 0 };
      const answered = Number.isFinite(stat.answered) && stat.answered > 0 ? Math.floor(stat.answered) : 0;
      const correct = Number.isFinite(stat.correct) && stat.correct > 0 ? Math.min(Math.floor(stat.correct), answered) : 0;
      const rate = answered ? Math.round(correct / answered * 100) : 0;
      const count = questionBank.filter(q => q.topic === topic).length;
      return { topic, answered, correct, rate, count };
    });
    const totalAttempts = rows.reduce((sum, row) => sum + row.answered, 0);
    const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
    report.innerHTML = `
      <h4>تقرير تقدّمك</h4>
      <p>إجمالي المحاولات المسجّلة: <strong>${totalAttempts.toLocaleString("ar")}</strong> · الإجابات الصحيحة: <strong>${totalCorrect.toLocaleString("ar")}</strong></p>
      <ul class="progress-report-list">${rows.map(row => `
        <li class="progress-report-item">
          <div class="progress-report-top"><strong>${escapeHtml(row.topic)}</strong><span>${row.answered ? `${row.correct.toLocaleString("ar")} صحيحة من ${row.answered.toLocaleString("ar")} محاولة · ${row.rate.toLocaleString("ar")}%` : "لم تبدأ بعد"}</span></div>
          <div class="progress-report-top"><span>${row.count.toLocaleString("ar")} سؤالاً متاحاً</span></div>
          <div class="progress-report-track" role="progressbar" aria-label="نسبة النجاح في ${escapeHtml(row.topic)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.rate}"><span style="width:${row.rate}%"></span></div>
        </li>`).join("")}</ul>`;
  };
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
    persistExtras();
    updateBookmarkUI();
    updateBookmarkButton();
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
    list.hidden = extras.bookmarks.length === 0;
    list.querySelectorAll("[data-bookmark-key]").forEach(btn => btn.addEventListener("click", () => {
      const q = byKey(btn.dataset.bookmarkKey);
      if (q) startTargetedQuiz([q], "المسائل المحفوظة");
    }));
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
  const startBookmarkReview = () => startTargetedQuiz(extras.bookmarks.map(byKey).filter(Boolean), "المسائل المحفوظة");
  const startSmartReview = () => {
    const now = Date.now();
    const dueKeys = [...new Set([...Object.keys(progressData.mistakes), ...Object.keys(extras.schedule)])].filter(k => (!extras.schedule[k] || (extras.schedule[k].due || 0) <= now) && (byKey(k) || extras.reviewQuestions[k]));
    const qs = dueKeys.map(k => byKey(k) || extras.reviewQuestions[k]).filter(Boolean);
    if (!qs.length) { alert("لا توجد أسئلة مستحقة للمراجعة الآن. ستظهر الأسئلة الخاطئة هنا عند حلول موعد مراجعتها."); return; }
    startTargetedQuiz(qs, "المراجعة الذكية");
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
      if (file.size > 2_000_000) throw new Error("حجم الملف أكبر من الحد المسموح.");
      const data = JSON.parse(await file.text());
      if (!data || data.format !== "math-bac-syria-progress" || !data.progress || typeof data.progress !== "object" || Array.isArray(data.progress)) {
        throw new Error("هذا الملف ليس نسخة احتياطية صالحة للمنصة.");
      }
      const source = data.progress;
      const toCount = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
      const nextProgress = {
        answered: toCount(source.answered),
        correct: toCount(source.correct),
        mistakes: {},
        topicStats: {},
        attempts: []
      };
      nextProgress.correct = Math.min(nextProgress.correct, nextProgress.answered);
      const importedMistakes = source.mistakes && typeof source.mistakes === "object" && !Array.isArray(source.mistakes) ? source.mistakes : {};
      for (const key of Object.keys(importedMistakes)) {
        const q = byKey(key);
        if (q) nextProgress.mistakes[key] = { topic:q.topic, q:q.q, options:q.options, answer:q.answer, solution:q.solution, level:q.level };
      }
      const importedStats = source.topicStats && typeof source.topicStats === "object" && !Array.isArray(source.topicStats) ? source.topicStats : {};
      for (const topic of (typeof topics !== "undefined" ? topics : [])) {
        const stat = importedStats[topic];
        if (!stat || typeof stat !== "object") continue;
        const answered = toCount(stat.answered);
        nextProgress.topicStats[topic] = { answered, correct:Math.min(toCount(stat.correct), answered) };
      }
      nextProgress.attempts = Array.isArray(source.attempts) ? source.attempts.slice(0, 100).filter(item =>
        item && typeof item === "object" && typeof item.topic === "string" &&
        (typeof topics === "undefined" || topics.includes(item.topic)) &&
        typeof item.correct === "boolean" && typeof item.date === "string" && !Number.isNaN(Date.parse(item.date))
      ) : [];
      let nextExtras = extras;
      if (data.studentTools && typeof data.studentTools === "object" && !Array.isArray(data.studentTools)) {
        const sourceTools = data.studentTools;
        const schedule = sourceTools.schedule && typeof sourceTools.schedule === "object" && !Array.isArray(sourceTools.schedule) ? sourceTools.schedule : {};
        nextExtras = {
          bookmarks:Array.isArray(sourceTools.bookmarks) ? [...new Set(sourceTools.bookmarks.filter(k => typeof k === "string" && byKey(k)))]:[],
          schedule:{},
          reviewQuestions:{},
          darkMode:Boolean(sourceTools.darkMode)
        };
        for (const key of Object.keys(schedule)) {
          const known = byKey(key);
          const due = Number(schedule[key]);
          if (known && Number.isFinite(due) && due > 0) {
            nextExtras.schedule[key] = due;
            nextExtras.reviewQuestions[key] = known;
          }
        }
      }
      if (!confirm("سيتم استبدال التقدم والعلامات الحالية بالبيانات الموجودة في النسخة الاحتياطية. هل تريد المتابعة؟")) return;
      progressData = nextProgress;
      extras = nextExtras;
      saveProgress();
      persistExtras();
      if (typeof refreshDashboard === "function") refreshDashboard();
      if (typeof renderTopics === "function") renderTopics();
      updateBookmarkUI();
      updateGuidedQuestionList();
      applyDarkMode();
      alert("تم استيراد النسخة الاحتياطية بعد التحقق من بياناتها.");
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
          if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([solution]).catch(()=>{});
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
  addStyles();
  addHomeTools();
})();
