function preferredScrollBehavior(){
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
}
let currentTopic = "";
let quizQuestions = [];
let index = 0;
let correctCount = 0;
let answered = false;
let reviewMode = false;
let reviewQuestions = [];
let sessionMistakes = [];
const STORAGE_KEY = "mathBacSyriaProgressV1";
const LAST_TOPIC_KEY = "mathBacSyriaLastTopicV1";
const TRAINING_SESSION_KEY = "mathBacSyriaTrainingSessionV1";
const HOMEPAGE_FILTERS_KEY = "mathBacSyriaHomepageFiltersV1";
const DASHBOARD_PREFERENCES_KEY = "mathBacSyriaDashboardPreferencesV1";
const DEFAULT_DASHBOARD_PREFERENCES = Object.freeze({
  density: "comfortable",
  hideUnlockedAchievements: false,
  hideAchievementDescriptions: false,
  showNextGoal: true
});
function loadDashboardPreferences(){
  try {
    const saved = JSON.parse(localStorage.getItem(DASHBOARD_PREFERENCES_KEY) || "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { ...DEFAULT_DASHBOARD_PREFERENCES };
    return {
      density: ["comfortable", "compact"].includes(saved.density) ? saved.density : "comfortable",
      hideUnlockedAchievements: saved.hideUnlockedAchievements === true,
      hideAchievementDescriptions: saved.hideAchievementDescriptions === true,
      showNextGoal: saved.showNextGoal !== false
    };
  } catch (_) { return { ...DEFAULT_DASHBOARD_PREFERENCES }; }
}
let dashboardPreferences = loadDashboardPreferences();
function saveDashboardPreferences(){
  try { localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(dashboardPreferences)); }
  catch (_) {
    const status = $("dashboard-preferences-status");
    if (status) status.textContent = "تعذر حفظ التفضيلات على هذا الجهاز؛ تحقق من مساحة التخزين.";
  }
}
function applyDashboardPreferences(){
  document.body.classList.toggle("dashboard-compact", dashboardPreferences.density === "compact");
  document.body.classList.toggle("dashboard-hide-achievement-descriptions", dashboardPreferences.hideAchievementDescriptions);
  const nextGoal = $("achievement-next-goal");
  if (nextGoal) nextGoal.hidden = !dashboardPreferences.showNextGoal;
  const density = $("dashboard-density");
  const hideUnlocked = $("dashboard-hide-unlocked");
  const hideDescriptions = $("dashboard-hide-achievement-descriptions");
  const showNextGoal = $("dashboard-show-next-goal");
  if (density) density.value = dashboardPreferences.density;
  if (hideUnlocked) hideUnlocked.checked = dashboardPreferences.hideUnlockedAchievements;
  if (hideDescriptions) hideDescriptions.checked = dashboardPreferences.hideAchievementDescriptions;
  if (showNextGoal) showNextGoal.checked = dashboardPreferences.showNextGoal;
}
function initDashboardPreferences(){
  const density = $("dashboard-density");
  const hideUnlocked = $("dashboard-hide-unlocked");
  const hideDescriptions = $("dashboard-hide-achievement-descriptions");
  const showNextGoal = $("dashboard-show-next-goal");
  const reset = $("dashboard-preferences-reset");
  const status = $("dashboard-preferences-status");
  if (!density || !hideUnlocked || !hideDescriptions || !showNextGoal || !reset) return;
  const update = message => {
    dashboardPreferences = {
      density: density.value === "compact" ? "compact" : "comfortable",
      hideUnlockedAchievements: hideUnlocked.checked,
      hideAchievementDescriptions: hideDescriptions.checked,
      showNextGoal: showNextGoal.checked
    };
    saveDashboardPreferences();
    applyDashboardPreferences();
    renderAchievements();
    if (status) status.textContent = message || "حُفظت تفضيلات مساحتك التعليمية على هذا الجهاز.";
  };
  density.addEventListener("change", () => update());
  hideUnlocked.addEventListener("change", () => update());
  hideDescriptions.addEventListener("change", () => update());
  showNextGoal.addEventListener("change", () => update());
  reset.addEventListener("click", () => {
    dashboardPreferences = { ...DEFAULT_DASHBOARD_PREFERENCES };
    saveDashboardPreferences();
    applyDashboardPreferences();
    renderAchievements();
    if (status) status.textContent = "أُعيدت تفضيلات مساحتك التعليمية إلى الإعدادات الافتراضية.";
  });
  applyDashboardPreferences();
}
const $ = (id) => document.getElementById(id);
// Question records are assembled once by merge-questions.js before app initialization.
const letters = ["أ","ب","ج","د"];
const emptyProgress = () => ({ answered: 0, correct: 0, mistakes: {}, topicStats: {}, attempts: [], seenQuestions: {} });
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
function loadProgress(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!isRecord(saved)) return emptyProgress();
    const toCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
    const answered = toCount(saved.answered);
    const topicStats = {};
    if (isRecord(saved.topicStats)) {
      for (const [topic, stat] of Object.entries(saved.topicStats)) {
        if (!topic || !isRecord(stat)) continue;
        const topicAnswered = toCount(stat.answered);
        topicStats[topic] = { answered: topicAnswered, correct: Math.min(toCount(stat.correct), topicAnswered) };
      }
    }
    const attempts = Array.isArray(saved.attempts) ? saved.attempts.filter(attempt =>
      isRecord(attempt) &&
      typeof attempt.topic === "string" &&
      typeof attempt.correct === "boolean" &&
      typeof attempt.date === "string" &&
      Number.isFinite(Date.parse(attempt.date))
    ).slice(0, 100).map(attempt => ({ topic: attempt.topic, correct: attempt.correct, date: attempt.date })) : [];
    const seenQuestions = {};
    if (isRecord(saved.seenQuestions)) {
      for (const [key, seen] of Object.entries(saved.seenQuestions)) {
        if (seen === true) seenQuestions[key] = true;
      }
    }
    return {
      ...emptyProgress(),
      answered,
      correct: Math.min(toCount(saved.correct), answered),
      mistakes: isRecord(saved.mistakes) ? saved.mistakes : {},
      topicStats,
      attempts,
      seenQuestions
    };
  } catch(e) { return emptyProgress(); }
}
let progressData = loadProgress();
function saveProgress(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData)); }
  catch(e) { console.warn("تعذر حفظ التقدم محلياً", e); }
}
function questionKey(q){ return `${q.topic}::${q.q}`; }
function countSeenQuestions(topic = "") {
  return questions.reduce((count, q) => count + ((!topic || q.topic === topic) && progressData.seenQuestions[questionKey(q)] ? 1 : 0), 0);
}
function renderPerformanceTrend(){
  const section = $("performance-trend");
  const chart = $("performance-trend-chart");
  const summary = $("performance-trend-summary");
  if (!section || !chart || !summary) return;
  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : [])
    .filter(attempt => attempt && typeof attempt.topic === "string" &&
      Array.isArray(topics) && topics.includes(attempt.topic) &&
      typeof attempt.correct === "boolean" && Number.isFinite(Date.parse(attempt.date)));
  const now = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, "0"), String(day.getDate()).padStart(2, "0")].join("-");
    const attempts = validAttempts.filter(attempt => {
      const date = new Date(attempt.date);
      return date.getFullYear() === day.getFullYear() &&
        date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
    });
    const correct = attempts.filter(attempt => attempt.correct).length;
    const dateLabel = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" }).format(day);
    const todayKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    days.push({
      key,
      label: new Intl.DateTimeFormat("ar", { weekday: "short" }).format(day),
      dateLabel,
      isToday: key === todayKey,
      count: attempts.length,
      correct,
      rate: attempts.length ? Math.round(correct / attempts.length * 100) : 0
    });
  }
  const total = days.reduce((sum, day) => sum + day.count, 0);
  chart.replaceChildren();
  syncDashboardEmptyState(section, total > 0);
  if (!total) {
    summary.textContent = "لا توجد إجابات مسجلة خلال آخر ٧ أيام.";
    return;
  }
  for (const day of days) {
    const item = document.createElement("li");
    item.className = "performance-trend-day" + (day.isToday ? " is-today" : "");
    item.dataset.date = day.key;
    item.dataset.count = String(day.count);
    item.dataset.accuracy = String(day.rate);
    item.title = day.dateLabel + ": " + day.count.toLocaleString("ar") + " إجابة";
    const rate = document.createElement("strong");
    rate.className = "performance-trend-rate";
    rate.textContent = day.count ? day.rate.toLocaleString("ar") + "٪" : "—";
    const track = document.createElement("div");
    track.className = "performance-trend-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", day.dateLabel + " " + day.label + ": نسبة الإجابات الصحيحة");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(day.rate));
    track.setAttribute("aria-valuetext", day.count
      ? day.correct.toLocaleString("ar") + " إجابة صحيحة من " + day.count.toLocaleString("ar")
      : "لا توجد إجابات مسجلة");
    const fill = document.createElement("span");
    fill.className = "performance-trend-fill";
    fill.style.height = (day.count ? Math.max(day.rate, 4) : 0) + "%";
    track.append(fill);
    const label = document.createElement("span");
    label.className = "performance-trend-label";
    label.textContent = day.label;
    const count = document.createElement("small");
    count.className = "performance-trend-count";
    count.textContent = day.count.toLocaleString("ar") + " إجابة";
    item.append(rate, track, label, count);
    chart.append(item);
  }
  const correctTotal = days.reduce((sum, day) => sum + day.correct, 0);
  const weeklyRate = Math.round(correctTotal / total * 100);
  const activeDays = days.filter(day => day.count > 0);
  const averagePerActiveDay = Math.round(total / activeDays.length);
  const bestDay = activeDays.slice().sort((a, b) => b.count - a.count || b.rate - a.rate)[0];
  section.dataset.totalAnswers = String(total);
  section.dataset.activeDays = String(activeDays.length);
  section.dataset.weeklyAccuracy = String(weeklyRate);
  summary.textContent = "خلال آخر ٧ أيام: " + total.toLocaleString("ar") +
    " إجابة خلال " + activeDays.length.toLocaleString("ar") + " أيام نشطة، بمتوسط " +
    averagePerActiveDay.toLocaleString("ar") + " إجابة في اليوم النشط ودقة " +
    weeklyRate.toLocaleString("ar") + "٪. أكثر الأيام نشاطاً: " + bestDay.dateLabel +
    " (" + bestDay.count.toLocaleString("ar") + " إجابة).";
}

function renderActivityCalendar(){
  const section = $("activity-calendar");
  const grid = $("activity-calendar-grid");
  const summary = $("activity-calendar-summary");
  if (!section || !grid || !summary) return;
  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : []).filter(attempt =>
    attempt && typeof attempt.topic === "string" && Array.isArray(topics) && topics.includes(attempt.topic) &&
    typeof attempt.correct === "boolean" && Number.isFinite(Date.parse(attempt.date)));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const countsByDay = new Map();
  for (const attempt of validAttempts) {
    const date = new Date(attempt.date);
    const key = [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
    countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
  }
  const days = [];
  for (let offset = 27; offset >= 0; offset--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate()-offset);
    const key = [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
    const count = countsByDay.get(key) || 0;
    days.push({ key, date, count, weekday: new Intl.DateTimeFormat("ar",{weekday:"short"}).format(date),
      label: new Intl.DateTimeFormat("ar",{day:"numeric",month:"long",year:"numeric"}).format(date) });
  }
  grid.replaceChildren();
  for (const day of days) {
    const cell = document.createElement("li");
    const level = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count <= 3 ? 2 : day.count <= 6 ? 3 : 4;
    const isToday = day.key === [today.getFullYear(), String(today.getMonth()+1).padStart(2,"0"), String(today.getDate()).padStart(2,"0")].join("-");
    cell.className = "activity-calendar-day level-" + level + (isToday ? " is-today" : "");
    cell.textContent = day.date.getDate().toLocaleString("ar");
    cell.title = (isToday ? "اليوم · " : "") + day.label + ": " + day.count.toLocaleString("ar") + " إجابة";
    cell.setAttribute("aria-label", (isToday ? "اليوم، " : "") + day.weekday + " " + day.label + ": " + day.count.toLocaleString("ar") + " إجابة");
    cell.setAttribute("data-date", day.key);
    cell.setAttribute("data-count", String(day.count));
    grid.append(cell);
  }
  const lastSeven = days.slice(-7);
  const weeklyAnswers = lastSeven.reduce((sum, day) => sum + day.count, 0);
  const activeDays = lastSeven.filter(day => day.count > 0).length;
  const dailyAverage = activeDays ? Math.round(weeklyAnswers / activeDays) : 0;
  summary.textContent = "آخر ٧ أيام: " + weeklyAnswers.toLocaleString("ar") + " إجابة خلال " +
    activeDays.toLocaleString("ar") + " أيام نشطة" +
    (activeDays ? "، بمتوسط " + dailyAverage.toLocaleString("ar") + " إجابة في اليوم النشط." : ".");
  section.dataset.totalAnswers = String(weeklyAnswers);
  section.dataset.activeDays = String(activeDays);
}

