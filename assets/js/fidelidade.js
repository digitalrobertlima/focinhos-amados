/* Fidelidade (em breve): cofre 3D que abre ao toque + cartão de carimbos. */
(function () {
  'use strict';
  const FA = window.FA;
  const TOTAL = 10;
  function iniciar() {
    const cofre = document.getElementById('cofre');
    const dica = document.getElementById('cofre-dica');
    const alternar = () => {
      const abrir = !cofre.classList.contains('aberto');
      cofre.classList.add('girando');
      setTimeout(() => {
        cofre.classList.toggle('aberto', abrir);
        cofre.classList.remove('girando');
        dica.textContent = abrir ? 'Prêmios chegando em breve ✨' : 'Toque no cofre';
        cofre.setAttribute('aria-label', abrir ? 'Fechar o cofre' : 'Toque para abrir o cofre');
        FA.vibrar(abrir ? [15, 60, 25] : 10);
      }, FA.reduzMovimento() ? 0 : 420);
    };
    cofre.addEventListener('click', alternar);
    cofre.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); } });
    if (!FA.reduzMovimento()) setTimeout(() => { if (!cofre.classList.contains('aberto')) alternar(); }, 900);

    // Cartão: 1º carimbo de presente (progresso inicial), depois 1 por banho agendado pelo app
    const feitos = Math.min(TOTAL - 1, FA.agenda.lista().length);
    const cheios = 1 + feitos;
    const pata = window.FA3D.desenho('pata', '#ffffff');
    const el = document.getElementById('carimbos');
    el.innerHTML = Array.from({ length: TOTAL }, (_, k) => {
      if (k === TOTAL - 1) return `<span class="carimbo presente" aria-label="Prêmio">🎁</span>`;
      return k < cheios ? `<span class="carimbo cheio" aria-label="Carimbo ${k + 1}">${pata}</span>` : `<span class="carimbo" aria-label="Vazio">${k + 1}</span>`;
    }).join('');
    el.setAttribute('aria-label', `Cartão fidelidade: ${cheios} de ${TOTAL} carimbos`);
    document.getElementById('cartao-texto').textContent = feitos
      ? `Você já tem ${cheios} carimbos: o de boas-vindas e ${feitos} ${feitos > 1 ? 'banhos agendados' : 'banho agendado'} pelo app.`
      : 'O primeiro carimbo é presente de boas-vindas. Cada banho agendado pelo app ganha outro.';

    const btn = document.getElementById('btn-instalar');
    if (FA.instalado()) { btn.hidden = true; document.getElementById('ja-instalado').hidden = false; }
    btn.addEventListener('click', () => FA.oferecerInstalacao({ forcar: true }));
  }
  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
