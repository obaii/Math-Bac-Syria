"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const serviceWorker = read("sw.js");
const html = read("index.html");
const installScript = read("pwa-install.js");
const manifest = JSON.parse(read("manifest.webmanifest"));

const coreMatch = serviceWorker.match(/const CORE_FILES = \[([\s\S]*?)\];/);
check(Boolean(coreMatch), "CORE_FILES must be declared as a static array in sw.js");

const coreFiles = coreMatch
  ? [...coreMatch[1].matchAll(/"([^"]+)"/g)].map(match => match[1])
  : [];
const coreSet = new Set(coreFiles);

check(coreFiles.length > 0, "CORE_FILES must not be empty");
check(coreSet.size === coreFiles.length, "CORE_FILES contains duplicate paths");

for (const asset of coreFiles) {
  const cleanPath = asset.replace(/^\.\//, "");
  const absolutePath = path.resolve(root, cleanPath || ".");
  check(
    absolutePath === root || absolutePath.startsWith(root + path.sep),
    `Core asset escapes repository root: ${asset}`
  );
  check(fs.existsSync(absolutePath), `Core asset does not exist: ${asset}`);
}

const localReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(reference =>
    reference &&
    !reference.startsWith("#") &&
    !/^(?:[a-z]+:)?\/\//i.test(reference) &&
    !reference.startsWith("data:")
  )
  .map(reference => reference.split(/[?#]/, 1)[0])
  .filter(Boolean);

for (const reference of localReferences) {
  const normalized = reference.startsWith("./") ? reference : `./${reference}`;
  check(
    coreSet.has(normalized),
    `Local index.html asset is missing from CORE_FILES: ${reference}`
  );
}

for (const icon of manifest.icons || []) {
  const normalized = icon.src.startsWith("./") ? icon.src : `./${icon.src}`;
  check(
    coreSet.has(normalized),
    `Manifest icon is missing from CORE_FILES: ${icon.src}`
  );
}

check(
  /addEventListener\(["']install["']/.test(serviceWorker),
  "Service worker must install and precache core assets"
);
check(
  /addEventListener\(["']activate["']/.test(serviceWorker),
  "Service worker must handle activation and cache cleanup"
);
check(
  /addEventListener\(["']fetch["']/.test(serviceWorker),
  "Service worker must provide a fetch strategy"
);
check(
  /caches\.delete\(name\)/.test(serviceWorker),
  "Service worker must remove obsolete application caches"
);
check(
  /serviceWorker\.register\(["']\.\/sw\.js["']/.test(installScript),
  "PWA installer must register the expected service worker"
);

if (failures.length) {
  console.error("Service worker / offline asset checks failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${coreFiles.length} unique core assets exist and all local page/manifest assets are precached.`);
  console.log("PASS: service worker install, activate, fetch, cache cleanup, and registration hooks are present.");
}
