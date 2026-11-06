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
console.log("PASS: homepage design tokens and stylesheet integration");
