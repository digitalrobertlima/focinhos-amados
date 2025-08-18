const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const port = 8004;

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

  console.log('=> /delivery.html');
  await page.goto(`http://localhost:${port}/delivery.html`, {waitUntil:'networkidle2'});
  // add product
  await page.type('#produto', 'TEST-ITEM');
  await page.click('#btn-add-prod');
  await page.waitForFunction(()=> document.querySelector('#carrinho li') !== null, {timeout:3000});
  // check initial qty
  const qty1 = await page.$eval('#carrinho input.item__qty_input, #carrinho input.item__qty_input', el=> el.value);
  console.log('initial qty', qty1);
  // inc
  await page.click('#carrinho button[data-act="inc"]');
  const qty2 = await page.$eval('#carrinho input.item__qty_input', el=> el.value);
  console.log('after inc', qty2);
  // dec
  await page.click('#carrinho button[data-act="dec"]');
  const qty3 = await page.$eval('#carrinho input.item__qty_input', el=> el.value);
  console.log('after dec', qty3);
  // remove
  await page.click('#carrinho button.item__remove');
  await (page.waitForTimeout ? page.waitForTimeout(200) : new Promise(r=>setTimeout(r,200)));
  const lenAfterRemove = await page.$$eval('#carrinho li', els=> els.length);
  console.log('lenAfterRemove', lenAfterRemove);
  // undo: click undo snackbar
  await page.waitForSelector('#__cart-undo-snackbar', {timeout:2000});
  await page.click('#__cart-undo-snackbar button');
  await page.waitForFunction(()=> document.querySelectorAll('#carrinho li').length>0, {timeout:2000});
  const lenAfterUndo = await page.$$eval('#carrinho li', els=> els.length);
  console.log('lenAfterUndo', lenAfterUndo);

  await browser.close();
  server.close();
})();
