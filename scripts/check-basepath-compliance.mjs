#!/usr/bin/env node
/**
 * Scans client-side source for fetch/EventSource calls that omit withBasePath().
 * Exit 1 when violations are found (for CI / pre-deploy smoke).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const scanRoots = [join(root, "src/app"), join(root, "src/components"), join(root, "src/lib/client")];
const skipFragments = ["/api/", "/lib/server/", "client-template"];

const riskyPatterns = [
  { label: "fetch", regex: /\bfetch\s*\(\s*(['"`])\/(?!\/)/ },
  { label: "EventSource", regex: /\bnew\s+EventSource\s*\(\s*(['"`])\/(?!\/)/ },
];

const violations = [];

for (const scanRoot of scanRoots) {
  walk(scanRoot);
}

if (violations.length > 0) {
  console.error("basePath compliance check failed:\n");
  for (const item of violations) {
    console.error(`  ${item.file}:${item.line} [${item.kind}] ${item.text}`);
  }
  console.error(`\n${violations.length} issue(s). Wrap runtime paths with withBasePath().`);
  process.exit(1);
}

console.log("basePath compliance check passed.");
process.exit(0);

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry)) {
      continue;
    }
    const rel = relative(root, fullPath);
    if (skipFragments.some((fragment) => rel.includes(fragment))) {
      continue;
    }
    scanFile(rel, readFileSync(fullPath, "utf8"));
  }
}

function scanFile(file, content) {
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes("withBasePath")) {
      continue;
    }
    for (const pattern of riskyPatterns) {
      if (pattern.regex.test(line)) {
        violations.push({
          file,
          kind: pattern.label,
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  }
}