function renderRecentActivity(){
  const section = $("recent-activity");
  const list = $("recent-activity-list");
  if (!section || !list) return;
  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : [])
    .filter(attempt => attempt && typeof attempt.topic === "string" &&
      Array.isArray(topics) && topics.includes(attempt.topic) &&
      typeof attempt.correct === "boolean" && Number.isFinite(Date.parse(attempt.date)));
  // Sort defensively: imported or migrated progress may not preserve newest-first order.
  const sortedAttempts = validAttempts.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const topicActivity = new Map();
  for (const attempt of sortedAttempts) {
    let item = topicActivity.get(attempt.topic);
    if (!item) {
      item = { topic: attempt.topic, count: 0, correct: 0, date: attempt.date };
      topicActivity.set(attempt.topic, item);
    }
    item.count += 1;
    if (attempt.correct) item.correct += 1;
  }
  const recentTopics = Array.from(topicActivity.values()).slice(0, 5).map(item => ({
    ...item,
    rate: Math.round(item.correct / item.count * 100)
  }));
  list.replaceChildren();
  syncDashboardEmptyState(section, recentTopics.length > 0);
  const summary = $("recent-activity-summary");
  if (summary) {
    summary.textContent = recentTopics.length
      ? "يعرض " + recentTopics.length.toLocaleString("ar") + " أبحاث حديثة من " + validAttempts.length.toLocaleString("ar") + " إجابة محفوظة."
      : "لم تسجل إجابات تدريبية بعد.";
  }
  const dateFormatter = new Intl.DateTimeFormat("ar", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  for (const item of recentTopics) {
    const row = document.createElement("li");
    row.className = "recent-activity-item";
    const details = document.createElement("div");
    details.className = "recent-activity-details";
    const title = document.createElement("strong");
    title.textContent = item.topic;
    const meta = document.createElement("span");
    meta.textContent = item.count.toLocaleString("ar") + " إجابة · " +
      item.rate.toLocaleString("ar") + "٪ صحيحة";
    row.dataset.topic = item.topic;
    row.dataset.attemptCount = String(item.count);
    row.dataset.accuracy = String(item.rate);
    const date = document.createElement("time");
    date.dateTime = item.date;
    date.title = dateFormatter.format(new Date(item.date));
    date.textContent = formatTopicActivity(item.date);
    details.append(title, meta, date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-activity-button";
    button.textContent = "تدرّب مجدداً";
    button.setAttribute("aria-label", "تدرّب مجدداً في بحث " + item.topic);
    button.addEventListener("click", () => startQuiz(item.topic));
    row.append(details, button);
    list.append(row);
  }
  renderRecentAttemptHistory();
}

function renderRecentAttemptHistory(){
  const list = $("recent-attempt-history-list");
  const summary = $("recent-attempt-history-summary");
  const empty = $("recent-attempt-history-empty");
  const topicFilter = $("recent-history-topic-filter");
  const periodFilter = $("recent-history-period-filter");
  const resultFilter = $("recent-history-result-filter");
  if (!list || !summary || !empty || !topicFilter || !periodFilter || !resultFilter) return;

  if (!topicFilter.dataset.initialized) {
    topicFilter.replaceChildren(new Option("كل الأبحاث", "all"));
    (Array.isArray(topics) ? topics : []).forEach(topic => topicFilter.add(new Option(topic, topic)));
    topicFilter.dataset.initialized = "true";
  }
  if (!list.dataset.filtersBound) {
    [topicFilter, periodFilter, resultFilter].forEach(control =>
      control.addEventListener("change", renderRecentAttemptHistory));
    list.dataset.filtersBound = "true";
  }

  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : [])
    .filter(attempt => attempt && typeof attempt.topic === "string" &&
      Array.isArray(topics) && topics.includes(attempt.topic) &&
      typeof attempt.correct === "boolean" && Number.isFinite(Date.parse(attempt.date)));
  const topic = topicFilter.value;
  const period = periodFilter.value;
  const result = resultFilter.value;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === "7") start.setDate(start.getDate() - 6);
  else if (period === "30") start.setDate(start.getDate() - 29);
  const matching = validAttempts.filter(attempt => {
    if (topic !== "all" && attempt.topic !== topic) return false;
    if (result === "correct" && !attempt.correct) return false;
    if (result === "incorrect" && attempt.correct) return false;
    if (period !== "all" && new Date(attempt.date) < start) return false;
    return true;
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const visible = matching.slice(0, 20);
  list.replaceChildren();
  const correctCount = matching.filter(attempt => attempt.correct).length;
  const accuracy = matching.length ? Math.round(correctCount / matching.length * 100) : 0;
  summary.textContent = matching.length
    ? "تطابق " + matching.length.toLocaleString("ar") + " محاولة مع المرشحات، بدقة " +
      accuracy.toLocaleString("ar") + "٪. " + visible.length.toLocaleString("ar") +
      " معروضة من أصل " + matching.length.toLocaleString("ar") + "."
    : "لا توجد محاولات تطابق المرشحات الحالية.";
  empty.hidden = matching.length > 0;
  empty.textContent = validAttempts.length
    ? "لا توجد نتائج لهذا الاختيار. جرّب تغيير المرشحات."
    : "سيظهر سجل المحاولات هنا بعد حل الأسئلة.";
  const formatter = new Intl.DateTimeFormat("ar", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  for (const attempt of visible) {
    const row = document.createElement("li");
    row.className = "recent-attempt-item";
    row.dataset.topic = attempt.topic;
    row.dataset.result = attempt.correct ? "correct" : "incorrect";
    const details = document.createElement("div");
    details.className = "recent-attempt-details";
    const title = document.createElement("strong");
    title.textContent = attempt.topic;
    const status = document.createElement("span");
    status.className = "recent-attempt-status " + (attempt.correct ? "is-correct" : "is-incorrect");
    status.textContent = attempt.correct ? "إجابة صحيحة" : "تحتاج إلى مراجعة";
    const date = document.createElement("time");
    date.dateTime = attempt.date;
    date.textContent = formatter.format(new Date(attempt.date));
    details.append(title, status, date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-activity-button";
    button.textContent = "تدرّب مجدداً";
    button.setAttribute("aria-label", "تدرّب مجدداً في بحث " + attempt.topic);
    button.addEventListener("click", () => startQuiz(attempt.topic));
    row.append(details, button);
    list.append(row);
  }
  list.setAttribute("aria-label", "أحدث " + visible.length.toLocaleString("ar") + " محاولة تدريبية");
}

function renderWeakTopicRecommendation(){
  const section = $("weak-topic-recommendation");
  const name = $("weak-topic-name");
  const rateNode = $("weak-topic-rate");
  const detail = $("weak-topic-detail");
  const reasonNode = $("weak-topic-reason");
  const button = $("weak-topic-button");
  if (!section || !name || !rateNode || !detail || !button) return;

  // نحتاج عينة كافية قبل تقديم توصية قد تؤثر في خطة مراجعة الطالب.
  const minimumSample = 5;
  const validTopics = (Array.isArray(topics) ? topics : [])
    .filter(topic => questions.some(question => question.topic === topic));
  const mistakes = progressData.mistakes && typeof progressData.mistakes === "object"
    ? Object.values(progressData.mistakes) : [];
  const startedTopics = validTopics.map(topic => {
    const stat = progressData.topicStats && progressData.topicStats[topic];
    const answered = stat && Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
    const correct = stat && Number.isSafeInteger(stat.correct) && stat.correct >= 0
      ? Math.min(stat.correct, answered) : 0;
    const mistakeCount = mistakes.filter(item => item && item.topic === topic).length;
    return { topic, answered, correct, mistakeCount, rate: answered ? Math.round(correct / answered * 100) : 0 };
  }).filter(item => item.answered > 0);
  const candidates = startedTopics.filter(item => item.answered >= minimumSample);
  candidates.sort((a, b) =>
    a.rate - b.rate || b.mistakeCount - a.mistakeCount ||
    b.answered - a.answered || a.topic.localeCompare(b.topic, "ar")
  );
  const weakest = candidates[0];
  if (!weakest) {
    let emptyMessage = "ابدأ بحل الأسئلة في أحد الأبحاث، وسنقترح عليك ما يستحق المراجعة.";
    if (startedTopics.length) {
      const bestSample = Math.max(...startedTopics.map(item => item.answered));
      const remaining = Math.max(1, minimumSample - bestSample);
      emptyMessage = "أجب عن " + remaining.toLocaleString("ar") +
        " إجابة إضافية على الأقل في أحد الأبحاث حتى نبني اقتراح المراجعة على عينة كافية.";
    }
    section.removeAttribute("data-topic");
    section.removeAttribute("data-accuracy");
    section.removeAttribute("data-sample-size");
    section.removeAttribute("data-mistake-count");
    section.removeAttribute("data-confidence");
    section.removeAttribute("aria-label");
    name.textContent = "";
    rateNode.textContent = "—";
    detail.textContent = "";
    if (reasonNode) reasonNode.textContent = "";
    button.textContent = "ابدأ مراجعة البحث";
    button.setAttribute("aria-label", "ابدأ التدريب بعد توفر بيانات كافية");
    button.onclick = null;
    syncDashboardEmptyState(section, false, emptyMessage);
    return;
  }

  const overallAnswered = startedTopics.reduce((sum, item) => sum + item.answered, 0);
  const overallCorrect = startedTopics.reduce((sum, item) => sum + item.correct, 0);
  const overallRate = overallAnswered ? Math.round(overallCorrect / overallAnswered * 100) : weakest.rate;
  const belowAverage = Math.max(0, overallRate - weakest.rate);
  const confidence = weakest.answered >= 10 ? "عينة أوسع" : "عينة أولية";
  const reason = weakest.mistakeCount
    ? "لديك " + weakest.mistakeCount.toLocaleString("ar") + " أخطاء محفوظة في هذا البحث، لذلك يستحق مراجعتها."
    : belowAverage >= 5
      ? "دقتك في هذا البحث أقل من متوسط أدائك في الأبحاث التي تدربت عليها بـ " + belowAverage.toLocaleString("ar") + " نقاط مئوية."
      : "هذا البحث يملك أدنى نسبة إجابات صحيحة بين الأبحاث ذات العينات الكافية.";
  section.dataset.topic = weakest.topic;
  section.dataset.accuracy = String(weakest.rate);
  section.dataset.sampleSize = String(weakest.answered);
  section.dataset.mistakeCount = String(weakest.mistakeCount);
  section.dataset.confidence = confidence;
  section.setAttribute("aria-label", "توصية مراجعة بحث " + weakest.topic + "، دقة " + weakest.rate + " بالمئة");
  syncDashboardEmptyState(section, true);
  name.textContent = weakest.topic;
  rateNode.textContent = weakest.rate.toLocaleString("ar") + "٪";
  detail.textContent = weakest.answered.toLocaleString("ar") + " إجابات مسجلة، منها " +
    weakest.correct.toLocaleString("ar") + " صحيحة. " + confidence +
    " مبنية على " + weakest.answered.toLocaleString("ar") + " إجابات؛ لا تمثل حكماً نهائياً على مستواك.";
  if (reasonNode) reasonNode.textContent = reason;
  button.textContent = "ابدأ مراجعة " + weakest.topic;
  button.setAttribute("aria-label", "ابدأ مراجعة البحث " + weakest.topic + "، " + reason);
  button.onclick = () => startQuiz(weakest.topic);
}

function renderAchievements(){
  const section = $("achievement-section");
  const list = $("achievement-list");
  const summary = $("achievement-summary");
  const nextGoal = $("achievement-next-goal");
  if (!section || !list || !summary) return;
  const answered = Number.isSafeInteger(progressData.answered) && progressData.answered > 0 ? progressData.answered : 0;
  const correct = Number.isSafeInteger(progressData.correct) && progressData.correct >= 0 ? Math.min(progressData.correct, answered) : 0;
  const rate = answered ? Math.round(correct / answered * 100) : 0;
  const topicNames = Array.isArray(topics) ? topics : [];
  const startedTopics = topicNames.filter(topic => {
    const stat = progressData.topicStats && progressData.topicStats[topic];
    return stat && Number.isSafeInteger(stat.answered) && stat.answered > 0;
  }).length;
  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : []).filter(attempt =>
    attempt && typeof attempt.topic === "string" && topicNames.includes(attempt.topic) &&
    typeof attempt.correct === "boolean" && Number.isFinite(Date.parse(attempt.date)));
  const activeDates = new Set(validAttempts.map(attempt => {
    const date = new Date(attempt.date);
    return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
  }));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateKey = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
  let streak = 0;
  const firstDay = activeDates.has(dateKey(today)) ? 0 : 1;
  for (let offset = firstDay; offset < 100; offset++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()-offset);
    if (!activeDates.has(dateKey(day))) break;
    streak++;
  }
  const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate()-29);
  const activeDaysLast30 = new Set(validAttempts.filter(attempt => new Date(attempt.date) >= thirtyDaysAgo)
    .map(attempt => dateKey(new Date(attempt.date)))).size;
  const badges = [
    { id:"first-answer", icon:"🌱", title:"البداية الأولى", description:"سجّلت أول إجابة تدريبية.", value:answered, target:1, unlocked:answered>=1, progressText:answered>=1?"تم الإنجاز":"ابدأ بحل سؤال واحد" },
    { id:"ten-answers", icon:"✍️", title:"خطوات ثابتة", description:"أكملت ١٠ إجابات تدريبية.", value:answered, target:10, unlocked:answered>=10, progressText:answered.toLocaleString("ar")+" / ١٠ إجابات" },
    { id:"fifty-answers", icon:"📘", title:"مثابر", description:"أكملت ٥٠ إجابة تدريبية.", value:answered, target:50, unlocked:answered>=50, progressText:answered.toLocaleString("ar")+" / ٥٠ إجابة" },
    { id:"hundred-answers", icon:"🏅", title:"مئة خطوة", description:"أكملت ١٠٠ إجابة تدريبية.", value:answered, target:100, unlocked:answered>=100, progressText:answered.toLocaleString("ar")+" / ١٠٠ إجابة" },
    { id:"quarter-thousand", icon:"📚", title:"ربع ألف إجابة", description:"أكملت ٢٥٠ إجابة تدريبية.", value:answered, target:250, unlocked:answered>=250, progressText:answered.toLocaleString("ar")+" / ٢٥٠ إجابة" },
    { id:"five-hundred", icon:"🏆", title:"خمسمئة خطوة", description:"أكملت ٥٠٠ إجابة تدريبية.", value:answered, target:500, unlocked:answered>=500, progressText:answered.toLocaleString("ar")+" / ٥٠٠ إجابة" },
    { id:"explorer", icon:"🧭", title:"مستكشف الأبحاث", description:"بدأت التدريب في خمسة أبحاث مختلفة.", value:startedTopics, target:5, unlocked:startedTopics>=5, progressText:startedTopics.toLocaleString("ar")+" / ٥ أبحاث" },
    { id:"ten-topics", icon:"🗺️", title:"رحّالة المنهاج", description:"بدأت التدريب في عشرة أبحاث مختلفة.", value:startedTopics, target:10, unlocked:startedTopics>=10, progressText:startedTopics.toLocaleString("ar")+" / ١٠ أبحاث" },
    { id:"all-topics", icon:"🎓", title:"استكشاف المنهاج", description:"بدأت التدريب في جميع الأبحاث المتاحة.", value:startedTopics, target:Math.max(1,topicNames.length), unlocked:topicNames.length>0 && startedTopics>=topicNames.length, progressText:startedTopics.toLocaleString("ar")+" / "+topicNames.length.toLocaleString("ar")+" بحث" },
    { id:"accuracy", icon:"🎯", title:"دقة مميزة", description:"حققت دقة ٨٠٪ على الأقل بعد ١٠ إجابات.", value:answered>=10?rate:answered, target:answered>=10?80:10, unlocked:answered>=10 && rate>=80, progressPercent:answered>=10?Math.min(100,Math.round(rate/80*100)):Math.round(answered/10*100), progressText:answered<10?"أكمل ١٠ إجابات أولاً":rate.toLocaleString("ar")+"٪ من الدقة المطلوبة ٨٠٪" },
    { id:"accuracy-90", icon:"💎", title:"إتقان عالٍ", description:"حققت دقة ٩٠٪ على الأقل بعد ٢٠ إجابة.", value:answered>=20?rate:answered, target:answered>=20?90:20, unlocked:answered>=20 && rate>=90, progressPercent:answered>=20?Math.min(100,Math.round(rate/90*100)):Math.round(answered/20*100), progressText:answered<20?answered.toLocaleString("ar")+" / ٢٠ إجابة أولاً":rate.toLocaleString("ar")+"٪ من الدقة المطلوبة ٩٠٪" },
    { id:"streak", icon:"🔥", title:"ثلاثة أيام متتالية", description:"تدرّبت في ثلاثة أيام متتابعة.", value:streak, target:3, unlocked:streak>=3, progressText:streak.toLocaleString("ar")+" / ٣ أيام" },
    { id:"streak-seven", icon:"🌟", title:"أسبوع من الالتزام", description:"تدرّبت في سبعة أيام متتابعة.", value:streak, target:7, unlocked:streak>=7, progressText:streak.toLocaleString("ar")+" / ٧ أيام" },
    { id:"active-five", icon:"📅", title:"حضور منتظم", description:"تدرّبت في خمسة أيام مختلفة خلال آخر ٣٠ يوماً.", value:activeDaysLast30, target:5, unlocked:activeDaysLast30>=5, progressText:activeDaysLast30.toLocaleString("ar")+" / ٥ أيام نشطة" }
  ];
  list.replaceChildren();
  for (const badge of badges) {
    const item = document.createElement("li");
    item.className = "achievement-card" + (badge.unlocked ? " is-unlocked" : " is-locked");
    item.dataset.achievement = badge.id;
    item.dataset.unlocked = String(badge.unlocked);
    const icon = document.createElement("span"); icon.className = "achievement-icon"; icon.textContent = badge.icon;
    const copy = document.createElement("div"); copy.className = "achievement-copy";
    const title = document.createElement("strong"); title.textContent = badge.title;
    const description = document.createElement("span"); description.textContent = badge.description;
    const progress = document.createElement("small"); progress.textContent = badge.progressText;
    const progressPercent = badge.progressPercent ?? (badge.target ? Math.round(Math.min(1,badge.value/badge.target)*100) : 0);
    const track = document.createElement("div");
    track.className = "achievement-progress-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "التقدم نحو إنجاز " + badge.title);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(progressPercent));
    track.setAttribute("aria-valuetext", badge.progressText);
    const fill = document.createElement("span");
    fill.className = "achievement-progress-fill";
    fill.style.width = progressPercent + "%";
    track.append(fill);
    copy.append(title, description, progress, track);
    const status = document.createElement("span"); status.className = "achievement-status"; status.textContent = badge.unlocked ? "مكتملة" : "قيد التقدم";
    item.append(icon, copy, status);
    item.hidden = badge.unlocked && dashboardPreferences.hideUnlockedAchievements;
    list.append(item);
  }
  const unlockedCount = badges.filter(badge => badge.unlocked).length;
  const completion = Math.round(unlockedCount / badges.length * 100);
  summary.textContent = "أنجزت " + unlockedCount.toLocaleString("ar") + " من " + badges.length.toLocaleString("ar") +
    " إنجازاً (" + completion.toLocaleString("ar") + "٪).";
  const next = badges.filter(badge => !badge.unlocked).sort((a,b) =>
    (b.progressPercent ?? (b.target ? b.value/b.target*100 : 0)) -
    (a.progressPercent ?? (a.target ? a.value/a.target*100 : 0))
  )[0];
  if (nextGoal) nextGoal.textContent = next
    ? "هدفك التالي: " + next.title + " — " + next.progressText + "."
    : "أكملت جميع الإنجازات الحالية! واصل التعلّم.";
  section.dataset.unlockedCount = String(unlockedCount);
  section.dataset.totalCount = String(badges.length);
  section.dataset.completion = String(completion);
}
function renderPersonalizedLearningPath(){
  const section = $("personalized-learning-path");
  const list = $("learning-path-list");
  if (!section || !list) return;
  const topicNames = (Array.isArray(topics) ? topics : []).filter(topic =>
    typeof topic === "string" && questions.some(question => question.topic === topic)
  );
  const stats = isRecord(progressData.topicStats) ? progressData.topicStats : {};
  const seenQuestions = isRecord(progressData.seenQuestions) ? progressData.seenQuestions : {};
  const rows = topicNames.map((topic, order) => {
    const stat = isRecord(stats[topic]) ? stats[topic] : {};
    const answered = Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
    const correct = Number.isSafeInteger(stat.correct) && stat.correct >= 0 ? Math.min(stat.correct, answered) : 0;
    const bankCount = questions.filter(question => question.topic === topic).length;
    const seenCount = questions.reduce((count, question) =>
      count + (question.topic === topic && seenQuestions[questionKey(question)] === true ? 1 : 0), 0);
    const accuracy = answered ? Math.round(correct / answered * 100) : null;
    const coverage = bankCount ? Math.round(seenCount / bankCount * 100) : 0;
    let priority = 0;
    let reason = "وسّع تدريبك إلى أسئلة جديدة من هذا البحث.";
    if (!answered) {
      priority = 100;
      reason = "لم تبدأ التدريب في هذا البحث بعد؛ ابدأ بالأسئلة الأساسية وتعرّف إلى أفكاره.";
    } else if (answered < 10) {
      priority = 75 + (10 - answered);
      reason = "لديك " + answered.toLocaleString("ar") + " إجابات فقط؛ أكمل عينة من ١٠ إجابات قبل تقدير الإتقان.";
    } else if (accuracy < 60) {
      priority = 70 + (60 - accuracy);
      reason = "دقتك الحالية " + accuracy.toLocaleString("ar") + "٪؛ راجع خطوات الحل ثم أعد التدريب.";
    } else if (accuracy < 85) {
      priority = 45 + (85 - accuracy);
      reason = "دقتك " + accuracy.toLocaleString("ar") + "٪؛ ثبّت المهارات قبل الانتقال إلى مستوى أعلى.";
    } else if (coverage < 35) {
      priority = 25 + (35 - coverage);
      reason = "أداؤك جيد في الإجابات المسجلة؛ وسّع التغطية إلى أسئلة جديدة من البنك.";
    } else {
      priority = 10;
      reason = "حافظ على مستواك وجرّب أسئلة متوسطة ومتقدمة.";
    }
    return { topic, order, answered, correct, accuracy, bankCount, seenCount, coverage, priority, reason };
  });
  const totalAnswers = rows.reduce((sum, row) => sum + row.answered, 0);
  const started = rows.filter(row => row.answered > 0).length;
  const reliable = rows.filter(row => row.answered >= 10).length;
  const totalBank = rows.reduce((sum, row) => sum + row.bankCount, 0);
  const seenTotal = rows.reduce((sum, row) => sum + row.seenCount, 0);
  const coveragePercent = totalBank ? Math.round(seenTotal / totalBank * 100) : 0;
  const overallAccuracy = totalAnswers
    ? Math.round(rows.reduce((sum, row) => sum + row.correct, 0) / totalAnswers * 100) : null;
  let level = "بانتظار بداية التدريب";
  let intro = "ابدأ التدريب في أحد الأبحاث، وسنكوّن مسارك من بياناتك الفعلية.";
  let note = "لا نصنّف مستواك قبل توفر بيانات كافية. هذا مؤشر تدريبي إرشادي وليس حكماً نهائياً.";
  if (totalAnswers > 0) {
    if (totalAnswers < 10 || reliable < 2) {
      level = "مؤشر أولي";
      intro = "لدينا بداية من سجلّك، لكن نحتاج إلى مزيد من الإجابات في بحثين على الأقل لتحسين دقة التوجيه.";
      note = "سجّلت " + totalAnswers.toLocaleString("ar") + " إجابة، ولديك " +
        reliable.toLocaleString("ar") + " أبحاث بعينة من ١٠ إجابات أو أكثر. لا نعرض تصنيف إتقان نهائياً قبل اتساع العينة.";
    } else if (overallAccuracy < 60) {
      level = "تثبيت الأساسيات";
      intro = "سنبدأ بالأبحاث التي تحتاج إلى مراجعة أكبر، ثم ننتقل تدريجياً إلى مهارات أكثر تقدماً.";
      note = "متوسط دقتك المسجل " + overallAccuracy.toLocaleString("ar") + "٪. ابدأ بمراجعة المفاهيم الأساسية ثم تدرب على أسئلة متنوعة.";
    } else if (started < rows.length || coveragePercent < 35) {
      level = "بناء المهارة";
      intro = "لديك قاعدة جيدة؛ المسار يوازن بين استكمال الأبحاث غير المبدوءة وتوسيع التدريب.";
      note = "متوسط دقتك " + overallAccuracy.toLocaleString("ar") + "٪، وبدأت " +
        started.toLocaleString("ar") + " من " + rows.length.toLocaleString("ar") + " أبحاث. وسّع تغطيتك تدريجياً.";
    } else {
      level = "تعزيز الإتقان";
      intro = "أداؤك المسجل يسمح بالتركيز على توسيع التغطية وتثبيت المهارات بالأسئلة المتقدمة.";
      note = "متوسط دقتك " + overallAccuracy.toLocaleString("ar") + "٪ وتغطية بنك الأسئلة " +
        coveragePercent.toLocaleString("ar") + "٪. واصل التدريب المتنوع؛ فالنتائج تتغير مع كل إجابة جديدة.";
    }
  }
  rows.sort((a, b) => b.priority - a.priority || a.order - b.order);
  const selected = rows.slice(0, 3);
  $("learning-path-level").textContent = level;
  $("learning-path-level").dataset.level = totalAnswers ? (reliable < 2 ? "provisional" : overallAccuracy < 60 ? "foundation" : started < rows.length || coveragePercent < 35 ? "building" : "mastery") : "not-started";
  $("learning-path-intro").textContent = intro;
  $("learning-path-answered").textContent = totalAnswers.toLocaleString("ar");
  $("learning-path-reliable").textContent = reliable.toLocaleString("ar");
  $("learning-path-started").textContent = started.toLocaleString("ar") + " / " + rows.length.toLocaleString("ar");
  $("learning-path-progress").setAttribute("aria-valuenow", String(coveragePercent));
  $("learning-path-progress-fill").style.width = coveragePercent + "%";
  $("learning-path-progress").setAttribute("aria-valuetext", coveragePercent.toLocaleString("ar") + "٪ من أسئلة البنك جرى تجربتها");
  list.replaceChildren();
  selected.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = "learning-path-step";
    item.dataset.topic = row.topic;
    item.dataset.priority = String(row.priority);
    const heading = document.createElement("h4");
    heading.textContent = (index + 1).toLocaleString("ar") + ". " + row.topic;
    const detail = document.createElement("p");
    detail.textContent = row.reason;
    const meta = document.createElement("span");
    meta.className = "learning-path-step-meta";
    meta.textContent = row.answered
      ? row.answered.toLocaleString("ar") + " إجابة · " + row.accuracy.toLocaleString("ar") + "٪ دقة · " + row.coverage.toLocaleString("ar") + "٪ تغطية"
      : "لم يبدأ بعد · " + row.bankCount.toLocaleString("ar") + " سؤالاً متاحاً";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "learning-path-start";
    button.textContent = "ابدأ هذا البحث";
    button.setAttribute("aria-label", "ابدأ التدريب على " + row.topic);
    button.addEventListener("click", () => startQuiz(row.topic));
    item.append(heading, detail, meta, button);
    list.append(item);
  });
  $("learning-path-note").textContent = note;
  section.dataset.totalAnswers = String(totalAnswers);
  section.dataset.reliableTopics = String(reliable);
  section.dataset.coverage = String(coveragePercent);
}
function refreshDashboard(){
  $("stat-answered").textContent = progressData.answered.toLocaleString("ar");
  $("stat-correct").textContent = progressData.correct.toLocaleString("ar");
  const mistakeMap = progressData.mistakes && typeof progressData.mistakes === "object" && !Array.isArray(progressData.mistakes) ? progressData.mistakes : {};
  const mistakeKeys = Object.keys(mistakeMap).filter(key => questions.some(q => questionKey(q) === key));
  const mistakes = mistakeKeys.length;
  $("stat-mistakes").textContent = mistakes.toLocaleString("ar");
  $("stat-percent").textContent = progressData.answered ? `${Math.round(progressData.correct / progressData.answered * 100).toLocaleString("ar")}٪` : "—";
  $("review-mistakes").disabled = mistakes === 0;
  $("review-mistakes").classList.toggle("is-disabled", mistakes === 0);

  // تقدم الأبحاث يعتمد على الأبحاث التي أجاب الطالب عن سؤال واحد على الأقل منها.
  const topicNames = Array.isArray(topics) ? topics : [];
  const started = topicNames.filter(topic => {
    const stat = progressData.topicStats[topic];
    return stat && Number(stat.answered) > 0;
  }).length;
  const total = topicNames.length;
  const percent = total ? Math.round(started / total * 100) : 0;
  const startedNode = $("started-topics-count");
  const totalNode = $("all-topics-count");
  const fill = $("topic-progress-fill");
  const track = $("topic-progress-bar");
  const caption = $("topic-progress-caption");
  if (startedNode) startedNode.textContent = started.toLocaleString("ar");
  if (totalNode) totalNode.textContent = total.toLocaleString("ar");
  if (fill) fill.style.width = percent + "%";
  if (track) track.setAttribute("aria-valuenow", String(percent));
  if (caption) {
    caption.textContent = total === 0
      ? "ستظهر متابعة تقدمك عند توفر الأبحاث."
      : started === 0
        ? "ابدأ بحل أسئلة من أي بحث لتتبع تقدمك هنا."
        : started === total
          ? "رائع! بدأت جميع الأبحاث. واصل التدريب لتحسين نتائجك."
          : `بدأت ${started.toLocaleString("ar")} من ${total.toLocaleString("ar")} بحثاً؛ تبقّى ${(total-started).toLocaleString("ar")} لتبدأ بها.`;
  }

  const uniqueCount = countSeenQuestions();
  const bankCount = questions.length;
  const questionCountNode = $("unique-question-count");
  const bankCountNode = $("total-bank-question-count");
  const questionFill = $("question-progress-fill");
  const questionTrack = $("question-progress-bar");
  const questionCaption = $("question-progress-caption");
  const questionPercent = bankCount ? Math.round(uniqueCount / bankCount * 100) : 0;
  if (questionCountNode) questionCountNode.textContent = uniqueCount.toLocaleString("ar");
  if (bankCountNode) bankCountNode.textContent = bankCount.toLocaleString("ar");
  if (questionFill) questionFill.style.width = questionPercent + "%";
  if (questionTrack) questionTrack.setAttribute("aria-valuenow", String(questionPercent));
  if (questionCaption) {
    questionCaption.textContent = progressData.answered > 0 && uniqueCount === 0
      ? "نتائجك السابقة ما زالت محفوظة؛ يبدأ عدّ الأسئلة المختلفة من هذا التحديث."
      : uniqueCount === 0
        ? "ابدأ التدريب لتتبع عدد الأسئلة المختلفة التي حللتها."
        : uniqueCount === bankCount
          ? "أحسنت! جرّبت جميع الأسئلة المختلفة في البنك."
          : `جرّبت ${uniqueCount.toLocaleString("ar")} من ${bankCount.toLocaleString("ar")} سؤالاً مختلفاً (${questionPercent.toLocaleString("ar")}٪).`;
  }
  renderRecentActivity();
  renderPerformanceTrend();
  renderActivityCalendar();
  renderAchievements();
  renderWeakTopicRecommendation();
  renderPersonalizedLearningPath();
  updateResumeCard();
  window.dispatchEvent(new CustomEvent("mathBacSyria:dashboard-refreshed"));
}

