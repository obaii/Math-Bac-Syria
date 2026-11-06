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
assert.match(css, /#section-menu \.quick-start-group-label\s*\{/, "navigation groups should have a distinct heading style");
assert.match(css, /#section-menu \.quick-start-group-label::before/, "navigation group headings should have a consistent visual marker");
assert.match(css, /#section-menu \.quick-start-card\s*\{[^}]*min-height:\s*72px/s, "navigation cards should have a consistent minimum height");
assert.match(css, /#topic-grid \.topic-card\s*\{[^}]*border-radius:\s*var\(--hp-radius-lg\)/s, "research cards should use the shared large radius");
assert.match(css, /#topic-grid \.topic-card \.topic-meta,\s*#topic-grid \.topic-card \.topic-status\s*\{[^}]*color:\s*var\(--hp-muted\)/s, "topic metadata should use the shared muted text color");
assert.match(css, /#topic-grid \.topic-card \.topic-card-bottom\s*\{[^}]*border-top-color:\s*var\(--hp-border\)/s, "topic card separators should use the shared border token");
assert.match(css, /#section-menu-toggle,\s*#section-menu a,\s*#topic-grid \.topic-card/s, "homepage navigation and research controls should share visible keyboard focus");
assert.match(css, /#section-menu \.quick-start-card:active/, "navigation cards should provide a pressed state");
assert.match(css, /#quiz \.actions button:active/, "post-answer actions should provide a pressed state");
assert.match(css, /transition-property:\s*transform, box-shadow, border-color, background-color/, "homepage controls should transition only visual feedback properties");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "homepage motion must respect reduced-motion preferences");
assert.match(css, /\.topic-loading-spinner\s*\{[^}]*animation:\s*none\s*!important/s, "the loading indicator should stop animating for reduced-motion users");

assert.match(css, /#feedback\.good[\s\S]*?background:\s*var\(--hp-success-bg\)/, "positive answer feedback should use the shared success palette");
assert.match(css, /#feedback\.bad[\s\S]*?background:\s*var\(--hp-danger-bg\)/, "corrective answer feedback should use the shared danger palette");
assert.match(css, /\.notice\s*\{[^}]*border-inline-start:\s*4px solid var\(--hp-brand\)/s, "informational notices should share the homepage accent system");
assert.match(css, /\.empty-state,\s*\.topic-loading\s*\{/, "empty and loading states should use consistent surfaces");
assert.match(css, /body\.dark-mode #feedback\.good,[\s\S]*?color:\s*var\(--hp-ink\)/, "feedback text should retain the shared readable foreground in dark mode");
assert.match(css, /body\.dark-mode \.notice,[\s\S]*?body\.dark-mode \.topic-loading/, "notice and loading states should explicitly support dark mode");
console.log("PASS: homepage design system, feedback states, and dark-mode support");
