#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const css = fs.readFileSync("homepage-polish.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
for (const token of ["--hp-brand", "--hp-ink", "--hp-muted", "--hp-surface", "--hp-border", "--hp-focus", "--hp-radius-md", "--hp-shadow-md"]) {
  assert.ok(css.includes(token), "homepage design token missing: " + token);
}
assert.match(html, /href="homepage-polish\.css"/, "homepage polish stylesheet must be loaded");
assert.match(css, /body\.dark-mode\s*\{/, "design tokens must include a dark theme override");
for (const selector of [".dashboard", ".first-visit-guide", "#section-menu", ".quick-start-card", ".stat-card", ".topic-card"]) {
  assert.ok(css.includes(selector), "shared component system should cover " + selector);
}
assert.match(css, /border-radius:\s*var\(--hp-radius-lg\)/, "large homepage surfaces should share the large radius token");
assert.match(css, /box-shadow:\s*var\(--hp-shadow-md\)/, "large homepage surfaces should share the medium elevation token");
console.log("PASS: homepage design tokens, stylesheet integration, and shared surface system");