function topicIcon(topic){
  const name = String(topic || "");
  if (name.includes("الاحتمالات")) return "🎲";
  if (name.includes("التحليل التوافقي")) return "🔢";
  if (name.includes("تطبيقات الأعداد العقدية")) return "🧭";
  if (name.includes("الأعداد العقدية")) return "ℂ";
  if (name.includes("الجداء السلمي")) return "·";
  if (name.includes("المستقيمات والمستويات")) return "📐";
  if (name.includes("الأشعة")) return "➤";
  if (name.includes("التكامل")) return "∫";
  if (name.includes("اللوغاريتمي")) return "ln";
  if (name.includes("الأسي")) return "eˣ";
  if (name.includes("الاشتقاق")) return "ƒ′";
  if (name.includes("نهاية متتالية")) return "lim";
  if (name.includes("المتتاليات")) return "uₙ";
  if (name.includes("النهايات")) return "↗";
  return "∑";
}

function topicColor(topic){
  const name = String(topic || "");
  if (name.includes("تطبيقات الأعداد العقدية")) return "complex-geometry";
  if (name.includes("الأعداد العقدية")) return "complex";
  if (name.includes("الجداء السلمي")) return "dot-product";
  if (name.includes("المستقيمات والمستويات")) return "lines-planes";
  if (name.includes("الأشعة")) return "vectors";
  if (name.includes("نهاية متتالية")) return "sequence-limits";
  if (name.includes("المتتاليات")) return "sequences";
  if (name.includes("التكامل")) return "integration";
  if (name.includes("اللوغاريتمي")) return "logarithm";
  if (name.includes("الأسي")) return "exponential";
  if (name.includes("الاشتقاق")) return "derivatives";
  if (name.includes("النهايات")) return "limits";
  if (name.includes("التحليل التوافقي")) return "combinatorics";
  if (name.includes("الاحتمالات")) return "probability";
  return "general";
}

