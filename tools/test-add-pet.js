const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8001;

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
  try{
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});

    // Scenario A: empty form, add 3 pets
    const initialA = await page.$$eval('.pet', els => els.length);
    for(let i=0;i<3;i++){
      const expected = initialA + i + 1;
      await page.click('#btn-add-pet');
      await page.waitForFunction((exp)=> document.querySelectorAll('.pet').length >= exp, {timeout:5000}, expected);
    }
    const finalA = await page.$$eval('.pet', els => els.length);
    console.log('Scenario A (empty) initial:', initialA, 'final:', finalA);

    // Reload page for scenario B
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    // Fill required fields for the first pet
    await page.type('#petNome','Rex');
    await page.select('#especie','Cão');
    await page.select('#porte','Médio');
    await page.type('#tutorNome','João Test');
    await page.type('#tutorTelefone','31999990000');
    // Scenario B: try to add 3 pets after filling
    const initialB = await page.$$eval('.pet', els => els.length);
    for(let i=0;i<3;i++){
      const expected = initialB + i + 1;
      await page.click('#btn-add-pet');
      // wait for increase, but catch timeout to report
      try{
        await page.waitForFunction((exp)=> document.querySelectorAll('.pet').length >= exp, {timeout:3000}, expected);
      }catch(e){ /* ignore timeout for capturing final count */ }
    }
    const finalB = await page.$$eval('.pet', els => els.length);
    console.log('Scenario B (filled) initial:', initialB, 'final:', finalB);
    // Report both
    console.log(JSON.stringify({scenarioA:{initial:initialA, final:finalA}, scenarioB:{initial:initialB, final:finalB}}));
  }catch(err){ console.error(err); process.exitCode = 2; }
  await browser.close();
  server.close();
})();
