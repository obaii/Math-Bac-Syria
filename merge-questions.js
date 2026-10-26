/* دمج الأسئلة الإضافية دون تكرار أي سؤال موجود */
(function () {
  if (typeof questions === "undefined" || typeof vectorQuestionsAdditional === "undefined") return;
  const known = new Set(questions.map(q => `${q.topic}::${q.q}`));
  for (const q of vectorQuestionsAdditional) {
    const key = `${q.topic}::${q.q}`;
    if (!known.has(key)) { questions.push(q); known.add(key); }
  }
})();
