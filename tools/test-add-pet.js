const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8001;

function serve() {
  return new Promise((resolve, reject)=>{
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

(async ()=>{
  const server = await serve();
  // Try default launch; if it times out, try common local Chrome paths on Windows
  let browser;
  try{
    browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox'], timeout: 60000});
  }catch(err){
    console.warn('Default launch failed, trying local Chrome executable fallback:', err.message);
    const possible = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    const found = possible.find(p=> require('fs').existsSync(p));
    if(!found) throw err;
    browser = await puppeteer.launch({executablePath: found, args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'], timeout: 60000});
  }
  try{
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/agendar.html`, {waitUntil:'networkidle2'});
    // count initial
    const initial = await page.$$eval('.pet', els => els.length);
    // click add pet 3x and wait for DOM to update
    for(let i=0;i<3;i++){
      const expected = initial + i + 1;
      await page.click('#btn-add-pet');
      await page.waitForFunction((exp)=> document.querySelectorAll('.pet').length >= exp, {timeout:5000}, expected);
    }
    const final = await page.$$eval('.pet', els => els.length);
    console.log('initial:', initial, 'final:', final);
  }catch(err){ console.error(err); process.exitCode = 2; }
  await browser.close();
  server.close();
})();
