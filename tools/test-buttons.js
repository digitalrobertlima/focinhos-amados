const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Iniciando testes forçados dos botões...');
  
  try {
    const browser = await puppeteer.launch({
      headless: false, // Para ver o teste acontecendo
      defaultViewport: { width: 375, height: 812 },
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    
    // Teste 1: Menu Mobile
    console.log('\n📱 Testando Menu Mobile...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.nav__btn', { visible: true });
    
    // Clica no botão do menu
    await page.click('.nav__btn');
    await page.waitForTimeout(500);
    
    // Verifica se o menu está aberto
    const menuOpen = await page.$eval('#drawer', el => el.classList.contains('open'));
    console.log('Menu abriu corretamente?', menuOpen ? '✅' : '❌');
    
    // Clica fora para fechar
    await page.click('body');
    await page.waitForTimeout(500);
    
    // Verifica se fechou
    const menuClosed = await page.$eval('#drawer', el => !el.classList.contains('open'));
    console.log('Menu fechou corretamente?', menuClosed ? '✅' : '❌');

    // Teste 2: Página de Agendamento
    console.log('\n📝 Testando página de Agendamento...');
    await page.goto('http://localhost:8080/agendar.html', { waitUntil: 'networkidle0' });
    
    // Testa botão de adicionar pet
    await page.waitForSelector('#btn-add-pet', { visible: true });
    const petsAntes = await page.$$eval('.pet', pets => pets.length);
    await page.click('#btn-add-pet');
    await page.waitForTimeout(500);
    const petsDepois = await page.$$eval('.pet', pets => pets.length);
    console.log('Pet adicionado corretamente?', (petsDepois > petsAntes) ? '✅' : '❌');

    // Teste 3: Delivery
    console.log('\n🛒 Testando página de Delivery...');
    await page.goto('http://localhost:8080/delivery.html', { waitUntil: 'networkidle0' });
    
    // Testa adição ao carrinho
    await page.type('#produto', 'Ração Premium');
    await page.type('#variacao', '1kg');
    await page.type('#qtd', '2');
    await page.click('#btn-add-prod');
    await page.waitForTimeout(500);
    
    const itemAdded = await page.$eval('.cart-item', el => el !== null);
    console.log('Produto adicionado ao carrinho?', itemAdded ? '✅' : '❌');

    // Teste 4: Táxi Pet
    console.log('\n🚕 Testando página de Táxi Pet...');
    await page.goto('http://localhost:8080/taxi.html', { waitUntil: 'networkidle0' });
    
    // Testa seleção de tipo
    await page.click('#tipo-banho');
    const tipoBanhoSelecionado = await page.$eval('#tipo-banho', el => el.checked);
    console.log('Tipo banho selecionado?', tipoBanhoSelecionado ? '✅' : '❌');

    console.log('\n✨ Todos os testes concluídos!');
    
    await browser.close();
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
})();
