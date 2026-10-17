let currentTopic = "";
let quizQuestions = [];
let index = 0;
let correctCount = 0;
let answered = false;
let mixedMode = false;
let answerHistory = [];
const $ = (id) => document.getElementById(id);
const letters = ["أ", "ب", "ج", "د"];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function renderTopics(filter = "") {
  const filtered = topics.filter(topic => topic.toLocaleLowerCase("ar").includes(filter.trim().toLocaleLowerCase("ar")));
  $("total-count").textContent = `${questions.length} سؤالاً تدريبياً · ${topics.length} محوراً`;
  $("topic-grid").innerHTML = filtered.map(topic => {
    const i = topics.indexOf(topic);
    const count = questions.filter(q => q.topic === topic).length;
    return `<button class="topic-card" data-topic="${escapeAttribute(topic)}">
      <span class="topic-card-top"><span class="topic-number">${String(i + 1).padStart(2, "0")}</span><span class="topic-arrow" aria-hidden="true">←</span></span>
      <span><span class="topic-title">${escapeHTML(topic)}</span><br><span class="topic-meta">${count} أسئلة · ابدأ التدريب</span></span>
    </button>`;
  }).join("");
  $("no-topics").classList.toggle("hidden", filtered.length > 0);
  document.querySelectorAll("[data-topic]").forEach(btn => btn.addEventListener("click", () => startQuiz(btn.dataset.topic)));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
}
function escapeAttribute(value) { return escapeHTML(value); }
function startQuiz(topic, isMixed = false) {
  currentTopic = topic;
  mixedMode = isMixed;
  quizQuestions = shuffle(isMixed ? questions : questions.filter(q => q.topic === topic));
  index = 0; correctCount = 0; answered = false; answerHistory = [];
  $("home").classList.add("hidden"); $("results").classList.add("hidden"); $("quiz").classList.remove("hidden");
  $("quiz-title").textContent = isMixed ? "اختبار شامل من كل الأبحاث" : topic;
  showQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showQuestion() {
  answered = false;
  const q = quizQuestions[index];
  $("question-number").textContent = `${index + 1} من ${quizQuestions.length}`;
  $("progress").textContent = `السؤال ${index + 1} / ${quizQuestions.length}`;
  const percent = index / quizQuestions.length * 100;
  $("progress-bar").style.width = `${percent}%`;
  const progressTrack = document.querySelector(".progress-track");
if (progressTrack) {
  progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
}
  $("question-text").innerHTML = (mixedMode ? `<div class="topic-meta">${escapeHTML(q.topic)}</div>` : "") + q.q;
  $("options").innerHTML = q.options.map((option, i) => `<button class="option" data-option="${i}"><span class="letter">${letters[i]}</span><span>${option}</span></button>`).join("");
  document.querySelectorAll("[data-option]").forEach(btn => btn.addEventListener("click", () => chooseAnswer(Number(btn.dataset.option))));
  $("feedback").className = "feedback hidden"; $("feedback").innerHTML = "";
  $("next").disabled = true;
  $("next").textContent = index === quizQuestions.length - 1 ? "عرض النتيجة ←" : "السؤال التالي ←";
  $("answer-hint").textContent = "اختر إجابة واحدة لعرض التصحيح.";
  typeset();
}
function chooseAnswer(choice) {
  if (answered) return;
  answered = true;
  const q = quizQuestions[index];
  const isCorrect = choice === q.answer;
  if (isCorrect) correctCount++;
  answerHistory.push({ question: q, choice, isCorrect });
  document.querySelectorAll("[data-option]").forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add("correct");
    if (i === choice && !isCorrect) btn.classList.add("wrong");
  });
  const fb = $("feedback");
  fb.className = `feedback ${isCorrect ? "good" : "bad"}`;
  fb.innerHTML = `<strong>${isCorrect ? "✓ إجابة صحيحة، أحسنت!" : "✗ إجابة غير صحيحة"}</strong>
    <div>${isCorrect ? "اختيارك صحيح." : `الإجابة الصحيحة هي: ${letters[q.answer]} — ${q.options[q.answer]}`}</div>
    <div class="solution"><strong>الحل المشروح:</strong><div>${q.solution}</div></div>`;
  $("next").disabled = false;
  $("answer-hint").textContent = isCorrect ? "تابع إلى السؤال التالي." : "اقرأ الحل ثم انتقل للسؤال التالي.";
  const percent = (index + 1) / quizQuestions.length * 100;
  $("progress-bar").style.width = `${percent}%`;
 const progressTrack = document.querySelector(".progress-track");
if (progressTrack) {
  progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
}
  typeset();
}
function showResults() {
  $("quiz").classList.add("hidden"); $("results").classList.remove("hidden");
  const total = quizQuestions.length;
  const percent = Math.round(correctCount / total * 100);
  $("score").textContent = `${correctCount} / ${total} (${percent}٪)`;
  $("score-bar").style.width = `${percent}%`;
  $("score-detail").textContent = `إجابات صحيحة: ${correctCount} · إجابات تحتاج إلى مراجعة: ${total - correctCount} · ${mixedMode ? "اختبار شامل" : currentTopic}`;
  $("result-message").textContent = percent >= 85 ? "ممتاز! واصل التدريب للمحافظة على مستواك." : percent >= 60 ? "أداء جيد. راجع الحلول ثم جرّب الاختبار مرة أخرى." : "لا بأس، التدرّب خطوة بخطوة يساعدك على التحسن.";
  const mistakes = answerHistory.filter(item => !item.isCorrect);
  $("mistakes").classList.toggle("hidden", mistakes.length === 0);
  $("mistake-list").innerHTML = mistakes.map((item, i) => `<div class="mistake-item">
    <div class="mistake-question">${i + 1}. ${item.question.q}</div>
    <div class="mistake-answer">إجابتك: ${letters[item.choice]} — ${item.question.options[item.choice]}</div>
    <div class="mistake-correct">الصحيح: ${letters[item.question.answer]} — ${item.question.options[item.question.answer]}</div>
    <div class="mistake-solution"><strong>الحل:</strong> ${item.question.solution}</div>
  </div>`).join("");
  window.scrollTo({ top: 0, behavior: "smooth" });
  typeset();
}
function typeset() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise().catch(() => {});
  }
}
$("next").addEventListener("click", () => {
  if (!answered) return;
  if (index < quizQuestions.length - 1) { index++; showQuestion(); }
  else showResults();
});
$("back").addEventListener("click", () => { $("quiz").classList.add("hidden"); $("home").classList.remove("hidden"); window.scrollTo({ top: 0, behavior: "smooth" }); });
$("retry").addEventListener("click", () => startQuiz(currentTopic, mixedMode));
$("to-home").addEventListener("click", () => { $("results").classList.add("hidden"); $("home").classList.remove("hidden"); window.scrollTo({ top: 0, behavior: "smooth" }); });
$("mixed-quiz").addEventListener("click", () => startQuiz("اختبار شامل", true));
$("topic-search").addEventListener("input", event => {
  renderTopics(event.target.value);
  $("clear-search").classList.toggle("visible", event.target.value.length > 0);
});
$("clear-search").addEventListener("click", () => { $("topic-search").value = ""; $("clear-search").classList.remove("visible"); renderTopics(); $("topic-search").focus(); });
$("brand-home").addEventListener("click", event => { event.preventDefault(); $("quiz").classList.add("hidden"); $("results").classList.add("hidden"); $("home").classList.remove("hidden"); window.scrollTo({ top: 0, behavior: "smooth" }); });
$("hero-question-count").textContent = new Intl.NumberFormat("ar").format(questions.length);
renderTopics();
