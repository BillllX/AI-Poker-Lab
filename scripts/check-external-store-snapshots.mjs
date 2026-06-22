#!/usr/bin/env node
/**
 * Flags useSyncExternalStore getSnapshot patterns that often cause React #185
 * (unstable object/array snapshots → infinite re-render → white screen).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const scanRoots = [join(root, "src/app"), join(root, "src/components"), join(root, "src/lib/client")];

/** Inline getSnapshot returning fresh object/array literals. */
const inlineUnsafePatterns = [
  {
    label: "inline-object-literal",
    regex: /=>\s*\(\s*\{/,
    hint: "Return a cached module-level object or a named getSnapshot function.",
  },
  {
    label: "inline-object-literal",
    regex: /=>\s*\(\{/,
    hint: "Return a cached module-level object or a named getSnapshot function.",
  },
  {
    label: "inline-array-literal",
    regex: /=>\s*\[\s*\]/,
    hint: "Use a module-level EMPTY_ARRAY constant for server snapshots.",
  },
  {
    label: "inline-array-literal",
    regex: /=>\s*\[[^\]]+\]/,
    hint: "Use a cached array snapshot (see agentFavorites listFavoriteAgents).",
  },
];

const violations = [];

for (const scanRoot of scanRoots) {
  walk(scanRoot);
}

if (violations.length > 0) {
  console.error("external-store snapshot check failed:\n");
  for (const item of violations) {
    console.error(`  ${item.file}:${item.line} [${item.kind}] ${item.text}`);
    console.error(`    → ${item.hint}\n`);
  }
  console.error(`${violations.length} issue(s). See .cursor/rules/external-store-snapshots.mdc`);
  process.exit(1);
}

console.log("external-store snapshot static check passed.");
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
    scanFile(relative(root, fullPath), readFileSync(fullPath, "utf8"));
  }
}

function scanFile(file, content) {
  if (!content.includes("useSyncExternalStore")) {
    return;
  }

  const blocks = extractUseSyncExternalStoreBlocks(content);
  for (const block of blocks) {
    const getSnapshot = extractGetSnapshotArg(block.text);
    if (!getSnapshot) {
      continue;
    }
    if (getSnapshot.includes("external-store-snapshot:stable")) {
      continue;
    }
    scanGetSnapshotArg(file, block.startLine, getSnapshot);
  }
}

function extractUseSyncExternalStoreBlocks(content) {
  const blocks = [];
  const needle = "useSyncExternalStore(";
  let searchFrom = 0;

  while (searchFrom < content.length) {
    const start = content.indexOf(needle, searchFrom);
    if (start === -1) {
      break;
    }
    const openParen = start + needle.length - 1;
    const end = findMatchingParen(content, openParen);
    if (end === -1) {
      break;
    }
    blocks.push({
      startLine: lineNumberAt(content, start),
      text: content.slice(start, end + 1),
    });
    searchFrom = end + 1;
  }

  return blocks;
}

function findMatchingParen(content, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

function extractGetSnapshotArg(blockText) {
  const openParen = blockText.indexOf("(");
  const closeParen = blockText.lastIndexOf(")");
  if (openParen === -1 || closeParen === -1) {
    return null;
  }

  const argsText = blockText.slice(openParen + 1, closeParen);
  const args = splitTopLevelArgs(argsText);
  return args[1]?.trim() ?? null;
}

function splitTopLevelArgs(text) {
  const args = [];
  let current = "";
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "(") {
      depthParen += 1;
    } else if (char === ")") {
      depthParen -= 1;
    } else if (char === "{") {
      depthBrace += 1;
    } else if (char === "}") {
      depthBrace -= 1;
    } else if (char === "[") {
      depthBracket += 1;
    } else if (char === "]") {
      depthBracket -= 1;
    }

    if (char === "," && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    args.push(current.trim());
  }
  return args;
}

function scanGetSnapshotArg(file, startLine, getSnapshot) {
  const normalized = getSnapshot.replace(/\s+/g, " ");

  for (const pattern of inlineUnsafePatterns) {
    if (pattern.regex.test(normalized)) {
      violations.push({
        file,
        hint: pattern.hint,
        kind: pattern.label,
        line: startLine,
        text: normalized.slice(0, 120),
      });
      return;
    }
  }

  if (/^[\w$]+\s*$/.test(normalized)) {
    return;
  }

  if (/^\(\)\s*=>\s*[\w$]+\(/.test(normalized)) {
    return;
  }

  if (/^\(\)\s*=>\s*[\w$.]+\??\./.test(normalized)) {
    return;
  }

  if (/^\(\)\s*=>\s*(true|false|null|undefined|\d+|["'`])/.test(normalized)) {
    return;
  }

  if (/^\(\)\s*=>\s*\([^)]*\?\s*[^:]+:\s*(true|false|null|undefined|\d+|["'`][^"']*["'`])\s*\)$/.test(normalized)) {
    return;
  }

  if (/^\(\)\s*=>\s*\([^)]*\?\s*[\w$]+\([^)]*\)\s*:\s*(true|false|null|undefined)\s*\)$/.test(normalized)) {
    return;
  }
}
