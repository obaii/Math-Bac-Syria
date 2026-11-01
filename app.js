let currentTopic = "";
let quizQuestions = [];
let index = 0;
let correctCount = 0;
let answered = false;
let reviewMode = false;
let reviewQuestions = [];
const STORAGE_KEY = "mathBacSyriaProgressV1";
const LAST_TOPIC_KEY = "mathBacSyriaLastTopicV1";
const $ = (id) => document.getElementById(id);
// Include supplementary vector questions without replacing or duplicating existing items.
if (typeof vectorQuestionsAdditional !== "undefined" && Array.isArray(vectorQuestionsAdditional)) {
  const knownQuestionKeys = new Set(questions.map(q => `${q.topic}::${q.q}`));
  for (const q of vectorQuestionsAdditional) {
    const key = `${q.topic}::${q.q}`;
    if (!knownQuestionKeys.has(key)) { questions.push(q); knownQuestionKeys.add(key); }
  }
}
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
    days.push({
      key,
      label: new Intl.DateTimeFormat("ar", { weekday: "short" }).format(day),
      count: attempts.length,
      correct,
      rate: attempts.length ? Math.round(correct / attempts.length * 100) : 0
    });
  }
  const total = days.reduce((sum, day) => sum + day.count, 0);
  chart.replaceChildren();
  section.hidden = total === 0;
  if (!total) return;
  for (const day of days) {
    const item = document.createElement("li");
    item.className = "performance-trend-day";
    const rate = document.createElement("strong");
    rate.className = "performance-trend-rate";
    rate.textContent = day.count ? day.rate.toLocaleString("ar") + "٪" : "—";
    const track = document.createElement("div");
    track.className = "performance-trend-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", day.label + ": نسبة الإجابات الصحيحة");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(day.rate));
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
  summary.textContent = "خلال آخر ٧ أيام: " + total.toLocaleString("ar") +
    " إجابة، ونسبة صحة " + weeklyRate.toLocaleString("ar") + "٪.";
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
    cell.className = "activity-calendar-day level-" + level;
    cell.textContent = day.date.getDate().toLocaleString("ar");
    cell.title = day.label + ": " + day.count.toLocaleString("ar") + " إجابة";
    cell.setAttribute("aria-label", day.weekday + " " + day.label + ": " + day.count.toLocaleString("ar") + " إجابة");
    cell.setAttribute("data-date", day.key);
    cell.setAttribute("data-count", String(day.count));
    grid.append(cell);
  }
  const lastSeven = days.slice(-7);
  const weeklyAnswers = lastSeven.reduce((sum, day) => sum + day.count, 0);
  const activeDays = lastSeven.filter(day => day.count > 0).length;
  summary.textContent = "آخر ٧ أيام: " + weeklyAnswers.toLocaleString("ar") + " إجابة خلال " + activeDays.toLocaleString("ar") + " أيام نشطة.";
  section.dataset.totalAnswers = String(weeklyAnswers);
  section.dataset.activeDays = String(activeDays);
  section.hidden = false;
}

function renderRecentActivity(){
  const section = $("recent-activity");
  const list = $("recent-activity-list");
  if (!section || !list) return;
  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : [])
    .filter(attempt => attempt && typeof attempt.topic === "string" &&
      Array.isArray(topics) && topics.includes(attempt.topic) &&
      typeof attempt.correct === "boolean" && Number.isFinite(Date.parse(attempt.date)));
  const recentTopics = [];
  const seenTopics = new Set();
  for (const attempt of validAttempts) {
    if (seenTopics.has(attempt.topic)) continue;
    seenTopics.add(attempt.topic);
    const topicAttempts = validAttempts.filter(item => item.topic === attempt.topic);
    const correct = topicAttempts.filter(item => item.correct).length;
    recentTopics.push({
      topic: attempt.topic,
      count: topicAttempts.length,
      rate: Math.round(correct / topicAttempts.length * 100),
      date: attempt.date
    });
    if (recentTopics.length === 5) break;
  }
  list.replaceChildren();
  section.hidden = recentTopics.length === 0;
  const dateFormatter = new Intl.DateTimeFormat("ar", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
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
    const date = document.createElement("time");
    date.dateTime = item.date;
    date.textContent = dateFormatter.format(new Date(item.date));
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
}

