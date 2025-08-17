const fs = require('fs');
const path = require('path');
const readline = require('readline');

const repoRoot = path.resolve(__dirname, '..');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === '.git') continue;
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) walk(fp, filelist);
    else filelist.push(fp);
  }
  return filelist;
}

function readFileSafe(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (e) { return null; }
}
function writeFileSafe(fp, data) {
  fs.writeFileSync(fp, data, 'utf8');
}

function scanForPatterns(patterns) {
  const files = walk(repoRoot);
  const results = {};
  for (const p of patterns) results[p] = [];
  for (const f of files) {
    if (!f.endsWith('.html') && !f.endsWith('.js') && !f.endsWith('.css') && !f.endsWith('.webmanifest') && !f.endsWith('.json')) continue;
    const content = readFileSafe(f);
    if (!content) continue;
    for (const p of patterns) {
      if (content.includes(p)) results[p].push(path.relative(repoRoot, f));
    }
  }
  return results;
}

function ensureLogoSvg() {
  const logoSvgPath = path.join(repoRoot, 'assets', 'img', 'logo.svg');
  if (!fs.existsSync(logoSvgPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64" viewBox="0 0 256 64">
  <rect width="100%" height="100%" fill="#fff0"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Segoe UI, Arial" font-size="20" fill="#e44">Focinhos Amados</text>
</svg>`;
    writeFileSafe(logoSvgPath, svg);
    return { created: true, path: logoSvgPath };
  }
  return { created: false, path: logoSvgPath };
}

function replaceReferences(oldPaths, newPath) {
  const files = walk(repoRoot);
  const changed = [];
  for (const f of files) {
    if (!f.endsWith('.html') && !f.endsWith('.css') && !f.endsWith('.js') && !f.endsWith('.webmanifest')) continue;
    let content = readFileSafe(f);
    if (!content) continue;
    const original = content;
    for (const oldp of oldPaths) {
      content = content.split(oldp).join(newPath);
    }
    if (content !== original) {
      writeFileSafe(f, content);
      changed.push(path.relative(repoRoot, f));
    }
  }
  return changed;
}

function fillShopCoords(lat = -19.9520894, lng = -43.9926409) {
  const cfgPath = path.join(repoRoot, 'assets', 'js', 'config.js');
  let txt = readFileSafe(cfgPath);
  if (!txt) return { ok: false, reason: 'config.js not found' };
  const newTxt = txt.replace(/shopCoords\s*:\s*{[^}]*}/m, `shopCoords: { lat: ${lat}, lng: ${lng} }`);
  writeFileSafe(cfgPath, newTxt);
  return { ok: true, path: path.relative(repoRoot, cfgPath) };
}

function incrementSWVersion() {
  const swPath = path.join(repoRoot, 'sw.js');
  let txt = readFileSafe(swPath);
  if (!txt) return { ok: false, reason: 'sw.js not found' };
  const m = txt.match(/(const\s+SW_VERSION\s*=\s*)(['"]?)(\d+)(['"]?)/);
  if (m) {
    const current = parseInt(m[3], 10);
    const next = current + 1;
    const newTxt = txt.replace(m[0], `${m[1]}${m[2]}${next}${m[4]}`);
    writeFileSafe(swPath, newTxt);
    return { ok: true, from: current, to: next, path: path.relative(repoRoot, swPath) };
  } else {
    const injected = `const SW_VERSION = "1";\n`;
    writeFileSafe(swPath, injected + txt);
    return { ok: true, injected: true, path: path.relative(repoRoot, swPath) };
  }
}

function addSpriteToSW() {
  const swPath = path.join(repoRoot, 'sw.js');
  let txt = readFileSafe(swPath);
  if (!txt) return { ok: false, reason: 'sw.js not found' };
  if (!txt.includes('assets/img/sprite.svg')) {
    const arrMatch = txt.match(/(const\s+STATIC_ASSETS\s*=\s*\[)([\s\S]*?)(\];)/);
    if (arrMatch) {
      const before = arrMatch[1];
      const body = arrMatch[2];
      const after = arrMatch[3];
      const newBody = body + `\n  '/assets/img/sprite.svg',`;
      const newTxt = txt.replace(arrMatch[0], before + newBody + after);
      writeFileSafe(swPath, newTxt);
      return { ok: true, added: true, path: path.relative(repoRoot, swPath) };
    } else {
      return { ok: false, reason: 'STATIC_ASSETS array not found in sw.js' };
    }
  }
  return { ok: true, added: false, path: path.relative(repoRoot, swPath) };
}

function createAt2Placeholders() {
  const imgDir = path.join(repoRoot, 'assets', 'img');
  if (!fs.existsSync(imgDir)) return { ok: false, reason: 'assets/img not found' };
  const gallery = ['gallery-pet-1.webp','gallery-pet-2.webp','gallery-pet-3.webp','gallery-pet-4.webp','gallery-pet-5.webp'];
  const created = [];
  for (const g of gallery) {
    const src = path.join(imgDir, g);
    if (fs.existsSync(src)) {
      const dest = path.join(imgDir, g.replace('.webp','@2x.webp'));
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        created.push(path.relative(repoRoot, dest));
      }
    }
  }
  return { ok: true, created };
}

function listMissingAssets() {
  const patterns = ['favicon.svg','logo_heart.svg','@2x.webp','gallery-pet-6.webp','assets/img/sprite.svg'];
  const found = scanForPatterns(patterns);
  const missing = [];
  const checkFiles = [
    'assets/img/favicon.svg',
    'assets/img/logo_heart.svg',
    'assets/img/logo.svg',
    'assets/img/sprite.svg'
  ];
  for (const cf of checkFiles) {
    if (!fs.existsSync(path.join(repoRoot, cf))) missing.push(cf);
  }
  return { foundRefs: found, missingFiles: missing };
}

async function mainMenu() {
  console.log('Menu interativo do projeto — responda apenas com o número da opção e Enter.\n');
  while (true) {
    console.log('1) Listar referências problemáticas e arquivos faltantes');
    console.log('2) Corrigir logo: criar assets/img/logo.svg (se não existir) e substituir referências para logo.svg');
    console.log('3) Preencher shopCoords (Av. Padre José Maurício, 572) automaticamente');
    console.log('4) Criar placeholders @2x para imagens da galeria (cópias simples)');
    console.log('5) Garantir sprite.svg está no cache do Service Worker (sw.js)');
    console.log('6) Incrementar SW_VERSION em sw.js');
    console.log('7) Executar todas as correções seguras automaticamente (1-6)');
    console.log('8) Mostrar instruções para servir localmente (comando)');
    console.log('9) Sair\n');
    const ans = await ask('Escolha um número: ');
    if (ans === '1') {
      const res = listMissingAssets();
      console.log('\nReferências encontradas (busca em .html/.js/.css/.webmanifest/.json):');
      console.dir(res.foundRefs, { depth: 2 });
      console.log('\nArquivos físicos ausentes (recomendados):');
      res.missingFiles.forEach(x => console.log(' - ' + x));
      console.log('');
    } else if (ans === '2') {
      const created = ensureLogoSvg();
      const changed = replaceReferences(['assets/img/escultura_unique.png','escultura_unique.png','logo_heart.svg'], '/assets/img/logo.svg');
      console.log(`logo.svg ${created.created ? 'criado' : 'já existia'} em ${created.path}`);
      if (changed.length) console.log('Referências substituídas em:\n - ' + changed.join('\n - '));
      else console.log('Nenhuma referência alterada.');
      console.log('');
    } else if (ans === '3') {
      const r = fillShopCoords();
      if (r.ok) console.log('shopCoords preenchido em', r.path);
      else console.log('Erro:', r.reason);
      console.log('');
    } else if (ans === '4') {
      const r = createAt2Placeholders();
      if (r.ok) {
        if (r.created.length) {
          console.log('Placeholders criados:\n - ' + r.created.join('\n - '));
        } else console.log('Nenhum placeholder criado (talvez já existam).');
      } else console.log('Erro:', r.reason);
      console.log('');
    } else if (ans === '5') {
      const r = addSpriteToSW();
      if (r.ok) {
        if (r.added) console.log('sprite.svg adicionado ao STATIC_ASSETS em', r.path);
        else console.log('sprite.svg já referenciado no sw.js');
      } else console.log('Erro:', r.reason);
      console.log('');
    } else if (ans === '6') {
      const r = incrementSWVersion();
      if (r.ok) {
        if (r.injected) console.log('Constante SW_VERSION injetada em', r.path);
        else console.log(`SW_VERSION incrementada de ${r.from} para ${r.to} em ${r.path}`);
      } else console.log('Erro:', r.reason);
      console.log('');
    } else if (ans === '7') {
      console.log('Executando 1-6 automaticamente...');
      const a1 = listMissingAssets();
      const c2 = ensureLogoSvg();
      const rep = replaceReferences(['assets/img/escultura_unique.png','escultura_unique.png','logo_heart.svg'], '/assets/img/logo.svg');
      const a3 = fillShopCoords();
      const a4 = createAt2Placeholders();
      const a5 = addSpriteToSW();
      const a6 = incrementSWVersion();
      console.log('Feito. Resumo:');
      console.log('- logo.svg:', c2.created ? 'criado' : 'existia');
      console.log('- refs substituídas em:', rep.length ? rep.join(', ') : 'nenhuma');
      console.log('- shopCoords:', a3.ok ? 'preenchido' : a3.reason);
      console.log('- @2x placeholders:', a4.created.length ? a4.created.join(', ') : 'nenhum criado');
      console.log('- sprite -> sw:', a5.ok ? (a5.added ? 'adicionado' : 'já presente') : a5.reason);
      console.log('- SW version:', a6.ok ? (a6.injected ? 'injetada' : `incrementada ${a6.from}→${a6.to}`) : a6.reason);
      console.log('');
    } else if (ans === '8') {
      console.log('\nPara servir localmente use (PowerShell/CMD):');
      console.log('python -m http.server 8080');
      console.log('Abra http://localhost:8080 no navegador.\n');
    } else if (ans === '9' || ans.toLowerCase() === 'sair') {
      console.log('Saindo...');
      break;
    } else {
      console.log('Opção inválida. Responda com um número entre 1 e 9.\n');
    }
  }
  rl.close();
}

mainMenu().catch(err => {
  console.error('Erro no menu:', err);
  rl.close();
});
