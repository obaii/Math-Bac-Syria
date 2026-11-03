"use strict";

const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const ids = [...html.matchAll(/\\bid\\s*=\\s*["']([^"']+)["']/gi)].map(match => match[1]);
const idCounts = new Map();
for (const id of ids) idCounts.set(id, (idCounts.get(id) || 0) + 1);

for (const [id, count] of idCounts) {
  check(count === 1, `Duplicate HTML id "${id}" appears ${count} times.`);
}

const fragments = [...html.matchAll(/\\bhref\\s*=\\s*["']#([^"']+)["']/gi)]
  .map(match => match[1])
  .filter(Boolean);

for (const fragment of new Set(fragments)) {
  check(idCounts.has(fragment), `Internal link target "#${fragment}" does not exist in index.html.`);
}

if (failures.length) {
  console.error("HTML anchor integrity checks failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${ids.length} unique HTML ids and ${fragments.length} internal fragment links are valid.`);
}