// تصنيف الإتقان يحتاج عينة كافية حتى لا يُضلّل الطالب بنتائج عدد قليل من الإجابات.
function getTopicMastery(stat){
  const answered = stat && Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
  const correct = stat && Number.isSafeInteger(stat.correct) && stat.correct >= 0 ? Math.min(stat.correct, answered) : 0;
  if (!answered) return { key: "not-started", label: "لم يبدأ بعد", answered, correct, rate: null };
  const rate = Math.round(correct / answered * 100);
  if (answered < 10 || rate < 60) return { key: "practice", label: "يحتاج إلى تدريب", answered, correct, rate };
  if (rate >= 85) return { key: "mastered", label: "متقن", answered, correct, rate };
  return { key: "good", label: "جيد", answered, correct, rate };
}

function getLatestTopicAttempts(){
  const latest = new Map();
  for (const attempt of (Array.isArray(progressData.attempts) ? progressData.attempts : [])) {
    if (!attempt || typeof attempt.topic !== "string" || !topics.includes(attempt.topic) ||
        !Number.isFinite(Date.parse(attempt.date))) continue;
    const previous = latest.get(attempt.topic);
    if (!previous || Date.parse(attempt.date) > Date.parse(previous.date)) latest.set(attempt.topic, attempt);
  }
  return latest;
}
function formatTopicActivity(dateValue){
  const timestamp = Date.parse(dateValue);
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  const relative = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  if (minutes < 1) return "الآن";
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return relative.format(-days, "day");
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(new Date(timestamp));
}
function getLastOpenedTopic(){
  try { return localStorage.getItem(LAST_TOPIC_KEY) || ""; }
  catch (_) { return ""; }
}

function readTrainingSession(){
  try {
    const saved = JSON.parse(localStorage.getItem(TRAINING_SESSION_KEY) || "null");
    if (!saved || saved.version !== 1 || typeof saved.topic !== "string" ||
        !Array.isArray(saved.questionKeys) || !saved.questionKeys.length ||
        !Number.isSafeInteger(saved.index) || saved.index < 0 ||
        !Number.isSafeInteger(saved.correctCount) || saved.correctCount < 0) return null;
    return saved;
  } catch (_) { return null; }
}

function saveTrainingSession(){
  if (reviewMode || !currentTopic || !Array.isArray(quizQuestions) || !quizQuestions.length) return;
  const questionKeys = quizQuestions.map(questionKey);
  const nextIndex = Math.min(quizQuestions.length, Math.max(0, index + (answered ? 1 : 0)));
  const session = {
    version: 1, topic: currentTopic, questionKeys, index: nextIndex,
    correctCount: Math.min(correctCount, nextIndex),
    mistakeKeys: sessionMistakes.map(questionKey), updatedAt: new Date().toISOString()
  };
  try { localStorage.setItem(TRAINING_SESSION_KEY, JSON.stringify(session)); }
  catch (error) { console.warn("تعذر حفظ جلسة التدريب", error); }
}

function clearTrainingSession(){
  try { localStorage.removeItem(TRAINING_SESSION_KEY); } catch (_) {}
}

