// Test all flows and buttons in Focinhos Amados
const puppeteer = require('puppeteer');
const assert = require('assert').strict;

async function runTests() {
  console.log('🔄 Iniciando testes de fluxos e botões...');
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  try {
    // Configurar viewport móvel padrão
    await page.setViewport({ width: 375, height: 812 });

    // ===== Teste 1: Menu de Navegação =====
    console.log('\n🧪 Testando menu de navegação...');
    await page.goto('http://localhost:8080/');
    await page.waitForSelector('.nav__btn');
    
    // Testar abertura/fechamento do menu
    await page.click('.nav__btn');
    await page.waitForSelector('#drawer.open');
    let isOpen = await page.$eval('#drawer', el => el.classList.contains('open'));
    assert.ok(isOpen, 'Menu deveria estar aberto');
    
    // Testar fechamento ao clicar fora
    await page.click('body');
    await page.waitForTimeout(300); // esperar animação
    isOpen = await page.$eval('#drawer', el => el.classList.contains('open'));
    assert.ok(!isOpen, 'Menu deveria estar fechado após clicar fora');

    // ===== Teste 2: Fluxo de Agendamento =====
    console.log('\n🧪 Testando fluxo de agendamento...');
    await page.goto('http://localhost:8080/agendar.html');
    
    // Adicionar um pet
    await page.waitForSelector('#btn-add-pet');
    await page.click('#btn-add-pet');
    const petsCount = await page.$$eval('.pet', pets => pets.length);
    assert.equal(petsCount, 1, 'Deveria ter 1 pet após adicionar');

    // Preencher dados do pet
    await page.type('#petNome', 'Rex');
    await page.select('#especie', 'Cachorro');
    await page.select('#porte', 'Médio');
    
    // Selecionar serviços
    await page.click('#srv-banho');
    await page.click('#srv-tosa');
    await page.type('#tosaTipo', 'Higiênica');
    
    // Dados do tutor
    await page.type('#tutorNome', 'João Silva');
    await page.type('#tutorTelefone', '11999887766');
    
    // Data e janela
    await page.type('#dataPreferida', '2025-08-20');
    await page.select('#janela', 'manha');
    
    // Verificar resumo
    await page.click('#btn-ver-resumo');
    const resumoText = await page.$eval('#agendar-resumo', el => el.textContent);
    assert.ok(resumoText.includes('Rex'), 'Resumo deve incluir nome do pet');

    // ===== Teste 3: Fluxo de Delivery =====
    console.log('\n🧪 Testando fluxo de delivery...');
    await page.goto('http://localhost:8080/delivery.html');
    
    // Adicionar produto
    await page.type('#produto', 'Ração Premium');
    await page.type('#variacao', '1kg');
    await page.type('#qtd', '2');
    await page.click('#btn-add-prod');
    
    // Verificar carrinho
    const cartItems = await page.$$eval('.cart-item', items => items.length);
    assert.equal(cartItems, 1, 'Deveria ter 1 item no carrinho');
    
    // Preencher dados de entrega
    await page.type('#recebedor', 'Maria Silva');
    await page.type('#tel', '11999887766');
    await page.type('#endereco', 'Rua Teste, 123');
    
    // Verificar resumo
    await page.click('#btn-ver-resumo');
    const deliveryResumo = await page.$eval('#delivery-resumo', el => el.textContent);
    assert.ok(deliveryResumo.includes('Ração Premium'), 'Resumo deve incluir produto');

    // ===== Teste 4: Fluxo de Táxi Pet =====
    console.log('\n🧪 Testando fluxo de táxi pet...');
    await page.goto('http://localhost:8080/taxi.html');
    
    // Selecionar tipo banho
    await page.click('#tipo-banho');
    
    // Preencher dados
    await page.type('#petNome', 'Luna');
    await page.type('#tutorNome', 'Pedro Silva');
    await page.type('#tutorTelefone', '11999887766');
    await page.type('#origem', 'Rua Origem, 100');
    await page.type('#destino', 'Rua Destino, 200');
    await page.type('#horario', '2025-08-20T10:00');
    
    // Verificar resumo
    await page.click('#btn-ver-resumo');
    const taxiResumo = await page.$eval('#taxi-resumo', el => el.textContent);
    assert.ok(taxiResumo.includes('Luna'), 'Resumo deve incluir nome do pet');

    // ===== Teste 5: Carrinho Global =====
    console.log('\n🧪 Testando carrinho global...');
    await page.goto('http://localhost:8080/');
    
    // Abrir carrinho
    await page.waitForSelector('#topbar-cart');
    await page.click('#topbar-cart');
    
    // Verificar modal
    const modalVisible = await page.$eval('.modal', el => getComputedStyle(el).display !== 'none');
    assert.ok(modalVisible, 'Modal do carrinho deveria estar visível');
    
    // Fechar modal
    await page.click('#__cart-close');
    await page.waitForTimeout(300);
    const modalClosed = await page.$('.modal').then(el => !el);
    assert.ok(modalClosed, 'Modal do carrinho deveria estar fechado');

    console.log('\n✅ Todos os testes completados com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Executar os testes
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
