#!/usr/bin/env node
/**
 * Fails if a Next.js / Hostinger production build still contains fictional
 * tutor inventory (names, mock hub ids, or prerendered /tutor/1–5 pages).
 *
 * Usage:
 *   node scripts/assert-no-mock-tutors-in-build.js
 *   node scripts/assert-no-mock-tutors-in-build.js hostinger-next
 *   node scripts/assert-no-mock-tutors-in-build.js .next
 */
const fs = require("node:fs");
const path = require("node:path");

const MARKERS = [
  "Mariana Silva",
  "Lucas Ferreira",
  "Rodrigo Almeida",
  "Fernanda Costa",
  "André Martins",
  "Andre Martins",
  "hub-m1",
  "hub-m2",
  "hub-l1",
  "hub-l2",
  "hub-r1",
  "hub-f1",
  "hub-f2",
  "hub-a1",
];

const PAGE_EXTENSIONS = new Set([".html", ".rsc", ".body", ".xml", ".meta"]);
const CLIENT_EXTENSIONS = new Set([".js", ".json"]);
const SKIP_DIR_NAMES = new Set(["cache", "trace", "types", "cache"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    files.push(full);
  }

  return files;
}

function shouldScan(filePath, root) {
  const rel = path.relative(root, filePath);
  const ext = path.extname(filePath);
  if (rel.startsWith(`server${path.sep}app${path.sep}`) && PAGE_EXTENSIONS.has(ext)) {
    return true;
  }
  if (rel.startsWith(`static${path.sep}chunks${path.sep}`) && CLIENT_EXTENSIONS.has(ext)) {
    return true;
  }
  if (rel.startsWith(`server${path.sep}chunks${path.sep}`) && CLIENT_EXTENSIONS.has(ext)) {
    return true;
  }
  return false;
}

function scanRoot(root) {
  const hits = [];
  const appDir = path.join(root, "server", "app");
  const staticDir = path.join(root, "static", "chunks");

  for (const dir of [appDir, staticDir]) {
    for (const file of walk(dir)) {
      if (!shouldScan(file, root)) {
        continue;
      }
      const text = fs.readFileSync(file, "utf8");
      for (const marker of MARKERS) {
        if (text.includes(marker)) {
          hits.push({ file: path.relative(process.cwd(), file), marker });
        }
      }
    }
  }

  return hits;
}

function resolveRoots() {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  if (requested.length > 0) {
    return requested.map((dir) => path.resolve(process.cwd(), dir));
  }

  return [".next", "hostinger-next"]
    .map((dir) => path.resolve(process.cwd(), dir))
    .filter((dir) => fs.existsSync(path.join(dir, "server", "app")));
}

const roots = resolveRoots();
if (roots.length === 0) {
  console.log("Nenhum build Next.js encontrado para inspecionar.");
  process.exit(0);
}

const hits = [];
for (const root of roots) {
  if (!fs.existsSync(root)) {
    console.error(`Build directory not found: ${root}`);
    process.exit(1);
  }
  hits.push(...scanRoot(root));
}

if (hits.length > 0) {
  console.error("Inventário mock de tutores encontrado no build de produção:");
  for (const hit of hits.slice(0, 50)) {
    console.error(`  ${hit.marker} → ${hit.file}`);
  }
  if (hits.length > 50) {
    console.error(`  … e mais ${hits.length - 50} ocorrência(s)`);
  }
  process.exit(1);
}

console.log(
  `Build sem inventário mock (${roots.map((root) => path.relative(process.cwd(), root) || root).join(", ")}).`,
);
