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
  try{ return await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox'], timeout:60000}); }
  catch(e){
    const possible = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    const found = possible.find(p=> fs.existsSync(p));
    if(!found) throw e;
    return await puppeteer.launch({executablePath: found, args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'], timeout:60000});
  }
}

(async ()=>{
  const server = await serve();
  const browser = await safeLaunch();
  const page = await browser.newPage();
  const report = [];

  async function visit(url, tester){
    console.log('\n==>', url);
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
    // add pet 3x
    const initial = await p.$$eval('.pet', els=>els.length);
    for(let i=0;i<3;i++){
      await p.click('#btn-add-pet');
      await p.waitForFunction((exp)=> document.querySelectorAll('.pet').length >= exp, {}, initial + i + 1);
    }
    const after = await p.$$eval('.pet', els=>els.length);
    // click Ver resumo
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('agendar-resumo') && document.getElementById('agendar-resumo').textContent.trim().length>20, {timeout:3000});
    // click WA (this will call overridden window.open and store url)
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {initial, after, wa};
  });

  // Test delivery
  await visit('/delivery.html', async (p)=>{
    // add product
    await p.type('#produto', 'QUATREE');
    await p.click('#btn-add-prod');
    await p.waitForFunction(()=> document.querySelector('#carrinho li') !== null, {timeout:3000});
    // increase qty
    await p.click('#carrinho button[data-act="inc"]');
    // decrease
    await p.click('#carrinho button[data-act="dec"]');
    // get cart length
    const cartLen = await p.$$eval('#carrinho li', els=>els.length);
    // resumo
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('delivery-resumo') && document.getElementById('delivery-resumo').textContent.trim().length>10, {timeout:3000});
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {cartLen, wa};
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
