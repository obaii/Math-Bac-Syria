#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const enhancements = fs.readFileSync(path.join(root, "enhancements.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

const helperMatch = enhancements.match(/const calendarDayOrdinal = date => Math\.floor\(Date\.UTC\(date\.getFullYear\(\), date\.getMonth\(\), date\.getDate\(\)\) \/ 86400000\);/);
assert.ok(helperMatch, "study-plan calendar ordinal should use UTC calendar components");
assert.match(enhancements, /const daysCount = Math\.min\(366, calendarDayOrdinal\(examDate\) - calendarDayOrdinal\(today\) \+ 1\);/,
  "plan generation should count calendar dates rather than elapsed 24-hour periods");
assert.match(enhancements, /const remainingDays = Math\.max\(0, calendarDayOrdinal\(parseLocalDate\(plan\.examDate\)\) - calendarDayOrdinal\(new Date\(\)\) \+ 1\);/,
  "remaining-day metrics should use the same DST-safe calendar arithmetic");
assert.match(html, /enhancements\.js\?v=20261105-5/, "the updated plan logic should have a refreshed asset URL");
assert.match(sw, /math-bac-syria-v74/, "the offline cache should be refreshed for the updated plan logic");

process.env.TZ = "America/Toronto";
const helperExpression = helperMatch[0].replace("const calendarDayOrdinal = date =>", "return date =>").replace(/;$/, "");
const calendarDayOrdinal = new Function(helperExpression)();
const springBefore = new Date(2026, 2, 7);
const springAfter = new Date(2026, 2, 10);
const autumnBefore = new Date(2026, 9, 31);
const autumnAfter = new Date(2026, 10, 3);

assert.notEqual(springAfter - springBefore, 3 * 86400000,
  "the spring DST transition should demonstrate a non-72-hour three-calendar-day interval");
assert.notEqual(autumnAfter - autumnBefore, 3 * 86400000,
  "the autumn DST transition should demonstrate a non-72-hour three-calendar-day interval");
assert.equal(calendarDayOrdinal(springAfter) - calendarDayOrdinal(springBefore), 3,
  "spring DST should still count exactly three calendar days");
assert.equal(calendarDayOrdinal(autumnAfter) - calendarDayOrdinal(autumnBefore), 3,
  "autumn DST should still count exactly three calendar days");

console.log("PASS: study-plan date counts remain correct across Toronto spring and autumn daylight-saving transitions.");
