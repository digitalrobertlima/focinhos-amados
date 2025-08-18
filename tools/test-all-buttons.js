const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8002;

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
  try{ return await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox'], timeout:120000, protocolTimeout:120000}); }
  catch(e){
    const possible = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    const found = possible.find(p=> fs.existsSync(p));
    if(!found) throw e;
  return await puppeteer.launch({executablePath: found, args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'], timeout:120000, protocolTimeout:120000});
  }
}

(async ()=>{
  const server = await serve();
  const browser = await safeLaunch();
  const report = [];

  async function visit(url, tester){
    console.log('\n==>', url);
    const page = await browser.newPage();
    // Increase per-page timeouts
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);
    await page.goto(`http://localhost:${port}${url}`, {waitUntil:'networkidle2'});
    // override window.open to capture WA urls
    await page.evaluate(()=>{
      window.__lastWindowOpen = null;
      window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; };
    });
    try{
      const res = await tester(page);
      report.push({url, ok:true, detail:res});
      console.log('OK', res);
    }catch(err){
      report.push({url, ok:false, error: String(err)});
      console.error('FAIL', err);
    } finally{
      try{ await page.close(); }catch(e){}
    }
  }

  // Test home
  await visit('/', async (p)=>{
  // menu button
  await p.click('.nav__btn');
  await p.waitForSelector('#drawer[aria-hidden="false"]', {timeout:2000}).catch(()=>{});
  const exp = await p.$eval('.nav__btn', b=>b.getAttribute('aria-expanded'));
  // close by clicking first link
  await p.$$eval('#drawer a', (els)=> els[0].click());
  // wait for drawer to become hidden
  await p.waitForSelector('#drawer[aria-hidden="true"]', {timeout:2000}).catch(()=>{});
    const heroLinks = await p.$$eval('.hero__actions a', els=> els.map(a=>a.getAttribute('href')));
    return {menuExpanded: exp, heroLinks};
  });

  // Test agendar
  await visit('/agendar.html', async (p)=>{
  // Try actions before filling to test validation paths
  await p.click('#btn-ver-resumo');
  // small wait to let UI update
  await new Promise(r=>setTimeout(r, 300));
  await p.click('#btn-wa');
    const waBlocked = await p.evaluate(()=> !!window.__lastWindowOpen);

    // Fill first pet and required fields
    await p.type('#petNome', 'Rex');
    await p.select('#especie', 'Cão').catch(()=>{});
    await p.select('#porte', 'Médio').catch(()=>{});
    await p.type('#tutorNome', 'João Teste');
    await p.type('#tutorTelefone', '31999999999');
    // choose date (tomorrow) and janela
    const tomorrow = new Date(Date.now() + 24*3600*1000).toISOString().slice(0,10);
    await p.$eval('#dataPreferida', (el,v)=> el.value = v, tomorrow);
    await p.select('#janela', 'Manhã').catch(()=>{});
    // select a service
    await p.click('#srv-banho');

    // add two more pets and fill minimal fields
    const initial = await p.$$eval('.pet', els=>els.length);
    for(let i=0;i<2;i++){
      await p.click('#btn-add-pet');
      await p.waitForFunction((exp)=> document.querySelectorAll('.pet').length >= exp, {}, initial + i + 1);
      // fill last pet fields
      const idx = initial + i;
      await p.type(`#petNome__${idx}`, `Pet${idx}`).catch(()=>{});
      await p.select(`#especie__${idx}`, 'Cão').catch(()=>{});
      await p.select(`#porte__${idx}`, 'Pequeno').catch(()=>{});
    }

    // Now request resumo and open WA
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('agendar-resumo') && document.getElementById('agendar-resumo').textContent.trim().length>20, {timeout:5000});
    // click WA (should open)
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    const after = await p.$$eval('.pet', els=>els.length);
    return {initial, after, waBlocked, wa};
  });

  // Test delivery
  await visit('/delivery.html', async (p)=>{
  // Attempt WA before filling to check validation behavior
  await p.click('#btn-wa');
  await new Promise(r=>setTimeout(r, 200));
  const waBefore = await p.evaluate(()=> window.__lastWindowOpen || null);

  // Fill contact and address
  await p.type('#recebedor', 'Maria Cliente');
  await p.type('#tel', '31988887777');
  await p.type('#endereco', 'Rua Teste, 123');

  // add product: use datalist option if present, else type
  await p.type('#produto', 'QUATREE');
  await p.type('#variacao', '1kg');
  await p.click('#btn-add-prod');
  await p.waitForFunction(()=> document.querySelector('#carrinho li') !== null, {timeout:3000});

  // change quantities
  await p.click('#carrinho button[data-act="inc"]').catch(()=>{});
  await p.click('#carrinho button[data-act="dec"]').catch(()=>{});

  const cartLen = await p.$$eval('#carrinho li', els=>els.length);

  // resumo and WA
  await p.click('#btn-ver-resumo');
  await p.waitForFunction(()=> document.getElementById('delivery-resumo') && document.getElementById('delivery-resumo').textContent.trim().length>10, {timeout:5000});
  await p.click('#btn-wa');
  const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
  return {waBefore, cartLen, wa};
  });

  // Test taxi
  await visit('/taxi.html', async (p)=>{
    // toggle to banho
    await p.click('#tipo-banho');
    await p.waitForSelector('#sec-banho:not(.hide)', {timeout:2000}).catch(()=>{});
    // fill fields
    await p.type('#petNome','Miau');
    await p.type('#tutorNome','Test');
    await p.type('#tutorTelefone','31999999999');
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('taxi-resumo') && document.getElementById('taxi-resumo').textContent.trim().length>10, {timeout:3000});
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {wa};
  });

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  server.close();
})();
