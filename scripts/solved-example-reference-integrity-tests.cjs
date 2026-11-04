#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const inventory = read("lesson-label-inventory.json");
const crosswalk = read("lesson-label-crosswalk.json");
const source = fs.readFileSync(path.join(root, "solved-examples.js"), "utf8");
const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

// The library uses stable id:"..." fields in its example records.
const actualIds = [...source.matchAll(/\bid\s*:\s*"([^"]+)"/g)].map(match => match[1]);
const actualSet = new Set(actualIds);
expect(actualIds.length === actualSet.size, "Solved-example IDs must be unique.");
expect(actualIds.length === inventory.exampleCount, "Inventory exampleCount must match the actual solved-example library.");

const inventoryIds = inventory.entries.flatMap(row => row.exampleIds || []);
const crosswalkIds = crosswalk.entries.flatMap(row => row.exampleIds || []);
const countIds = rows => rows.reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
const inventoryCounts = countIds(inventoryIds);
const crosswalkCounts = countIds(crosswalkIds);

expect(inventoryIds.length === inventory.exampleCount, "Inventory example ID total must match exampleCount.");
expect(crosswalkIds.length === inventory.exampleCount, "Crosswalk must account for every library example exactly once.");
for (const id of actualSet) {
  expect(inventoryCounts.get(id) === 1, "Library example must occur exactly once in inventory: " + id);
  expect(crosswalkCounts.get(id) === 1, "Library example must occur exactly once in crosswalk: " + id);
}
for (const id of inventoryIds) {
  expect(actualSet.has(id), "Inventory references an unknown solved-example ID: " + id);
}
for (const id of crosswalkIds) {
  expect(actualSet.has(id), "Crosswalk references an unknown solved-example ID: " + id);
}
expect(inventoryIds.slice().sort().join("\n") === crosswalkIds.slice().sort().join("\n"),
  "Inventory and crosswalk must contain the exact same example ID set.");

for (const row of [...inventory.entries, ...crosswalk.entries]) {
  const ids = row.exampleIds || [];
  expect(row.exampleCount === ids.length, "exampleCount must match exampleIds for label: " + row.lessonLabel);
  const sourceTotal = Object.values(row.sourceTypes || {}).reduce((sum, value) => sum + value, 0);
  expect(sourceTotal === row.exampleCount, "sourceTypes must reconcile for label: " + row.lessonLabel);
}

if (failures.length) {
  console.error("Solved-example reference integrity failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("PASS: all " + actualIds.length + " solved examples have unique IDs.");
  console.log("PASS: inventory and provisional crosswalk each reference every example exactly once.");
  console.log("PASS: per-label example counts and source-type totals reconcile.");
}