function resumeTrainingSession(topic){
  const saved = readTrainingSession();
  if (!saved || saved.topic !== topic) return false;
  const byKey = new Map(questions.map(question => [questionKey(question), question]));
  const restoredQuestions = saved.questionKeys.map(key => byKey.get(key));
  if (restoredQuestions.some(question => !question) || saved.index > restoredQuestions.length || saved.correctCount > saved.index) {
    clearTrainingSession();
    return false;
  }
  currentTopic = topic; reviewMode = false; quizQuestions = restoredQuestions;
  index = saved.index; correctCount = saved.correctCount; answered = false;
  sessionMistakes = (Array.isArray(saved.mistakeKeys) ? saved.mistakeKeys : []).map(key => byKey.get(key)).filter(Boolean);
  try { localStorage.setItem(LAST_TOPIC_KEY, topic); } catch (_) {}
  window.dispatchEvent(new CustomEvent("mathBacSyria:topic-opened", { detail: { topic } }));
  $("home").classList.add("hidden"); $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent = topic; updateResumeCard();
  if (index >= quizQuestions.length) { clearTrainingSession(); showResults(); }
  else showQuestion();
  window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  return true;
}

function renderTopics(){
  const level = $("difficulty").value;
  const masterySelect = $("mastery-filter");
  const masteryFilter = masterySelect?.value || "الكل";
  const coverageSelect = $("coverage-filter");
  const coverageFilter = coverageSelect?.value || "الكل";
  // 711–713: Derive coverage from the complete question bank, independent of the selected difficulty.
  const coverageStats = new Map(topics.map(topic => [topic, { total: 0, seen: 0 }]));
  for (const question of questions) {
    const stats = coverageStats.get(question.topic);
    if (!stats) continue;
    stats.total += 1;
    if (progressData.seenQuestions[questionKey(question)]) stats.seen += 1;
  }
  const getCoverageState = topic => {
    const stats = coverageStats.get(topic);
    if (!stats || !stats.total || stats.seen === 0) return "not-started";
    return stats.seen >= stats.total ? "completed" : "in-progress";
  };
  if (coverageSelect) {
    const coverageCounts = new Map([["الكل", topics.length]]);
    for (const topic of topics) {
      const state = getCoverageState(topic);
      coverageCounts.set(state, (coverageCounts.get(state) || 0) + 1);
    }
    for (const option of coverageSelect.options) {
      const baseLabel = option.dataset.baseLabel || option.textContent;
      option.dataset.baseLabel = baseLabel;
      option.textContent = baseLabel + " (" + (coverageCounts.get(option.value) || 0).toLocaleString("ar") + ")";
    }
  }
  if (masterySelect) {
    const masteryCounts = new Map([["الكل", topics.length]]);
    for (const topic of topics) {
      const state = getTopicMastery(progressData.topicStats[topic] || { answered: 0, correct: 0 }).key;
      masteryCounts.set(state, (masteryCounts.get(state) || 0) + 1);
    }
    for (const option of masterySelect.options) {
      const baseLabel = option.dataset.baseLabel || option.textContent;
      option.dataset.baseLabel = baseLabel;
      const count = masteryCounts.get(option.value) || 0;
      option.textContent = `${baseLabel} (${count.toLocaleString("ar")})`;
    }
  }
  const search = ($("topic-search")?.value || "").trim().toLocaleLowerCase("ar");
  const clearSearchButton = $("clear-topic-search");
  if (clearSearchButton) clearSearchButton.hidden = search.length === 0;
  const clearAllFiltersButton = $("clear-all-topic-filters");
  if (clearAllFiltersButton) clearAllFiltersButton.hidden =
    !search && level === "الكل" && masteryFilter === "الكل" && coverageFilter === "الكل";

  // 671–675: Show each active topic filter as a removable, accessible chip.
  const activeFilters = $("active-topic-filters");
  if (activeFilters) {
    activeFilters.replaceChildren();
    const addFilterChip = (label, description, clearFilter) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "active-topic-filter-chip";
      chip.setAttribute("aria-label", "إزالة فلتر " + description);
      const text = document.createElement("span");
      text.textContent = label;
      const remove = document.createElement("span");
      remove.className = "active-topic-filter-remove";
      remove.setAttribute("aria-hidden", "true");
      remove.textContent = "×";
      chip.append(text, remove);
      // 681–683: Keep keyboard focus predictable after a chip removes itself.
      const filterControlId = description === "البحث" ? "topic-search" :
        description === "مستوى الأسئلة" ? "difficulty" :
        description === "حالة التغطية" ? "coverage-filter" : "mastery-filter";
      chip.addEventListener("click", () => {
        const chipIndex = Array.from(activeFilters.children).indexOf(chip);
        clearFilter();
        saveHomepageFilters();
        renderTopics();
        const remainingChips = activeFilters.querySelectorAll("button");
        const nextChip = remainingChips[Math.min(chipIndex, remainingChips.length - 1)];
        if (nextChip) nextChip.focus();
        else $(filterControlId)?.focus();
      });
      activeFilters.append(chip);
    };
    const rawSearch = ($("topic-search")?.value || "").trim();
    if (rawSearch) addFilterChip("البحث: " + rawSearch, "البحث", () => {
      $("topic-search").value = "";
      $("topic-search").focus();
    });
    if (level !== "الكل") addFilterChip("المستوى: " + $("difficulty").selectedOptions[0].textContent.trim(),
      "مستوى الأسئلة", () => { $("difficulty").value = "الكل"; });
    if (masteryFilter !== "الكل") {
      const masteryOption = masterySelect?.selectedOptions[0];
      // 684–686: Use the stable untranslated option label, not its live count suffix.
      const masteryLabel = masteryOption?.dataset.baseLabel || masteryFilter;
      addFilterChip("الإتقان: " + masteryLabel, "حالة الإتقان", () => { masterySelect.value = "الكل"; });
    }
    if (coverageFilter !== "الكل") {
      const coverageOption = coverageSelect?.selectedOptions[0];
      const coverageLabel = coverageOption?.dataset.baseLabel || coverageFilter;
      addFilterChip("التغطية: " + coverageLabel, "حالة التغطية", () => { coverageSelect.value = "الكل"; });
    }
    activeFilters.hidden = activeFilters.childElementCount === 0;
  }
  // 714–716: Combine search, difficulty, mastery, and coverage without one filter overriding another.
  const availableTopics = topics.filter(topic => {
    if (!window.MathSearchUtils.matches(topic, search)) return false;
    if (masteryFilter !== "الكل" &&
        getTopicMastery(progressData.topicStats[topic] || { answered: 0, correct: 0 }).key !== masteryFilter) return false;
    return coverageFilter === "الكل" || getCoverageState(topic) === coverageFilter;
  });
  // Count available and previously seen questions in one pass instead of
  // scanning the complete question bank twice for each of the 14 topic cards.
  // 701–705: Keep one per-topic aggregate for filtered totals, all-level distribution, and coverage.
  const topicQuestionCounts = new Map();
  for (const question of questions) {
    const counts = topicQuestionCounts.get(question.topic) || {
      total: 0, seen: 0, levels: { "أساسي": 0, "متوسط": 0, "متقدم": 0 }
    };
    if (Object.prototype.hasOwnProperty.call(counts.levels, question.level)) {
      counts.levels[question.level] += 1;
    }
    if (level !== "الكل" && question.level !== level) {
      topicQuestionCounts.set(question.topic, counts);
      continue;
    }
    counts.total += 1;
    if (progressData.seenQuestions[questionKey(question)]) counts.seen += 1;
    topicQuestionCounts.set(question.topic, counts);
  }
  const latestAttempts = getLatestTopicAttempts();
  const lastOpenedTopic = getLastOpenedTopic();
  const savedSession = readTrainingSession();
  const resumableTopic = savedSession && savedSession.index < savedSession.questionKeys.length
    ? savedSession.topic : "";
  const availableQuestionCount = availableTopics.reduce((total, topic) =>
    total + (topicQuestionCounts.get(topic)?.total || 0), 0);
  $("total-count").textContent = `${availableQuestionCount.toLocaleString("ar")} سؤال متاح في ${availableTopics.length.toLocaleString("ar")} بحث`;
  const topicGrid = $("topic-grid");
  topicGrid.setAttribute("aria-busy", "true");
  topicGrid.innerHTML = availableTopics.map((topic, displayIndex)=>{
    const i = topics.indexOf(topic);
    const questionCounts = topicQuestionCounts.get(topic) || { total: 0, seen: 0, levels: { "أساسي": 0, "متوسط": 0, "متقدم": 0 } };
    const count = questionCounts.total;
    const topicStat = progressData.topicStats[topic] || {answered:0,correct:0};
    const successRate = topicStat.answered ? Math.round(topicStat.correct/topicStat.answered*100) : 0;
    // 721–724: Keep topic-wide coverage independent of the temporary difficulty filter.
    const fullCoverage = coverageStats.get(topic) || { total: 0, seen: 0 };
    const fullCoverageTotal = fullCoverage.total;
    const fullCoverageSeen = fullCoverage.seen;
    const fullCoverageRemaining = Math.max(0, fullCoverageTotal - fullCoverageSeen);
    const fullCoverageRate = fullCoverageTotal
      ? Math.min(100, Math.round(fullCoverageSeen / fullCoverageTotal * 100)) : 0;
    // The lower status line remains scoped to the currently selected level.
    const seenCount = questionCounts.seen;
    const remainingCount = Math.max(0, count - seenCount);
    const attempts = Number.isSafeInteger(topicStat.answered) && topicStat.answered > 0 ? topicStat.answered : 0;
    const correctAnswers = Number.isSafeInteger(topicStat.correct) && topicStat.correct > 0 ? Math.min(topicStat.correct, attempts) : 0;
    const incorrectAnswers = Math.max(0, attempts - correctAnswers);
    const mastery = getTopicMastery(topicStat);
    const lastAttempt = latestAttempts.get(topic);
    const isLastOpenedTopic = lastOpenedTopic === topic;
    const canResumeTopic = resumableTopic === topic;
    const lastActivityText = lastAttempt ? formatTopicActivity(lastAttempt.date) : "";
    const lastActivityTitle = lastAttempt ? new Date(lastAttempt.date).toLocaleString("ar") : "";
    // 725–726: Derive the card state and accessible summary from the complete topic bank.
    const topicState = fullCoverageSeen === 0 ? "لم تبدأ بعد" :
      fullCoverageRate === 100 ? "جرّبت جميع الأسئلة" : "قيد التقدم";
    const levelCounts = questionCounts.levels;
    const cardLabel = `${topic}، ${fullCoverageTotal.toLocaleString("ar")} سؤالاً في بنك البحث كاملاً، ${fullCoverageSeen.toLocaleString("ar")} سؤالاً جُرّب، ${fullCoverageRate.toLocaleString("ar")}٪ تغطية، ${mastery.label}${canResumeTopic ? "، توجد جلسة تدريب محفوظة" : ""}`;
    return `<button class="topic-card${isLastOpenedTopic ? " is-resume-topic" : ""}" data-topic="${topic}" data-topic-color="${topicColor(topic)}" data-can-resume="${canResumeTopic}" data-coverage="${getCoverageState(topic)}" data-coverage-seen="${fullCoverageSeen}" data-coverage-total="${fullCoverageTotal}" data-coverage-rate="${fullCoverageRate}" aria-label="${cardLabel}" style="--topic-order:${displayIndex}" data-topic-attempts="${attempts}" data-topic-correct="${correctAnswers}" data-mastery="${mastery.key}" data-last-practiced="${lastAttempt ? new Date(lastAttempt.date).toISOString() : ""}" ${count===0?"disabled":""}>
      <span class="topic-card-top"><span class="topic-number">${String(i+1).padStart(2,"0")}</span>${isLastOpenedTopic ? `<span class="topic-resume-badge">${canResumeTopic ? "جلسة محفوظة" : "آخر بحث فتحته"}</span>` : ""}<span class="topic-state ${fullCoverageSeen === 0 ? "not-started" : fullCoverageRate === 100 ? "covered" : "in-progress"}">${topicState}</span><span class="topic-arrow">↖</span></span>
      <span class="topic-card-content"><span class="topic-subject-icon" aria-hidden="true">${topicIcon(topic)}</span><span class="topic-title">${topic}</span><span class="topic-meta">${count.toLocaleString("ar")} سؤال متاح</span></span>
      <span class="topic-card-levels" aria-label="توزيع الأسئلة حسب المستوى"><span>أساسي ${levelCounts["أساسي"].toLocaleString("ar")}</span><span>متوسط ${levelCounts["متوسط"].toLocaleString("ar")}</span><span>متقدم ${levelCounts["متقدم"].toLocaleString("ar")}</span></span>
      <span class="topic-card-bottom"><span class="topic-status" aria-label="${level === "الكل" ? "عدد الأسئلة المجربة من كامل البحث" : "عدد الأسئلة المجربة في المستوى المختار"}">${seenCount.toLocaleString("ar")} من ${count.toLocaleString("ar")} سؤالاً جُرّب</span><span class="topic-start">${canResumeTopic ? "استئناف التدريب ↶" : "ابدأ التدريب ←"}</span></span>
      <span class="topic-coverage-summary"><span>${fullCoverageSeen.toLocaleString("ar")} من ${fullCoverageTotal.toLocaleString("ar")} سؤالاً جُرّب في البحث كاملاً · ${fullCoverageRate.toLocaleString("ar")}٪</span><span>متبقي ${fullCoverageRemaining.toLocaleString("ar")}</span></span>
      <span class="topic-card-performance">${attempts ? `${attempts.toLocaleString("ar")} إجابة · ${correctAnswers.toLocaleString("ar")} صحيحة · ${incorrectAnswers.toLocaleString("ar")} خاطئة · ${successRate.toLocaleString("ar")}٪ دقة` : "لم تسجل إجابات بعد"}</span>${lastAttempt ? `<time class="topic-last-activity" datetime="${new Date(lastAttempt.date).toISOString()}" title="${lastActivityTitle}">آخر تدريب: ${lastActivityText}</time>` : ""}
      <span class="topic-mastery-status ${mastery.key}" title="${mastery.answered < 10 && mastery.answered > 0 ? "يحتاج تصنيف الإتقان إلى 10 إجابات على الأقل" : mastery.rate === null ? "لم تُسجّل إجابات لهذا البحث بعد" : mastery.rate.toLocaleString("ar") + "٪ من الإجابات صحيحة"}">${mastery.label}</span>
      <span class="topic-mastery" role="progressbar" aria-label="نسبة الأسئلة التي جرى حلها في ${topic} من بنك البحث كاملاً" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fullCoverageRate}" aria-valuetext="جُرّب ${fullCoverageSeen.toLocaleString("ar")} من ${fullCoverageTotal.toLocaleString("ar")} سؤالاً في البحث كاملاً، ${fullCoverageRate.toLocaleString("ar")}٪ تغطية، متبقي ${fullCoverageRemaining} سؤال"><span style="width:${fullCoverageRate}%"></span></span>
    </button>`;
  }).join("");
  topicGrid.setAttribute("aria-busy", "false");
  $("no-topics").classList.toggle("hidden", availableTopics.length !== 0);
  // 708: A saved active session resumes from its exact question instead of being reset.
  document.querySelectorAll("#topic-grid [data-topic]").forEach(btn=>btn.addEventListener("click",()=>{
    if (btn.dataset.canResume === "true" && resumeTrainingSession(btn.dataset.topic)) return;
    startQuiz(btn.dataset.topic);
  }));
  refreshDashboard();
}
function syncDashboardEmptyState(section, hasContent, emptyMessage){
  if (!section) return;
  const panel = section.closest(".dashboard-dynamic-panel");
  const emptyState = panel && panel.querySelector(".dashboard-empty-state");
  section.hidden = !hasContent;
  if (emptyState) {
    emptyState.hidden = hasContent;
    if (typeof emptyMessage === "string" && emptyMessage) emptyState.textContent = emptyMessage;
  }
}

