let currentTopic = "";
let quizQuestions = [];
let index = 0;
let correctCount = 0;
let answered = false;
let reviewMode = false;
let reviewQuestions = [];
const STORAGE_KEY = "mathBacSyriaProgressV1";
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
const emptyProgress = () => ({ answered: 0, correct: 0, mistakes: {}, topicStats: {}, attempts: [] });
function loadProgress(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return emptyProgress();
    return { ...emptyProgress(), ...saved, mistakes: saved.mistakes || {}, topicStats: saved.topicStats || {}, attempts: Array.isArray(saved.attempts) ? saved.attempts : [] };
  } catch(e) { return emptyProgress(); }
}
let progressData = loadProgress();
function saveProgress(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData)); }
  catch(e) { console.warn("تعذر حفظ التقدم محلياً", e); }
}
function questionKey(q){ return `${q.topic}::${q.q}`; }
function refreshDashboard(){
  $("stat-answered").textContent = progressData.answered.toLocaleString("ar");
  $("stat-correct").textContent = progressData.correct.toLocaleString("ar");
  const mistakes = Object.keys(progressData.mistakes).length;
  $("stat-mistakes").textContent = mistakes.toLocaleString("ar");
  $("stat-percent").textContent = progressData.answered ? `${Math.round(progressData.correct / progressData.answered * 100).toLocaleString("ar")}٪` : "—";
  $("review-mistakes").disabled = mistakes === 0;
  $("review-mistakes").classList.toggle("is-disabled", mistakes === 0);
}

function renderTopics(){
  const level = $("difficulty").value;
  const search = ($("topic-search")?.value || "").trim().toLocaleLowerCase("ar");
  const availableTopics = topics.filter(topic => topic.toLocaleLowerCase("ar").includes(search));
  $("total-count").textContent = `${questions.length.toLocaleString("ar")} سؤال تدريبي`;
  $("topic-grid").innerHTML = availableTopics.map(topic=>{
    const i = topics.indexOf(topic);
    const count = questions.filter(q=>q.topic===topic && (level==="الكل" || q.level===level)).length;
    const done = Object.keys(progressData.mistakes).length + progressData.correct;
    const topicStat = progressData.topicStats[topic] || {answered:0,correct:0};
    const successRate = topicStat.answered ? Math.round(topicStat.correct/topicStat.answered*100) : 0;
    const completion = topicStat.answered ? `${successRate.toLocaleString("ar")}٪ نجاح` : "لم تبدأ بعد";
    return `<button class="topic-card" data-topic="${topic}" ${count===0?"disabled":""}>
      <span class="topic-card-top"><span class="topic-number">${String(i+1).padStart(2,"0")}</span><span class="topic-arrow">↖</span></span>
      <span class="topic-card-content"><span class="topic-title">${topic}</span><span class="topic-meta">${count.toLocaleString("ar")} سؤال متاح</span></span>
      <span class="topic-card-bottom"><span class="topic-status">${completion}</span><span class="topic-start">${count ? "ابدأ التدريب ←" : "لا توجد أسئلة بهذا المستوى"}</span></span>
      <span class="topic-mastery" role="progressbar" aria-label="نسبة الإجابات الصحيحة في ${topic}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${successRate}"><span style="width:${successRate}%"></span></span>
    </button>`;
  }).join("");
  $("no-topics").classList.toggle("hidden", availableTopics.length !== 0);
  document.querySelectorAll("[data-topic]").forEach(btn=>btn.addEventListener("click",()=>startQuiz(btn.dataset.topic)));
  refreshDashboard();
}
function startQuiz(topic){
  currentTopic = topic;
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
  fb.innerHTML=`<strong>${isCorrect?"✓ إجابة صحيحة، أحسنت!":"✗ إجابة غير صحيحة"}</strong>
    <div>${isCorrect?"اختيارك صحيح.":"الإجابة الصحيحة هي: "+letters[q.answer]+" — "+q.options[q.answer]}</div>
    <div class="solution"><strong>الحل:</strong><div>${q.solution}</div></div>`;
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
$("back").addEventListener("click",()=>{$("quiz").classList.add("hidden");$("home").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});});
$("retry").addEventListener("click",()=> reviewMode ? startReviewQuiz() : startQuiz(currentTopic));
$("to-home").addEventListener("click",()=>{$("results").classList.add("hidden");$("quiz").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();window.scrollTo({top:0,behavior:"smooth"});});
$("difficulty").addEventListener("change",renderTopics);
$("topic-search").addEventListener("input",renderTopics);
$("brand-home").addEventListener("click",e=>{e.preventDefault();$("quiz").classList.add("hidden");$("results").classList.add("hidden");$("home").classList.remove("hidden");renderTopics();window.scrollTo({top:0,behavior:"smooth"});});
function startReviewQuiz(){
  reviewQuestions = Object.values(progressData.mistakes);
  if (!reviewQuestions.length) { alert("لا توجد إجابات خاطئة للمراجعة حالياً. أحسنت!"); return; }
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
  window.dispatchEvent(new CustomEvent("mathBacSyria:reset-progress"));
  refreshDashboard();
  renderTopics();
});
renderTopics();
refreshDashboard();
