#!/usr/bin/env node
/**
 * Scan repo for unreferenced images under assets/img and report them.
 * Looks across HTML/JS/CSS/manifest/sw/config files.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const imgDir = path.join(repoRoot, 'assets', 'img');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function loadFiles(patterns) {
  const files = [];
  for (const rel of patterns) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      files.push(...walk(abs).filter(f => /\.(html|css|js|json|webmanifest|xml|txt)$/i.test(f)));
    } else {
      files.push(abs);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(imgDir)) {
    console.error('assets/img not found');
    process.exit(2);
  }

  const contentFiles = loadFiles([
    '.', // whole repo but filtered by extensions
  ]);
  const allContent = contentFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  const imgs = walk(imgDir);
  const used = new Set();
  const unused = [];
  const duplicates = [];

  for (const p of imgs) {
    const rel = path.relative(repoRoot, p).replace(/\\/g, '/');
    const base = path.basename(p);
    const isDup = /\b[Cc]opia\b|\bcopy\b/.test(base);
    if (isDup) duplicates.push(rel);
    const referenced = allContent.includes(rel) || allContent.includes(base);
    if (referenced) used.add(rel);
    else unused.push(rel);
  }

  const report = { used: Array.from(used).sort(), unused: unused.sort(), duplicates: duplicates.sort(), total: imgs.length };
  const outPath = path.join(repoRoot, 'unused_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Scanned ${imgs.length} images. Used: ${used.size}. Unused: ${unused.length}. Duplicates: ${duplicates.length}.`);
  if (duplicates.length) {
    console.log('\nPotential duplicates (safe to delete if not referenced):');
    for (const d of duplicates) console.log('  -', d);
  }
  if (unused.length) {
    console.log('\nUnreferenced images:');
    for (const u of unused) console.log('  -', u);
  }
  console.log(`\nFull report saved to ${path.basename(outPath)}`);
}

main();
