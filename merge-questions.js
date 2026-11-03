/* Centralized assembly of the legacy and supplementary question collections. */
(function () {
  if (typeof questions === "undefined" || !Array.isArray(questions)) return;

  const known = new Set(
    questions.map(question => `${question.topic}::${question.q}`)
  );

  function appendUnique(collection) {
    if (!Array.isArray(collection)) return;
    for (const question of collection) {
      if (!question || typeof question !== "object") continue;
      const key = `${question.topic}::${question.q}`;
      if (known.has(key)) continue;
      questions.push(question);
      known.add(key);
    }
  }

  // Keep the order deterministic: vector questions first, then typed questions.
  if (typeof vectorQuestionsAdditional !== "undefined") {
    appendUnique(vectorQuestionsAdditional);
  }
  if (typeof typedQuestionsAdditional !== "undefined") {
    appendUnique(typedQuestionsAdditional);
  }
})();