function updateResumeCard(){
  const section = $("resume-session");
  const name = $("resume-topic-name");
  const button = $("resume-topic-button");
  if (!section || !name || !button) return;
  const lastTopic = getLastOpenedTopic();
  if (!lastTopic || !Array.isArray(topics) || !topics.includes(lastTopic) || !questions.some(q => q.topic === lastTopic)) {
    syncDashboardEmptyState(section, false);
    return;
  }
  const stat = progressData.topicStats[lastTopic] || { answered: 0, correct: 0 };
  const answered = Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
  const savedSession = readTrainingSession();
  const canResume = savedSession && savedSession.topic === lastTopic &&
    Array.isArray(savedSession.questionKeys) && savedSession.questionKeys.length > 0 &&
    Number.isSafeInteger(savedSession.index) && savedSession.index < savedSession.questionKeys.length;
  // Show the card after a recorded answer, or when a real unfinished session can be resumed.
  if (answered === 0 && !canResume) {
    syncDashboardEmptyState(section, false);
    return;
  }
  name.textContent = lastTopic;
  const activity = $("resume-topic-activity");
  const correct = Number.isSafeInteger(stat.correct) && stat.correct >= 0 ? Math.min(stat.correct, answered) : 0;
  const latestAttempt = getLatestTopicAttempts().get(lastTopic);
  if (activity) {
    activity.textContent = latestAttempt
      ? "آخر إجابة " + formatTopicActivity(latestAttempt.date) + " · " +
        answered.toLocaleString("ar") + " إجابة مسجلة · دقة " +
        (answered ? Math.round(correct / answered * 100).toLocaleString("ar") : "٠") + "٪"
      : "لم تسجل إجابات في هذا البحث بعد.";
  }
  syncDashboardEmptyState(section, true);
  button.textContent = canResume ? "استئناف جلسة التدريب" : "ابدأ التدريب مجدداً";
  button.onclick = () => { if (!canResume || !resumeTrainingSession(lastTopic)) startQuiz(lastTopic); };
}

function startQuiz(topic){
  currentTopic = topic;
  try { localStorage.setItem(LAST_TOPIC_KEY, topic); } catch (_) {}
  updateResumeCard();
  reviewMode = false;
  const level = $("difficulty").value;
  quizQuestions = questions.filter(q=>q.topic===topic && (level==="الكل" || q.level===level));
  if(!quizQuestions.length){ alert("لا توجد أسئلة في هذا المستوى لهذا البحث حالياً. اختر مستوى آخر."); return; }
  window.dispatchEvent(new CustomEvent("mathBacSyria:topic-opened", { detail: { topic } }));
  clearTrainingSession();
  quizQuestions = [...quizQuestions].sort(()=>Math.random()-0.5);
  index=0; correctCount=0; answered=false; sessionMistakes=[];
  $("home").classList.add("hidden"); $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent=topic;
  showQuestion();
  saveTrainingSession();
  updateResumeCard();
  window.scrollTo({top:0,behavior:preferredScrollBehavior()});
}
function updateQuizProgress(completed){
  const total = Math.max(0, quizQuestions.length);
  const answeredCount = Math.min(Math.max(Number(completed) || 0, 0), total);
  const correct = Math.min(Math.max(Number(correctCount) || 0, 0), answeredCount);
  const remainingCount = Math.max(0, total - answeredCount);
  const percent = total ? Math.round(answeredCount / total * 100) : 0;
  const accuracy = answeredCount ? Math.round(correct / answeredCount * 100) : 0;
  const bar = $("progress-bar");
  const track = $("quiz-progress-track");
  const label = $("progress-percent");
  if (bar) bar.style.width = `${percent}%`;
  if (track) track.setAttribute("aria-valuenow", String(percent));
  if (label) label.textContent = `${percent.toLocaleString("ar")}٪ مكتمل`;
  const answeredNode = $("session-answered");
  const remainingNode = $("session-remaining");
  const accuracyNode = $("session-accuracy");
  if (answeredNode) answeredNode.textContent = `${answeredCount.toLocaleString("ar")} / ${total.toLocaleString("ar")}`;
  if (remainingNode) remainingNode.textContent = remainingCount.toLocaleString("ar");
  if (accuracyNode) accuracyNode.textContent = answeredCount ? `${accuracy.toLocaleString("ar")}٪` : "—";
}
function getQuestionType(q){
  return ["true-false", "numeric", "short-text"].includes(q?.type) ? q.type : "mcq";
}
function isSupportedQuestion(q){
  if (!q || typeof q.q !== "string" || !q.q.trim() || !String(q.solution ?? "").trim()) return false;
  const type = getQuestionType(q);
  if (type === "mcq") return Array.isArray(q.options) && q.options.length === 4 &&
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4;
  if (type === "true-false") return typeof q.answer === "boolean";
  if (type === "numeric") return String(q.answer).trim() !== "" && Number.isFinite(Number(q.answer)) &&
    (q.tolerance === undefined || (Number.isFinite(q.tolerance) && q.tolerance >= 0));
  return (typeof q.answer === "string" && q.answer.trim().length > 0) ||
    (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.some(value => typeof value === "string" && value.trim()));
}
function normalizeNumericAnswer(value){
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  let text = String(value ?? "").trim();
  text = [...text].map(char => {
    const arabicIndex = arabicDigits.indexOf(char);
    if (arabicIndex >= 0) return String(arabicIndex);
    const persianIndex = persianDigits.indexOf(char);
    return persianIndex >= 0 ? String(persianIndex) : char;
  }).join("");
  text = text.replace(/[٫]/g, ".").replace(/[٬،]/g, "");
  if (!text.includes(".") && (text.match(/,/g) || []).length === 1) text = text.replace(",", ".");
  text = text.replace(/\s+/g, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return NaN;
  return Number(text);
}
function normalizeShortAnswer(value){
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ar")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[،؛؟.,!?:()[\]{}]/g, " ")
    .replace(/\s+/g, " ").trim();
}
function evaluateQuestionAnswer(q, response){
  const type = getQuestionType(q);
  if (type === "mcq" || type === "true-false") return response === q.answer;
  if (type === "numeric") {
    const actual = normalizeNumericAnswer(response);
    const expected = normalizeNumericAnswer(q.answer);
    const tolerance = Number.isFinite(q.tolerance) ? q.tolerance : 1e-9;
    return Number.isFinite(actual) && Number.isFinite(expected) &&
      Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));
  }
  const accepted = [q.answer, ...(Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [])]
    .filter(value => typeof value === "string" && value.trim());
  const normalized = normalizeShortAnswer(response);
  return normalized.length > 0 && accepted.some(value => normalizeShortAnswer(value) === normalized);
}
function formatExpectedAnswer(q){
  const type = getQuestionType(q);
  if (type === "true-false") return q.answer ? "صح" : "خطأ";
  if (type === "short-text") return [q.answer, ...(Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [])]
    .filter(value => typeof value === "string" && value.trim()).join(" أو ");
  return String(q.answer ?? "");
}

