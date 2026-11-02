#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const match = source.match(/const renderExamHistory = \(\) => \{[\s\S]*?\n  \};/);
const failures = [];
const check = (name, passed) => {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
  if (!passed) failures.push(name);
};
check("exam history renderer is available", Boolean(match));

if (match) {
  const panel = { innerHTML: "" };
  const history = Array.from({ length: 8 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    total: 20,
    correct: 20 - index,
    topicResults: { "الاشتقاق": { total: 10, correct: 8 - Math.min(index, 7) } }
  }));
  const render = vm.runInNewContext(`${match[0]}\nrenderExamHistory`, {
    document: { getElementById: id => id === "exam-history" ? panel : null },
    extras: { examHistory: history },
    escapeHtml: value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  });
  render();
  const count = (panel.innerHTML.match(/class="exam-history-item"/g) || []).length;
  check("archive renders all available records rather than only five", count === 8);
  check("the five newest attempts remain visible in the recent section", panel.innerHTML.indexOf("<ol class=\"exam-history-list\">") < panel.innerHTML.indexOf("<details class=\"exam-history-archive\">"));
  check("older attempts are grouped in an accessible expandable details section", /<details class="exam-history-archive">[\s\S]*?<summary>عرض بقية الأرشيف/.test(panel.innerHTML));
  check("archive labels retain chronological attempt numbering", panel.innerHTML.includes("محاكاة سابقة ٨"));
  const emptyPanel = { innerHTML: "" };
  const emptyRender = vm.runInNewContext(`${match[0]}\nrenderExamHistory`, {
    document: { getElementById: () => emptyPanel },
    extras: { examHistory: [] },
    escapeHtml: value => String(value)
  });
  emptyRender();
  check("empty archive explains where future results will appear", emptyPanel.innerHTML.includes("بعد إنهاء أول امتحان تجريبي"));
}
check("exam history storage retains up to twenty attempts", /extras\.examHistory = \[\{ date:new Date\(\)\.toISOString\(\), correct, total, topicResults \}, \.\.\.\(extras\.examHistory \|\| \[\]\)\]\.slice\(0, 20\)/.test(source));

console.log(`\nExam history archive checks: ${failures.length ? "failed" : "passed"}.`);
if (failures.length) process.exitCode = 1;
