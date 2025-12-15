#!/usr/bin/env node
/**
 * Build a minimal dist/ folder with only referenced files.
 * - Copies HTML, CSS, JS, manifest, sw, config.json
 * - Scans HTML/JS/CSS for asset references under assets/
 */
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const dist = path.join(repo, 'dist');

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
function copyFile(src, dst){ ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); }
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

function main(){
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  ensureDir(dist);

  // Copy root HTML and core files
  const roots = fs.readdirSync(repo).filter(f => /\.(html|webmanifest|xml|txt|json)$/i.test(f) || ['sw.js'].includes(f));
  for (const f of roots){ copyFile(path.join(repo, f), path.join(dist, f)); }

  // Copy assets/css and assets/js entirely
  const cssDir = path.join(repo, 'assets', 'css');
  const jsDir = path.join(repo, 'assets', 'js');
  if (fs.existsSync(cssDir)) for (const f of walk(cssDir)) copyFile(f, path.join(dist, path.relative(repo, f)));
  if (fs.existsSync(jsDir)) for (const f of walk(jsDir)) copyFile(f, path.join(dist, path.relative(repo, f)));

  // Scan for referenced assets (images)
  const pages = roots.filter(f => f.endsWith('.html')).map(f => path.join(repo, f));
  const codeFiles = [...pages];
  if (fs.existsSync(cssDir)) codeFiles.push(...walk(cssDir));
  if (fs.existsSync(jsDir)) codeFiles.push(...walk(jsDir));
  const content = codeFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const assetRe = /assets\/(?:img|icons)\/[^"'\)\s]+/g;
  const matches = new Set(content.match(assetRe) || []);

  for (const rel of matches){
    const src = path.join(repo, rel);
    if (fs.existsSync(src)) copyFile(src, path.join(dist, rel));
  }

  console.log(`dist built with ${matches.size} image assets and core files.`);
}

main();