function renderWeakTopicRecommendation(){
  const section = $("weak-topic-recommendation");
  const name = $("weak-topic-name");
  const rateNode = $("weak-topic-rate");
  const detail = $("weak-topic-detail");
  const button = $("weak-topic-button");
  if (!section || !name || !rateNode || !detail || !button) return;
  const candidates = (Array.isArray(topics) ? topics : []).map(topic => {
    const stat = progressData.topicStats && progressData.topicStats[topic];
    const answered = stat && Number.isSafeInteger(stat.answered) && stat.answered > 0 ? stat.answered : 0;
    const correct = stat && Number.isSafeInteger(stat.correct) && stat.correct >= 0 ? Math.min(stat.correct, answered) : 0;
    return { topic, answered, correct, rate: answered ? Math.round(correct / answered * 100) : 0 };
  }).filter(item => item.answered > 0 && questions.some(q => q.topic === item.topic));
  candidates.sort((a, b) => a.rate - b.rate || b.answered - a.answered || a.topic.localeCompare(b.topic, "ar"));
  const weakest = candidates[0];
  section.hidden = !weakest;
  if (!weakest) return;
  name.textContent = weakest.topic;
  rateNode.textContent = weakest.rate.toLocaleString("ar") + "٪";
  detail.textContent = weakest.answered.toLocaleString("ar") + " إجابة مسجلة، منها " +
    weakest.correct.toLocaleString("ar") + " صحيحة. هذا البحث هو الأقل في نسبة الإجابات الصحيحة بين الأبحاث التي بدأت بها.";
  button.onclick = () => startQuiz(weakest.topic);
}

