/* أدوات الطالب: مراجعة متباعدة، علامات، نسخ احتياطي، وضع ليلي وشرح قابل للتوسع. */
(() => {
  "use strict";
  const EXTRA_KEY = "mathBacSyriaStudentToolsV1";
  const BACKUP_FORMAT = "math-bac-syria-progress";
  const BACKUP_VERSION = 2;
  const intervalsDays = [1, 3, 7, 14, 30];
  const safeParse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const normalizeExamHistory = history => Array.isArray(history) ? history
    .filter(item => isRecord(item)
      && Number.isSafeInteger(item.correct) && item.correct >= 0
      && Number.isSafeInteger(item.total) && item.total > 0
      && item.correct <= item.total
      && typeof item.date === "string"
      && Number.isFinite(Date.parse(item.date)))
    .slice(0, 20)
    .map(item => ({ date:new Date(item.date).toISOString(), correct:item.correct, total:item.total,
      ...(isRecord(item.topicResults) ? { topicResults:item.topicResults } : {}) })) : [];
  const normalizeSchedule = schedule => {
    if (!isRecord(schedule)) return {};
    const normalized = Object.create(null);
    for (const [key, value] of Object.entries(schedule)) {
      if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
      const record = isRecord(value) ? value : { due:value };
      const due = Number(record.due);
      if (!Number.isFinite(due) || due <= 0) continue;
      const rawStage = Number(record.stage);
      const stage = Number.isFinite(rawStage) ? Math.max(0, Math.min(intervalsDays.length - 1, Math.floor(rawStage))) : 0;
      const lastResult = ["wrong", "correct", "pending"].includes(record.lastResult) ? record.lastResult : "pending";
      normalized[key] = { stage, due, lastResult };
    }
    return normalized;
  };
  const loadExtras = () => {
    const parsed = safeParse(localStorage.getItem(EXTRA_KEY), {});
    const x = isRecord(parsed) ? parsed : {};
    return {
      bookmarks: Array.isArray(x.bookmarks) ? x.bookmarks.filter(key => typeof key === "string") : [],
      schedule: normalizeSchedule(x.schedule),
      reviewQuestions: isRecord(x.reviewQuestions) ? x.reviewQuestions : {},
      examHistory: normalizeExamHistory(x.examHistory),
      studyPlan: normalizeStudyPlan(x.studyPlan),
      darkMode: Boolean(x.darkMode),
      textScale: Number.isFinite(x.textScale) ? Math.min(130, Math.max(80, Math.round(x.textScale / 10) * 10)) : 100,
      mathScale: Number.isFinite(x.mathScale) ? Math.min(140, Math.max(80, Math.round(x.mathScale / 10) * 10)) : 100
    };
  };
  // Load the student-tool state before any setup function can render or read it.
  let extras = loadExtras();
  // Keep the expanded/collapsed state while the study plan re-renders after task updates.
  let studyPlanExpanded = false;
  const persistExtras = () => { try { localStorage.setItem(EXTRA_KEY, JSON.stringify(extras)); return true; } catch (_) { alert("تعذر حفظ الإعدادات؛ قد تكون مساحة التخزين ممتلئة."); return false; } };
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
  const calendarDayOrdinal = date => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  function localDateKey(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
  }
  function parseLocalDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }
  function normalizeStudyPlan(value) {
    if (!isRecord(value)) return null;
    const examDate = parseLocalDate(value.examDate);
    const dailyTarget = Number(value.dailyTarget);
    if (!examDate || !Number.isInteger(dailyTarget) || dailyTarget < 5 || dailyTarget > 30) return null;
    const allowedTopics = new Set(typeof topics !== "undefined" && Array.isArray(topics) ? topics : []);
    const normalizeTask = task => isRecord(task)
      && typeof task.id === "string" && task.id.length > 0 && task.id.length <= 180
      && ["practice", "mistakes"].includes(task.kind)
      && (task.kind === "mistakes" || allowedTopics.has(task.topic))
      && Number.isInteger(task.target) && task.target >= 1 && task.target <= 30
      ? { id:task.id, kind:task.kind, topic:task.topic || "", title:String(task.title || "").slice(0,100),
          target:task.target, done:task.done === true }
      : null;
    const days = Array.isArray(value.days) ? value.days.slice(0, 366).filter(day => isRecord(day) && parseLocalDate(day.date)).map(day => ({
      date: day.date,
      tasks: (Array.isArray(day.tasks) ? day.tasks : []).slice(0, 10).map(normalizeTask).filter(Boolean)
    })) : [];
    const pendingTasks = Array.isArray(value.pendingTasks)
      ? value.pendingTasks.slice(0, 1000).map(normalizeTask).filter(Boolean)
      : [];
    return { examDate:localDateKey(examDate), dailyTarget, createdAt:typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt)) ? value.createdAt : new Date().toISOString(),
      lastRebalancedDate:parseLocalDate(value.lastRebalancedDate) ? value.lastRebalancedDate : "", days, pendingTasks,
      completedStudyDays:Array.isArray(value.completedStudyDays) ? [...new Set(value.completedStudyDays.filter(d => parseLocalDate(d)))].slice(-366) : [] };
  }
  const getStudyPriorityTopics = () => {
    const names = Array.isArray(topics) ? topics : [];
    const stats = typeof progressData !== "undefined" && isRecord(progressData.topicStats) ? progressData.topicStats : {};
    const mistakes = typeof progressData !== "undefined" && isRecord(progressData.mistakes) ? Object.values(progressData.mistakes) : [];
    return names.map((topic, order) => {
      const stat = isRecord(stats[topic]) ? stats[topic] : {};
      const answered = Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
      const correct = Number.isSafeInteger(stat.correct) && stat.correct >= 0 ? Math.min(stat.correct, answered) : 0;
      const errorRate = answered ? (answered - correct) / answered : 0;
      const errorCount = mistakes.filter(item => item && item.topic === topic).length;
      return { topic, order, answered, errorCount, score: errorCount * 3 + errorRate * 5 + (answered ? 0 : 1) };
    }).sort((a,b) => b.score - a.score || a.order - b.order);
  };
  const buildStudyPlan = (examDateValue, dailyTargetValue) => {
    const examDate = parseLocalDate(examDateValue);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (!examDate || examDate < today) { alert("اختر تاريخاً اليوم أو في المستقبل."); return; }
    const daysCount = Math.min(366, calendarDayOrdinal(examDate) - calendarDayOrdinal(today) + 1);
    const priorities = getStudyPriorityTopics();
    if (!priorities.length) { alert("لم يتم العثور على أبحاث في بنك المنصة."); return; }
    const dailyTarget = Math.max(5, Math.min(30, Math.round(Number(dailyTargetValue) || 10)));
    const mistakeKeys = typeof progressData !== "undefined" && isRecord(progressData.mistakes)
      ? Object.keys(progressData.mistakes).filter(key => byKey(key)) : [];
    // Keep completion marks only when the task identity and target are unchanged.
    const previousCompletedTasks = new Map([
      ...(extras.studyPlan?.days || []).flatMap(day => Array.isArray(day.tasks) ? day.tasks : []),
      ...(extras.studyPlan?.pendingTasks || [])
    ].filter(task => task && task.done === true && typeof task.id === "string")
      .map(task => [task.id, task.target]));
    studyPlanExpanded = false;
    const days = [];
    for (let offset=0; offset<daysCount; offset++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate()+offset);
      const dateKey = localDateKey(date);
      const topic = priorities[offset % priorities.length].topic;
      const practiceId = "practice-"+dateKey+"-"+encodeURIComponent(topic);
      const tasks = [{ id:practiceId, kind:"practice", topic,
        title:"تدريب على بحث "+topic, target:dailyTarget, done:previousCompletedTasks.get(practiceId) === dailyTarget }];
      if (mistakeKeys.length && offset % 2 === 0) {
        const mistakeId = "mistakes-"+dateKey;
        const mistakeTarget = Math.min(5,mistakeKeys.length);
        tasks.push({ id:mistakeId, kind:"mistakes", topic:"",
          title:"مراجعة الأسئلة الخاطئة", target:mistakeTarget, done:previousCompletedTasks.get(mistakeId) === mistakeTarget });
      }
      days.push({ date:dateKey, tasks });
    }
    extras.studyPlan = { examDate:localDateKey(examDate), dailyTarget, createdAt:new Date().toISOString(),
      lastRebalancedDate:localDateKey(today), days,
      completedStudyDays:days.filter(day => day.tasks.length && day.tasks.every(task => task.done)).map(day => day.date) };
    persistExtras();
    renderStudyPlan();
  };
  const rebalanceStudyPlan = plan => {
    if (!plan || !Array.isArray(plan.days)) return;
    const today = localDateKey(new Date());
    if (plan.lastRebalancedDate === today) return;
    const retainedBacklog = (Array.isArray(plan.pendingTasks) ? plan.pendingTasks : [])
      .filter(task => task && typeof task.id === "string" && task.done === true);
    const pending = new Map((Array.isArray(plan.pendingTasks) ? plan.pendingTasks : [])
      .filter(task => task && typeof task.id === "string" && task.done !== true)
      .map(task => [task.id, task]));
    plan.pendingTasks = retainedBacklog;
    for (const day of plan.days) {
      if (day.date < today) {
        const retained = [];
        for (const task of day.tasks) {
          if (task.done) retained.push(task);
          else pending.set(task.id, task);
        }
        day.tasks = retained;
      }
    }
    const future = plan.days.filter(day => day.date >= today);
    for (const task of pending.values()) {
      // A task already present on a future day must not be duplicated.
      if (future.some(day => day.tasks.some(existing => existing.id === task.id))) continue;
      // Keep the daily task limit intact; overflow remains visible in the backlog
      // and can be distributed as days advance instead of being truncated on reload.
      const destination = future
        .filter(day => day.tasks.length < 10)
        .sort((a, b) => a.tasks.length - b.tasks.length)[0];
      if (destination) destination.tasks.push({ ...task });
      else plan.pendingTasks.push({ ...task });
    }
    plan.lastRebalancedDate = today;
    persistExtras();
  };
  const renderStudyPlan = () => {
    const panel = document.getElementById("study-plan");
    if (!panel) return;
    const plan = extras.studyPlan;
    const today = localDateKey(new Date());
    if (!plan) {
      panel.innerHTML = '<h3>خطة دراستي</h3><p>حدد موعد امتحانك والهدف اليومي، وسنوزّع الأبحاث تلقائياً مع إعطاء أولوية أكبر للأبحاث التي تحتاج إلى تدريب.</p><form id="study-plan-form" class="study-plan-form"><label>موعد الامتحان<input id="study-exam-date" type="date" min="'+today+'" required></label><label>عدد الأسئلة يومياً<input id="study-daily-target" type="number" min="5" max="30" step="5" value="10" required></label><button type="submit">إنشاء خطة دراستي</button></form><p class="study-plan-note">التاريخ تحدده أنت، والخطة محفوظة على هذا الجهاز فقط.</p>';
    } else {
      rebalanceStudyPlan(plan);
      const allTasks = [...plan.days.flatMap(day => day.tasks), ...(plan.pendingTasks || [])];
      const total = allTasks.length;
      const done = allTasks.filter(task => task.done).length;
      const percent = total ? Math.round(done/total*100) : 0;
      const completedDays = plan.days.filter(day => day.tasks.length && day.tasks.every(task => task.done)).length;
      const remainingDays = Math.max(0, calendarDayOrdinal(parseLocalDate(plan.examDate)) - calendarDayOrdinal(new Date()) + 1);
      const todayPlan = plan.days.find(day => day.date === today);
      const allUpcoming = plan.days.filter(day => day.date > today);
      const upcoming = studyPlanExpanded ? allUpcoming : allUpcoming.slice(0,3);
      const upcomingToggleMarkup = allUpcoming.length > 3
        ? '<button type="button" class="study-plan-upcoming-toggle" id="study-plan-upcoming-toggle" aria-controls="study-plan-upcoming" aria-expanded="'+String(studyPlanExpanded)+'">'+(studyPlanExpanded ? "إخفاء الأيام اللاحقة" : "عرض بقية الخطة ("+(allUpcoming.length - 3).toLocaleString("ar")+" أيام)")+'</button>'
        : "";
      const renderDay = (day, label) => '<section class="study-plan-day"><h4>'+label+(day.date ? ' · '+escapeHtml(day.date) : '')+'</h4><ul>'+day.tasks.map(task =>
        '<li><label><input type="checkbox" data-study-task="'+escapeHtml(task.id)+'" '+(task.done?'checked':'')+'><span><strong>'+escapeHtml(task.title)+'</strong><small>'+(task.kind==="practice" ? task.target+" سؤالاً" : "حتى "+task.target+" أسئلة")+'</small></span></label><button type="button" data-study-open="'+task.kind+'" data-study-topic="'+escapeHtml(task.topic || "")+'" data-study-target="'+task.target+'">'+(task.kind==="practice" ? "ابدأ التدريب" : "افتح المراجعة")+'</button></li>'
      ).join("")+'</ul></section>';
      const dueReviewCount = getScheduledReviews().filter(item => item.due <= Date.now()).length;
      const dueReviewTask = dueReviewCount ? '<section class="study-plan-day study-plan-due-review"><h4>مراجعة ذكية مستحقة اليوم</h4><p>لديك '+dueReviewCount.toLocaleString("ar")+' سؤالاً حان موعد مراجعته. أُضيفت هذه المهمة تلقائياً من جدول المراجعة دون إنشاء مهام مكررة أو تغيير إنجازاتك السابقة.</p><button type="button" id="study-plan-due-review">ابدأ مراجعة الأسئلة المستحقة</button></section>' : '<p class="study-plan-note">لا توجد مراجعات متباعدة مستحقة اليوم.</p>';
      const editDateValue = plan.examDate < today ? today : plan.examDate;
      panel.innerHTML = '<div class="study-plan-heading"><div><h3>خطة دراستي</h3><p>موعد الامتحان: <strong>'+escapeHtml(plan.examDate)+'</strong></p></div><button type="button" id="study-plan-edit" aria-controls="study-plan-edit-form" aria-expanded="false">تعديل الخطة</button></div><form id="study-plan-edit-form" class="study-plan-form study-plan-edit-form" hidden><label for="study-plan-edit-date">موعد الامتحان الجديد<input id="study-plan-edit-date" type="date" min="'+today+'" value="'+escapeHtml(editDateValue)+'" required></label><label for="study-plan-edit-target">عدد الأسئلة يومياً<input id="study-plan-edit-target" type="number" min="5" max="30" step="5" value="'+plan.dailyTarget+'" required></label><div class="study-plan-edit-actions"><button type="submit">حفظ التعديلات</button><button type="button" id="study-plan-edit-cancel" class="study-plan-cancel">إلغاء</button></div><p class="study-plan-note">ستُحفظ المهام المكتملة المطابقة، وتُعاد جدولة المهام التي تغيرت.</p></form><div class="study-plan-metrics"><div><strong>'+remainingDays.toLocaleString("ar")+'</strong><span>يوماً متبقياً</span></div><div><strong>'+percent.toLocaleString("ar")+'٪</strong><span>إنجاز الخطة</span></div><div><strong>'+completedDays.toLocaleString("ar")+'</strong><span>أيام مكتملة</span></div></div><div class="study-plan-track" role="progressbar" aria-label="نسبة إنجاز خطة الدراسة" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+(todayPlan ? renderDay(todayPlan,"مهام اليوم") : '<p>انتهت أيام الخطة المحددة. يمكنك تعديل موعد الامتحان لإنشاء جدول جديد.</p>')+(plan.pendingTasks?.length ? renderDay({ date:"", tasks:plan.pendingTasks },"مهام متراكمة تحتاج إلى توزيع") : "")+dueReviewTask+'<div id="study-plan-upcoming">'+upcoming.map((day,index)=>renderDay(day,"اليوم القادم "+(index+1))).join("")+'</div>'+upcomingToggleMarkup+'<p class="study-plan-note">تُعاد جدولة المهام غير المكتملة تلقائياً عند فوات يوم، مع الاحتفاظ بالمهام التي أنجزتها. تُعطى الأولوية للأبحاث التي يظهر فيها عدد أكبر من الأخطاء أو دقة أقل.</p>';
      const dueReviewButton = document.getElementById("study-plan-due-review");
      if (dueReviewButton) dueReviewButton.addEventListener("click", startSmartReview);
       const upcomingToggle = document.getElementById("study-plan-upcoming-toggle");
       if (upcomingToggle) upcomingToggle.addEventListener("click", () => {
         studyPlanExpanded = !studyPlanExpanded;
         renderStudyPlan();
         document.getElementById("study-plan-upcoming-toggle")?.focus();
       });
      const edit = document.getElementById("study-plan-edit");
      const editForm = document.getElementById("study-plan-edit-form");
      const editDate = document.getElementById("study-plan-edit-date");
      const editTarget = document.getElementById("study-plan-edit-target");
      const cancelEdit = document.getElementById("study-plan-edit-cancel");
      if (edit && editForm) edit.addEventListener("click", () => {
        editForm.hidden = false;
        edit.hidden = true;
        edit.setAttribute("aria-expanded", "true");
        editDate?.focus();
      });
      if (cancelEdit && editForm && edit) cancelEdit.addEventListener("click", () => {
        editForm.hidden = true;
        edit.hidden = false;
        edit.setAttribute("aria-expanded", "false");
        edit.focus();
      });
      if (editForm) editForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!editForm.reportValidity()) return;
        if (!confirm("سيُعاد توزيع مهام الخطة وفق التاريخ والهدف الجديدين. ستبقى علامات إنجاز المهام المطابقة كما هي، أما المهام التي تغيّر هدفها أو موعدها فستبدأ من جديد. هل تريد المتابعة؟")) return;
        buildStudyPlan(editDate.value, editTarget.value);
        // The form is replaced during rendering; return focus to the plan editor control.
        document.getElementById("study-plan-edit")?.focus();
      });
    }
    const form = document.getElementById("study-plan-form");
    if (form) form.addEventListener("submit", event => {
      event.preventDefault();
      buildStudyPlan(document.getElementById("study-exam-date").value, document.getElementById("study-daily-target").value);
      // Move focus to the newly rendered plan controls after creating the plan.
      document.getElementById("study-plan-edit")?.focus();
    });
    panel.querySelectorAll("[data-study-task]").forEach(input => input.addEventListener("change", () => {
      const taskId = input.dataset.studyTask;
      for (const day of extras.studyPlan.days) {
        const task = day.tasks.find(item => item.id === taskId);
        if (task) task.done = input.checked;
      }
      const pendingTask = (extras.studyPlan.pendingTasks || []).find(item => item.id === taskId);
      if (pendingTask) pendingTask.done = input.checked;
      extras.studyPlan.completedStudyDays = extras.studyPlan.days.filter(day => day.tasks.length && day.tasks.every(task => task.done)).map(day => day.date);
      persistExtras();
      renderStudyPlan();
      // Re-rendering the plan replaces its controls; restore keyboard focus to the task just changed.
      const nextFocus = Array.from(panel.querySelectorAll("[data-study-task]"))
        .find(item => item.dataset.studyTask === taskId);
      if (nextFocus) nextFocus.focus();
    }));
    panel.querySelectorAll("[data-study-open]").forEach(button => button.addEventListener("click", () => {
      if (button.dataset.studyOpen === "practice") {
        if (typeof startQuiz === "function" && button.dataset.studyTopic) startQuiz(button.dataset.studyTopic);
        return;
      }
      const mistakeMap = typeof progressData !== "undefined" && isRecord(progressData.mistakes) ? progressData.mistakes : {};
      const missed = Object.keys(mistakeMap).map(byKey).filter(q => typeof isSupportedQuestion === "function" ? isSupportedQuestion(q) : q && Array.isArray(q.options) && q.options.length === 4).slice(0, Math.max(1, Number(button.dataset.studyTarget) || 5));
      if (missed.length && typeof startTargetedQuiz === "function") startTargetedQuiz(missed, "مراجعة أخطاء الخطة");
      else alert("لا توجد أخطاء محفوظة للمراجعة حالياً. واصل التدريب لتحديث هذه المهمة.");
    }));
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
      .study-rhythm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:12px}
      .study-rhythm>div{padding:10px;border-radius:9px;background:var(--bg,#f7f9fc);text-align:center}
      .study-rhythm strong{display:block;font-size:22px;color:var(--primary,#315edb)}
      .study-rhythm span{display:block;margin-top:4px;color:var(--muted);font-size:12px}
      body.dark-mode .study-rhythm>div{background:var(--card-bg)}
      @media(max-width:420px){.study-rhythm{grid-template-columns:1fr}}
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
      .study-plan{margin-top:12px;padding:15px;border:1px solid var(--line);border-radius:12px;background:var(--card-bg,white)}
      .study-plan h3{margin:0 0 6px}.study-plan p{line-height:1.8}.study-plan-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end}
      .study-plan-form label{display:grid;gap:6px;font-size:13px}.study-plan-form input{font:inherit;min-width:0;width:100%;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--bg,#fff);color:var(--ink);min-height:42px}
      .study-plan button{font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--card-bg,white);color:var(--ink);cursor:pointer;min-height:42px}
       .study-plan-upcoming-toggle{display:block;width:100%;margin-top:12px;font-weight:700}
       .study-plan-upcoming-toggle:focus-visible{outline:3px solid var(--focus-ring,#8aa8ff);outline-offset:3px}
      .study-plan-heading,.study-plan-metrics{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.study-plan-metrics{margin:12px 0}.study-plan-metrics>div{display:grid;gap:3px;padding:10px;border:1px solid var(--line);border-radius:10px;min-width:100px}.study-plan-metrics strong{font-size:20px}.study-plan-metrics span,.study-plan-day small,.study-plan-note{font-size:12px;color:var(--muted)}
      .study-plan-track{height:9px;border-radius:99px;overflow:hidden;background:var(--line);margin:12px 0 16px}.study-plan-track span{display:block;height:100%;background:var(--success,#2f9e72)}
      .study-plan-day{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:10px}.study-plan-day h4{margin:0 0 8px}.study-plan-day ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}.study-plan-day li label{display:flex;align-items:flex-start;gap:9px;cursor:pointer}.study-plan-day input{margin-top:5px;flex:0 0 auto}.study-plan-day li span{display:grid;gap:3px}.study-plan-note{margin-top:12px}
      body.dark-mode .study-plan{background:var(--card-bg);border-color:var(--line)}body.dark-mode .study-plan-form input{background:#101827;color:var(--ink);border-color:var(--line)}
      @media(max-width:640px){.study-plan{padding:12px}.study-plan-heading{align-items:stretch;flex-direction:column}.study-plan-heading button{width:100%}.study-plan-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.study-plan-metrics>div{min-width:0;padding:8px}.study-plan-metrics strong{font-size:17px}}
      .review-plan{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:12px}
      .review-plan h4{margin:0 0 8px;font-size:15px}.review-plan>p{line-height:1.8}
      .review-plan-group{margin-top:12px}.review-plan-group h4{display:flex;justify-content:space-between;gap:8px}
      .review-plan-group h4 span{font-size:12px;color:var(--muted)}
      .review-plan-list{display:grid;gap:7px;list-style:none;margin:8px 0;padding:0}
      .review-plan-item{padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--bg,#f7f9fc)}
      .review-plan-item p{margin:5px 0;line-height:1.8;overflow-wrap:anywhere}
      .review-plan-item small,.review-plan-empty{color:var(--muted);font-size:12px}
      .review-plan-summary{grid-template-columns:repeat(4,minmax(0,1fr));margin:12px 0}
      .study-plan-due-review p{font-size:13px;line-height:1.8}
      body.dark-mode .review-plan-item{background:var(--card-bg);border-color:var(--line)}
      @media(max-width:640px){.review-plan-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
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
      .error-analysis-disclosure{margin:8px 0;color:var(--muted);font-size:12px;line-height:1.8}
      .error-analysis-summary{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      .error-analysis-chip{display:inline-flex;padding:5px 9px;border:1px solid var(--line);border-radius:999px;background:var(--bg,#f7f9fc);font-size:12px}
      .error-analysis-filter-label{display:block;margin:12px 0 5px;font-size:13px;font-weight:700}
      .error-analysis-filter{width:100%;min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card-bg);color:var(--ink);font:inherit}
      .error-analysis-reason{margin:0 0 9px;color:var(--muted);font-size:12px;line-height:1.7}
      .error-analysis-empty{padding:10px;color:var(--muted);font-size:13px}
      .error-reflection{margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card-bg)}
      .error-reflection>p{margin:5px 0 9px;color:var(--muted);font-size:12px;line-height:1.8}
      .error-reflection-options{display:flex;flex-wrap:wrap;gap:7px}
      .error-reflection-options button{min-height:44px;padding:8px 11px;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);font:inherit;font-size:13px;cursor:pointer}
      .error-reflection-options button:focus-visible,.error-analysis-filter:focus-visible{outline:3px solid var(--focus,#2563eb);outline-offset:2px}
      .error-reflection-options button[aria-pressed=true]{border-color:var(--success,#2f9e72);background:var(--success-soft,#e8f7ef)}
      .error-reflection-options button:disabled{opacity:.75;cursor:default}
      .error-reflection-status{display:block;margin-top:8px;color:var(--muted);font-size:12px}
      .remediation-plan{margin:14px 0;padding:13px;border:1px solid var(--line);border-radius:12px;background:var(--card-bg)}
      .remediation-plan h5{margin:0 0 6px;font-size:15px}
      .remediation-plan>p{margin:0 0 10px;color:var(--muted);font-size:12px;line-height:1.8}
      .remediation-plan-list{display:grid;gap:9px}
      .remediation-plan-item{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--bg,#f7f9fc)}
      .remediation-plan-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .remediation-plan-heading span{min-width:28px;padding:3px 8px;border-radius:999px;background:var(--card-bg);border:1px solid var(--line);text-align:center;font-size:12px}
      .remediation-plan-evidence{margin:4px 0;color:var(--muted);font-size:11px}
      .remediation-plan-item>p:not(.remediation-plan-evidence){margin:5px 0 10px;font-size:13px;line-height:1.8}
      .remediation-plan-actions{display:flex;flex-wrap:wrap;gap:7px}
      .remediation-plan-actions button{min-height:42px;padding:7px 11px;border:1px solid var(--line);border-radius:8px;background:var(--card-bg);color:var(--ink);font:inherit;font-size:12px;cursor:pointer}
      .remediation-plan-actions button:focus-visible{outline:3px solid var(--focus,#2563eb);outline-offset:2px}
      .remediation-plan-actions [data-remediation-reason]{background:var(--accent,#3154b5);color:white;border-color:transparent}
      body.dark-mode .remediation-plan-item{background:var(--bg);border-color:var(--line)}
      @media(max-width:640px){.remediation-plan-actions{display:grid;grid-template-columns:1fr}.remediation-plan-actions button{width:100%}}
      body.dark-mode .error-reflection-options button[aria-pressed=true]{background:#123b2b;color:#c7f9df}
      @media(max-width:640px){.error-reflection-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.error-reflection-options button{overflow-wrap:anywhere}.error-analysis-chip{max-width:100%}}
      .solution{margin-top:14px;padding:15px;border:1px solid var(--line);border-radius:14px;background:var(--card-bg,white);line-height:1.9}
      .solution-heading{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--line)}
      .solution-heading>span{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border-radius:10px;background:#eaf0ff;color:#3154b5;font-size:19px}
      .solution-heading>div{display:grid;gap:1px}.solution-heading strong{font-size:15px}.solution-heading small{color:var(--muted);font-size:11px}
      .key-idea{margin:0 0 13px;padding:12px 14px;border-right:4px solid #d5a32b;background:#fff8e6;border-radius:10px}
      .key-idea strong{display:block;margin-bottom:4px;color:#795b13;font-size:12px}.key-idea p{margin:0;line-height:1.9}
      .solution-steps{display:grid;gap:9px;list-style:none;counter-reset:solution-step;margin:12px 0 0;padding:0}
      .solution-steps li{position:relative;counter-increment:solution-step;min-height:44px;padding:10px 48px 10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg,#f7f9fc);line-height:1.9;overflow-wrap:anywhere}
      .solution-steps li::before{content:counter(solution-step,arabic-indic);position:absolute;right:10px;top:10px;display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:#e7efff;color:#3154b5;font-size:12px;font-weight:800}
      .solution-existing-content{padding:4px 2px;line-height:2;overflow-wrap:anywhere}
      .solution-note{margin:10px 0 0;padding:9px 11px;border-radius:9px;background:var(--bg,#f7f9fc);color:var(--muted);font-size:11px;line-height:1.8}
      body.dark-mode .solution{background:var(--card-bg);border-color:var(--line)}
      body.dark-mode .solution-heading>span{background:#293d60;color:#c5d5ff}
      body.dark-mode .key-idea{background:#3a321d;color:#f8e7b4;border-color:#b58a2b}
      body.dark-mode .key-idea strong{color:#ffdf91}
      body.dark-mode .solution-steps li,body.dark-mode .solution-note{background:#111d30;border-color:var(--line)}
      body.dark-mode .solution-steps li::before{background:#293d60;color:#c5d5ff}
      @media(max-width:640px){.solution{padding:12px}.solution-steps{gap:7px}.solution-steps li{padding:9px 44px 9px 9px}}
      .offline-status{font-size:12px;margin-top:10px;color:var(--muted)}
      .footer-disclaimer{font-size:12px;color:var(--muted);max-width:800px;margin:8px auto}
      body.dark-mode{--ink:#e7edf8;--muted:#aab8cc;--line:#34445d;--bg:#101827;--card-bg:#182438;--cyan:#243657;background:var(--bg);color:var(--ink)}
      body.dark-mode .top,body.dark-mode .topic-card,body.dark-mode .question-card,body.dark-mode .result-card,body.dark-mode .student-tools,body.dark-mode .option,body.dark-mode .tools-actions button,body.dark-mode .bookmark-toggle{background:var(--card-bg);color:var(--ink);border-color:var(--line)}
      body.dark-mode .tag,body.dark-mode .filter-panel,body.dark-mode .progress-track{background:#24334a;color:var(--ink)}
      body.dark-mode .notice,body.dark-mode .key-idea{background:#3a321d;color:#f8e7b4;border-color:#75602c}
      body.dark-mode footer{background:#0c1320;color:var(--muted)}
      @media(max-width:640px){.student-tools{padding:14px}.tools-actions button{flex:1 1 145px}.bookmark-toggle{width:100%}.question-text{overflow-wrap:anywhere}.options .option{min-height:52px}.actions button{min-height:46px}}
      @media(max-width:640px){.student-tools{padding:14px}.tools-actions button{flex:1 1 145px}.bookmark-toggle{width:100%}.guided-list{grid-template-columns:1fr}.question-text{overflow-wrap:anywhere}.options .option{min-height:52px}.actions button{min-height:46px}}
      .reading-settings{margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--bg,#f7f9fc)}
      .reading-settings h4{margin:0 0 10px;font-size:15px}
      .reading-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .reading-control{display:grid;gap:7px;min-width:0}
      .reading-control label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:700}
      .reading-control output{color:var(--primary,#315edb);font-variant-numeric:tabular-nums}
      .reading-control input{width:100%;min-height:32px;accent-color:var(--primary,#315edb);cursor:pointer}
      .reading-settings>p{margin:8px 0 0!important;font-size:12px!important}
      body{font-size:calc(16px * var(--reading-scale,1))}
      .question-text{font-size:calc(18px * var(--reading-scale,1))!important}
      .options .option{font-size:calc(15px * var(--reading-scale,1))!important}
      .feedback,.solution,.key-idea,.notice{font-size:calc(14px * var(--reading-scale,1))!important}
      .topic-card{font-size:calc(14px * var(--reading-scale,1))}
      .dashboard-intro p,.learning-progress p,.quick-start-copy small,.stat-label{font-size:calc(13px * var(--reading-scale,1))}
      mjx-container{font-size:calc(100% * var(--math-scale,1))!important}
      @media(max-width:640px){.reading-settings-grid{grid-template-columns:1fr}.reading-control input{min-height:40px}}
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
        <p>تتضمن النسخة الاحتياطية تقدمك وإجاباتك المحفوظة والاختبارات والعلامات المرجعية وجدول المراجعة وخيارات العرض. يمكنك نقلها إلى جهاز آخر؛ راجع ملخص الملف قبل تأكيد الاستيراد.</p>
        <div class="tools-actions">
          <button type="button" id="smart-review">المراجعة الذكية المستحقة</button>
          <button type="button" id="review-assistant-generate" aria-controls="review-assistant-panel">مساعد المراجعة الذكي</button>
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
        <section id="review-assistant-panel" class="review-assistant-panel" aria-labelledby="review-assistant-title" aria-live="polite" hidden>
          <h4 id="review-assistant-title">خطة مراجعتك الشخصية</h4>
          <p class="review-assistant-disclosure">تُحلّل المنصة تقدمك على جهازك. تُنشأ خطة المراجعة محلياً على جهازك، ولا تُرسل بياناتك إلى أي خادم.</p>
          <p id="review-assistant-status" role="status">ستظهر هنا توصيات مراجعة مبنية على أدائك.</p>
          <div id="review-assistant-output" class="review-assistant-output"></div>
        </section>
        <div class="offline-status" id="offline-status" aria-live="polite">جارٍ التحقق من حالة الاتصال...</div>
        <ul class="bookmark-list" id="bookmark-list" hidden></ul>
      `;
      home.insertBefore(panel, topicSection);
    }
    // Existing HTML may already contain the panel but omit newer controls.
    // Ensure required nodes exist before binding; a missing node must never abort all tools.
    const actions = panel.querySelector(".tools-actions");
    if (actions && !document.getElementById("reading-settings")) {
      const settings = document.createElement("section");
      settings.id = "reading-settings";
      settings.className = "reading-settings";
      settings.setAttribute("aria-labelledby", "reading-settings-title");
      settings.innerHTML = "<h4 id='reading-settings-title'>إعدادات القراءة</h4>" +
        "<div class='reading-settings-grid'>" +
        "<div class='reading-control'><label for='text-scale'>حجم النص <output id='text-scale-value' for='text-scale'>100٪</output></label><input id='text-scale' type='range' min='80' max='130' step='10' value='100' aria-describedby='reading-settings-help'></div>" +
        "<div class='reading-control'><label for='math-scale'>حجم المعادلات <output id='math-scale-value' for='math-scale'>100٪</output></label><input id='math-scale' type='range' min='80' max='140' step='10' value='100' aria-describedby='reading-settings-help'></div>" +
        "</div><p id='reading-settings-help'>يمكنك تكبير النصوص والمعادلات أو تصغيرها بشكل مستقل. يُحفظ اختيارك على هذا الجهاز.</p>";
      actions.insertAdjacentElement("afterend", settings);
    }
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
    if (actions && !document.getElementById("study-plan-toggle")) {
      const studyButton = document.createElement("button");
      studyButton.type = "button"; studyButton.id = "study-plan-toggle";
      studyButton.setAttribute("aria-expanded", "false"); studyButton.textContent = "خطة دراستي";
      actions.appendChild(studyButton);
    }
    if (!document.getElementById("study-plan")) {
      const studyPanel = document.createElement("section");
      studyPanel.className = "study-plan"; studyPanel.id = "study-plan";
      studyPanel.setAttribute("aria-live", "polite"); studyPanel.hidden = true;
      const reviewPanel = document.getElementById("review-plan");
      if (reviewPanel && reviewPanel.parentNode) reviewPanel.insertAdjacentElement("afterend", studyPanel);
      else panel.appendChild(studyPanel);
    }
    const studyToggle = document.getElementById("study-plan-toggle");
    if (studyToggle && studyToggle.dataset.enhancementBound !== "true") {
      studyToggle.addEventListener("click", () => {
        const section = document.getElementById("study-plan");
        if (!section) return;
        section.hidden = !section.hidden;
        studyToggle.setAttribute("aria-expanded", String(!section.hidden));
        if (!section.hidden) { renderStudyPlan(); section.scrollIntoView({behavior:"smooth",block:"nearest"}); }
      });
      studyToggle.dataset.enhancementBound = "true";
    }
    if (!document.getElementById("review-plan")) {
      const plan = document.createElement("section");
      plan.className = "review-plan"; plan.id = "review-plan";
      plan.setAttribute("aria-live", "polite"); plan.hidden = true;
      const report = document.getElementById("progress-report");
      if (report && report.parentNode) report.insertAdjacentElement("afterend", plan);
      else panel.appendChild(plan);
    }
    if (actions && !document.getElementById("review-assistant-generate")) {
      const reviewButton = document.createElement("button");
      reviewButton.type = "button";
      reviewButton.id = "review-assistant-generate";
      reviewButton.setAttribute("aria-controls", "review-assistant-panel");
      reviewButton.textContent = "مساعد المراجعة الذكي";
      actions.appendChild(reviewButton);
    }
    if (!document.getElementById("review-assistant-panel")) {
      const reviewAssistant = document.createElement("section");
      reviewAssistant.id = "review-assistant-panel";
      reviewAssistant.className = "review-assistant-panel";
      reviewAssistant.setAttribute("aria-labelledby", "review-assistant-title");
      reviewAssistant.setAttribute("aria-live", "polite");
      reviewAssistant.hidden = true;
      reviewAssistant.innerHTML = "<h4 id=\"review-assistant-title\">خطة مراجعتك الشخصية</h4><p class=\"review-assistant-disclosure\">تُحلّل المنصة تقدمك على جهازك. تُنشأ خطة المراجعة محلياً على جهازك، ولا تُرسل بياناتك إلى أي خادم.</p><p id=\"review-assistant-status\" role=\"status\">ستظهر هنا توصيات مراجعة مبنية على أدائك.</p><div id=\"review-assistant-output\" class=\"review-assistant-output\"></div>";
      const report = document.getElementById("progress-report");
      if (report && report.parentNode) report.insertAdjacentElement("afterend", reviewAssistant);
      else panel.appendChild(reviewAssistant);
    }
    if (!document.getElementById("intensive-training")) {
      const training = document.createElement("section");
      training.id = "intensive-training";
      training.className = "intensive-training-panel";
      training.setAttribute("aria-labelledby", "intensive-training-title");

      training.innerHTML = "<h4 id='intensive-training-title'>التدريب المكثّف</h4>" +
        "<p>أنشئ جلسة مركّزة من ١٠ أو ٢٠ أو ٣٠ سؤالاً، واختر مصدر الأسئلة بحسب هدفك.</p>" +
        "<div class='intensive-training-options' style='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end'>" +
        "<label for='intensive-training-focus'>مصدر الأسئلة<select id='intensive-training-focus' style='display:block;width:100%;min-height:42px;margin-top:5px'><option value='all'>كامل بنك الأسئلة</option><option value='weak'>الأبحاث الأضعف في أدائي</option><option value='mistakes'>الأسئلة التي أخطأت بها</option></select></label>" +
        "<label for='intensive-training-count'>عدد الأسئلة<select id='intensive-training-count' style='display:block;width:100%;min-height:42px;margin-top:5px'><option value='10'>١٠ أسئلة</option><option value='20'>٢٠ سؤالاً</option><option value='30'>٣٠ سؤالاً</option></select></label>" +
        "</div><button type='button' id='intensive-training-start'>ابدأ التدريب المكثّف ←</button>" +
        "<p id='intensive-training-status' role='status' aria-live='polite'>اختر نوع التدريب وعدد الأسئلة لبدء جلسة جديدة.</p>";
      const assistantPanel = document.getElementById("review-assistant-panel");
      if (assistantPanel && assistantPanel.parentNode) assistantPanel.insertAdjacentElement("afterend", training);
      else panel.appendChild(training);
    }
    const bindClick = (id, handler) => {
      const element = document.getElementById(id);
      if (!element || element.dataset.enhancementBound === "true") return;
      element.addEventListener("click", handler);
      element.dataset.enhancementBound = "true";
    };
    bindClick("smart-review", startSmartReview);
    bindClick("intensive-training-start", startIntensiveTraining);
    bindClick("review-assistant-generate", runReviewAssistant);
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
    bindReadingSettings();
    updateBookmarkUI();
    updateGuidedQuestionList();
    applyDarkMode();
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  };
  const renderDashboardWeeklySummary = () => {
    const panel = document.getElementById("dashboard-weekly-summary");
    if (!panel) return;
    const attempts = Array.isArray(progressData?.attempts) ? progressData.attempts : [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const dayKey = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
    const days = Array.from({length:7}, (_, index) => {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()+index);
      return { date, key:dayKey(date), count:0 };
    });
    const dayMap = new Map(days.map(day => [day.key, day]));
    const weekly = attempts.filter(item => {
      const date = new Date(item && item.date);
      if (Number.isNaN(date.getTime()) || date < weekStart || date >= new Date(todayStart.getTime()+86400000)) return false;
      const day = dayMap.get(dayKey(date));
      if (day) day.count++;
      return true;
    });
    const correct = weekly.filter(item => item.correct === true).length;
    const activeDays = days.filter(day => day.count > 0).length;
    const accuracy = weekly.length ? Math.round(correct / weekly.length * 100) : null;
    const topicMap = new Map();
    weekly.forEach(item => {
      const topic = typeof item.topic === "string" && item.topic.trim() ? item.topic.trim() : "بحث غير محدد";
      const record = topicMap.get(topic) || { topic, total:0, correct:0 };
      record.total++;
      if (item.correct === true) record.correct++;
      topicMap.set(topic, record);
    });
    const topicRows = [...topicMap.values()].filter(row => row.total >= 2);
    const best = [...topicRows].sort((a,b) => (b.correct/b.total)-(a.correct/a.total) || b.total-a.total || a.topic.localeCompare(b.topic,"ar"))[0];
    const focus = [...topicRows].filter(row => row.correct < row.total)
      .sort((a,b) => (a.correct/a.total)-(b.correct/b.total) || (b.total-b.correct)-(a.total-a.correct) || b.total-a.total || a.topic.localeCompare(b.topic,"ar"))[0];
    const attemptsNode = document.getElementById("dashboard-weekly-attempts");
    const accuracyNode = document.getElementById("dashboard-weekly-accuracy");
    const daysNode = document.getElementById("dashboard-weekly-days");
    if (attemptsNode) attemptsNode.textContent = weekly.length.toLocaleString("ar");
    if (accuracyNode) accuracyNode.textContent = accuracy === null ? "—" : accuracy.toLocaleString("ar")+"٪";
    if (daysNode) daysNode.textContent = activeDays.toLocaleString("ar");
    const period = document.getElementById("dashboard-weekly-period");
    if (period) period.textContent = days[0].date.toLocaleDateString("ar-SY",{day:"numeric",month:"short"})+" – "+days[6].date.toLocaleDateString("ar-SY",{day:"numeric",month:"short"});
    const chart = document.getElementById("dashboard-weekly-chart");
    if (chart) {
      const maxCount = Math.max(1,...days.map(day=>day.count));
      chart.innerHTML = days.map(day => {
        const height = day.count ? Math.max(8,Math.round(day.count/maxCount*100)) : 0;
        const label = day.date.toLocaleDateString("ar-SY",{weekday:"short"});
        return '<div class="dashboard-weekly-day" aria-label="'+escapeHtml(label)+': '+day.count.toLocaleString("ar")+' محاولات"><span class="dashboard-weekly-bar-track"><span class="dashboard-weekly-bar" style="height:'+height+'%"></span></span><strong>'+day.count.toLocaleString("ar")+'</strong><small>'+escapeHtml(label)+'</small></div>';
      }).join("");
    }
    const bestNode = document.getElementById("dashboard-weekly-best");
    const focusNode = document.getElementById("dashboard-weekly-focus");
    if (bestNode) bestNode.textContent = best
      ? "أقوى أبحاثك هذا الأسبوع: "+best.topic+" — دقة "+Math.round(best.correct/best.total*100).toLocaleString("ar")+"٪ من "+best.total.toLocaleString("ar")+" محاولات."
      : "سيظهر البحث الأقوى بعد تسجيل محاولتين على الأقل في أحد الأبحاث.";
    if (focusNode) focusNode.textContent = focus
      ? "أولوية التدريب: "+focus.topic+" — "+(focus.total-focus.correct).toLocaleString("ar")+" إجابات تحتاج إلى مراجعة هذا الأسبوع."
      : "ستظهر أولوية التدريب عند وجود إجابات غير صحيحة ضمن بحث جُرّبت أسئلته مرتين على الأقل.";
    const action = document.getElementById("dashboard-weekly-focus-start");
    if (action) {
      action.hidden = !focus;
      action.onclick = focus && typeof startQuiz === "function" ? () => startQuiz(focus.topic) : null;
      action.dataset.topic = focus ? focus.topic : "";
    }
    const empty = document.getElementById("dashboard-weekly-empty");
    if (empty) empty.hidden = weekly.length > 0;
    panel.dataset.attempts = String(weekly.length);
    panel.dataset.activeDays = String(activeDays);
    panel.dataset.accuracy = accuracy === null ? "" : String(accuracy);
  };
  window.addEventListener("mathBacSyria:dashboard-refreshed", renderDashboardWeeklySummary);
  renderDashboardWeeklySummary();

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
    const allAttempts = Array.isArray(progressData.attempts) ? progressData.attempts : [];
    const attempts = allAttempts.slice(0, 10);
    const dayKey = value => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    };
    const activeDays = new Set(allAttempts.map(item => item && dayKey(item.date)).filter(Boolean));
    const today = new Date();
    const todayKey = dayKey(today);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    let streak = 0;
    let cursor = activeDays.has(todayKey) ? today : activeDays.has(dayKey(yesterday)) ? yesterday : null;
    while (cursor && activeDays.has(dayKey(cursor))) {
      streak++;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    }
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const weeklyAttempts = allAttempts.filter(item => {
      const date = new Date(item && item.date);
      return !Number.isNaN(date.getTime()) && date >= weekStart && date <= today;
    });
    const weeklyDays = new Set(weeklyAttempts.map(item => dayKey(item.date)).filter(Boolean)).size;
    const weeklyCorrect = weeklyAttempts.filter(item => item.correct === true).length;
    const weeklyRate = weeklyAttempts.length ? Math.round(weeklyCorrect / weeklyAttempts.length * 100) : null;
    const rhythmMarkup = `<section class="study-rhythm" aria-label="انتظام التدريب">
      <div><strong>${weeklyDays.toLocaleString("ar")}</strong><span>أيام تدريب خلال آخر ٧ أيام</span></div>
      <div><strong>${streak.toLocaleString("ar")}</strong><span>أيام متتالية من التدريب</span></div>
      <div><strong>${weeklyRate === null ? "—" : weeklyRate.toLocaleString("ar") + "٪"}</strong><span>دقة الإجابات خلال آخر ٧ أيام</span></div>
    </section>`;
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
      ${rhythmMarkup}
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
        const qs = mistakeValues.filter(q => q && q.topic === topic && q.q && (typeof isSupportedQuestion === "function" ? isSupportedQuestion(q) : Array.isArray(q.options)));
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
    const reasonLabels = {
      concept:"فهم المفهوم", law:"اختيار القانون", calculation:"الحساب",
      sign:"الإشارة أو الترتيب", reading:"فهم المطلوب", steps:"خطوات الحل", other:"سبب آخر / غير متأكد"
    };
    const mistakes = progressData.mistakes && typeof progressData.mistakes === "object" && !Array.isArray(progressData.mistakes) ? progressData.mistakes : {};
    const rows = Object.keys(mistakes).map(key => {
      const q = byKey(key);
      if (!q || typeof q.q !== "string" || !(typeof isSupportedQuestion === "function" ? isSupportedQuestion(q) : Array.isArray(q.options) && q.options.length === 4)) return null;
      const stored = mistakes[key];
      const reason = stored && typeof stored.selfReportedReason === "string" && Object.prototype.hasOwnProperty.call(reasonLabels, stored.selfReportedReason) ? stored.selfReportedReason : "";
      return { key, q, reason };
    }).filter(Boolean).sort((a,b) => String(a.q.topic || "").localeCompare(String(b.q.topic || ""), "ar"));
    const reasonCounts = Object.fromEntries(Object.keys(reasonLabels).map(key => [key, rows.filter(row => row.reason === key).length]));
    const classifiedCount = rows.filter(row => row.reason).length;
    const currentFilter = section.dataset.reasonFilter || "all";
    const filteredRows = rows.filter(row => currentFilter === "all" || (currentFilter === "unclassified" ? !row.reason : row.reason === currentFilter));
    if (button) {
      button.textContent = "تحليل الأخطاء (" + rows.length.toLocaleString("ar") + ")";
      button.disabled = rows.length === 0;
      button.setAttribute("aria-expanded", String(!section.hidden));
    }
    if (!rows.length) {
      section.innerHTML = '<h4>سجل الأخطاء وتحليلها</h4><p>لا توجد أسئلة صالحة للمراجعة حالياً. ستظهر هنا الأنماط التي تختار وصفها بنفسك بعد الإجابة.</p>';
      return;
    }
    const summary = Object.entries(reasonLabels).filter(([key]) => reasonCounts[key] > 0)
      .map(([key,label]) => '<span class="error-analysis-chip">' + escapeHtml(label) + ': ' + reasonCounts[key].toLocaleString("ar") + '</span>').join("");
    const remediationGuidance = {
      concept:{text:"ابدأ بمثال محلول يشرح الفكرة، ثم أعد حل السؤال دون النظر إلى الحل.",resource:"solved-examples-library",resourceLabel:"افتح الأمثلة المحلولة"},
      law:{text:"راجع القانون المناسب وشروط استخدامه، ثم طبّقه على سؤال من البحث نفسه.",resource:"formula-library",resourceLabel:"افتح مكتبة القوانين"},
      calculation:{text:"قسّم العمليات الحسابية إلى أسطر قصيرة، وتحقق من كل ناتج قبل الانتقال للخطوة التالية.",resource:"solved-examples-library",resourceLabel:"راجع مثالاً محلولاً"},
      sign:{text:"اكتب الإشارات والأقواس بوضوح، وراجع أثر كل تحويل جبري قبل إكمال الحل.",resource:"solved-examples-library",resourceLabel:"راجع خطوات الحل"},
      reading:{text:"استخرج المعطيات وحدد المطلوب بكلماتك قبل اختيار طريقة الحل.",resource:"solved-examples-library",resourceLabel:"شاهد مثالاً محلولاً"},
      steps:{text:"قسّم الحل إلى خطوات مرقمة، ولا تنتقل إلى النتيجة قبل تبرير الخطوة الحالية.",resource:"solved-examples-library",resourceLabel:"راجع الحلول المفصلة"},
      other:{text:"أعد قراءة الحل المفصل وحدد الجزء الذي تحتاج إلى مراجعته قبل المحاولة التالية.",resource:"solved-examples-library",resourceLabel:"افتح الأمثلة المحلولة"}
    };
    const remediationGroups = Object.keys(reasonLabels).map(reason => ({
      reason, label:reasonLabels[reason], count:rows.filter(row => row.reason === reason).length,
      questions:rows.filter(row => row.reason === reason).map(row => row.q)
    })).filter(group => group.count > 0).sort((a,b) => b.count-a.count || a.label.localeCompare(b.label,"ar"));
    const remediationHtml = remediationGroups.length ? '<section class="remediation-plan" aria-labelledby="remediation-plan-title">' +
      '<h5 id="remediation-plan-title">خطوتك العلاجية التالية</h5>' +
      '<p>هذه اقتراحات مراجعة مرتبطة بالأسباب التي اخترتها بنفسك. ظهور سبب مرة واحدة مؤشر أولي، وتكراره في أكثر من سؤال يساعدك على ترتيب الأولويات دون اعتباره تشخيصاً نهائياً.</p>' +
      '<div class="remediation-plan-list">' + remediationGroups.map(group => {
        const guidance = remediationGuidance[group.reason];
        const evidence = group.count >= 2 ? "ظهر في " + group.count.toLocaleString("ar") + " سؤالاً مختلفاً" : "ظهر في سؤال واحد؛ راجعه كمؤشر أولي";
        return '<article class="remediation-plan-item" data-remediation-group="' + group.reason + '">' +
          '<div class="remediation-plan-heading"><strong>' + escapeHtml(group.label) + '</strong><span>' + group.count.toLocaleString("ar") + '</span></div>' +
          '<p class="remediation-plan-evidence">' + evidence + '</p><p>' + escapeHtml(guidance.text) + '</p>' +
          '<div class="remediation-plan-actions"><button type="button" data-remediation-reason="' + group.reason + '">ابدأ مراجعة علاجية</button>' +
          '<button type="button" class="remediation-resource-button" data-remediation-resource="' + guidance.resource + '">' + guidance.resourceLabel + '</button></div></article>';
      }).join("") + '</div></section>' : "";
    let html = '<h4>سجل الأخطاء وتحليلها</h4>' +
      '<p class="error-analysis-disclosure">التصنيفات أدناه مبنية على اختيارك الذاتي، وليست تشخيصاً آلياً أو حكماً على مستواك. ' +
      classifiedCount.toLocaleString("ar") + ' من أصل ' + rows.length.toLocaleString("ar") + ' خطأً لها سبب محدد.</p>' +
      '<div class="error-analysis-summary" aria-label="توزيع الأسباب التي حددتها">' + (summary || '<span class="error-analysis-chip">لم تُحدّد أسباب بعد</span>') + '</div>' +
      remediationHtml +
      '<label class="error-analysis-filter-label" for="mistake-reason-filter">تصفية الأخطاء حسب السبب</label>' +
      '<select id="mistake-reason-filter" class="error-analysis-filter">' +
      '<option value="all">كل الأخطاء (' + rows.length.toLocaleString("ar") + ')</option>' +
      '<option value="unclassified">لم يُحدّد سببها (' + (rows.length-classifiedCount).toLocaleString("ar") + ')</option>' +
      Object.entries(reasonLabels).map(([key,label]) => '<option value="' + key + '">' + escapeHtml(label) + ' (' + reasonCounts[key].toLocaleString("ar") + ')</option>').join("") +
      '</select><ul class="mistake-log-list">' +
      filteredRows.map(({key,q,reason}) => '<li class="mistake-log-item">' +
        '<div class="mistake-log-meta"><strong>' + escapeHtml(q.topic || "بحث غير محدد") + '</strong><span>' + escapeHtml(q.level || "مستوى غير محدد") + '</span></div>' +
        '<div class="mistake-log-question">' + escapeHtml(String(q.q).replace(/<[^>]*>/g, " ")) + '</div>' +
        '<p class="error-analysis-reason">' + (reason ? "السبب الذي حددته: " + escapeHtml(reasonLabels[reason]) : "لم يُحدّد سبب هذا الخطأ بعد") + '</p>' +
        '<button type="button" data-mistake-key="' + escapeHtml(key) + '">تدرّب على هذا السؤال ←</button></li>').join("") +
      '</ul>' + (filteredRows.length ? "" : '<p class="error-analysis-empty">لا توجد أخطاء ضمن هذا التصنيف.</p>');
    section.innerHTML = html;
    const filter = section.querySelector("#mistake-reason-filter");
    if (filter) {
      filter.value = currentFilter;
      filter.addEventListener("change", () => {
        section.dataset.reasonFilter = filter.value;
        renderMistakeLog();
      });
    }
    section.querySelectorAll("[data-remediation-reason]").forEach(item => item.addEventListener("click", () => {
      const reason = item.dataset.remediationReason;
      const group = remediationGroups.find(entry => entry.reason === reason);
      if (!group || !group.questions.length) return;
      startTargetedQuiz(group.questions, "مراجعة علاجية — " + reasonLabels[reason]);
    }));
    section.querySelectorAll("[data-remediation-resource]").forEach(item => item.addEventListener("click", () => {
      const panel = item.dataset.remediationResource;
      const shortcut = document.querySelector('[data-panel-toggle="' + panel + '"]');
      if (shortcut) shortcut.click();
    }));
    section.querySelectorAll("[data-mistake-key]").forEach(item => item.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const key = item.dataset.mistakeKey;
      const q = byKey(key) || progressData.mistakes[key];
      if (!q) return;
      startTargetedQuiz([q], "مراجعة خطأ — " + (q.topic || ""));
      document.getElementById("quiz")?.classList.remove("hidden");
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
  const applyReadingSettings = () => {
    document.documentElement.style.setProperty("--reading-scale", String(extras.textScale / 100));
    document.documentElement.style.setProperty("--math-scale", String(extras.mathScale / 100));
    const textInput = document.getElementById("text-scale");
    const mathInput = document.getElementById("math-scale");
    const textOutput = document.getElementById("text-scale-value");
    const mathOutput = document.getElementById("math-scale-value");
    if (textInput) textInput.value = String(extras.textScale);
    if (mathInput) mathInput.value = String(extras.mathScale);
    if (textOutput) textOutput.textContent = extras.textScale.toLocaleString("ar") + "٪";
    if (mathOutput) mathOutput.textContent = extras.mathScale.toLocaleString("ar") + "٪";
  };
  const bindReadingSettings = () => {
    [["text-scale", "textScale"], ["math-scale", "mathScale"]].forEach(([id, key]) => {
      const input = document.getElementById(id);
      if (!input || input.dataset.enhancementBound === "true") return;
      input.addEventListener("input", () => {
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        extras[key] = Math.min(Number(input.max), Math.max(Number(input.min), value));
        persistExtras();
        applyReadingSettings();
      });
      input.dataset.enhancementBound = "true";
    });
    applyReadingSettings();
  };
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
    if (topic.includes("عقدي") || topic.includes("العقدية")) return "تذكير عام: عند وجود مساواة عقدية، اكتب العدد على الصورة a+bi وقارن الجزأين الحقيقي والتخيلي؛ استخدم الطويلة أو السعة فقط عندما يتطلب السؤال ذلك.";
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
    sessionMistakes = [];
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
    currentTopic = title; reviewMode = true; sessionMistakes = []; quizQuestions = [...qs]; index = 0; correctCount = 0; answered = false;
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
  const buildReviewAssistantSnapshot = () => {
    const bankTopics = Array.isArray(topics) ? topics : [];
    const stats = progressData && isRecord(progressData.topicStats) ? progressData.topicStats : {};
    const mistakes = progressData && isRecord(progressData.mistakes) ? progressData.mistakes : {};
    const mistakeCounts = {};
    for (const item of Object.values(mistakes)) {
      if (item && typeof item.topic === "string") mistakeCounts[item.topic] = (mistakeCounts[item.topic] || 0) + 1;
    }
    const seenQuestions = isRecord(progressData.seenQuestions) ? progressData.seenQuestions : {};
    const topicRows = bankTopics.map(topic => {
      const stat = isRecord(stats[topic]) ? stats[topic] : {};
      const answered = Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
      const correct = Number.isSafeInteger(stat.correct) && stat.correct >= 0 ? Math.min(stat.correct, answered) : 0;
      const questionCount = (Array.isArray(questions) ? questions : []).filter(q => q.topic === topic).length;
      const seenCount = Object.keys(seenQuestions).filter(key => key.startsWith(topic + "::")).length;
      return { topic, answered, correct, accuracy: answered ? Math.round(correct / answered * 100) : null,
        mistakes: mistakeCounts[topic] || 0, remaining: Math.max(0, questionCount - seenCount) };
    });
    const priorities = topicRows.filter(row => row.mistakes > 0 || (row.answered > 0 && row.accuracy < 85))
      .sort((a,b) => b.mistakes-a.mistakes || a.accuracy-b.accuracy || b.answered-a.answered).slice(0,6);
    const unstarted = topicRows.filter(row => row.answered === 0).slice(0,3).map(row => row.topic);
    const attempts = Array.isArray(progressData.attempts) ? progressData.attempts : [];
    const recent = attempts.filter(item => item && typeof item.date === "string" && Number.isFinite(Date.parse(item.date))
      && Date.now() - Date.parse(item.date) <= 7*86400000 && Date.now() >= Date.parse(item.date));
    const answered = Number.isSafeInteger(progressData.answered) ? progressData.answered : 0;
    const correct = Number.isSafeInteger(progressData.correct) ? Math.min(progressData.correct, answered) : 0;
    const dueReviews = getScheduledReviews().filter(item => item.due <= Date.now()).length;
    return { overall:{answered,correct,accuracy:answered?Math.round(correct/answered*100):null},
      recentSevenDays:{answers:recent.length,correct:recent.filter(item=>item.correct).length},
      dueReviews, priorities, unstarted };
  };
  const buildLocalReviewAssistantPlan = snapshot => {
    if (!snapshot.overall.answered) return "لم تُسجّل إجابات كافية بعد لبناء خطة شخصية. ابدأ بجلسة قصيرة من ٥ إلى ١٠ أسئلة في أحد الأبحاث، ثم اطلب الخطة مجدداً.";
    const lines = [
      "ملخصك: " + snapshot.overall.answered.toLocaleString("ar") + " إجابة، ودقة إجمالية " + snapshot.overall.accuracy.toLocaleString("ar") + "٪.",
      "لديك " + snapshot.dueReviews.toLocaleString("ar") + " مراجعة متباعدة مستحقة الآن.",
      "", "أولويات المراجعة:"
    ];
    if (snapshot.priorities.length) snapshot.priorities.forEach((row,index) => {
      const reason = row.mistakes ? row.mistakes.toLocaleString("ar") + " أخطاء محفوظة" : "دقة " + row.accuracy.toLocaleString("ar") + "٪";
      lines.push((index+1) + ". " + row.topic + ": " + reason + ". ابدأ بمراجعة الفكرة الأساسية ثم حل ٥ أسئلة من البنك.");
    });
    else lines.push("لا يظهر ضعف واضح في الأبحاث التي تدربت عليها؛ وسّع التغطية إلى أسئلة جديدة ومتقدمة.");
    if (snapshot.unstarted.length) lines.push("", "أبحاث لم تبدأ بها بعد: " + snapshot.unstarted.join("، ") + ". اختر بحثاً واحداً منها بعد معالجة الأولويات.");
    lines.push("", "جلسة مقترحة مدتها ٣٠ دقيقة:", "• ٥ دقائق: استرجاع القوانين من الذاكرة.", "• ١٥ دقيقة: حل أسئلة الأولوية دون النظر إلى الحل.", "• ١٠ دقائق: تصحيح الحل وتسجيل الفكرة التي تحتاج إلى تثبيت.");
    return lines.join("\n");
  };
  const runReviewAssistant = () => {
    const panel = document.getElementById("review-assistant-panel");
    const status = document.getElementById("review-assistant-status");
    const output = document.getElementById("review-assistant-output");
    const button = document.getElementById("review-assistant-generate");
    if (!panel || !status || !output || !button) return;
    panel.hidden = false;
    panel.setAttribute("aria-busy", "true");
    button.disabled = true;
    const snapshot = buildReviewAssistantSnapshot();
    output.textContent = buildLocalReviewAssistantPlan(snapshot);
    status.textContent = snapshot.overall.answered
      ? "هذه خطة مراجعة محلية مبنية على تقدمك المحفوظ على هذا الجهاز؛ لا تُرسل بياناتك إلى أي خادم."
      : "ابدأ التدريب أولاً؛ ستُبنى الخطة من نتائجك الفعلية.";
    panel.removeAttribute("aria-busy");
    button.disabled = false;
    panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  };
  const startIntensiveTraining = () => {
    const focus = document.getElementById("intensive-training-focus")?.value || "all";
    const requested = Math.max(10, Math.min(30, Number(document.getElementById("intensive-training-count")?.value) || 10));
    const status = document.getElementById("intensive-training-status");
    const bank = Array.isArray(questions) ? questions.filter(q => isSupportedQuestion(q)) : [];
    let pool = bank;
    let label = "من كامل بنك الأسئلة";
    if (focus === "mistakes") {
      const mistakeMap = typeof progressData !== "undefined" && isRecord(progressData.mistakes) ? progressData.mistakes : {};
      pool = Object.keys(mistakeMap).map(byKey).filter(q => q && isSupportedQuestion(q));
      label = "من أسئلتك التي أخطأت بها";
    } else if (focus === "weak") {
      const weakTopics = getStudyPriorityTopics().filter(item => item.answered > 0).slice(0, 3);
      const selectedTopics = new Set(weakTopics.map(item => item.topic));
      pool = bank.filter(q => selectedTopics.has(q.topic));
      label = "من الأبحاث التي تحتاج إلى تقوية";
    }
    const unique = new Map();
    pool.forEach(q => { const key = keyOf(q); if (key && !unique.has(key)) unique.set(key, q); });
    pool = [...unique.values()];
    if (!pool.length) {
      if (status) status.textContent = focus === "mistakes"
        ? "لا توجد أخطاء محفوظة صالحة للتدريب حالياً. تابع حل الأسئلة أولاً."
        : focus === "weak"
          ? "نحتاج إلى بعض نتائج التدريب أولاً حتى نحدد الأبحاث الأضعف."
          : "لا توجد أسئلة صالحة في بنك الأسئلة حالياً.";
      return;
    }
    // Fisher–Yates produces an unbiased shuffle without mutating the question bank.
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, requested);
    currentTopic = "التدريب المكثف";
    reviewMode = false;
    sessionMistakes = [];
    quizQuestions = selected;
    index = 0;
    correctCount = 0;
    answered = false;
    document.getElementById("home").classList.add("hidden");
    document.getElementById("results").classList.add("hidden");
    document.getElementById("quiz").classList.remove("hidden");
    document.getElementById("quiz-title").textContent = "التدريب المكثف — " + label;
    showQuestion();
    if (status) status.textContent = "بدأت جلسة من " + selected.length.toLocaleString("ar") + " سؤالاً " + label + ".";
    window.scrollTo({top:0,behavior:"smooth"});
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
    const mastered = items.filter(item => item.stage >= 3 && item.lastResult === "correct");
    const struggling = items.filter(item => item.lastResult === "wrong");
    const fmt = value => new Date(value).toLocaleString("ar-SY", { dateStyle:"medium", timeStyle:"short" });
    const renderGroup = (title, list, emptyText) => `
      <div class="review-plan-group">
        <h4>${title} <span>${list.length.toLocaleString("ar")}</span></h4>
        ${list.length ? `<ul class="review-plan-list">${list.slice(0, 8).map(item => `
          <li class="review-plan-item">
            <strong>${escapeHtml(item.q.topic || "بحث غير محدد")}</strong>
            <p>${escapeHtml(String(item.q.q || "").slice(0, 180))}</p>
            <small>${item.due <= now ? "مستحق الآن" : "موعد المراجعة: " + escapeHtml(fmt(item.due))} · ${item.lastResult === "wrong" ? "يحتاج إلى تثبيت" : item.stage >= 3 && item.lastResult === "correct" ? "متقن مبدئياً" : item.stage > 0 ? "قيد الإتقان" : "مراجعة أولى"}</small>
          </li>`).join("")}</ul>${list.length > 8 ? `<p class="muted">وتوجد ${(list.length - 8).toLocaleString("ar")} أسئلة أخرى في هذه الفئة.</p>` : ""}` : `<p class="review-plan-empty">${emptyText}</p>`}
      </div>`;
    panel.innerHTML = `
      <h4>خطة المراجعة المتباعدة</h4>
      <p>تتدرج المواعيد من يوم إلى ٣٠ يوماً حسب إجاباتك. الخطأ يعيد السؤال إلى مراجعة أقرب، والإجابة الصحيحة في جلسة المراجعة توسّع الفاصل تدريجياً.</p>
      <div class="study-rhythm review-plan-summary">
        <div><strong>${due.length.toLocaleString("ar")}</strong><span>مستحق اليوم</span></div>
        <div><strong>${upcoming.length.toLocaleString("ar")}</strong><span>خلال ٧ أيام</span></div>
        <div><strong>${mastered.length.toLocaleString("ar")}</strong><span>متقن مبدئياً</span></div>
        <div><strong>${struggling.length.toLocaleString("ar")}</strong><span>يحتاج تثبيتاً</span></div>
      </div>
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
    const payload = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: "2026.11.03",
      questionCount: Array.isArray(questions) ? questions.length : 0,
      progress: progressData,
      studentTools: extras
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "math-bac-syria-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importProgress = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("حجم الملف أكبر من الحد المسموح (2 ميغابايت).");
      const data = JSON.parse(await file.text());
      const version = data && data.version === undefined ? 1 : data?.version;
      if (!data || data.format !== BACKUP_FORMAT || !data.progress || typeof data.progress !== "object" || Array.isArray(data.progress)) {
        throw new Error("هذا الملف ليس نسخة احتياطية صالحة للمنصة.");
      }
      if (!Number.isSafeInteger(version) || version < 1 || version > BACKUP_VERSION) {
        throw new Error("إصدار النسخة الاحتياطية غير مدعوم. حدّث المنصة أو استخدم نسخة متوافقة.");
      }
      const source = data.progress;
      const sourceTools = isRecord(data.studentTools) ? data.studentTools : {};
      const toCount = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
      const backupAnswers = toCount(source.answered);
      const backupCorrect = Math.min(toCount(source.correct), backupAnswers);
      const backupBookmarks = Array.isArray(sourceTools.bookmarks) ? sourceTools.bookmarks.length : 0;
      const backupReviews = isRecord(sourceTools.schedule) ? Object.keys(sourceTools.schedule).length : 0;
      const backupExams = Array.isArray(sourceTools.examHistory) ? sourceTools.examHistory.length : 0;
      const backupQuestionCount = toCount(data.questionCount);
      const currentQuestionCount = Array.isArray(questions) ? questions.length : 0;
      const bankWarning = backupQuestionCount && currentQuestionCount && backupQuestionCount !== currentQuestionCount
        ? "\\nتنبيه: أُنشئت النسخة من بنك يضم " + backupQuestionCount.toLocaleString("ar") + " سؤالاً، بينما يضم هذا الإصدار " + currentQuestionCount.toLocaleString("ar") + ". ستُستعاد العناصر المتوافقة فقط."
        : "";
      const exportedAt = typeof data.exportedAt === "string" && Number.isFinite(Date.parse(data.exportedAt))
        ? new Date(data.exportedAt).toLocaleString("ar") : "غير محدد";
      const confirmation = "ملخص النسخة الاحتياطية (الإصدار " + version + "):\\n"
        + "تاريخ الإنشاء: " + exportedAt + "\\n"
        + "الإجابات المسجلة: " + backupAnswers.toLocaleString("ar") + " (الصحيحة: " + backupCorrect.toLocaleString("ar") + ")\\n"
        + "العلامات المرجعية: " + backupBookmarks.toLocaleString("ar") + "\\n"
        + "المراجعات المجدولة: " + backupReviews.toLocaleString("ar") + "\\n"
        + "نتائج الامتحانات: " + backupExams.toLocaleString("ar") + bankWarning
        + "\\n\\nسيُستبدل التقدم الحالي بمحتوى هذه النسخة. هل تريد المتابعة؟";
      if (!confirm(confirmation)) return;
      const nextProgress = {
        answered: toCount(source.answered),
        correct: Math.min(toCount(source.correct), toCount(source.answered)),
        mistakes: {},
        topicStats: {},
        attempts: [],
        seenQuestions: {}
      };
      // Keep only well-formed attempt records for topics that still exist in this version.
      const allowedTopics = new Set(typeof topics !== "undefined" && Array.isArray(topics) ? topics : []);
      nextProgress.attempts = (Array.isArray(source.attempts) ? source.attempts : [])
        .filter(item => item && typeof item === "object" && !Array.isArray(item)
          && allowedTopics.has(item.topic)
          && typeof item.correct === "boolean"
          && typeof item.date === "string"
          && Number.isFinite(Date.parse(item.date))
          && Date.parse(item.date) <= Date.now() + 86400000)
        .slice(0, 100)
        .map(item => ({ topic: item.topic, correct: item.correct, date: new Date(item.date).toISOString() }));
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
      let nextExtras = { bookmarks:[], schedule:{}, reviewQuestions:{}, darkMode:false, textScale:100, mathScale:100 };
      nextExtras.darkMode = Boolean(sourceTools.darkMode);
      nextExtras.textScale = Number.isFinite(sourceTools.textScale) ? Math.min(130, Math.max(80, Math.round(sourceTools.textScale / 10) * 10)) : 100;
      nextExtras.mathScale = Number.isFinite(sourceTools.mathScale) ? Math.min(140, Math.max(80, Math.round(sourceTools.mathScale / 10) * 10)) : 100;
      nextExtras.examHistory = normalizeExamHistory(sourceTools.examHistory);
      nextExtras.studyPlan = normalizeStudyPlan(sourceTools.studyPlan);
      nextExtras.bookmarks = Array.isArray(sourceTools.bookmarks) ? [...new Set(sourceTools.bookmarks.filter(k => typeof k === "string" && byKey(k)))] : [];
      const restoredSchedule = normalizeSchedule(sourceTools.schedule);
      for (const [key, item] of Object.entries(restoredSchedule)) {
        const q = byKey(key);
        if (!q) continue;
        nextExtras.schedule[key] = item;
        nextExtras.reviewQuestions[key] = q;
      }
      // Persist both records before mutating in-memory state. If either write fails, restore the previous storage values.
      const previousProgressRaw = localStorage.getItem(STORAGE_KEY);
      const previousExtrasRaw = localStorage.getItem(EXTRA_KEY);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
        localStorage.setItem(EXTRA_KEY, JSON.stringify(nextExtras));
      } catch (storageError) {
        try {
          if (previousProgressRaw === null) localStorage.removeItem(STORAGE_KEY);
          else localStorage.setItem(STORAGE_KEY, previousProgressRaw);
          if (previousExtrasRaw === null) localStorage.removeItem(EXTRA_KEY);
          else localStorage.setItem(EXTRA_KEY, previousExtrasRaw);
        } catch (rollbackError) {
          console.warn("تعذر استعادة بيانات التخزين السابقة بالكامل", rollbackError);
        }
        throw new Error("تعذر حفظ النسخة الاحتياطية على هذا الجهاز؛ لم يُعلن نجاح الاستيراد. تحقق من مساحة التخزين ثم حاول مجدداً.");
      }
      progressData = nextProgress;
      extras = nextExtras;
      if (typeof refreshDashboard === "function") refreshDashboard();
      if (typeof renderTopics === "function") renderTopics();
      applyReadingSettings();
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
          const hasSteps = Array.isArray(q.steps) && q.steps.length > 0;
          const idea = q.keyIdea || generalTopicHint(q);
          const heading = `<div class="solution-heading"><span aria-hidden="true">✦</span><div><strong>شرح الحل</strong><small>${hasSteps ? "الفكرة الأساسية ثم خطوات الحل" : "الفكرة العامة والحل المتاح"}</small></div></div>`;
          const ideaPanel = `<section class="key-idea" aria-label="الفكرة الأساسية"><strong>${q.keyIdea ? "الفكرة الأساسية" : "تذكير بالفكرة العامة"}</strong><p>${escapeHtml(idea)}</p></section>`;
          if (hasSteps) {
            solution.innerHTML = `${heading}${ideaPanel}<ol class="solution-steps" aria-label="خطوات الحل">${q.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`;
          } else {
            solution.innerHTML = `${heading}${ideaPanel}<div class="solution-existing-content">${q.solution || ""}</div><p class="solution-note">الشرح التفصيلي لهذا السؤال يحتاج إلى مراجعة تعليمية إضافية؛ المعروض حالياً هو الحل المختصر المتاح.</p>`;
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
  const examState = { active:false, remaining:0, timer:null, answers:[], marked:[], resultVisible:false };
  const shuffle = list => {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const buildBalancedExam = (count, difficulty = "الكل") => {
    const allQuestions = typeof questions !== "undefined" && Array.isArray(questions) ? questions.filter(q => typeof getQuestionType !== "function" || getQuestionType(q) === "mcq") : [];
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
    const allHistory = Array.isArray(extras.examHistory) ? extras.examHistory.slice(0, 20) : [];
    if (!allHistory.length) {
      panel.innerHTML = "<h4>أرشيف المحاكاة</h4><p>ستظهر هنا نتائج المحاكاة بعد إنهاء أول امتحان تجريبي. يُحفظ الأرشيف على هذا الجهاز فقط.</p>";
      return;
    }
    const renderRows = (entries, offset = 0) => entries.map((entry, index) => {
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
      const attemptNumber = offset + index;
      const title = attemptNumber === 0 ? "أحدث محاكاة" : `محاكاة سابقة ${attemptNumber.toLocaleString("ar")}`;
      return `<li class="exam-history-item">
        <div><strong>${title}</strong><span>${rate.toLocaleString("ar")}٪</span></div>
        <p>${correct.toLocaleString("ar")} صحيحة من ${total.toLocaleString("ar")}</p>
        <small>${escapeHtml(dateLabel)}</small>
        <p>${weakLabel}</p>
      </li>`;
    }).join("");
    const recentHistory = allHistory.slice(0, 5);
    const olderHistory = allHistory.slice(5);
    const recentRows = renderRows(recentHistory);
    const archiveRows = renderRows(olderHistory, 5);
    panel.innerHTML = `<h4>أرشيف المحاكاة</h4><p>آخر ${allHistory.length.toLocaleString("ar")} محاكاة محفوظة محلياً، مع إبراز أحدث خمس نتائج وإتاحة بقية السجل عند الطلب.</p><ol class="exam-history-list">${recentRows}</ol>${olderHistory.length ? `<details class="exam-history-archive"><summary>عرض بقية الأرشيف (${olderHistory.length.toLocaleString("ar")} محاكاة)</summary><ol class="exam-history-list">${archiveRows}</ol></details>` : ""}`;
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
    const questionLabel = document.querySelector("#quiz .question-label");
    if (questionLabel && !document.getElementById("exam-question-nav")) {
      const nav = document.createElement("section");
      nav.id = "exam-question-nav";
      nav.className = "exam-question-nav";
      nav.hidden = true;
      nav.setAttribute("aria-label", "ورقة أسئلة المحاكاة");
      nav.innerHTML = `
        <div class="exam-nav-toolbar">
          <p id="exam-nav-status" aria-live="polite"></p>
          <button type="button" id="exam-mark-question" aria-pressed="false">☆ وضع علامة للمراجعة</button>
        </div>
        <div id="exam-nav-grid" class="exam-nav-grid" role="group" aria-label="الانتقال إلى سؤال"></div>`;
      questionLabel.insertAdjacentElement("afterend", nav);
    }
    const markButton = document.getElementById("exam-mark-question");
    if (markButton && !markButton.dataset.bound) {
      markButton.addEventListener("click", () => {
        if (!examState.active || !quizQuestions[index]) return;
        examState.marked[index] = !examState.marked[index];
        updateExamChrome();
      });
      markButton.dataset.bound = "true";
    }
    const nextButton = document.getElementById("next");
    if (nextButton && !nextButton.dataset.examNavigationBound) {
      nextButton.addEventListener("click", event => {
        if (!examState.active) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const nextIndex = index + 1;
        if (nextIndex < quizQuestions.length) {
          index = nextIndex;
          renderExamQuestion();
          return;
        }
        const pendingIndex = examState.answers.findIndex(answer => answer === null);
        if (pendingIndex >= 0) {
          index = pendingIndex;
          renderExamQuestion();
        } else {
          const status = document.getElementById("exam-nav-status");
          if (status) status.textContent = "أجبت عن جميع الأسئلة. راجع علاماتك ثم اضغط «إنهاء وتسليم الامتحان».";
        }
      }, true);
      nextButton.dataset.examNavigationBound = "true";
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
  const renderExamNavigator = () => {
    const nav = document.getElementById("exam-question-nav");
    const grid = document.getElementById("exam-nav-grid");
    const status = document.getElementById("exam-nav-status");
    const markButton = document.getElementById("exam-mark-question");
    if (!nav || !grid || !examState.active) return;
    const answeredCount = examState.answers.filter(answer => answer !== null).length;
    const markedCount = examState.marked.filter(Boolean).length;
    if (status) status.textContent = `تمت الإجابة عن ${answeredCount.toLocaleString("ar")} من ${quizQuestions.length.toLocaleString("ar")} سؤالاً · علامات المراجعة: ${markedCount.toLocaleString("ar")}`;
    grid.innerHTML = quizQuestions.map((question, questionIndex) => {
      const isAnswered = examState.answers[questionIndex] !== null;
      const isMarked = Boolean(examState.marked[questionIndex]);
      const isCurrent = questionIndex === index;
      const classes = ["exam-nav-number", isAnswered ? "is-answered" : "", isMarked ? "is-marked" : "", isCurrent ? "is-current" : ""].filter(Boolean).join(" ");
      const stateLabel = isAnswered ? "تمت الإجابة" : "لم تتم الإجابة";
      const markLabel = isMarked ? "، محدد للمراجعة" : "";
      return `<button type="button" class="${classes}" data-exam-go="${questionIndex}" aria-label="السؤال ${questionIndex + 1}: ${stateLabel}${markLabel}" ${isCurrent ? 'aria-current="step"' : ""}>${(questionIndex + 1).toLocaleString("ar")}</button>`;
    }).join("");
    grid.querySelectorAll("[data-exam-go]").forEach(button => {
      button.addEventListener("click", () => {
        const target = Number(button.dataset.examGo);
        if (!examState.active || !Number.isInteger(target) || target < 0 || target >= quizQuestions.length) return;
        index = target;
        renderExamQuestion();
      });
    });
    if (markButton) {
      const marked = Boolean(examState.marked[index]);
      markButton.textContent = marked ? "★ إزالة علامة المراجعة" : "☆ وضع علامة للمراجعة";
      markButton.setAttribute("aria-pressed", String(marked));
    }
  };
  const updateExamChrome = () => {
    const clock = document.getElementById("exam-clock");
    const submit = document.getElementById("exam-submit");
    const nav = document.getElementById("exam-question-nav");
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
    if (nav) nav.hidden = !examState.active;
    if (examState.active) renderExamNavigator();
  };
  const renderExamQuestion = () => {
    showQuestion();
    const savedChoice = examState.answers[index];
    if (savedChoice !== null) {
      answered = true;
      document.querySelectorAll("#options [data-option]").forEach((button, optionIndex) => {
        button.disabled = true;
        if (optionIndex === savedChoice) button.classList.add("exam-selected");
      });
      const feedback = document.getElementById("feedback");
      if (feedback) { feedback.className = "feedback hidden"; feedback.innerHTML = ""; }
    }
    const nextButton = document.getElementById("next");
    if (nextButton) nextButton.disabled = false;
    updateExamChrome();
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
    examState.marked = Array(picked.length).fill(false);
    currentTopic = "محاكاة الامتحان";
    reviewMode = false;
    sessionMistakes = [];
    quizQuestions = picked;
    index = 0; correctCount = 0; answered = false;
    document.getElementById("results")?.classList.add("hidden");
    document.getElementById("home")?.classList.add("hidden");
    document.getElementById("quiz")?.classList.remove("hidden");
    document.getElementById("quiz-title").textContent = "محاكاة امتحان البكالوريا";
    document.getElementById("exam-review")?.remove();
    ensureExamControls();
    updateExamChrome();
    renderExamQuestion();
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
    const performanceLabel = overallRate >= 85 ? "أداء متقن" : overallRate >= 70 ? "أداء جيد جداً" : overallRate >= 60 ? "أداء جيد" : "يحتاج إلى مزيد من التدريب";
    const weakestTopic = [...topicResults.entries()]
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))[0]?.[0];
    const resultSummary = `<div class="exam-result-summary" aria-label="ملخص نتيجة المحاكاة">
      <div class="exam-result-summary-main"><span>العلامة التدريبية</span><strong>${correctAnswers.toLocaleString("ar")} / ${totalQuestions.toLocaleString("ar")}</strong><b>${overallRate.toLocaleString("ar")}٪ إجابات صحيحة · ${performanceLabel}</b></div>
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
      const skipped = chosen === null || chosen === -1;
      const correct = !skipped && chosen === q.answer;
      const chosenText = !skipped && Number.isInteger(chosen) && chosen >= 0 ? q.options[chosen] : "لم تتم الإجابة";
      const answerStatus = skipped ? "سؤال متروك" : correct ? "إجابة صحيحة" : "إجابة خاطئة";
      const statusClass = skipped ? "exam-answer-skipped" : correct ? "exam-answer-good" : "exam-answer-bad";
      return `<li class="exam-review-item">
        <div class="exam-review-title"><strong>السؤال ${i+1} — ${escapeHtml(q.topic || "")}</strong><span class="${statusClass}">${answerStatus}</span></div>
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
    if (!timedOut && !confirm("هل تريد تسليم الامتحان الآن؟ ستظهر الأسئلة غير المجابة في النتيجة كأسئلة متروكة.")) return;
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
        document.querySelectorAll("#options .option").forEach((btn, optionIndex) => {
          btn.classList.remove("correct","wrong","exam-selected");
          if (optionIndex === choice) btn.classList.add("exam-selected");
        });
        updateExamChrome();
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
  window.addEventListener("mathBacSyria:reset-progress", () => {
    if (extras.studyPlan) {
      extras.studyPlan = null;
      persistExtras();
      const panel = document.getElementById("study-plan");
      if (panel && !panel.hidden) renderStudyPlan();
    }
  });
  ensureMistakeLog();
  // أنشئ أدوات المحاكاة بعد إنشاء لوحة أدوات الطالب، ولا تعتمد على حدث load وحده.
  ensureExamControls();

  // Announce genuinely new homepage destinations once, then remember that the learner has seen them.
  const MENU_UPDATE_STORAGE_KEY = "mathBacSyriaSeenMenuUpdatesV1";
  const readSeenMenuUpdates = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(MENU_UPDATE_STORAGE_KEY) || "[]");
      return new Set(Array.isArray(parsed) ? parsed.filter(key => typeof key === "string") : []);
    } catch (_) { return new Set(); }
  };
  const refreshMenuUpdateBadges = menu => {
    if (!menu) return;
    const seen = readSeenMenuUpdates();
    menu.querySelectorAll("[data-update-key]").forEach(link => {
      const key = link.dataset.updateKey;
      const isNew = Boolean(key && !seen.has(key));
      const badge = link.querySelector(".menu-update-badge");
      if (badge) badge.hidden = !isNew;
      link.classList.toggle("has-new-update", isNew);
    });
  };
  const markMenuUpdateSeen = link => {
    const key = link?.dataset?.updateKey;
    if (!key) return;
    const seen = readSeenMenuUpdates();
    seen.add(key);
    try { localStorage.setItem(MENU_UPDATE_STORAGE_KEY, JSON.stringify([...seen].slice(-30))); } catch (_) {}
    const badge = link.querySelector(".menu-update-badge");
    if (badge) badge.hidden = true;
    link.classList.remove("has-new-update");
  };

  // Keep the home page uncluttered: one section menu, one active panel at a time.
  const bindHomePanelToggles = () => {
    const menu = document.getElementById("section-menu");
    const menuButton = document.getElementById("section-menu-toggle");
    let menuAnimationHandler = null;
    const clearMenuAnimation = () => {
      if (menu && menuAnimationHandler) menu.removeEventListener("animationend", menuAnimationHandler);
      menuAnimationHandler = null;
      menu?.classList.remove("is-opening", "is-closing");
    };
    const reducedMotionRequested = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    // Scroll only after the navigation menu has been removed from layout.
    // This avoids the page shifting after scrollIntoView and leaving the panel mid-screen.
    const scrollPanelIntoView = panel => {
      const behavior = reducedMotionRequested() ? "auto" : "smooth";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!panel?.isConnected || panel.hidden) return;
        const stickyHeader = document.querySelector(".top");
        const headerOffset = stickyHeader ? Math.ceil(stickyHeader.getBoundingClientRect().height) : 0;
        const targetTop = Math.max(0, window.scrollY + panel.getBoundingClientRect().top - headerOffset - 12);
        window.scrollTo({ top: targetTop, behavior });
      }));
    };
    const setMenuOpen = open => {
      if (!menu) return;
      clearMenuAnimation();
      if (open) {
        menu.hidden = false;
        // Reopening the long shortcut list always starts at its first group.
        menu.scrollTop = 0;
      }
      if (menuButton) {
        menuButton.setAttribute("aria-expanded", String(open));
        menuButton.style.background = open ? "#6b7280" : "";
        menuButton.style.borderColor = open ? "#6b7280" : "";
      }
      if (reducedMotionRequested()) {
        menu.hidden = !open;
        return;
      }
      menu.classList.add(open ? "is-opening" : "is-closing");
      menuAnimationHandler = event => {
        if (event.target !== menu) return;
        const shouldHide = menu.classList.contains("is-closing");
        clearMenuAnimation();
        if (shouldHide) menu.hidden = true;
      };
      menu.addEventListener("animationend", menuAnimationHandler);
    };
    // Navigation must hide the menu synchronously before calculating the destination.
    // Waiting for the closing animation changes document height after the scroll.
    const closeMenuForNavigation = () => {
      if (!menu) return;
      clearMenuAnimation();
      menu.hidden = true;
      if (menuButton) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.style.background = "";
        menuButton.style.borderColor = "";
      }
    };

    const getActiveHomePanel = () => {
      // The expanded shortcut is the source of truth; dashboard widgets may contain
      // nested, temporarily visible content that is not the active top-level section.
      const selectedPanelLink = menu?.querySelector('a[data-panel-toggle][aria-expanded="true"]');
      if (selectedPanelLink && selectedPanelLink.dataset.panelToggle !== "topic-section") {
        const selectedPanel = document.getElementById(selectedPanelLink.dataset.panelToggle);
        if (selectedPanel && !selectedPanel.hidden) return selectedPanel;
      }
      const selectedDashboardLink = menu?.querySelector('a[data-dashboard-target][aria-expanded="true"]');
      if (selectedDashboardLink) {
        const selectedDashboard = document.getElementById("dashboard-panel-" + selectedDashboardLink.dataset.dashboardTarget);
        if (selectedDashboard && !selectedDashboard.hidden) return selectedDashboard;
      }
      const dashboardPanel = [...document.querySelectorAll("[data-dashboard-panel]")].find(panel => !panel.hidden);
      if (dashboardPanel) return dashboardPanel;
      const panelIds = [...(menu?.querySelectorAll("[data-panel-toggle]") || [])]
        .map(item => item.dataset.panelToggle)
        .filter(id => id && id !== "topic-section");
      return [...new Set(panelIds)].map(id => document.getElementById(id))
        .find(panel => panel && !panel.hidden) || null;
    };
    const ensurePanelCloseButton = panel => {
      if (!panel || panel.querySelector(":scope > .section-panel-close")) return;
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "section-panel-close";
      closeButton.textContent = "إغلاق";
      closeButton.setAttribute("aria-label", "إغلاق القسم والعودة إلى قائمة أقسام المنصة");
      closeButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeActiveHomePanel(true);
      });
      panel.append(closeButton);
    };
    const closeActiveHomePanel = showMenu => {
      const activePanel = getActiveHomePanel();
      if (!activePanel) return false;
      const panelIds = [...(menu?.querySelectorAll("[data-panel-toggle]") || [])]
        .map(item => item.dataset.panelToggle)
        .filter(id => id && id !== "topic-section");
      for (const id of new Set(panelIds)) {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = true;
      }
      document.querySelectorAll("[data-dashboard-panel]").forEach(panel => { panel.hidden = true; });
      document.querySelectorAll("[data-panel-toggle], #section-menu [data-dashboard-target]").forEach(item => {
        item.setAttribute("aria-expanded", "false");
      });
      const researchSection = document.getElementById("topic-section");
      if (researchSection) researchSection.hidden = false;
      closeMenuForNavigation();
      if (showMenu) {
        setMenuOpen(true);
        menuButton?.focus({ preventScroll: true });
      }
      return true;
    };
    const menuSearch = document.getElementById("section-menu-search");
    const menuSearchStatus = document.getElementById("section-menu-search-status");
    const menuSearchEmpty = document.getElementById("section-menu-search-empty");
    const menuSearchClear = document.getElementById("section-menu-search-clear");
    const menuSearchAliases = {
      flashcards: "بطاقات مراجعة حفظ تذكر تعليمية فلاش",
      "formula-library": "القوانين الرياضية المعادلات الصيغ قوانين",
      "math-assistant": "مساعد ذكي شرح سؤال اسأل",
      "solved-examples-library": "مسائل محلولة أمثلة حلول تمارين محلولة",
      "topic-section": "الأبحاث الموضوعات التدريب الأسئلة المنهاج",
      "exam-tools": "امتحان اختبار محاكاة مؤقت تجريبي",
      "student-tools": "أدوات الطالب مراجعة تقدم سجل محفوظات",
      "scientific-calculator": "حاسبة علمية حساب آلة آلة حاسبة",
      "function-plotter": "رسم الدوال المنحنيات بياني تمثيل الدوال",
      "geometry-tools": "هندسة تفاعلية أشكال مساحة حجم أشكال هندسية",
      home: "ملخص إحصائيات الإجابات مساحتي",
      "learning-progress-title": "تقدم الأبحاث بداية خطوتي التالية",
      "question-coverage-title": "تغطية بنك الأسئلة المحلولة الأسئلة المجربة",
      "weak-topic-recommendation": "اقتراح توصية بحث ضعيف مراجعة اقتراح مراجعة",
      "resume-session": "استئناف متابعة آخر جلسة أكمل",
      "recent-activity": "سجل النشاط آخر الإجابات سجل الإجابات",
      "performance-trend": "الأداء التحسن النسبة تطور",
      "activity-calendar": "تقويم الأيام الانتظام تقويم الدراسة",
      "achievement-section": "إنجازات شارات جوائز"
    };
    const normalizeMenuSearch = value => String(value || "").normalize("NFKC").toLocaleLowerCase("ar")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[\u0622\u0623\u0625]/g, "ا")
      .replace(/[ىی]/g, "ي").replace(/ک/g, "ك")
      .replace(/[،؛؟!.,:"'«»…]/g, " ")
      .replace(/\s+/g, " ").trim();
    const visibleMenuCards = () => [...(menu?.querySelectorAll("a.quick-start-card") || [])].filter(card => !card.hidden);
    const filterSectionMenu = () => {
      if (!menu || !menuSearch) return;
      const query = normalizeMenuSearch(menuSearch.value);
      const terms = query.split(/\s+/).filter(Boolean);
      let visibleCount = 0;
      menu.querySelectorAll("a.quick-start-card").forEach(card => {
        const key = card.dataset.panelToggle || card.dataset.dashboardTarget || "";
        const searchableText = normalizeMenuSearch(card.textContent + " " + (menuSearchAliases[key] || ""));
        const matches = terms.length === 0 || terms.every(term => searchableText.includes(term));
        card.hidden = !matches;
        if (matches) visibleCount += 1;
      });
      menu.querySelectorAll(".quick-start-group-label").forEach(label => {
        let next = label.nextElementSibling;
        let hasVisibleCard = false;
        while (next && !next.classList.contains("quick-start-group-label")) {
          if (next.matches("a.quick-start-card") && !next.hidden) hasVisibleCard = true;
          next = next.nextElementSibling;
        }
        label.hidden = !hasVisibleCard;
      });
      if (menuSearchStatus) {
        menuSearchStatus.textContent = query
          ? "النتائج المطابقة: " + visibleCount.toLocaleString("ar") + " من " + menu.querySelectorAll("a.quick-start-card").length.toLocaleString("ar")
          : "جميع الأقسام متاحة: " + visibleCount.toLocaleString("ar");
      }
      if (menuSearchEmpty) menuSearchEmpty.hidden = visibleCount !== 0;
      if (menuSearchClear) menuSearchClear.hidden = !query;
    };
    if (menuSearch && menuSearch.dataset.searchBound !== "true") {
      menuSearch.addEventListener("input", filterSectionMenu);
      menuSearch.addEventListener("keydown", event => {
        if (event.key === "Escape" && menuSearch.value) {
          event.preventDefault();
          event.stopPropagation();
          menuSearch.value = "";
          filterSectionMenu();
          return;
        }
        if (event.key === "ArrowDown") {
          const first = visibleMenuCards()[0];
          if (first) { event.preventDefault(); first.focus(); }
          return;
        }
        if (event.key === "Enter" && normalizeMenuSearch(menuSearch.value)) {
          const first = visibleMenuCards()[0];
          if (first) { event.preventDefault(); first.click(); }
        }
      });
      menuSearch.dataset.searchBound = "true";
    }
    if (menuSearchClear && menuSearchClear.dataset.clearBound !== "true") {
      menuSearchClear.addEventListener("click", () => {
        if (!menuSearch) return;
        menuSearch.value = "";
        filterSectionMenu();
        menuSearch.focus({ preventScroll: true });
      });
      menuSearchClear.dataset.clearBound = "true";
    }
    if (menu && menu.dataset.searchKeyboardBound !== "true") {
      menu.addEventListener("keydown", event => {
        const link = event.target instanceof Element ? event.target.closest("a.quick-start-card") : null;
        if (!link || link.hidden) return;
        const cards = visibleMenuCards();
        const index = cards.indexOf(link);
        if (index < 0) return;
        let targetIndex = -1;
        if (event.key === "ArrowDown") targetIndex = Math.min(cards.length - 1, index + 1);
        else if (event.key === "ArrowUp") {
          if (index === 0) { event.preventDefault(); menuSearch?.focus({ preventScroll: true }); return; }
          targetIndex = index - 1;
        } else if (event.key === "Home") targetIndex = 0;
        else if (event.key === "End") targetIndex = cards.length - 1;
        if (targetIndex >= 0) {
          event.preventDefault();
          cards[targetIndex]?.focus({ preventScroll: true });
        }
      });
      menu.dataset.searchKeyboardBound = "true";
    }
    if (menu && menuButton && menuButton.dataset.menuBound !== "true") {
      menuButton.addEventListener("click", () => {
        // The top menu control doubles as a quick way back from any open destination.
        if (getActiveHomePanel()) {
          closeActiveHomePanel(false);
          return;
        }
        const shouldOpen = menu.hidden || menu.classList.contains("is-closing");
        setMenuOpen(shouldOpen);
        if (shouldOpen) {
          if (menuSearch) { menuSearch.value = ""; filterSectionMenu(); }
          refreshMenuUpdateBadges(menu);
          let recentKey = "";
          try { recentKey = localStorage.getItem("mathBacSyriaRecentMenuItemV1") || ""; } catch (_) {}
          menu.querySelectorAll("a.quick-start-card").forEach(item => {
            const itemKey = item.dataset.panelToggle || item.dataset.dashboardTarget || "";
            const recent = Boolean(recentKey && itemKey === recentKey);
            item.classList.toggle("is-recently-used", recent);
            if (recent) item.setAttribute("data-recent-label", "استُخدم مؤخراً");
            else item.removeAttribute("data-recent-label");
          });
          menuSearch?.focus({ preventScroll: true });
        }
      });
      menuButton.dataset.menuBound = "true";
    }
    // Escape closes the expanded navigation and returns keyboard focus to its trigger.
    if (menu && menuButton && document.documentElement.dataset.menuEscapeBound !== "true") {
      document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        // Escape should also dismiss an active destination even though its menu is hidden.
        if (getActiveHomePanel()) {
          closeActiveHomePanel(false);
          menuButton.focus({ preventScroll: true });
          return;
        }
        if (menu.hidden) return;
        setMenuOpen(false);
        menuButton.focus({ preventScroll: true });
      });
      document.documentElement.dataset.menuEscapeBound = "true";
    }
    // Dismiss the section menu when the user clicks outside it, without
    // stealing focus from the control they intentionally clicked.
    if (menu && menuButton && document.documentElement.dataset.menuOutsideBound !== "true") {
      document.addEventListener("click", event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        // Use the original event path: an in-panel action may replace its own DOM
        // (for example, expanding a study plan) before this document listener runs.
        const path = typeof event.composedPath === "function" ? event.composedPath() : [target];
        const isWithin = element => Boolean(element && (path.includes(element) ||
          path.some(node => node instanceof Node && element.contains(node))));
        const activePanel = getActiveHomePanel();
        if (activePanel) {
          if (isWithin(activePanel) || isWithin(menu) || isWithin(menuButton)) return;
          closeActiveHomePanel(false);
          return;
        }
        if (menu.hidden) return;
        if (isWithin(menu) || isWithin(menuButton)) return;
        setMenuOpen(false);
      });
      document.documentElement.dataset.menuOutsideBound = "true";
    }
    // Capture at document level so dynamically inserted shortcuts always work,
    // regardless of which nested element receives the click.
    if (document.documentElement.dataset.panelToggleBound !== "true") {
      document.addEventListener("click", event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const link = target?.closest('a[data-panel-toggle]');
        const currentMenu = document.getElementById("section-menu");
        if (!link || !currentMenu?.contains(link)) return;
        event.preventDefault();
        markMenuUpdateSeen(link);
        try { localStorage.setItem("mathBacSyriaRecentMenuItemV1", link.dataset.panelToggle || ""); } catch (_) {}
        const panel = document.getElementById(link.dataset.panelToggle);
        if (!panel) return;
        event.__mathBacPanelHandled = true;
        const shouldClose = !panel.hidden;
        const panelIds = [...document.querySelectorAll("[data-panel-toggle]")]
          .map(item => item.dataset.panelToggle)
          .filter(Boolean);
        for (const id of new Set(panelIds)) {
          const other = document.getElementById(id);
          if (other) other.hidden = true;
        }
        document.querySelectorAll("[data-dashboard-panel]").forEach(panel => { panel.hidden = true; });
        document.querySelectorAll("[data-panel-toggle]").forEach(item => {
          item.setAttribute("aria-expanded", String(!shouldClose && item === link));
        });
        closeMenuForNavigation();
        const currentMenuButton = document.getElementById("section-menu-toggle");
        if (shouldClose) {
          // Closing a secondary panel returns the home view to its default topic selector.
          const defaultPanel = document.getElementById("topic-section");
          if (defaultPanel) {
            defaultPanel.hidden = false;
            defaultPanel.setAttribute("tabindex", "-1");
          }
          document.querySelectorAll("[data-panel-toggle]").forEach(item => {
            item.setAttribute("aria-expanded", String(item.dataset.panelToggle === "topic-section"));
          });
          currentMenuButton?.focus({ preventScroll: true });
          return;
        }
        panel.hidden = false;
        ensurePanelCloseButton(panel);
        panel.setAttribute("tabindex", "-1");
        panel.focus({ preventScroll: true });
        scrollPanelIntoView(panel);
      }, true);
      document.documentElement.dataset.panelToggleBound = "true";
    }
    document.querySelectorAll("#section-menu a:not([data-panel-toggle])").forEach(link => {
      if (link.dataset.menuCloseBound === "true") return;
      link.addEventListener("click", event => {
        const panelKey = link.dataset.dashboardTarget;
        if (panelKey) {
          event.preventDefault();
          markMenuUpdateSeen(link);
          try { localStorage.setItem("mathBacSyriaRecentMenuItemV1", panelKey); } catch (_) {}
          const panels = [...document.querySelectorAll("[data-dashboard-panel]")];
          const panel = panels.find(item => item.dataset.dashboardPanel === panelKey);
          if (panel) {
            panels.forEach(item => { item.hidden = true; });
            const otherPanelIds = [...document.querySelectorAll("[data-panel-toggle]")]
              .map(item => item.dataset.panelToggle).filter(Boolean);
            for (const id of new Set(otherPanelIds)) {
              const other = document.getElementById(id);
              if (other) other.hidden = true;
            }
            document.querySelectorAll("[data-panel-toggle]").forEach(item => item.setAttribute("aria-expanded", "false"));
            panel.hidden = false;
            ensurePanelCloseButton(panel);
            document.querySelectorAll("#section-menu [data-dashboard-target]").forEach(item => {
              item.setAttribute("aria-expanded", String(item === link));
            });
            closeMenuForNavigation();
            panel.setAttribute("tabindex", "-1");
            panel.focus({ preventScroll: true });
            scrollPanelIntoView(panel);
            return;
          }
        }
        if (menu) setMenuOpen(false);
      });
      link.dataset.menuCloseBound = "true";
    });
  };
  bindHomePanelToggles();
  window.addEventListener("load", () => {
    ensureExamControls();
    bindHomePanelToggles();
  });
})();
