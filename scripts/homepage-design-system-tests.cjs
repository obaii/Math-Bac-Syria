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
console.log("PASS: homepage design system, research cards, and interaction feedback");
