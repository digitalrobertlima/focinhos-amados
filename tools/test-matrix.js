const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8005;

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
  try{ return await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox'], timeout:60000, headless:true}); }
  catch(e){
    const possible = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    const found = possible.find(p=> fs.existsSync(p));
    if(!found) throw e;
    return await puppeteer.launch({executablePath: found, args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'], timeout:60000, headless:true});
  }
}

function mockGeolocation(page){
  page.evaluateOnNewDocument(()=>{
    const mockPos = { coords: { latitude: -19.953147, longitude: -43.99368, accuracy: 12 }, timestamp: Date.now() };
    navigator.geolocation.getCurrentPosition = function(success, err){ try{ success(mockPos); }catch(e){ if(err) err(e); } };
    navigator.geolocation.watchPosition = function(success, err){ try{ success(mockPos); }catch(e){ if(err) err(e); } return 1; };
    navigator.geolocation.clearWatch = function(){ return; };
  });
}

async function ensureWaIntercept(page){
  await page.evaluate(()=>{ window.__lastWindowOpen = null; window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; }; });
}

(async ()=>{
  const server = await serve();
  const browser = await safeLaunch();
  const page = await browser.newPage();
  mockGeolocation(page);

  const results = [];
  async function record(name, fn){
    try{
      const detail = await fn();
      results.push({ name, ok:true, detail });
      console.log('[OK]', name);
    }catch(err){
      results.push({ name, ok:false, error: String(err && err.stack || err) });
      console.error('[FAIL]', name, err);
    }
  }

  // Home: route links
  await record('home:route-links', async ()=>{
    await page.goto(`http://localhost:${port}/`, {waitUntil:'networkidle2'});
    const hrefs = await page.$$eval('#route-link, #route-link-foot', els=> els.map(e=> e.href));
    if(hrefs.some(h=> !h.includes('google.com/maps/dir'))) throw new Error('route links not set');
    return { hrefs };
  });

  // Delivery matrices
  await record('delivery:empty-cart validation', async ()=>{
    await page.goto(`http://localhost:${port}/delivery.html`, {waitUntil:'networkidle2'});
    await page.evaluate(()=>{ window.__alertMsg = null; window.alert = (m)=> window.__alertMsg=m; });
    await page.click('#btn-wa');
    const alertMsg = await page.evaluate(()=> window.__alertMsg);
    if(!alertMsg || !/Adicione pelo menos um produto/.test(alertMsg)) throw new Error('no empty-cart alert');
    return { alertMsg };
  });

  await record('delivery:geo happy (no address number)', async ()=>{
    await page.goto(`http://localhost:${port}/delivery.html`, {waitUntil:'networkidle2'});
    // add item
    await page.type('#produto','QUATREE GOURMET ADULTOS 1kg');
    await page.click('#btn-add-prod');
    await page.waitForFunction(()=> document.querySelectorAll('#carrinho li').length>0, {timeout:3000});
    // share geo
    await page.click('#btn-use-geo');
    await page.type('#recebedor','Maria');
    await page.type('#tel','31988887777');
    await ensureWaIntercept(page);
    await page.click('#btn-wa');
    const wa = await page.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    if(!(wa && wa.startsWith('https://wa.me/'))) throw new Error('no wa link');
    return { wa };
  });

  await record('delivery:address+number happy (no geo)', async ()=>{
    await page.goto(`http://localhost:${port}/delivery.html`, {waitUntil:'networkidle2'});
    await page.type('#produto','PIPICAT CLASSIC 4kg');
    await page.click('#btn-add-prod');
    await page.type('#recebedor','Joana');
    await page.type('#tel','31977776666');
    await page.type('#endereco','Rua Teste');
    // ensure number field exists
    await page.evaluate(()=>{
      if(!document.getElementById('endereco-numero')){
        const num = document.createElement('input'); num.id='endereco-numero'; document.getElementById('endereco').parentNode.appendChild(num);
      }
    });
    await page.type('#endereco-numero','123');
    await ensureWaIntercept(page);
    await page.click('#btn-wa');
    const wa = await page.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    if(!(wa && wa.startsWith('https://wa.me/'))) throw new Error('no wa link');
    return { wa };
  });

  await record('delivery:invalid phone flagged', async ()=>{
    await page.goto(`http://localhost:${port}/delivery.html`, {waitUntil:'networkidle2'});
    await page.type('#produto','GOLDEN GATOS CASTRADOS 1kg');
    await page.click('#btn-add-prod');
    await page.type('#recebedor','Ana');
    await page.type('#tel','12345');
    await page.click('#btn-wa');
    const ariaInvalid = await page.$eval('#tel', el=> el.getAttribute('aria-invalid'));
    if(ariaInvalid !== 'true') throw new Error('tel not flagged invalid');
    return { ariaInvalid };
  });

  // Agendar matrices
  await record('agendar:missing service validation', async ()=>{
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    await page.click('#btn-ver-resumo');
    await page.click('#btn-wa');
    const err = await page.$eval('#agendar-err', el=> el.textContent.trim());
    if(!/Selecione pelo menos um serviço/i.test(err)) throw new Error('missing service not validated');
    return { err };
  });

  await record('agendar:loja happy minimal', async ()=>{
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    await page.type('#petNome','Rex');
    await page.select('#especie','Cão');
    await page.select('#porte','Médio');
    await page.type('#tutorNome','João');
    await page.type('#tutorTelefone','31999998888');
    await page.type('#dataPreferida', new Date(Date.now()+86400000).toISOString().slice(0,10));
    await page.select('#janela','Tarde');
  await page.click('[data-role="srv-banho"]');
    await page.click('#btn-ver-resumo');
    await page.waitForFunction(()=> (document.getElementById('agendar-resumo')||{}).textContent.includes('Rex'), {timeout:3000});
    await ensureWaIntercept(page);
    await page.click('#btn-wa');
    const wa = await page.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    if(!(wa && wa.startsWith('https://wa.me/'))) throw new Error('no wa link');
    return { wa };
  });

  await record('agendar:multi-pet add and summary', async ()=>{
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    await page.type('#petNome','Luna');
    await page.select('#especie','Cão');
    await page.select('#porte','Pequeno');
    await page.type('#tutorNome','Bia');
    await page.type('#tutorTelefone','31988887777');
    await page.type('#dataPreferida', new Date(Date.now()+86400000).toISOString().slice(0,10));
    await page.select('#janela','Manhã');
  await page.click('[data-role="srv-banho"]');
    // click add another pet
    await page.click('#btn-add-pet');
    // fill dynamic pet by data-role selectors
    await page.type('[data-role="petNome"]','Thor');
    await page.select('[data-role="especie"]','Cão');
    await page.select('[data-role="porte"]','Médio');
    await page.click('#btn-ver-resumo');
    await page.waitForFunction(()=> (document.getElementById('agendar-resumo')||{}).textContent.includes('Luna') && document.getElementById('agendar-resumo').textContent.includes('Thor'), {timeout:3000});
    return { pets: true };
  });

  await record('agendar:taxi-both accepts geo', async ()=>{
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    await page.type('#petNome','Bob');
    await page.select('#especie','Cão');
    await page.select('#porte','Grande');
    await page.type('#tutorNome','Leo');
    await page.type('#tutorTelefone','31977776666');
    await page.type('#dataPreferida', new Date(Date.now()+86400000).toISOString().slice(0,10));
    await page.select('#janela','Tarde');
  await page.click('[data-role="srv-banho"]');
  // switch to taxi-both
    await page.evaluate(()=>{ const r = Array.from(document.querySelectorAll("input[name='modalidadeLocalizacao']")).find(x=> x.value==='taxi-both'); if(r){ r.click(); }});
  // trigger geo for both fields
  await page.click('button[data-geo="origem"]');
  await page.click('button[data-geo="destino"]');
    await ensureWaIntercept(page);
    await page.click('#btn-wa');
    const wa = await page.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    if(!(wa && wa.startsWith('https://wa.me/'))) throw new Error('no wa link');
    return { wa };
  });

  // Taxi matrices
  await record('taxi:banho summary+wa', async ()=>{
    await page.goto(`http://localhost:${port}/taxi.html`, {waitUntil:'networkidle2'});
    await page.click('#tipo-banho');
    await page.type('#petNome','Nick');
    await page.type('#tutorNome','Ana');
    await page.type('#tutorTelefone','31966665555');
    await page.click('#btn-ver-resumo');
    await page.waitForFunction(()=> (document.getElementById('taxi-resumo')||{}).textContent.includes('Nick'), {timeout:3000});
    await ensureWaIntercept(page);
    await page.click('#btn-wa');
    const wa = await page.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    if(!(wa && wa.startsWith('https://wa.me/'))) throw new Error('no wa link');
    return { wa };
  });

  await record('taxi:agendado summary+wa', async ()=>{
    await page.goto(`http://localhost:${port}/taxi.html`, {waitUntil:'networkidle2'});
    await page.click('#tipo-agendado');
    await page.type('#origem2','Rua X, 1');
    await page.type('#destino2','Rua Y, 2');
    await page.type('#contato2','Paulo • 31955554444');
    const dt = new Date(Date.now()+3600*1000).toISOString().slice(0,16);
    await page.evaluate((d)=> document.getElementById('horario2').value = d, dt);
    await page.click('#btn-ver-resumo');
    await page.waitForFunction(()=> (document.getElementById('taxi-resumo')||{}).textContent.includes('Paulo'), {timeout:3000});
    await ensureWaIntercept(page);
    await page.click('#btn-wa');
    const wa = await page.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    if(!(wa && wa.startsWith('https://wa.me/'))) throw new Error('no wa link');
    return { wa };
  });

  console.log('\n=== MATRIX REPORT ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
  server.close();
})();
