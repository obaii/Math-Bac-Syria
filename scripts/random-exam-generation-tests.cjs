#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const shuffleMatch = source.match(/const shuffle = list => \{[\s\S]*?\n  \};/);
const pickerMatch = source.match(/const buildBalancedExam = \(count, difficulty = "الكل"\) => \{[\s\S]*?\n  \};/);
const failures = [];
const check = (name, passed) => {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures.push(name);
};

check("exam question shuffle uses Fisher-Yates rather than random sort", Boolean(
  shuffleMatch && /Math\.floor\(Math\.random\(\) \* \(i \+ 1\)\)/.test(shuffleMatch[0]) &&
  !/\.sort\(\(\) => Math\.random/.test(source)
));
check("balanced random exam picker remains available", Boolean(pickerMatch));

if (shuffleMatch && pickerMatch) {
  const questions = [
    { id: "a1", topic: "أ", level: "أساسي", type: "mcq" },
    { id: "a2", topic: "أ", level: "متوسط", type: "mcq" },
    { id: "a3", topic: "أ", level: "متقدم", type: "mcq" },
    { id: "b1", topic: "ب", level: "أساسي", type: "mcq" },
    { id: "b2", topic: "ب", level: "متوسط", type: "mcq" },
    { id: "b3", topic: "ب", level: "متقدم", type: "mcq" },
    { id: "c1", topic: "ج", level: "أساسي", type: "mcq" },
    { id: "c2", topic: "ج", level: "متوسط", type: "mcq" },
    { id: "typed", topic: "ج", level: "أساسي", type: "numeric" }
  ];
  const makePicker = seed => {
    let state = seed;
    const math = {
      floor: Math.floor,
      min: Math.min,
      random: () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
      }
    };
    return vm.runInNewContext(
      `${shuffleMatch[0]}\n${pickerMatch[0]}\nbuildBalancedExam`,
      { questions, topics: ["أ", "ب", "ج"], getQuestionType: q => q.type || "mcq", Math: math }
    );
  };

  const first = makePicker(17)(5, "الكل");
  const second = makePicker(29)(5, "الكل");
  const topicCounts = first.reduce((counts, q) => {
    counts[q.topic] = (counts[q.topic] || 0) + 1;
    return counts;
  }, {});
  const counts = Object.values(topicCounts);
  check("random exam has the requested size without duplicate questions", first.length === 5 && new Set(first.map(q => q.id)).size === 5);
  check("random exam distributes questions across topics as evenly as available pools allow", counts.length === 3 && Math.max(...counts) - Math.min(...counts) <= 1);
  check("random exam excludes non-multiple-choice items from the current exam flow", first.every(q => q.type === "mcq"));
  const basic = makePicker(41)(10, "أساسي");
  check("difficulty filter is applied before random selection", basic.length === 3 && basic.every(q => q.level === "أساسي"));
  check("different random seeds can produce different exam orders", first.map(q => q.id).join(",") !== second.map(q => q.id).join(","));
}

console.log(`\nRandom exam generation checks: ${failures.length ? "failed" : "passed"}.`);
if (failures.length) process.exitCode = 1;
