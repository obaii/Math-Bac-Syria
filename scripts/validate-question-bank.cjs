#!/usr/bin/env node
"use strict";

// Validate the question bank without requiring a browser or external packages.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
const load = (file) => vm.runInContext(
  fs.readFileSync(path.join(root, file), "utf8"),
  context,
  { filename: file, timeout: 5000 }
);

try {
  load("questions.js");
  load("questions_vectors_additional.js");
  load("merge-questions.js");
  const data = vm.runInContext(
    "({ topics, questions, additional: vectorQuestionsAdditional })",
    context
  );
  const { topics, questions, additional } = data;
  const errors = [];
  const warnings = [];
  const allowedLevels = new Set(["أساسي", "متوسط", "متقدم"]);
  const normalize = (value) => String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
  const slash = String.fromCharCode(92);
  const countToken = (value, token) => value.split(token).length - 1;
  const extractMathSegments = (value) => {
    const segments = [];
    const pattern = /\\\\\\((.*?)\\\\\\)|\\\\\\[([\\s\\S]*?)\\\\\\]/g;
    for (const match of String(value ?? "").matchAll(pattern)) {
      segments.push(match[1] ?? match[2] ?? "");
    }
    return segments;
  };
  const hasUnbalancedBraces = (formula) => {
    let depth = 0;
    const text = String(formula ?? "");
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== "{" && text[i] !== "}") continue;
      let slashes = 0;
      for (let j = i - 1; j >= 0 && text[j] === slash; j--) slashes++;
      if (slashes % 2 === 1) continue;
      if (text[i] === "{") depth++;
      else if (--depth < 0) return true;
    }
    return depth !== 0;
  };

  if (!Array.isArray(topics) || topics.length === 0) {
    errors.push("قائمة topics مفقودة أو فارغة.");
  } else if (new Set(topics.map(normalize)).size !== topics.length) {
    errors.push("توجد أسماء أبحاث مكررة في topics.");
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push("بنك questions مفقود أو فارغ.");
  }

  const seenQuestions = new Map();
  const counts = new Map();
  for (const topic of topics || []) counts.set(topic, { total: 0, levels: {} });

  for (const [index, q] of (questions || []).entries()) {
    const label = `السؤال #${index + 1}`;
    if (!q || typeof q !== "object") {
      errors.push(`${label}: العنصر ليس كائناً صالحاً.`);
      continue;
    }
    if (!topics.includes(q.topic)) errors.push(`${label}: البحث غير معروف (${q.topic}).`);
    if (!normalize(q.q)) errors.push(`${label}: نص السؤال فارغ.`);
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${label}: يجب أن يحتوي السؤال على أربعة خيارات بالضبط.`);
    } else {
      const normalizedOptions = q.options.map(normalize);
      if (normalizedOptions.some((option) => !option)) errors.push(`${label}: يوجد خيار فارغ.`);
      if (new Set(normalizedOptions).size !== normalizedOptions.length) {
        errors.push(`${label}: يوجد خيار مكرر.`);
      }
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      errors.push(`${label}: فهرس الإجابة الصحيحة يجب أن يكون 0 أو 1 أو 2 أو 3.`);
    }
    if (!normalize(q.solution)) errors.push(`${label}: الحل فارغ.`);
    if (!allowedLevels.has(q.level)) errors.push(`${label}: مستوى الصعوبة غير صالح (${q.level}).`);

    const questionKey = `${normalize(q.topic)}::${normalize(q.q)}`;
    if (seenQuestions.has(questionKey)) {
      errors.push(`${label}: سؤال مكرر مع العنصر #${seenQuestions.get(questionKey)}.`);
    } else {
      seenQuestions.set(questionKey, index + 1);
    }

    const fields = [
      ["نص السؤال", q.q],
      ["الحل", q.solution],
      ...((q.options || []).map((option, i) => [`الخيار ${i + 1}`, option]))
    ];
    for (const [field, value] of fields) {
      const text = String(value ?? "");
      const inlineOpen = countToken(text, slash + "(");
      const inlineClose = countToken(text, slash + ")");
      const displayOpen = countToken(text, slash + "[");
      const displayClose = countToken(text, slash + "]");
      if (inlineOpen !== inlineClose || displayOpen !== displayClose) {
        errors.push(`${label}: محددات LaTeX غير متوازنة في ${field}.`);
      }
      for (const [mathIndex, formula] of extractMathSegments(text).entries()) {
        if (hasUnbalancedBraces(formula)) {
          errors.push(`${label}: أقواس المعادلة ${mathIndex + 1} غير متوازنة في ${field}.`);
        }
      }
    }

    const bucket = counts.get(q.topic);
    if (bucket) {
      bucket.total += 1;
      bucket.levels[q.level] = (bucket.levels[q.level] || 0) + 1;
    }
  }

  const rawAdditional = Array.isArray(additional) ? additional.length : 0;
  console.log(`عدد الأبحاث: ${topics.length}`);
  console.log(`الأسئلة بعد الدمج وإزالة التطابق التام: ${questions.length}`);
  console.log(`مدخلات الملف الإضافي: ${rawAdditional}`);
  console.log("\nتوزيع الأسئلة حسب البحث:");
  for (const [topic, bucket] of counts) {
    console.log(`- ${topic}: ${bucket.total} (${Object.entries(bucket.levels).map(([level, n]) => `${level}: ${n}`).join("، ") || "لا توجد أسئلة"})`);
    if (bucket.total === 0) warnings.push(`البحث "${topic}" لا يحتوي أسئلة.`);
  }
  for (const warning of warnings) console.warn(`تحذير: ${warning}`);
  if (errors.length) {
    console.error(`\nفشل الفحص: ${errors.length} مشكلة:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("\nنجح فحص بنية بنك الأسئلة والمعادلات.");
  }
} catch (error) {
  console.error("تعذر تنفيذ فحص بنك الأسئلة:", error);
  process.exitCode = 1;
}
