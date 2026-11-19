const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8003;

function serve() {
  return new Promise((resolve)=>{
    const server = http.createServer((req,res)=>{
      let filePath = path.join(root, req.url.split('?')[0]);
      if(req.url === '/' ) filePath = path.join(root, 'index.html');
      fs.readFile(filePath, (err,data)=>{
        if(err){ res.writeHead(404); res.end('Not found: '+filePath); return; }
        const ext = path.extname(filePath).toLowerCase();
        const map = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
        res.writeHead(200, {'Content-Type': map[ext] || 'text/plain'});
        res.end(data);
      });
    }).listen(port, ()=> resolve(server));
  });
}

async function safeLaunch(){
  const headful = /^(1|true|yes)$/i.test(process.env.HEADFUL||'');
  const slow = parseInt(process.env.SLOW_MS || '0', 10) || 0;
  try{ return await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox'], timeout:60000, headless: !headful, slowMo: slow}); }
  catch(e){
    const possible = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    const found = possible.find(p=> fs.existsSync(p));
    if(!found) throw e;
  return await puppeteer.launch({executablePath: found, args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'], timeout:60000, headless: !headful, slowMo: slow});
  }
}

function mockGeolocation(page){
  // inject a fake geolocation implementation before any scripts run
  page.evaluateOnNewDocument(()=>{
    const mockPos = { coords: { latitude: -19.953147, longitude: -43.99368, accuracy: 10 }, timestamp: Date.now() };
    navigator.geolocation.getCurrentPosition = function(success, err){ try{ success(mockPos); }catch(e){ if(err) err(e); } };
    navigator.geolocation.watchPosition = function(success, err){ try{ success(mockPos); }catch(e){ if(err) err(e); } return 1; };
    navigator.geolocation.clearWatch = function(){ return; };

    // speed up: stub reverse geocode fetch to avoid network latency
    const origFetch = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = (url, opts)=>{
      try{
        const s = String(url||'');
        if(s.includes('nominatim.openstreetmap.org/reverse')){
          const payload = { display_name: 'Rua Padre José Maurício, Belo Horizonte, MG, Brasil', address: { road: 'Rua Padre José Maurício' } };
          return Promise.resolve({ ok: true, json: async ()=> payload });
        }
      }catch(_){}
      return origFetch ? origFetch(url, opts) : Promise.reject(new Error('fetch-not-available'));
    };
  });
}


async function pickSlot(p, time='14:00'){
  // Próximo dia útil (amanhã; pula domingo) e um horário de chegada válido
  await p.evaluate(()=>{
    const d = new Date(); d.setDate(d.getDate()+1); if(d.getDay()===0) d.setDate(d.getDate()+1);
    const el = document.getElementById('dataPreferida');
    el.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    el.dispatchEvent(new Event('change', {bubbles:true}));
  });
  await p.select('#janela', time);
}

(async ()=>{
  const server = await serve();
  const browser = await safeLaunch();
  const page = await browser.newPage();
  mockGeolocation(page);
  const report = [];

  async function run(name, fn){
    try{
      const res = await fn(page);
      report.push({name, ok:true, detail:res});
      console.log(`[OK] ${name}`, res);
    }catch(err){
      report.push({name, ok:false, error:String(err)});
      console.error(`[FAIL] ${name}`, err);
    }
  }

  // AGENDAR: happy path
  await run('agendar - happy', async (p)=>{
    await p.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
  // ensure no services -> validation (per-pet)
  await p.$$eval('[data-role="srv-banho"], [data-role="srv-tosa"]', els => els.forEach(e=> e.checked = false));
    await p.click('#btn-ver-resumo');
    // summary should still be present but validation prevents WA.
    await p.click('#btn-wa');
    // check agendar-err text appears
    const errText = await p.$eval('#agendar-err', el=>el.textContent.trim());
    // now fill proper data
    await p.type('#petNome', 'Rex');
    await p.select('#especie', 'Cão');
    await p.select('#porte', 'Médio');
    await p.type('#tutorNome', 'João Silva');
    await p.type('#tutorTelefone', '31988887777');
    await pickSlot(p);
  await p.click('[data-role="srv-banho"]');
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('agendar-resumo') && document.getElementById('agendar-resumo').textContent.includes('Rex'), {timeout:3000});
    // intercept open
    await p.evaluate(()=>{ window.__lastWindowOpen = null; window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; }; });
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {errText, wa};
  });

  await run('taxi - banho mode', async (p)=>{
    await p.goto(`http://localhost:${port}/taxi.html`, {waitUntil:'networkidle2'});
    // choose banho
    await p.click('#tipo-banho');
    await p.type('#petNome','Bolinha');
    await p.type('#tutorNome','Ana');
    await p.type('#tutorTelefone','31966665555');
    // select modalidade 
    await p.evaluate(()=>{ const r = Array.from(document.querySelectorAll("input[name='modalidade']")).find(x=> x.value==='Buscar e entregar'); if(r){ r.click(); }});
    // fill origem fields starting with CEP
    await p.type('#origem-cep','30140071');
    await p.evaluate(()=> new Promise(r=> setTimeout(r, 600)));
    await p.type('#origem-rua','Rua Origem');
    await p.type('#origem-numero','100');
    await p.type('#origem-bairro','Centro');
    await p.type('#origem-complemento','Apt 1');
    // fill destino fields starting with CEP
    await p.type('#destino-cep','30140072');
    await p.evaluate(()=> new Promise(r=> setTimeout(r, 600)));
    await p.type('#destino-rua','Rua Destino');
    await p.type('#destino-numero','200');
    await p.type('#destino-bairro','Savassi');
    await p.type('#destino-complemento','Apt 2');
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('taxi-resumo') && document.getElementById('taxi-resumo').textContent.includes('Bolinha'), {timeout:3000});
    await p.evaluate(()=>{ window.__lastWindowOpen = null; window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; }; });
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {wa};
  });

  await run('taxi - agendado mode', async (p)=>{
    await p.goto(`http://localhost:${port}/taxi.html`, {waitUntil:'networkidle2'});
    await p.click('#tipo-agendado');
    // fill origem2 fields starting with CEP
    await p.type('#origem2-cep','30140071');
    await p.evaluate(()=> new Promise(r=> setTimeout(r, 600)));
    await p.type('#origem2-rua','Rua A');
    await p.type('#origem2-numero','1');
    await p.type('#origem2-bairro','Centro');
    await p.type('#origem2-complemento','Apt 1');
    // fill destino2 fields starting with CEP
    await p.type('#destino2-cep','30140072');
    await p.evaluate(()=> new Promise(r=> setTimeout(r, 600)));
    await p.type('#destino2-rua','Rua B');
    await p.type('#destino2-numero','2');
    await p.type('#destino2-bairro','Savassi');
    await p.type('#destino2-complemento','Apt 2');
    // fill contact
    await p.type('#contato2','Paulo • 31955554444');
    // set horario2 to future datetime (ISO local)
    const dt = new Date(Date.now()+3600*1000).toISOString().slice(0,16);
    await p.evaluate((d)=> document.getElementById('horario2').value = d, dt);
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('taxi-resumo') && document.getElementById('taxi-resumo').textContent.includes('Paulo'), {timeout:3000});
    await p.evaluate(()=>{ window.__lastWindowOpen = null; window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; }; });
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {wa};
  });

  // ROUTE LINKS on index
  // REGRAS NOVAS: domingo bloqueado, horários da tarde, Manso/Bravo, vídeo e Pix
  await run('agendar - regras de horario e domingo', async (p)=>{
    await p.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    const r = await p.evaluate(()=>{
      const el = document.getElementById('dataPreferida');
      const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); // próximo domingo
      el.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      el.dispatchEvent(new Event('change', {bubbles:true}));
      const sunday = { disabled: document.getElementById('janela').disabled, err: document.getElementById('err-dataPreferida').textContent };
      const m = new Date(d); m.setDate(m.getDate()+1); // segunda
      el.value = `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`;
      el.dispatchEvent(new Event('change', {bubbles:true}));
      const times = Array.from(document.querySelectorAll('#janela option')).map(o=>o.value).filter(Boolean);
      const temps = Array.from(document.querySelectorAll('#temperamento option')).map(o=>o.value).filter(Boolean);
      return { sunday, times, temps, pixHidden: document.getElementById('step-pix').hidden };
    });
    if(!r.sunday.disabled || !/domingo/i.test(r.sunday.err)) throw new Error('domingo nao bloqueado');
    if(r.times[0] !== '13:30' || r.times[r.times.length-1] !== '17:00') throw new Error('horarios errados: '+r.times);
    if(r.temps.join() !== 'Manso,Bravo') throw new Error('temperamento: '+r.temps);
    if(!r.pixHidden) throw new Error('pix deveria estar escondido sem chave');
    return r;
  });

  await run('agendar - mensagem pede video e pix aparece com chave', async (p)=>{
    await p.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    await p.evaluate(()=>{ try{ localStorage.clear(); }catch(_){} });
    await p.reload({waitUntil:'networkidle2'});
    await p.type('#petNome', 'Mel');
    await p.select('#especie', 'Cão');
    await p.select('#porte', 'Pequeno');
    await p.select('#temperamento', 'Bravo');
    await p.type('#tutorNome', 'Ana');
    await p.type('#tutorTelefone', '31988887777');
    await pickSlot(p, '15:30');
    await p.click('[data-role="srv-banho"]');
    await p.click('#btn-ver-resumo');
    const resumo = await p.$eval('#agendar-resumo', el=> el.textContent);
    if(!/Chegada: 15:30/.test(resumo)) throw new Error('sem horario de chegada');
    if(!/vídeo/i.test(resumo)) throw new Error('sem pedido de video');
    if(!/Bravo/.test(resumo)) throw new Error('sem temperamento');
    return { ok:true };
  });

  await run('home - route links', async (p)=>{
    await p.goto(`http://localhost:${port}/`, {waitUntil:'networkidle2'});
    const href1 = await p.$eval('#route-link', el=>el.href);
    const href2 = await p.$eval('#route-link-foot', el=>el.href);
    return {href1, href2};
  });

  console.log('\n=== FULL REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  server.close();
})();
