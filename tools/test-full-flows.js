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
  const slow = parseInt(process.env.SLOW_MS || '0', 10) || 0;
  try{ return await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox'], timeout:60000, headless: true, slowMo: slow}); }
  catch(e){
    const possible = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    const found = possible.find(p=> fs.existsSync(p));
    if(!found) throw e;
  return await puppeteer.launch({executablePath: found, args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'], timeout:60000, headless: true, slowMo: slow});
  }
}

function mockGeolocation(page){
  // inject a fake geolocation implementation before any scripts run
  page.evaluateOnNewDocument(()=>{
    const mockPos = { coords: { latitude: -19.953147, longitude: -43.99368, accuracy: 10 }, timestamp: Date.now() };
    navigator.geolocation.getCurrentPosition = function(success, err){ try{ success(mockPos); }catch(e){ if(err) err(e); } };
    navigator.geolocation.watchPosition = function(success, err){ try{ success(mockPos); }catch(e){ if(err) err(e); } return 1; };
    navigator.geolocation.clearWatch = function(){ return; };
  });
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
    // ensure no services -> validation
    await p.$$eval('#srv-banho, #srv-tosa', els => els.forEach(e=> e.checked = false));
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
    await p.click('#srv-banho');
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('agendar-resumo') && document.getElementById('agendar-resumo').textContent.includes('Rex'), {timeout:3000});
    // intercept open
    await p.evaluate(()=>{ window.__lastWindowOpen = null; window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; }; });
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {errText, wa};
  });

  // DELIVERY: happy path and validation
  await run('delivery - validation then happy', async (p)=>{
    await p.goto(`http://localhost:${port}/delivery.html`, {waitUntil:'networkidle2'});
    // try WA without cart -> should alert; intercept window.alert
    await p.evaluate(()=>{ window.__alertMsg = null; window.alert = (m)=>{ window.__alertMsg = m; }; window.__lastWindowOpen = null; window.open = (u)=>{ window.__lastWindowOpen = u; return { focus: ()=>{} }; }; });
    await p.click('#btn-wa');
    const alertMsg = await p.evaluate(()=> window.__alertMsg || '');
    // add product
    await p.type('#produto','GOLDEN DOG');
    await p.type('#variacao','1kg');
    await p.click('#btn-add-prod');
    await p.waitForFunction(()=> document.querySelectorAll('#carrinho li').length>0, {timeout:3000});
    await p.type('#recebedor','Maria');
    await p.type('#tel','31977776666');
    await p.type('#endereco','Av Teste, 123');
    await p.click('#btn-ver-resumo');
    await p.waitForFunction(()=> document.getElementById('delivery-resumo') && document.getElementById('delivery-resumo').textContent.includes('GOLDEN'), {timeout:3000});
    await p.click('#btn-wa');
    const wa = await p.evaluate(()=> window.__lastWindowOpen || document.getElementById('btn-wa')?.href);
    return {alertMsg, wa};
  });

  // TAXI: test both modes
  await run('taxi - banho mode', async (p)=>{
    await p.goto(`http://localhost:${port}/taxi.html`, {waitUntil:'networkidle2'});
    // choose banho
    await p.click('#tipo-banho');
    await p.type('#petNome','Bolinha');
    await p.type('#tutorNome','Ana');
    await p.type('#tutorTelefone','31966665555');
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
    await p.type('#origem2','Rua A, 1');
    await p.type('#destino2','Rua B, 2');
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
