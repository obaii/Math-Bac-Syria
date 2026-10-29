"use strict";

// Regression check: curated solution text must be inserted as text, not trusted HTML.
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "enhancements.js"), "utf8");
const safeStepRendering = source.includes('${q.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}');
if (!safeStepRendering) {
  console.error("FAIL: detailed solution steps must pass through escapeHtml before insertion.");
  process.exitCode = 1;
} else {
  console.log("PASS: detailed solution steps are HTML-escaped before rendering.");
}
if (!source.includes("typesetMath(solution)")) {
  console.error("FAIL: MathJax typesetting hook is missing from the solution renderer.");
  process.exitCode = 1;
} else {
  console.log("PASS: MathJax typesetting hook remains present.");
}
