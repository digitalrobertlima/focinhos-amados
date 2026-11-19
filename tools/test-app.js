#!/usr/bin/env node
/* Testes de ponta a ponta do app v2 (Puppeteer).
   Uso: npm test   (defina PUPPETEER_EXECUTABLE_PATH se o Chrome não estiver no padrão) */
const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const raiz = process.env.RAIZ ? path.resolve(process.env.RAIZ) : path.resolve(__dirname, '..'); // RAIZ=dist testa o build
const PORTA = 8123;
const BASE = `http://localhost:${PORTA}`;
const TIPOS = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

function servir() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let f = path.join(raiz, decodeURIComponent(req.url.split('?')[0]));
      if (req.url === '/' || req.url.startsWith('/?')) f = path.join(raiz, 'index.html');
      if (!f.startsWith(raiz)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
        res.end(d);
      });
    }).listen(PORTA, () => ok(s));
  });
}

let pubTeste = null; // chave pública injetada no config.json durante o teste dos selos
const resultados = [];
async function caso(nome, fn) {
  try { const r = await fn(); resultados.push({ nome, ok: true }); console.log(`[OK] ${nome}${r ? ' — ' + JSON.stringify(r) : ''}`); }
  catch (e) { resultados.push({ nome, ok: false }); console.error(`[FALHOU] ${nome}\n   ${e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n   ') : e}`); }
}
const certo = (c, msg) => { if (!c) throw new Error(msg); };

