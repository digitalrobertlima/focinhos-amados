#!/usr/bin/env node
/**
 * Set project version across files from a single input (e.g., 0.1.8 or v0.1.8).
 * Updates:
 *  - assets/js/config.js (window.CONFIG.appVersion)
 *  - config.json (appVersion)
 *  - sw.js (fallback version in SW_VERSION template)
 *  - manifest.webmanifest (version)
 *  - Root HTML files' fallback text inside <span data-bind="version">...</span>
 *  - package.json (version) [optional but enabled]
 *
 * Usage:
 *   node tools/set-version.js 0.1.8
 *   npm run set:version -- 0.1.8
 */
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const arg = (process.argv[2] || '').trim();
if(!arg){
  console.error('Usage: node tools/set-version.js <version>  # e.g., 0.1.8 or v0.1.8');
  process.exit(1);
}

const m = arg.match(/^v?(\d+\.\d+\.\d+)$/);
if(!m){
  console.error('Invalid version. Use semantic version like 0.1.8 or v0.1.8');
  process.exit(1);
}

const NUM = m[1];
const DISP = `v${NUM}`; // display in UI

function read(p){ return fs.readFileSync(p, 'utf8'); }
function write(p, s){ fs.writeFileSync(p, s, 'utf8'); }
function upd(p, re, repl){
  const txt = read(p);
  const out = txt.replace(re, repl);
  if(out !== txt){ write(p, out); return true; }
  return false;
}

const changes = [];
function change(p, ok){ if(ok) changes.push(path.relative(repo, p)); }

// 1) assets/js/config.js -> appVersion
{
  const f = path.join(repo, 'assets', 'js', 'config.js');
  if(fs.existsSync(f)){
    change(f, upd(f, /(appVersion\s*:\s*["'])v?\d+\.\d+\.\d+(["'])/g, `$1${DISP}$2`));
  }
}

// 2) config.json -> appVersion
{
  const f = path.join(repo, 'config.json');
  if(fs.existsSync(f)){
    change(f, upd(f, /(\"appVersion\"\s*:\s*\")v?\d+\.\d+\.\d+(\")/g, `$1${DISP}$2`));
  }
}

// 3) sw.js -> fallback in template literal const SW_VERSION = `fa-${V || '0.x.y'}`;
{
  const f = path.join(repo, 'sw.js');
  if(fs.existsSync(f)){
    change(f, upd(f, /(const\s+SW_VERSION\s*=\s*`fa-\$\{V\s*\|\|\s*')(\d+\.\d+\.\d+)('\}`;)/, `$1${NUM}$3`));
  }
}

// 4) manifest.webmanifest -> version
{
  const f = path.join(repo, 'manifest.webmanifest');
  if(fs.existsSync(f)){
    change(f, upd(f, /(\"version\"\s*:\s*\")\d+\.\d+\.\d+(\")/g, `$1${NUM}$2`));
  }
}

// 5) HTML fallbacks -> <span data-bind="version">vX.Y.Z</span>
{
  const htmlFiles = ['index.html','404.html','agendar.html','delivery.html','sobre.html','taxi.html']
    .map(f=> path.join(repo, f)).filter(f=> fs.existsSync(f));
  for(const f of htmlFiles){
    change(f, upd(f, /(<span\s+data-bind=\"version\">)v?\d+\.\d+\.\d+(<\/span>)/g, `$1${DISP}$2`));
  }
}

// 6) package.json -> version (numeric)
{
  const f = path.join(repo, 'package.json');
  if(fs.existsSync(f)){
    change(f, upd(f, /(\"version\"\s*:\s*\")\d+\.\d+\.\d+(\")/, `$1${NUM}$2`));
  }
}

console.log(`[set-version] Version set to ${DISP} (${NUM}). Files updated: ${changes.length}`);
changes.forEach(f=> console.log(' -', f));