function findSimilarPracticeQuestion(current) {
  const bank = Array.isArray(questions) ? questions : [];
  const alreadyInSession = new Set(quizQuestions.map(questionKey));
  const candidates = bank.filter(candidate =>
    candidate && candidate.q !== current.q &&
    candidate.topic === current.topic &&
    !alreadyInSession.has(questionKey(candidate)) &&
    isSupportedQuestion(candidate)
  );
  const type = getQuestionType(current);
  const sameTypeAndLevel = candidates.filter(candidate =>
    getQuestionType(candidate) === type &&
    (!current.level || candidate.level === current.level)
  );
  const sameType = candidates.filter(candidate => getQuestionType(candidate) === type);
  const pool = sameTypeAndLevel.length ? sameTypeAndLevel : sameType.length ? sameType : candidates;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function startSimilarPracticeQuestion(current) {
  const similarQuestion = findSimilarPracticeQuestion(current);
  if (!similarQuestion) return false;

  // Add the similar exercise to the active quiz so it uses the exact same
  // prompt, answer, feedback, accessibility and next-question flow.
  quizQuestions.splice(index + 1, 0, similarQuestion);
  index += 1;
  answered = false;
  showQuestion();
  saveTrainingSession();
  updateResumeCard();
  return true;
}

function showSimilarPracticeQuestion(current, host) {
  host.querySelector(".similar-practice-card")?.remove();
  const question = findSimilarPracticeQuestion(current);
  if (!question) return;
  const card = document.createElement("section");
  card.className = "similar-practice-card";
  card.id = "similar-practice-card";
  card.dataset.topic = question.topic;
  const heading = document.createElement("h4");
  heading.textContent = "تمرين مشابه من بنك المنصة";
  const note = document.createElement("p");
  note.className = "similar-practice-note";
  note.textContent = "هذا تدريب إضافي من الأسئلة الموجودة، ولا يدخل في علامة الاختبار أو سجل تقدمك.";
  const prompt = document.createElement("p");
  prompt.className = "similar-practice-question";
  prompt.textContent = question.q;
  const controls = document.createElement("div");
  controls.className = "similar-practice-options";
  const result = document.createElement("p");
  result.className = "similar-practice-feedback";
  result.id = "similar-practice-feedback";
  result.setAttribute("role", "status");
  result.setAttribute("aria-live", "polite");
  result.hidden = true;
  const solution = document.createElement("p");
  solution.className = "similar-practice-solution";
  solution.hidden = true;
  let completed = false;

  const finish = value => {
    if (completed) return;
    completed = true;
    const correct = evaluateQuestionAnswer(question, value);
    controls.querySelectorAll("button,input").forEach(control => { control.disabled = true; });
    if (getQuestionType(question) === "mcq") {
      controls.querySelectorAll("[data-similar-option]").forEach((button, index) => {
        if (index === question.answer) button.classList.add("correct");
        if (index === value && !correct) button.classList.add("wrong");
      });
    } else if (getQuestionType(question) === "true-false") {
      controls.querySelectorAll("[data-similar-boolean]").forEach(button => {
        const selected = button.dataset.similarBoolean === "true";
        if (selected === question.answer) button.classList.add("correct");
        if (selected === value && !correct) button.classList.add("wrong");
      });
    }
    result.textContent = correct ? "إجابة صحيحة، أحسنت!" : "ليست هذه الإجابة الصحيحة. راجع الحل ثم حاول في تمرين آخر.";
    result.classList.add(correct ? "good" : "bad");
    result.hidden = false;
    solution.textContent = "الحل: " + String(question.solution || "");
    solution.hidden = false;
    typeset();
  };

  const type = getQuestionType(question);
  if (type === "mcq") {
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option similar-practice-option";
      button.dataset.similarOption = String(index);
      button.textContent = String(option);
      button.addEventListener("click", () => finish(index));
      controls.append(button);
    });
  } else if (type === "true-false") {
    for (const [value, label] of [[true, "صح"], [false, "خطأ"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option similar-practice-option";
      button.dataset.similarBoolean = String(value);
      button.textContent = label;
      button.addEventListener("click", () => finish(value));
      controls.append(button);
    }
  } else {
    const form = document.createElement("form");
    form.className = "similar-practice-form";
    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    input.inputMode = type === "numeric" ? "decimal" : "text";
    input.placeholder = type === "numeric" ? "اكتب القيمة العددية" : "اكتب إجابتك";
    input.required = true;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "primary";
    submit.textContent = "تحقق من الإجابة";
    form.append(input, submit);
    form.addEventListener("submit", event => {
      event.preventDefault();
      finish(input.value);
    });
    controls.append(form);
  }

  card.append(heading, note, prompt, controls, result, solution);
  host.append(card);
  typeset();
}

function showQuestion(){
  // Reuse the single, pre-rendered action button; never accumulate nodes across questions.
  const similarPracticeButton = $("similar-practice-start");
  if (similarPracticeButton) {
    similarPracticeButton.hidden = true;
    similarPracticeButton.disabled = false;
    similarPracticeButton.textContent = "تدرّب على سؤال مشابه";
    similarPracticeButton.onclick = null;
  }
  answered=false;
  const q=quizQuestions[index];
  const type=getQuestionType(q);
  $("question-number").textContent=(index+1).toLocaleString("ar") + " من " + quizQuestions.length.toLocaleString("ar");
  $("progress").textContent="السؤال " + (index+1).toLocaleString("ar") + " / " + quizQuestions.length.toLocaleString("ar");
  updateQuizProgress(index);
  const questionHost = $("question-text");
  const promptCopy = document.createElement("div");
  promptCopy.className = "question-prompt-copy";
  promptCopy.innerHTML = q.q;
  questionHost.replaceChildren(promptCopy);
  questionHost.classList.remove("question-has-diagram");
  if (typeof getQuestionDiagram === "function") {
    const diagramMarkup = getQuestionDiagram(q);
    if (diagramMarkup) {
      questionHost.insertAdjacentHTML("beforeend", diagramMarkup);
      questionHost.classList.add("question-has-diagram");
    }
  }
  const options = $("options");
  options.replaceChildren();
  if (type === "mcq") {
    options.innerHTML=q.options.map((option,i)=>'<button class="option" data-option="' + i + '" type="button"><span class="letter">' + letters[i] + '</span><span>' + option + '</span></button>').join("");
    options.querySelectorAll("[data-option]").forEach(btn=>btn.addEventListener("click",()=>chooseAnswer(Number(btn.dataset.option))));
  } else if (type === "true-false") {
    for (const [value, label] of [[true, "صح"], [false, "خطأ"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option typed-choice";
      button.dataset.booleanAnswer = String(value);
      button.textContent = label;
      button.addEventListener("click", () => submitQuestionAnswer(value));
      options.append(button);
    }
  } else {
    const form = document.createElement("form");
    form.className = "typed-answer-form";
    const label = document.createElement("label");
    label.htmlFor = "typed-answer-input";
    label.textContent = type === "numeric" ? "اكتب القيمة العددية:" : "اكتب إجابتك:";
    const input = document.createElement("input");
    input.id = "typed-answer-input";
    input.name = "answer";
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.inputMode = type === "numeric" ? "decimal" : "text";
    input.placeholder = q.placeholder || (type === "numeric" ? "مثال: 2.5" : "اكتب الإجابة هنا");
    input.required = true;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "primary typed-answer-submit";
    submit.textContent = "تحقق من الإجابة";
    form.append(label, input, submit);
    form.addEventListener("submit", event => {
      event.preventDefault();
      submitQuestionAnswer(input.value);
    });
    options.append(form);
  }
  const hintsPanel = $("question-hints");
  const hintButton = $("show-hint");
  const hintText = $("question-hint-text");
  if (hintsPanel && hintButton && hintText) {
    const hints = Array.isArray(q.hints)
      ? q.hints.filter(hint => typeof hint === "string" && hint.trim()).slice(0, 3)
      : [];
    hintsPanel.hidden = hints.length === 0;
    hintButton.disabled = false;
    hintButton.textContent = "أحتاج إلى تلميح";
    hintText.hidden = true;
    hintText.textContent = "";
    let shownHints = 0;
    hintButton.onclick = () => {
      if (shownHints >= hints.length) return;
      shownHints += 1;
      hintText.textContent = hints[shownHints - 1];
      hintText.hidden = false;
      hintButton.disabled = shownHints >= hints.length;
      hintButton.textContent = shownHints >= hints.length
        ? "اكتملت التلميحات"
        : "التلميح التالي (" + (shownHints + 1).toLocaleString("ar") + " من " + hints.length.toLocaleString("ar") + ")";
      typeset();
    };
  }
  $("feedback").className="feedback hidden";
  $("feedback").innerHTML="";
  $("next").disabled=true;
  $("next").textContent=index===quizQuestions.length-1?"عرض النتيجة ←":"السؤال التالي ←";
  typeset();
  $("question-text").focus({ preventScroll: true });
  // Keep the active question visible at the top of the viewport on entry
  // and every transition, rather than leaving it below the page header.
  requestAnimationFrame(() => {
    const card = $("question-text")?.closest(".question-card");
    if (card && !$("quiz").classList.contains("hidden")) {
      card.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
      $("question-text").focus({ preventScroll: true });
    }
  });
}
function chooseAnswer(choice){
  submitQuestionAnswer(choice);
}
function submitQuestionAnswer(response){
  if(answered)return;
  const q=quizQuestions[index];
  const type=getQuestionType(q);
  if (type !== "mcq" && type !== "true-false" && !String(response ?? "").trim()) {
    $("typed-answer-input")?.focus();
    return;
  }
  answered=true;
  const hintButton = $("show-hint");
  if (hintButton) hintButton.disabled = true;
  const isCorrect=evaluateQuestionAnswer(q,response);
  if(isCorrect)correctCount++;
  else if (!sessionMistakes.some(item => questionKey(item) === questionKey(q))) sessionMistakes.push(q);
  if (!reviewMode) {
    progressData.answered += 1;
    progressData.seenQuestions = progressData.seenQuestions || {};
    progressData.seenQuestions[questionKey(q)] = true;
    if (isCorrect) {
      progressData.correct += 1;
      delete progressData.mistakes[questionKey(q)];
    } else {
      const previousMistake = progressData.mistakes[questionKey(q)];
      progressData.mistakes[questionKey(q)] = { topic: q.topic, q: q.q, options: q.options, answer: q.answer, solution: q.solution, level: q.level, type: q.type, acceptedAnswers: q.acceptedAnswers, tolerance: q.tolerance,
        selfReportedReason: previousMistake && ["concept","law","calculation","sign","reading","steps","other"].includes(previousMistake.selfReportedReason) ? previousMistake.selfReportedReason : "",
        reasonUpdatedAt: previousMistake && typeof previousMistake.reasonUpdatedAt === "string" ? previousMistake.reasonUpdatedAt : "" };
    }
    const ts = progressData.topicStats[q.topic] || { answered: 0, correct: 0 };
    ts.answered += 1;
    if (isCorrect) ts.correct += 1;
    progressData.topicStats[q.topic] = ts;
    progressData.attempts.unshift({ topic: q.topic, correct: isCorrect, date: new Date().toISOString() });
    progressData.attempts = progressData.attempts.slice(0, 100);
    saveProgress();
    refreshDashboard();
  } else if (isCorrect) {
    delete progressData.mistakes[questionKey(q)];
    saveProgress();
    refreshDashboard();
  }
  $("options").querySelectorAll("button, input").forEach(control => { control.disabled = true; });
  if (type === "mcq") {
    $("options").querySelectorAll("[data-option]").forEach((btn,i)=>{
      if(i===q.answer)btn.classList.add("correct");
      if(i===response && !isCorrect)btn.classList.add("wrong");
    });
  } else if (type === "true-false") {
    $("options").querySelectorAll("[data-boolean-answer]").forEach(btn => {
      const value = btn.dataset.booleanAnswer === "true";
      if (value === q.answer) btn.classList.add("correct");
      if (value === response && !isCorrect) btn.classList.add("wrong");
    });
  }
  updateQuizProgress(index + 1);
  const fb=$("feedback");
  fb.className="feedback " + (isCorrect?"good":"bad");
  fb.setAttribute("role", "status");
  fb.setAttribute("aria-live", "polite");
  fb.setAttribute("aria-atomic", "true");
  const escapeSolutionText = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const hasGuidedSteps = typeof q.keyIdea === "string" && q.keyIdea.trim() &&
    Array.isArray(q.steps) && q.steps.length > 0 &&
    q.steps.every(step => typeof step === "string" && step.trim());
  const solutionMethod = !hasGuidedSteps && Array.isArray(q.hints) && q.hints.length
    ? '<div class="solution-method"><strong>منهجية الحل خطوة بخطوة:</strong><ol>' + q.hints.map(step => '<li>' + escapeSolutionText(step) + '</li>').join("") + '</ol></div>'
    : "";
  const solutionContent = hasGuidedSteps
    ? '<div class="solution-key-idea"><strong>الفكرة الأساسية:</strong><div>' + escapeSolutionText(q.keyIdea) + '</div></div><strong class="solution-steps-title">شرح الحل خطوة بخطوة:</strong><ol class="solution-steps">' + q.steps.map(step => '<li>' + escapeSolutionText(step) + '</li>').join("") + '</ol>'
    : '<div class="solution-original">' + q.solution + '</div>' + solutionMethod;
  const answerSummary = type === "mcq"
    ? (isCorrect ? "اختيارك صحيح." : "الإجابة الصحيحة هي: " + letters[q.answer] + " — " + q.options[q.answer])
    : (isCorrect ? "إجابتك صحيحة." : "الإجابة الصحيحة هي: " + escapeSolutionText(formatExpectedAnswer(q)));
  const submittedSummary = type === "mcq" ? "" : '<div>إجابتك: ' + escapeSolutionText(type === "true-false" ? (response ? "صح" : "خطأ") : response) + '</div>';
  fb.innerHTML='<strong>' + (isCorrect?"✓ إجابة صحيحة، أحسنت!":"✗ إجابة غير صحيحة") + '</strong><div>' + answerSummary + '</div>' + submittedSummary +
    (isCorrect ? "" : '<section class="error-reflection" aria-labelledby="error-reflection-title"><strong id="error-reflection-title">ما السبب الأقرب لوقوعك في الخطأ؟</strong><p>اختيارك اختياري ويساعدك على فهم نمط المراجعة؛ لا تستنتج المنصة السبب تلقائياً.</p><div class="error-reflection-options">' +
      [["concept","لم أفهم المفهوم"],["law","اخترت قانوناً غير مناسب"],["calculation","خطأ في الحساب"],["sign","خطأ في الإشارة أو الترتيب"],["reading","لم أفهم المطلوب جيداً"],["steps","تعثر في خطوات الحل"],["other","سبب آخر / لست متأكداً"]].map(([value,label]) => '<button type="button" data-error-reason="' + value + '">' + label + '</button>').join("") +
      '</div><span class="error-reflection-status" role="status" aria-live="polite">يمكنك تخطي هذا السؤال والمتابعة.</span></section>') +
    '<div class="solution"><strong>الحل:</strong>' + solutionContent + '</div>';
  fb.querySelectorAll("[data-error-reason]").forEach(button => button.addEventListener("click", () => {
    const key = questionKey(q);
    const record = progressData.mistakes && progressData.mistakes[key];
    if (!record || !["concept","law","calculation","sign","reading","steps","other"].includes(button.dataset.errorReason)) return;
    record.selfReportedReason = button.dataset.errorReason;
    record.reasonUpdatedAt = new Date().toISOString();
    saveProgress();
    fb.querySelectorAll("[data-error-reason]").forEach(option => {
      option.disabled = true;
      option.setAttribute("aria-pressed", String(option === button));
    });
    const status = fb.querySelector(".error-reflection-status");
    if (status) status.textContent = "حُفظ تصنيفك الذاتي لهذا الخطأ على هذا الجهاز.";
  }));
  // One static button is reused for every question; assigning onclick replaces any prior handler.
  const similarPracticeAction = $("similar-practice-start");
  if (similarPracticeAction) {
    similarPracticeAction.onclick = () => {
      if (!startSimilarPracticeQuestion(q)) {
        similarPracticeAction.disabled = true;
        similarPracticeAction.textContent = "لا يوجد سؤال مشابه متاح حالياً";
      }
    };
    similarPracticeAction.hidden = false;
  }
  $("next").disabled=false;
  $("next").focus({ preventScroll: true });
  $("progress-bar").style.width=((index+1)/quizQuestions.length*100) + "%";
  typeset();
  saveTrainingSession();
  updateResumeCard();
}
function showResults(){
  if (!reviewMode) clearTrainingSession();
  $("quiz").classList.add("hidden"); $("results").classList.remove("hidden");
  const total=quizQuestions.length;
  const wrongCount=Math.max(0, total-correctCount);
  const percent=total ? Math.round(correctCount/total*100) : 0;
  $("score").textContent=`${correctCount} / ${total} (${percent}٪)`;
  const scoreMeter = $("score-meter");
  const scoreMeterFill = $("score-meter-fill");
  if (scoreMeter) {
    scoreMeter.setAttribute("aria-valuenow", String(percent));
    scoreMeter.setAttribute("aria-valuetext", percent.toLocaleString("ar") + "٪ من الإجابات صحيحة");
  }
  if (scoreMeterFill) scoreMeterFill.style.width = percent + "%";
  const scoreFeedback = $("score-feedback");
  if (scoreFeedback) {
    scoreFeedback.textContent = total === 0
      ? "لم تتضمن هذه الجلسة أسئلة مكتملة لاحتساب النتيجة."
      : percent === 100
        ? "إتقان كامل في هذه الجلسة؛ واصل مراجعة الأفكار للحفاظ على فهمك."
        : percent >= 80
          ? "أداء قوي. راجع أي نقطة غير واضحة لتعزيز ثبات الحل."
          : percent >= 60
            ? "تقدم جيد. مراجعة الحلول ستساعدك على تثبيت الخطوات."
            : "كل جلسة فرصة للتعلم. ابدأ بمراجعة الحلول ثم جرّب مرة أخرى.";
  }
  $("score-detail").textContent=`إجابات صحيحة: ${correctCount} · إجابات خاطئة: ${wrongCount} · ${reviewMode ? "مراجعة الأخطاء" : "البحث: "+currentTopic}`;
  const resultCard = $("results").querySelector(".result-card");
  let sessionPanel = $("session-result-review");
  if (!sessionPanel) {
    sessionPanel = document.createElement("section");
    sessionPanel.id = "session-result-review";
    sessionPanel.className = "session-result-review";
    sessionPanel.setAttribute("aria-live", "polite");
    resultCard.querySelector(".actions").before(sessionPanel);
  }
  sessionPanel.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = sessionMistakes.length ? "أسئلة تحتاج إلى مراجعة" : "أداء رائع، لا توجد أخطاء في هذه الجلسة";
  sessionPanel.append(heading);
  if (sessionMistakes.length) {
    const list = document.createElement("ol");
    list.className = "session-mistake-list";
    for (const question of sessionMistakes) {
      const item = document.createElement("li");
      const topic = document.createElement("strong");
      topic.textContent = question.topic || currentTopic;
      const snippet = document.createElement("p");
      snippet.textContent = String(question.q || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      item.append(topic, snippet);
      list.append(item);
    }
    sessionPanel.append(list);
    const retryMistakes = document.createElement("button");
    retryMistakes.type = "button";
    retryMistakes.id = "retry-session-mistakes";
    retryMistakes.className = "secondary";
    retryMistakes.textContent = "إعادة تدريب الأخطاء فقط";
    retryMistakes.addEventListener("click", startSessionMistakeQuiz);
    sessionPanel.append(retryMistakes);
  }
  if (reviewMode) $("quiz-title").textContent = "مراجعة الإجابات الخاطئة";
  window.scrollTo({top:0,behavior:preferredScrollBehavior()});
  $("results").querySelector("h2").focus({ preventScroll: true });
}
function startSessionMistakeQuiz(){
  const retryQuestions = [...sessionMistakes];
  if (!retryQuestions.length) return;
  reviewQuestions = retryQuestions;
  reviewMode = true;
  currentTopic = "إعادة تدريب أخطاء الجلسة";
  quizQuestions = [...retryQuestions].sort(()=>Math.random()-0.5);
  sessionMistakes = [];
  index=0; correctCount=0; answered=false;
  $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent=currentTopic;
  showQuestion();
  window.scrollTo({top:0,behavior:preferredScrollBehavior()});
}
function typeset(){
  if (!window.MathJax) return;
  const targets = [$("question-text"), $("options"), $("feedback")].filter(Boolean);
  // Clear MathJax's previous state before typesetting newly injected question content.
  if (MathJax.typesetClear) MathJax.typesetClear(targets);
  if (MathJax.typesetPromise) {
    MathJax.startup.promise
      .then(() => MathJax.typesetPromise(targets))
      .catch(error => console.warn("تعذر تنسيق صيغة رياضية في السؤال الحالي", error));
  }
}
$("next").addEventListener("click",()=>{
  if(!answered)return;
  if(index<quizQuestions.length-1){index++;showQuestion();saveTrainingSession();}
  else {clearTrainingSession();showResults();}
  updateResumeCard();
});
$("back").addEventListener("click",()=>{$("quiz").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();$("topic-section").focus({preventScroll:true});window.scrollTo({top:0,behavior:preferredScrollBehavior()});});
$("retry").addEventListener("click",()=> reviewMode ? startReviewQuiz() : startQuiz(currentTopic));
function focusTopicSelector(){
  const target = $("topic-section");
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  if (document.activeElement === target) return;
  requestAnimationFrame(() => {
    const current = $("topic-section");
    if (!current) return;
    current.focus({ preventScroll: true });
    if (document.activeElement !== current) {
      setTimeout(() => {
        const fallback = $("topic-section");
        if (fallback && !fallback.closest(".hidden")) {
          fallback.focus({ preventScroll: true });
        }
      }, 0);
    }
  });
}
$("to-home").addEventListener("click",()=>{
  $("results").classList.add("hidden");
  $("quiz").classList.add("hidden");
  $("home").classList.remove("hidden");
  const topicSelector = $("topic-section");
  if (topicSelector) topicSelector.hidden = false;
  renderTopics();
  window.scrollTo({top:0,behavior:"auto"});
  focusTopicSelector();
}, true);
const topicSearchInput = $("topic-search");
function readHomepageFilters(){
  try {
    const saved = JSON.parse(localStorage.getItem(HOMEPAGE_FILTERS_KEY) || "null");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
    return {
      level: typeof saved.level === "string" ? saved.level : "",
      search: typeof saved.search === "string" ? saved.search.slice(0, 100) : "",
      mastery: typeof saved.mastery === "string" ? saved.mastery : "الكل",
      coverage: typeof saved.coverage === "string" ? saved.coverage : "الكل"
    };
  } catch (_) { return null; }
}
function saveHomepageFilters(){
  try {
    localStorage.setItem(HOMEPAGE_FILTERS_KEY, JSON.stringify({
      level: $("difficulty").value,
      search: topicSearchInput.value.slice(0, 100),
      mastery: $("mastery-filter")?.value || "الكل",
      coverage: $("coverage-filter")?.value || "الكل"
    }));
  } catch (_) {}
}
const savedHomepageFilters = readHomepageFilters();
if (savedHomepageFilters) {
  const availableLevels = [...$("difficulty").options].map(option => option.value);
  if (availableLevels.includes(savedHomepageFilters.level)) $("difficulty").value = savedHomepageFilters.level;
  const availableMasteryStates = [...$("mastery-filter").options].map(option => option.value);
  if (availableMasteryStates.includes(savedHomepageFilters.mastery)) {
    $("mastery-filter").value = savedHomepageFilters.mastery;
  }
  const availableCoverageStates = [...$("coverage-filter").options].map(option => option.value);
  if (availableCoverageStates.includes(savedHomepageFilters.coverage)) {
    $("coverage-filter").value = savedHomepageFilters.coverage;
  }
  topicSearchInput.value = savedHomepageFilters.search;
}
$("difficulty").addEventListener("change",saveHomepageFilters);
$("difficulty").addEventListener("change",renderTopics);
$("mastery-filter").addEventListener("change",saveHomepageFilters);
$("mastery-filter").addEventListener("change",renderTopics);
$("coverage-filter").addEventListener("change",saveHomepageFilters);
$("coverage-filter").addEventListener("change",renderTopics);
topicSearchInput.addEventListener("input",saveHomepageFilters);
topicSearchInput.addEventListener("input",renderTopics);
document.addEventListener("keydown",event=>{
  if(event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  const isTyping = target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(target.tagName));
  if(event.key === "/" && !isTyping && !$("home").classList.contains("hidden")){
    event.preventDefault();
    topicSearchInput.focus();
    return;
  }
  if(event.key === "Escape" && target === topicSearchInput && topicSearchInput.value){
    event.preventDefault();
    topicSearchInput.value = "";
    saveHomepageFilters();
    renderTopics();
  }
});
$("clear-topic-search").addEventListener("click",()=>{
  topicSearchInput.value = "";
  saveHomepageFilters();
  renderTopics();
  topicSearchInput.focus();
});
$("clear-all-topic-filters").addEventListener("click",()=>{
  topicSearchInput.value = "";
  $("difficulty").value = "الكل";
  $("mastery-filter").value = "الكل";
  $("coverage-filter").value = "الكل";
  saveHomepageFilters();
  renderTopics();
  topicSearchInput.focus();
});
$("reset-topic-filters").addEventListener("click",()=>{
  topicSearchInput.value = "";
  $("difficulty").value = "الكل";
  $("mastery-filter").value = "الكل";
  $("coverage-filter").value = "الكل";
  saveHomepageFilters();
  renderTopics();
  topicSearchInput.focus();
});
$("brand-home").addEventListener("click",e=>{e.preventDefault();$("quiz").classList.add("hidden");$("results").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();$("topic-section").focus({preventScroll:true});window.scrollTo({top:0,behavior:preferredScrollBehavior()});});
function startReviewQuiz(){
  const mistakeMap = progressData.mistakes && typeof progressData.mistakes === "object" && !Array.isArray(progressData.mistakes) ? progressData.mistakes : {};
  // Rebuild review questions from the current bank so obsolete backup entries cannot break the quiz.
  reviewQuestions = Object.keys(mistakeMap)
    .map(key => questions.find(q => questionKey(q) === key))
    .filter(isSupportedQuestion);
  if (!reviewQuestions.length) { alert("لا توجد أسئلة خاطئة صالحة للمراجعة حالياً. قد تكون العلامات المتبقية من نسخة قديمة من بنك الأسئلة."); refreshDashboard(); return; }
  reviewMode = true;
  sessionMistakes = [];
  currentTopic = "مراجعة الأخطاء";
  quizQuestions = [...reviewQuestions].sort(()=>Math.random()-0.5);
  index=0; correctCount=0; answered=false;
  $("home").classList.add("hidden"); $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent=currentTopic;
  showQuestion();
  window.scrollTo({top:0,behavior:preferredScrollBehavior()});
}
$("review-mistakes").addEventListener("click",startReviewQuiz);
$("reset-progress").addEventListener("click",()=>{
  if (!confirm("هل تريد مسح تقدم الإجابات والعلامات المرجعية وجدول المراجعة على هذا الجهاز؟ لا يمكن التراجع عن ذلك. سيبقى إعداد الوضع الليلي كما هو.")) return;
  progressData = emptyProgress();
  saveProgress();
  try { localStorage.removeItem(LAST_TOPIC_KEY); } catch (_) {}
  updateResumeCard();
  window.dispatchEvent(new CustomEvent("mathBacSyria:reset-progress"));
  refreshDashboard();
  renderTopics();
});
initDashboardPreferences();
renderTopics();
refreshDashboard();
updateResumeCard();
