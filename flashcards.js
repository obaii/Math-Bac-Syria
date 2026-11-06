/* بطاقات تعليمية تفاعلية مبنية على مكتبة القوانين */
(() => {
  "use strict";
  const root = document.getElementById("flashcards");
  if (!root) return;
  const data = Array.isArray(window.MathFormulaLibraryData) ? window.MathFormulaLibraryData : [];
  const key = "mathBacSyriaFlashcardsV1";
  const $ = id => root.querySelector("#" + id);
  const deck = $("flashcard-deck"), card = $("flashcard");
  const front = $("flashcard-front"), back = $("flashcard-back");
  const title = $("flashcard-title"), category = $("flashcard-category");
  const formula = $("flashcard-formula"), note = $("flashcard-note");
  const counter = $("flashcard-counter"), progress = $("flashcard-progress");
  const status = $("flashcard-status"), flip = $("flashcard-flip");
  status?.setAttribute("aria-live", "polite");
  status?.setAttribute("aria-atomic", "true");
  const known = $("flashcard-known"), review = $("flashcard-review");
  const previous = $("flashcard-previous"), next = $("flashcard-next");
  let ratings = {}, selected = "all", index = 0, revealed = false, order = [];
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && saved.ratings && typeof saved.ratings === "object") ratings = saved.ratings;
  } catch (_) {}
  const items = () => data.filter(item => selected === "all" || item.category === selected);
  const current = () => data.find(item => item.id === order[index]) || items()[0];
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify({ ratings })); }
    catch (_) { status.textContent = "تعذر حفظ التقدم على هذا الجهاز."; }
  };
  const render = () => {
    const list = items();
    if (!list.length) return;
    order = order.length === list.length && order.every(id => list.some(item => item.id === id)) ? order : list.map(item => item.id);
    index = Math.max(0, Math.min(index, order.length - 1));
    const item = current();
    title.textContent = item.title;
    category.textContent = item.category;
    formula.textContent = "\\[" + item.tex + "\\]";
    note.textContent = item.note;
    front.hidden = revealed; back.hidden = !revealed;
    flip.textContent = revealed ? "إخفاء الإجابة" : "اكشف الإجابة";
    flip.setAttribute("aria-expanded", String(revealed));
    card.setAttribute("aria-expanded", String(revealed));
    counter.textContent = "البطاقة " + (index + 1) + " من " + order.length;
    const mastered = list.filter(entry => ratings[entry.id] === "known").length;
    const revisit = list.filter(entry => ratings[entry.id] === "review").length;
    progress.textContent = "أتقنت " + mastered + " · تحتاج مراجعة " + revisit;
    status.textContent = ratings[item.id] === "known" ? "سبق أن صنّفت هذه البطاقة: أعرفها." : ratings[item.id] === "review" ? "هذه البطاقة ضمن قائمة ما يحتاج إلى مراجعة." : "لم تُقيّم هذه البطاقة بعد.";
    previous.disabled = index === 0;
    next.disabled = index >= order.length - 1;
    known.setAttribute("aria-pressed", String(ratings[item.id] === "known"));
    review.setAttribute("aria-pressed", String(ratings[item.id] === "review"));
    if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([root]).catch(() => {});
  };
  const reveal = () => { revealed = !revealed; render(); };
  const move = delta => { index = Math.max(0, Math.min(order.length - 1, index + delta)); revealed = false; render(); };
  const rate = value => { const item = current(); if (!item) return; ratings[item.id] = value; save(); render(); };
  [...new Set(data.map(item => item.category))].forEach(name => {
    const option = document.createElement("option"); option.value = name; option.textContent = name; deck.append(option);
  });
  deck.addEventListener("change", () => { selected = deck.value; index = 0; order = []; revealed = false; render(); });
  flip.addEventListener("click", reveal);
  card.addEventListener("click", event => { if (!event.target.closest("button")) reveal(); });
  card.addEventListener("keydown", event => { if (event.target === card && ["Enter", " "].includes(event.key)) { event.preventDefault(); reveal(); } });
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  known.addEventListener("click", () => rate("known"));
  review.addEventListener("click", () => rate("review"));
  $("flashcard-shuffle").addEventListener("click", () => {
    order = items().map(item => item.id);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    index = 0; revealed = false; render();
  });
  $("flashcard-reset").addEventListener("click", () => { ratings = {}; index = 0; revealed = false; save(); render(); status.textContent = "تمت إعادة ضبط تقدم البطاقات."; });
  order = data.map(item => item.id);
  render();
  window.MathFlashcards = Object.freeze({ storageKey: key, getData: () => data.slice() });
})();