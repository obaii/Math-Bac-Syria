#!/usr/bin/env node
"use strict";

// Ensure HTML entry-point assets exist in the repository; ignore external and inline URLs.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const errors = [];
const checked = new Set();

function attributes(tag) {
  const result = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return result;
}

function checkReference(raw, label) {
  const value = String(raw || "").trim();
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(value, "https://local.test/").pathname);
  } catch {
    errors.push(label + ": مرجع غير صالح (" + value + ").");
    return;
  }
  const relative = pathname.replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    errors.push(label + ": المرجع يتجاوز مجلد المشروع (" + value + ").");
    return;
  }
  checked.add(relative || ".");
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    errors.push(label + ": الملف المحلي غير موجود (" + value + ").");
  }
}

for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
  const tag = match[0];
  const kind = match[1].toLowerCase();
  const attrs = attributes(tag);
  if (kind === "script" && attrs.src) {
    checkReference(attrs.src, "script");
  } else if (kind === "link" && attrs.href) {
    const rel = String(attrs.rel || "").toLowerCase().split(/\s+/);
    if (rel.some(value => ["stylesheet", "manifest", "icon", "apple-touch-icon"].includes(value))) {
      checkReference(attrs.href, "link[" + rel.join(" ") + "]");
    }
  }
}

if (errors.length) {
  console.error("فشل فحص مراجع الملفات المحلية في index.html:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("نجح فحص مراجع الملفات المحلية في index.html (" + checked.size + " مرجعاً).");
}
