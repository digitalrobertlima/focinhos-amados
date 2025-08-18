const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8007;

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

(async ()=>{
  const server = await serve();
  const browser = await safeLaunch();
  const page = await browser.newPage();

  const results = [];
  try{
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    // Fill first pet
    await page.type('#petNome', 'Ted');
    await page.select('#especie', 'Cão').catch(()=>{});
    await page.select('#porte', 'Médio').catch(()=>{});
    // Add second pet and fill
    await page.click('#btn-add-pet');
    await page.waitForFunction(()=> document.querySelectorAll('.pet').length >= 2, {timeout:3000});
    // Fill second pet via data-role selectors scoped to the last .pet
    await page.type('.pet:last-of-type [data-role="petNome"]', 'Luna');
    await page.select('.pet:last-of-type [data-role="especie"]', 'Cão').catch(()=>{});
    await page.select('.pet:last-of-type [data-role="porte"]', 'Pequeno').catch(()=>{});

    // Trigger a small change to ensure draft saved
    await page.click('[data-role="srv-banho"]').catch(()=>{});
  await page.evaluate(()=> new Promise(r=> setTimeout(r, 400)));

    // Reload
    await page.reload({waitUntil:'networkidle2'});
    // Validate both names persisted (read values from inputs)
    const vals = await page.evaluate(()=>{
      const first = document.getElementById('petNome')?.value || '';
      const last = document.querySelector('.pet:last-of-type [data-role="petNome"]')?.value || '';
      return { first, last };
    });
    const hasTed = vals.first === 'Ted';
    const hasLuna = vals.last === 'Luna';
    results.push({ check: 'bothPetNamesRestored', ok: hasTed && hasLuna, detail: { vals } });
  }catch(e){
    results.push({check:'persist', ok:false, error:String(e)});
  }

  console.log('AGENDAR PERSIST REPORT', JSON.stringify(results, null, 2));

  await browser.close();
  server.close();
})();
