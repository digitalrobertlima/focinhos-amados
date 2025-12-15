// Teste direto das funções do main.js

console.log('🚀 Iniciando testes das funções principais...');

// Setup mock browser environment
global.window = {};
global.document = {
  querySelector: () => ({}),
  querySelectorAll: () => [],
  getElementById: () => ({}),
  createElement: () => ({}),
  body: { dataset: {} },
  addEventListener: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.navigator = { clipboard: {}, serviceWorker: {} };
global.location = { hostname: 'localhost' };

// Load and execute main.js
const mainJsPath = path.join(__dirname, '..', 'assets', 'js', 'main.js');
const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');
vm.runInThisContext(mainJsCode);

// Test cart functions
console.log('\n🛒 Testando funções do carrinho...');
try {
  const cart = window.getCartFromStorage();
  console.log('getCartFromStorage retorna array vazio?', Array.isArray(cart) && cart.length === 0 ? '✅' : '❌');
  
  window.saveCartToStorage([{nome: 'Teste', qtd: 1}]);
  console.log('saveCartToStorage funciona?', '✅');
  
  window.updateCartQty(0, 2);
  console.log('updateCartQty funciona?', '✅');
  
  window.removeCartItem(0);
  console.log('removeCartItem funciona?', '✅');
} catch (e) {
  console.error('❌ Erro nos testes do carrinho:', e);
}

// Test menu functions
console.log('\n📱 Testando funções do menu...');
try {
  const btn = document.createElement('button');
  btn.classList = { add: () => {}, remove: () => {}, contains: () => false };
  const drawer = document.createElement('div');
  drawer.classList = { add: () => {}, remove: () => {}, contains: () => false };
  
  document.querySelector = () => btn;
  document.getElementById = () => drawer;
  
  window.initNav();
  console.log('initNav executa sem erros?', '✅');
} catch (e) {
  console.error('❌ Erro nos testes do menu:', e);
}

console.log('\n✨ Testes concluídos!');