(async () => {
  const servidor = await servir();
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  const errosConsole = [];
  page.on('pageerror', (e) => errosConsole.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/facebook|ERR_|Failed to load resource/i.test(m.text())) errosConsole.push(m.text()); });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('viacep.com.br/ws/30140071')) return r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ logradouro: 'Rua da Bahia', bairro: 'Centro', localidade: 'Belo Horizonte' }) });
    if (u.includes('viacep.com.br')) return r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"erro":true}' });
    if (!u.startsWith(BASE)) return r.abort();
    if (pubTeste && new URL(u).pathname === '/config.json') {
      const j = JSON.parse(fs.readFileSync(path.join(raiz, 'config.json'), 'utf8')); j.loyalty.publicKey = pubTeste;
      return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(j) });
    }
    r.continue();
  });
  await page.evaluateOnNewDocument(() => { window.open = (u) => { window.__aberto = u; return null; }; });

  const tela = () => page.evaluate(() => window.__faAgendar && window.__faAgendar.tela());
  const esperaTela = (id) => page.waitForFunction((x) => window.__faAgendar && window.__faAgendar.tela() === x && document.querySelector(`.wz-tela[data-tela="${x}"]`), { timeout: 5000 }, id);
  const tocar = async (texto) => {
    const ok = await page.evaluate((t) => {
      const telaAtual = [...document.querySelectorAll('.wz-tela')].pop();
      const b = [...telaAtual.querySelectorAll('button, a')].find((x) => x.textContent.replace(/\s+/g, ' ').trim().includes(t));
      if (!b) return false; b.click(); return true;
    }, texto);
    certo(ok, `botão "${texto}" não encontrado na tela ${await tela()}`);
  };
  const digitar = async (sel, txt) => { await page.focus(sel); await page.$eval(sel, (e) => { e.value = ''; }); await page.type(sel, txt); };
  const continuar = () => page.click('#wz-continuar');

  await caso('home: carrega, 1 ação principal, abas, sem erros', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    const r = await page.evaluate(() => ({
      cta: document.getElementById('cta-agendar').textContent.trim(),
      principais: document.querySelectorAll('main .btn-principal').length,
      abas: document.querySelectorAll('.abas a').length,
      desenhos: document.querySelectorAll('[data-3d] svg').length,
      status: document.querySelector('#status span').textContent,
    }));
    certo(r.cta === 'Agendar banho', 'CTA: ' + r.cta);
    certo(r.principais === 1, 'mais de 1 botão principal na home: ' + r.principais);
    certo(r.abas === 4, 'abas');
    certo(r.desenhos >= 5, 'ilustrações 3D não renderizaram');
    certo(!/delivery/i.test(await page.content()), 'ainda menciona delivery');
    return r;
  });

  await caso('alvos de toque >= 44px (home e fidelidade)', async () => {
    const pequenos = [];
    for (const url of ['/', '/fidelidade.html', '/painel.html']) {
      await page.goto(BASE + url, { waitUntil: 'networkidle0' });
      pequenos.push(...await page.evaluate(() => [...document.querySelectorAll('a.btn, button, .abas a, .cofre-palco')].filter((e) => e.offsetParent).map((e) => {
        const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 20), h: Math.round(r.height), w: Math.round(r.width) };
      }).filter((x) => x.h < 44 || x.w < 44)));
    }
    certo(pequenos.length === 0, 'alvos pequenos: ' + JSON.stringify(pequenos));
  });

  await caso('agendar: fluxo completo, 2 pets, tosa, extras, saúde, Táxi Dog', async () => {
    await page.goto(BASE + '/agendar.html', { waitUntil: 'networkidle0' });
    await esperaTela('nome');
    certo(await page.$eval('.wz-base', (e) => !e.hidden), 'sem botão continuar na tela de texto');
    await digitar('#f-nome', 'Thor'); await continuar();
    await esperaTela('especie'); certo((await page.$eval('.wz-pergunta', (e) => e.textContent)).includes('Thor'), 'pergunta não usa o nome');
    certo(await page.$eval('.wz-base', (e) => e.hidden), 'escolha única não deveria mostrar botão');
    await tocar('Cachorro');
    await esperaTela('porte'); await tocar('Médio');
    await esperaTela('pelo'); await tocar('Longo');
    await esperaTela('temperamento'); await tocar('Bravo');
    await esperaTela('servico'); await tocar('Banho e tosa');
    await esperaTela('tosa'); await tocar('Na máquina');
    await esperaTela('extras'); await tocar('Hidratação');
    certo((await page.$eval('#wz-continuar', (e) => e.textContent)) === 'Continuar', 'rótulo do botão de extras'); await continuar();
    await esperaTela('perfume'); await tocar('Suave');
    await esperaTela('acessorio'); await tocar('Laço');
    await esperaTela('saude'); await tocar('Sim');
    await esperaTela('saudeTxt'); await digitar('#f-saude', 'alergia a perfume forte'); await continuar();
    await esperaTela('outroPet'); await tocar('Sim, mais um');
    await esperaTela('nome'); await digitar('#f-nome', 'Mel'); await continuar();
    await esperaTela('especie'); await tocar('Gato');
    await esperaTela('porte'); await tocar('Pequeno');
    await esperaTela('pelo'); await tocar('Curto');
    await esperaTela('temperamento'); await tocar('Manso');
    await esperaTela('servico'); await tocar('Banho');
    await esperaTela('extras'); certo((await page.$eval('#wz-continuar', (e) => e.textContent)).startsWith('Pular'), 'deveria oferecer pular'); await continuar();
    await esperaTela('perfume'); await tocar('Sem');
    await esperaTela('acessorio'); await tocar('Nenhum');
    await esperaTela('saude'); await tocar('Não');
    await esperaTela('outroPet'); await tocar('Não, só');
    await esperaTela('dia');
    const dias = await page.$$eval('[data-dia]', (bs) => bs.map((b) => b.dataset.dia));
    certo(dias.length === 6, 'deveria mostrar 6 dias');
    certo(dias.every((d) => new Date(d + 'T12:00:00').getDay() !== 0), 'domingo apareceu: ' + dias);
    await page.click('[data-dia]');
    await esperaTela('hora');
    const horas = await page.$$eval('[data-hora]', (bs) => bs.map((b) => b.dataset.hora));
    certo(horas.every((h) => h >= '13:30' && h <= '18:00'), 'hora fora da regra: ' + horas);
    await page.click('[data-hora]');
    await esperaTela('vem');
    certo(await page.evaluate(() => /só entrega/.test(document.body.textContent) && /só busca/.test(document.body.textContent)), 'faltam opções só busca/só entrega');
    await tocar('busca e devolve');
    await esperaTela('cep'); await page.type('#f-cep', '30140071');
    await page.waitForFunction(() => (document.getElementById('cep-achado') || {}).textContent.includes('Rua da Bahia'), { timeout: 4000 });
    await continuar();
    await esperaTela('numero'); await page.type('#f-num', '120'); await page.type('#f-comp', 'apto 301'); await continuar();
    await esperaTela('tutorNome'); await digitar('#f-tutor', 'Ana Souza'); await continuar();
    await esperaTela('tutorTel'); await page.type('#f-tel', '31988887777');
    certo((await page.$eval('#f-tel', (e) => e.value)) === '(31) 98888-7777', 'máscara do telefone');
    await continuar();
    await esperaTela('revisao');
    const rev = await page.$eval('.wz-tela[data-tela="revisao"]', (e) => e.textContent.replace(/\s+/g, ' '));
    certo(rev.includes('Thor') && rev.includes('Mel') && rev.includes('Rua da Bahia, 120') && rev.includes('Eu confirmo'), 'revisão incompleta: ' + rev);
    certo((await page.$eval('#wz-continuar', (e) => e.textContent)) === 'Confirmo o horário', 'botão de compromisso');
    await continuar();
    await esperaTela('final');
    const href = await page.$eval('#btn-zap', (a) => decodeURIComponent(a.href));
    ['wa.me/5531982339672', '*1. Thor*', 'BRAVO', 'Banho e tosa (Na máquina)', 'Hidratação', 'alergia a perfume forte', '*2. Mel*', 'Gato', 'Chegada:', 'Buscar e devolver em casa', 'Rua da Bahia, 120', 'apto 301', 'Ana Souza', '(31) 98888-7777', 'vídeo']
      .forEach((t) => certo(href.includes(t), `mensagem sem "${t}"`));
    certo(!/delivery/i.test(href), 'mensagem cita delivery');
    certo(await page.$('#btn-ics'), 'sem botão de agenda');
    certo(!(await page.$('#btn-pix')), 'Pix apareceu sem chave configurada');
    return { tamanhoMensagem: href.length };
  });

  await caso('cliente que volta: home oferece repetir, agendar começa no serviço', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
    const r = await page.evaluate(() => ({ cta: document.getElementById('cta-agendar').textContent, outro: !document.getElementById('cta-outro').hidden, prox: !document.getElementById('proximo').hidden }));
    certo(/de novo/.test(r.cta), 'CTA de recorrente: ' + r.cta);
    certo(r.outro && r.prox, 'faltou "outro pet" ou próximo horário');
    await page.goto(BASE + '/agendar.html?pet=Thor', { waitUntil: 'networkidle0' });
    await esperaTela('servico');
    const pet = await page.evaluate(() => window.__faAgendar.estado().pets[0]);
    certo(pet.temperamento === 'Bravo' && pet.porte === 'Médio', 'perfil não carregou');
    certo((await page.$eval('#f-tutor', () => 1).catch(() => 0)) === 0, 'ok');
    return r;
  });

  await caso('novo agendamento com perfil: escolher pet salvo', async () => {
    await page.goto(BASE + '/agendar.html?novo=1', { waitUntil: 'networkidle0' });
    await esperaTela('quem');
    await tocar('Mel');
    await esperaTela('servico');
    certo((await page.evaluate(() => window.__faAgendar.estado().pets[0].especie)) === 'Gato', 'pet salvo errado');
  });

  await caso('voltar mantém resposta; rascunho sobrevive ao recarregar', async () => {
    await page.evaluate(() => { localStorage.removeItem('fa:perfil:v1'); localStorage.removeItem('fa:rascunho:v1'); });
    await page.goto(BASE + '/agendar.html?novo=1', { waitUntil: 'networkidle0' });
    await esperaTela('nome'); await digitar('#f-nome', 'Bidu'); await continuar();
    await esperaTela('especie'); await tocar('Cachorro');
    await esperaTela('porte');
    await page.click('#wz-voltar');
    await esperaTela('especie');
    certo(await page.$eval('[data-valor="Cachorro"]', (b) => b.getAttribute('aria-pressed')) === 'true', 'escolha perdida ao voltar');
    await tocar('Cachorro'); await esperaTela('porte');
    await page.goto(BASE + '/agendar.html', { waitUntil: 'networkidle0' });
    await esperaTela('porte');
    certo((await page.evaluate(() => window.__faAgendar.estado().pets[0].nome)) === 'Bidu', 'rascunho');
  });

  await caso('editar pela revisão volta direto pra revisão', async () => {
    // continua do rascunho anterior até a revisão
    await tocar('Pequeno'); await esperaTela('pelo'); await tocar('Curto');
    await esperaTela('temperamento'); await tocar('Manso');
    await esperaTela('servico'); await tocar('Banho');
    await esperaTela('extras'); await continuar();
    await esperaTela('perfume'); await tocar('Suave');
    await esperaTela('acessorio'); await tocar('Nenhum');
    await esperaTela('saude'); await tocar('Não');
    await esperaTela('outroPet'); await tocar('Não, só');
    await esperaTela('dia'); await page.click('[data-dia]');
    await esperaTela('hora'); await page.click('[data-hora]');
    await esperaTela('vem'); await tocar('Eu levo');
    await esperaTela('tutorNome'); await digitar('#f-tutor', 'Rob'); await continuar();
    await esperaTela('tutorTel'); await page.type('#f-tel', '31977776666'); await continuar();
    await esperaTela('revisao');
    await page.click('[data-editar="dia"]');
    await esperaTela('dia'); await page.click('[data-dia]:nth-child(2)');
    await esperaTela('hora'); await page.click('[data-hora]:last-child');
    await esperaTela('revisao');
    const r = await page.evaluate(() => window.__faAgendar.estado());
    certo(r.hora === '18:00', 'hora editada: ' + r.hora);
  });

  await caso('segurança: nome com código não executa', async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + '/agendar.html?novo=1', { waitUntil: 'networkidle0' });
    await esperaTela('nome');
    await digitar('#f-nome', '<img src=x onerror="window.__xss=1">'); await continuar();
    await esperaTela('especie');
    const r = await page.evaluate(() => ({ xss: window.__xss, img: !!document.querySelector('.wz-pergunta img'), txt: document.querySelector('.wz-tela[data-tela="especie"] .wz-pergunta').textContent }));
    certo(!r.xss && !r.img, 'XSS executou!');
    certo(r.txt.includes('<img'), 'texto deveria aparecer literal');
    const csp = await page.$eval('meta[http-equiv="Content-Security-Policy"]', (m) => m.content);
    certo(/script-src 'self'/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), 'CSP fraca');
  });

  await caso('fidelidade: cofre abre, carimbos contam, selo em breve', async () => {
    await page.evaluate(() => { localStorage.setItem('fa:agendamentos:v1', JSON.stringify([{ dia: '2099-01-02', hora: '14:00', pets: ['Thor'] }, { dia: '2099-01-09', hora: '14:00', pets: ['Thor'] }])); });
    await page.goto(BASE + '/fidelidade.html', { waitUntil: 'networkidle0' });
    await page.click('#cofre');
    await page.waitForFunction(() => document.getElementById('cofre').classList.contains('aberto'), { timeout: 3000 });
    const r = await page.evaluate(() => ({ cheios: document.querySelectorAll('.carimbo.cheio').length, breve: document.querySelector('.em-breve').textContent, cripto: /criptomoedas/.test(document.body.textContent) }));
    certo(r.cheios === 0, 'agendar não pode dar selo: ' + r.cheios);
    certo(await page.evaluate(() => /3 banhos|Hidratação/i.test(document.body.textContent) && document.querySelectorAll('.nivel.misterio').length >= 1), 'trilha: hidratação + misteriosa');
    certo(/breve/i.test(r.breve) && r.cripto, 'texto em breve/cripto');
    return r;
  });


  await caso('capacidade: 17:30 e 18:00, 1 tosa por horário, vídeo de 1 minuto, táxi só entrega', async () => {
    await page.goto(BASE + '/agendar.html?novo=1', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__faAgendar);
    const r = await page.evaluate(() => {
      const A = window.__faAgendar; const S = A.estado();
      const dia = (() => { const d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0); return FA.ymd(d); })();
      const mk = (servico) => ({ nome: 'X', servico, extras: [], tosa: servico === 'Banho e tosa' ? 'Higiênica' : '' });
      const base = A.horariosDo(dia);
      S.pets = [mk('Banho e tosa'), mk('Banho e tosa')];
      const duas = A.planejar(dia, '14:00');
      const ultima = A.horariosDo(dia);
      S.pets = [mk('Banho e tosa'), mk('Banho')];
      const mista = A.planejar(dia, '14:00');
      // horário já com 1 tosa e 1 cão: só cabe banho
      window.CONFIG.booking.busy = { [dia]: { '15:00': { caes: 1, tosas: 1 } } };
      S.pets = [mk('Banho e tosa')]; const tosaOcupada = A.horariosDo(dia).includes('15:00');
      S.pets = [mk('Banho')]; const banhoOk = A.horariosDo(dia).includes('15:00');
      S.pets = [mk('Banho'), mk('Banho')]; const doisBanhos = A.planejar(dia, '15:00');
      return { base, duas, ultima, mista, tosaOcupada, banhoOk, doisBanhos };
    });
    certo(r.base.includes('17:30') && r.base.includes('18:00'), 'faltam 17:30/18:00: ' + r.base);
    certo(r.duas[0] === '14:00' && r.duas[1] === '14:30', 'duas tosas deveriam ficar em horários seguidos: ' + r.duas);
    certo(!r.ultima.includes('18:00'), 'duas tosas não cabem às 18:00');
    certo(r.mista[0] === '14:00' && r.mista[1] === '14:00', 'tosa + banho juntos: ' + r.mista);
    certo(!r.tosaOcupada && r.banhoOk && r.doisBanhos[0] === '15:00' && r.doisBanhos[1] === '15:30', 'horário com tosa só aceita 1 banho: ' + JSON.stringify(r));
    const html = await page.evaluate(() => window.__faAgendar.mensagem.toString());
    certo(/1 minuto/.test(html) && !/20 segundos/.test(html), 'vídeo de 1 minuto');
    return r;
  });


  await caso('selos sem servidor: painel assina, cliente guarda, falsificação e outro número recusados', async () => {
    await page.setBypassServiceWorker(true); // o SW buscaria o config.json sem passar pela injeção da chave de teste
    await page.goto(BASE + '/painel.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' });
    await page.click('#btn-criar');
    await page.waitForFunction(() => !document.getElementById('com-chave').hidden);
    pubTeste = await page.evaluate(() => window.__faPainel.ler().pub);
    certo(!JSON.stringify(pubTeste).includes('"d"'), 'chave pública não pode ter parte privada');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.type('#p-tel', '31 98888-7777'); await page.type('#p-nome', 'Thor');
    for (let k = 0; k < 3; k++) { await page.click('#btn-banho'); await page.waitForFunction((n) => (window.__faPainel.ler().clientes['31988887777'] || {}).n === n, {}, k + 1); }
    const zap = await page.$eval('#btn-enviar', (a) => a.href);
    certo(zap.startsWith('https://wa.me/5531988887777?text=') && decodeURIComponent(zap).includes('hidratação'), 'link do whatsapp: ' + zap.slice(0, 60));
    const token = await page.evaluate(() => window.__faPainel.ler().clientes['31988887777'].ult);
    certo(!(await page.$eval('#btn-resgate', (b) => b.disabled)), 'resgate deveria liberar com 3 banhos');

    // cliente recebe o link (perfil já tem o telefone do agendamento)
    await page.evaluate(() => { localStorage.removeItem('fa:painel:v1'); localStorage.setItem('fa:perfil:v1', JSON.stringify({ tutor: { nome: 'Ana', tel: '(31) 98888-7777' }, pets: [] })); });
    await page.goto(BASE + '/fidelidade.html#selo=' + token, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => (window.__faSelo.ler().n || 0) === 3, { timeout: 4000 });
    const r = await page.evaluate(() => ({ url: location.hash, aviso: document.getElementById('selo-aviso').textContent, cheios: document.querySelectorAll('.carimbo.cheio').length, aberto: !!document.querySelector('.nivel.aberto') }));
    certo(!r.url && r.cheios === 3 && r.aberto, 'trilha: ' + JSON.stringify(r));

    // selo adulterado (n=99) é recusado
    const [c, sg] = token.split('.');
    const falso = Buffer.from(Buffer.from(c, 'base64url').toString().replace('"n":3', '"n":99')).toString('base64url') + '.' + sg;
    await page.evaluate((t) => window.__faSelo.receber(t), falso);
    certo((await page.evaluate(() => window.__faSelo.ler().n)) === 3, 'selo falso aceito');
    // selo de outro número é recusado
    await page.evaluate(() => localStorage.setItem('fa:selo:v1', JSON.stringify({ tel: '31977776666' })));
    await page.evaluate((t) => window.__faSelo.receber(t), token);
    const outro = await page.evaluate(() => ({ n: window.__faSelo.ler().n || 0, aviso: document.getElementById('selo-aviso').textContent }));
    certo(outro.n === 0 && /outro número/.test(outro.aviso), 'selo de outro número aceito: ' + JSON.stringify(outro));
    pubTeste = null; await page.setBypassServiceWorker(false);
    return { tamanhoToken: token.length };
  });

  await caso('sobre: apagar meus dados', async () => {
    await page.goto(BASE + '/sobre.html', { waitUntil: 'networkidle0' });
    await page.click('#btn-esquecer');
    const r = await page.evaluate(() => localStorage.getItem('fa:agendamentos:v1'));
    certo(r === null, 'dados não apagados');
  });

  await caso('taxi.html leva ao agendamento com Táxi Dog', async () => {
    await page.goto(BASE + '/taxi.html', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => location.pathname.endsWith('agendar.html'), { timeout: 4000 });
    certo((await page.evaluate(() => window.__faAgendar.estado().vem)) === 'buscaEntrega', 'táxi não pré-selecionado');
  });

  await caso('sem erros de JavaScript em nenhuma página', async () => {
    certo(errosConsole.length === 0, errosConsole.join('\n'));
  });

  await browser.close(); servidor.close();
  const falhas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} passaram`);
  process.exit(falhas ? 1 : 0);
})();