function renderAchievements(){
  const section = $("achievement-section");
  const list = $("achievement-list");
  const summary = $("achievement-summary");
  if (!section || !list || !summary) return;
  const answered = Number.isSafeInteger(progressData.answered) && progressData.answered > 0 ? progressData.answered : 0;
  const correct = Number.isSafeInteger(progressData.correct) && progressData.correct >= 0 ? Math.min(progressData.correct, answered) : 0;
  const rate = answered ? Math.round(correct / answered * 100) : 0;
  const startedTopics = (Array.isArray(topics) ? topics : []).filter(topic => {
    const stat = progressData.topicStats && progressData.topicStats[topic];
    return stat && Number.isSafeInteger(stat.answered) && stat.answered > 0;
  }).length;
  const validAttempts = (Array.isArray(progressData.attempts) ? progressData.attempts : []).filter(attempt =>
    attempt && typeof attempt.topic === "string" && Array.isArray(topics) && topics.includes(attempt.topic) &&
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
  const badges = [
    { id:"first-answer", icon:"🌱", title:"البداية الأولى", description:"سجّلت أول إجابة تدريبية.", value:answered, target:1, unlocked:answered>=1, progressText:answered>=1?"تم الإنجاز":"ابدأ بحل سؤال واحد" },
    { id:"ten-answers", icon:"✍️", title:"خطوات ثابتة", description:"أكملت ١٠ إجابات تدريبية.", value:answered, target:10, unlocked:answered>=10, progressText:answered.toLocaleString("ar")+" / ١٠ إجابات" },
    { id:"fifty-answers", icon:"📘", title:"مثابر", description:"أكملت ٥٠ إجابة تدريبية.", value:answered, target:50, unlocked:answered>=50, progressText:answered.toLocaleString("ar")+" / ٥٠ إجابة" },
    { id:"hundred-answers", icon:"🏅", title:"مئة خطوة", description:"أكملت ١٠٠ إجابة تدريبية.", value:answered, target:100, unlocked:answered>=100, progressText:answered.toLocaleString("ar")+" / ١٠٠ إجابة" },
    { id:"explorer", icon:"🧭", title:"مستكشف الأبحاث", description:"بدأت التدريب في خمسة أبحاث مختلفة.", value:startedTopics, target:5, unlocked:startedTopics>=5, progressText:startedTopics.toLocaleString("ar")+" / ٥ أبحاث" },
    { id:"accuracy", icon:"🎯", title:"دقة مميزة", description:"حققت دقة ٨٠٪ على الأقل بعد ١٠ إجابات.", value:answered>=10 && rate>=80 ? 1 : 0, target:1, unlocked:answered>=10 && rate>=80, progressText:answered<10?"أكمل ١٠ إجابات أولاً":rate.toLocaleString("ar")+"٪ من الدقة المطلوبة ٨٠٪" },
    { id:"streak", icon:"🔥", title:"ثلاثة أيام متتالية", description:"تدرّبت في ثلاثة أيام متتابعة.", value:streak, target:3, unlocked:streak>=3, progressText:streak.toLocaleString("ar")+" / ٣ أيام" }
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
    copy.append(title, description, progress);
    const status = document.createElement("span"); status.className = "achievement-status"; status.textContent = badge.unlocked ? "مكتملة" : "قيد التقدم";
    item.append(icon, copy, status);
    list.append(item);
  }
  const unlockedCount = badges.filter(badge => badge.unlocked).length;
  summary.textContent = "أنجزت " + unlockedCount.toLocaleString("ar") + " من " + badges.length.toLocaleString("ar") + " إنجازات.";
  section.dataset.unlockedCount = String(unlockedCount);
  section.dataset.totalCount = String(badges.length);
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
  if (name.includes("نهاية متتالية")) return "uₙ";
  if (name.includes("المتتاليات")) return "uₙ";
  if (name.includes("النهايات")) return "↗";
  return "∑";
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

function renderTopics(){
  const level = $("difficulty").value;
  const search = ($("topic-search")?.value || "").trim().toLocaleLowerCase("ar");
  const clearSearchButton = $("clear-topic-search");
  if (clearSearchButton) clearSearchButton.hidden = search.length === 0;
  const availableTopics = topics.filter(topic => topic.toLocaleLowerCase("ar").includes(search));
  $("total-count").textContent = `${questions.length.toLocaleString("ar")} سؤال تدريبي`;
  $("topic-grid").innerHTML = availableTopics.map(topic=>{
    const i = topics.indexOf(topic);
    const count = questions.filter(q=>q.topic===topic && (level==="الكل" || q.level===level)).length;
    const topicStat = progressData.topicStats[topic] || {answered:0,correct:0};
    const successRate = topicStat.answered ? Math.round(topicStat.correct/topicStat.answered*100) : 0;
    const seenCount = questions.filter(q => q.topic === topic && (level === "الكل" || q.level === level) && progressData.seenQuestions[questionKey(q)]).length;
    const coverageRate = count ? Math.min(100, Math.round(seenCount/count*100)) : 0;
    const attempts = Number.isSafeInteger(topicStat.answered) && topicStat.answered > 0 ? topicStat.answered : 0;
    const correctAnswers = Number.isSafeInteger(topicStat.correct) && topicStat.correct > 0 ? Math.min(topicStat.correct, attempts) : 0;
    const mastery = getTopicMastery(topicStat);
    const topicState = seenCount === 0 ? "لم تبدأ بعد" : coverageRate === 100 ? "جرّبت جميع الأسئلة" : "قيد التقدم";
    return `<button class="topic-card" data-topic="${topic}" data-topic-attempts="${attempts}" data-topic-correct="${correctAnswers}" data-mastery="${mastery.key}" ${count===0?"disabled":""}>
      <span class="topic-card-top"><span class="topic-number">${String(i+1).padStart(2,"0")}</span><span class="topic-state ${seenCount === 0 ? "not-started" : coverageRate === 100 ? "covered" : "in-progress"}">${topicState}</span><span class="topic-arrow">↖</span></span>
      <span class="topic-card-content"><span class="topic-subject-icon" aria-hidden="true">${topicIcon(topic)}</span><span class="topic-title">${topic}</span><span class="topic-meta">${count.toLocaleString("ar")} سؤال متاح</span></span>
      <span class="topic-card-bottom"><span class="topic-status">${seenCount.toLocaleString("ar")} من ${count.toLocaleString("ar")} سؤالاً جُرّب</span><span class="topic-start">ابدأ التدريب ←</span></span>
      <span class="topic-card-performance">${attempts ? `${attempts.toLocaleString("ar")} إجابة · ${correctAnswers.toLocaleString("ar")} صحيحة · ${successRate.toLocaleString("ar")}٪ دقة` : "لم تسجل إجابات بعد"}</span>
      <span class="topic-mastery-status ${mastery.key}" title="${mastery.answered < 10 && mastery.answered > 0 ? "يحتاج تصنيف الإتقان إلى 10 إجابات على الأقل" : mastery.rate === null ? "لم تُسجّل إجابات لهذا البحث بعد" : mastery.rate.toLocaleString("ar") + "٪ من الإجابات صحيحة"}">${mastery.label}</span>
      <span class="topic-mastery" role="progressbar" aria-label="نسبة الأسئلة التي جرى حلها في ${topic}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${coverageRate}"><span style="width:${coverageRate}%"></span></span>
    </button>`;
  }).join("");
  $("no-topics").classList.toggle("hidden", availableTopics.length !== 0);
  document.querySelectorAll("[data-topic]").forEach(btn=>btn.addEventListener("click",()=>startQuiz(btn.dataset.topic)));
  refreshDashboard();
}
function updateResumeCard(){
  const section = $("resume-session");
  const name = $("resume-topic-name");
  const button = $("resume-topic-button");
  if (!section || !name || !button) return;
  let lastTopic = "";
  try { lastTopic = localStorage.getItem(LAST_TOPIC_KEY) || ""; }
  catch (_) { lastTopic = ""; }
  if (!lastTopic || !Array.isArray(topics) || !topics.includes(lastTopic) || !questions.some(q => q.topic === lastTopic)) {
    section.hidden = true;
    return;
  }
  name.textContent = lastTopic;
  section.hidden = false;
  button.onclick = () => startQuiz(lastTopic);
}

function startQuiz(topic){
  currentTopic = topic;
  try { localStorage.setItem(LAST_TOPIC_KEY, topic); } catch (_) {}
  updateResumeCard();
  reviewMode = false;
  const level = $("difficulty").value;
  quizQuestions = questions.filter(q=>q.topic===topic && (level==="الكل" || q.level===level));
  if(!quizQuestions.length){ alert("لا توجد أسئلة في هذا المستوى لهذا البحث حالياً. اختر مستوى آخر."); return; }
  quizQuestions = [...quizQuestions].sort(()=>Math.random()-0.5);
  index=0; correctCount=0; answered=false;
  $("home").classList.add("hidden"); $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent=topic;
  showQuestion();
  window.scrollTo({top:0,behavior:"smooth"});
}
function showQuestion(){
  answered=false;
  const q=quizQuestions[index];
  $("question-number").textContent=`${index+1} من ${quizQuestions.length}`;
  $("progress").textContent=`السؤال ${index+1} / ${quizQuestions.length}`;
  $("progress-bar").style.width=`${index/quizQuestions.length*100}%`;
  $("question-text").innerHTML=q.q;
  if (typeof getQuestionDiagram === "function") {
    const diagramMarkup = getQuestionDiagram(q);
    if (diagramMarkup) $("question-text").insertAdjacentHTML("beforeend", diagramMarkup);
  }
  $("options").innerHTML=q.options.map((option,i)=>`<button class="option" data-option="${i}"><span class="letter">${letters[i]}</span><span>${option}</span></button>`).join("");
  document.querySelectorAll("[data-option]").forEach(btn=>btn.addEventListener("click",()=>chooseAnswer(Number(btn.dataset.option))));
  $("feedback").className="feedback hidden"; $("feedback").innerHTML="";
  $("next").disabled=true;
  $("next").textContent=index===quizQuestions.length-1?"عرض النتيجة ←":"السؤال التالي ←";
  typeset();
}
function chooseAnswer(choice){
  if(answered)return;
  answered=true;
  const q=quizQuestions[index];
  const isCorrect=choice===q.answer;
  if(isCorrect)correctCount++;
  if (!reviewMode) {
    progressData.answered += 1;
    progressData.seenQuestions = progressData.seenQuestions || {};
    progressData.seenQuestions[questionKey(q)] = true;
    if (isCorrect) {
      progressData.correct += 1;
      delete progressData.mistakes[questionKey(q)];
    } else {
      progressData.mistakes[questionKey(q)] = { topic: q.topic, q: q.q, options: q.options, answer: q.answer, solution: q.solution, level: q.level };
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
  document.querySelectorAll("[data-option]").forEach((btn,i)=>{
    btn.disabled=true;
    if(i===q.answer)btn.classList.add("correct");
    if(i===choice && !isCorrect)btn.classList.add("wrong");
  });
  const fb=$("feedback");
  fb.className=`feedback ${isCorrect?"good":"bad"}`;
  const escapeSolutionText = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const hasGuidedSteps = typeof q.keyIdea === "string" && q.keyIdea.trim() &&
    Array.isArray(q.steps) && q.steps.length > 0 &&
    q.steps.every(step => typeof step === "string" && step.trim());
  const solutionContent = hasGuidedSteps
    ? `<div class="solution-key-idea"><strong>الفكرة الأساسية:</strong><div>${escapeSolutionText(q.keyIdea)}</div></div>
       <ol class="solution-steps">${q.steps.map(step => `<li>${escapeSolutionText(step)}</li>`).join("")}</ol>`
    : `<div>${q.solution}</div>`;
  fb.innerHTML=`<strong>${isCorrect?"✓ إجابة صحيحة، أحسنت!":"✗ إجابة غير صحيحة"}</strong>
    <div>${isCorrect?"اختيارك صحيح.":"الإجابة الصحيحة هي: "+letters[q.answer]+" — "+q.options[q.answer]}</div>
    <div class="solution"><strong>الحل:</strong>${solutionContent}</div>`;
  $("next").disabled=false;
  $("progress-bar").style.width=`${(index+1)/quizQuestions.length*100}%`;
  typeset();
}
function showResults(){
  $("quiz").classList.add("hidden"); $("results").classList.remove("hidden");
  const total=quizQuestions.length;
  const percent=Math.round(correctCount/total*100);
  $("score").textContent=`${correctCount} / ${total} (${percent}٪)`;
  $("score-detail").textContent=`إجابات صحيحة: ${correctCount} · إجابات خاطئة: ${total-correctCount} · ${reviewMode ? "مراجعة الأخطاء" : "البحث: "+currentTopic}`;
  if (reviewMode) $("quiz-title").textContent = "مراجعة الإجابات الخاطئة";
  window.scrollTo({top:0,behavior:"smooth"});
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
  if(index<quizQuestions.length-1){index++;showQuestion();}
  else showResults();
});
$("back").addEventListener("click",()=>{$("quiz").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();window.scrollTo({top:0,behavior:"smooth"});});
$("retry").addEventListener("click",()=> reviewMode ? startReviewQuiz() : startQuiz(currentTopic));
$("to-home").addEventListener("click",()=>{$("results").classList.add("hidden");$("quiz").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();window.scrollTo({top:0,behavior:"smooth"});});
$("difficulty").addEventListener("change",renderTopics);
const topicSearchInput = $("topic-search");
topicSearchInput.addEventListener("input",renderTopics);
$("clear-topic-search").addEventListener("click",()=>{
  topicSearchInput.value = "";
  renderTopics();
  topicSearchInput.focus();
});
$("brand-home").addEventListener("click",e=>{e.preventDefault();$("quiz").classList.add("hidden");$("results").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();window.scrollTo({top:0,behavior:"smooth"});});
function startReviewQuiz(){
  const mistakeMap = progressData.mistakes && typeof progressData.mistakes === "object" && !Array.isArray(progressData.mistakes) ? progressData.mistakes : {};
  // Rebuild review questions from the current bank so obsolete backup entries cannot break the quiz.
  reviewQuestions = Object.keys(mistakeMap)
    .map(key => questions.find(q => questionKey(q) === key))
    .filter(q => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4);
  if (!reviewQuestions.length) { alert("لا توجد أسئلة خاطئة صالحة للمراجعة حالياً. قد تكون العلامات المتبقية من نسخة قديمة من بنك الأسئلة."); refreshDashboard(); return; }
  reviewMode = true;
  currentTopic = "مراجعة الأخطاء";
  quizQuestions = [...reviewQuestions].sort(()=>Math.random()-0.5);
  index=0; correctCount=0; answered=false;
  $("home").classList.add("hidden"); $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent=currentTopic;
  showQuestion();
  window.scrollTo({top:0,behavior:"smooth"});
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
renderTopics();
refreshDashboard();
updateResumeCard();
