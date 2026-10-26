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
      .key-idea{margin:10px 0;padding:10px 12px;border-right:4px solid #d5a32b;background:#fff8e6;border-radius:8px}
      .solution-steps{padding-right:22px}.offline-status{font-size:12px;margin-top:10px;color:var(--muted)}
      .footer-disclaimer{font-size:12px;color:var(--muted);max-width:800px;margin:8px auto}
      body.dark-mode{--ink:#e7edf8;--muted:#aab8cc;--line:#34445d;--bg:#101827;--card-bg:#182438;--cyan:#243657;background:var(--bg);color:var(--ink)}
      body.dark-mode .top,body.dark-mode .topic-card,body.dark-mode .question-card,body.dark-mode .result-card,body.dark-mode .student-tools,body.dark-mode .option,body.dark-mode .tools-actions button,body.dark-mode .bookmark-toggle{background:var(--card-bg);color:var(--ink);border-color:var(--line)}
      body.dark-mode .tag,body.dark-mode .filter-panel,body.dark-mode .progress-track{background:#24334a;color:var(--ink)}
      body.dark-mode .notice,body.dark-mode .key-idea{background:#3a321d;color:#f8e7b4;border-color:#75602c}
      body.dark-mode footer{background:#0c1320;color:var(--muted)}
      @media(max-width:640px){.student-tools{padding:14px}.tools-actions button{flex:1 1 145px}.bookmark-toggle{width:100%}.question-text{overflow-wrap:anywhere}.options .option{min-height:52px}.actions button{min-height:46px}}
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
        <button type="button" id="export-progress">تصدير التقدم JSON</button>
        <button type="button" id="import-progress-button">استيراد نسخة احتياطية</button>
        <button type="button" id="toggle-dark-mode" aria-pressed="false">تفعيل الوضع الليلي</button>
        <input id="import-progress-file" type="file" accept="application/json,.json" hidden>
      </div>
      <ul class="bookmark-list guided-list" id="guided-question-list" hidden></ul>
      <div class="offline-status" id="offline-status" aria-live="polite">جارٍ التحقق من حالة الاتصال...</div>
      <ul class="bookmark-list" id="bookmark-list" hidden></ul>
    `;
    home.insertBefore(panel, topicSection);
    document.getElementById("smart-review").addEventListener("click", startSmartReview);
    document.getElementById("bookmark-review").addEventListener("click", startBookmarkReview);
    document.getElementById("guided-review").addEventListener("click", toggleGuidedQuestionList);
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
  const applyDarkMode = () => {
    document.body.classList.toggle("dark-mode", extras.darkMode);
    const btn = document.getElementById("toggle-dark-mode");
    if (btn) { btn.textContent = extras.darkMode ? "إيقاف الوضع الليلي" : "تفعيل الوضع الليلي"; btn.setAttribute("aria-pressed", String(extras.darkMode)); }
  };
  const toggleDarkMode = () => { extras.darkMode = !extras.darkMode; persistExtras(); applyDarkMode(); };
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
      if (data.format !== "math-bac-syria-progress" || !data.progress || typeof data.progress !== "object") throw new Error("هذا الملف ليس نسخة احتياطية صالحة للمنصة.");
      if (!confirm("سيتم استبدال التقدم والعلامات الحالية بالبيانات الموجودة في النسخة الاحتياطية. هل تريد المتابعة؟")) return;
      progressData = data.progress;
      const importedMistakes = progressData.mistakes && typeof progressData.mistakes === "object" ? progressData.mistakes : {};
      progressData.mistakes = {};
      for (const key of Object.keys(importedMistakes)) { const q = byKey(key); if (q) progressData.mistakes[key] = { topic:q.topic, q:q.q, options:q.options, answer:q.answer, solution:q.solution, level:q.level }; }
      progressData.topicStats = progressData.topicStats && typeof progressData.topicStats === "object" ? progressData.topicStats : {};
      progressData.attempts = Array.isArray(progressData.attempts) ? progressData.attempts : [];
      progressData.answered = Number(progressData.answered) || 0; progressData.correct = Number(progressData.correct) || 0;
      saveProgress();
      if (data.studentTools && typeof data.studentTools === "object") {
        extras = { bookmarks:Array.isArray(data.studentTools.bookmarks) ? data.studentTools.bookmarks.filter(k => byKey(k)) : [], schedule:data.studentTools.schedule && typeof data.studentTools.schedule === "object" ? data.studentTools.schedule : {}, reviewQuestions:{}, darkMode:Boolean(data.studentTools.darkMode) };
        for (const key of Object.keys(extras.schedule)) { const known = byKey(key); if (known) extras.reviewQuestions[key] = known; else delete extras.schedule[key]; }
        persistExtras();
      }
      if (typeof refreshDashboard === "function") refreshDashboard();
      if (typeof renderTopics === "function") renderTopics();
      updateBookmarkUI(); applyDarkMode();
      alert("تم استيراد النسخة الاحتياطية على هذا الجهاز.");
    } catch (err) { alert("تعذر استيراد الملف: " + err.message); }
    finally { event.target.value = ""; }
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
