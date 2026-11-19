/* Fidelidade (em breve): cofre 3D que abre ao toque + cartão de carimbos. */
(function () {
  'use strict';
  const FA = window.FA;
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

    // Trilha de níveis: cada banho agendado pelo app vale 1 carimbo.
    // Nível 1: 3 banhos = hidratação de brinde. Depois, uma trilha misteriosa (novos prêmios em breve).
    const feitos = FA.agenda.lista().length;
    const pata = window.FA3D.desenho('pata', '#ffffff');
    const NIVEIS = [
      { at: 3, icone: '💧', nome: 'Hidratação de brinde', desc: 'Complete 3 banhos e ganhe uma hidratação.' },
      { at: 6, misterio: true }, { at: 9, misterio: true }, { at: 12, misterio: true },
    ];
    const el = document.getElementById('trilha');
    el.innerHTML = NIVEIS.map((n, k) => {
      const ini = k === 0 ? 0 : NIVEIS[k - 1].at;
      const ok = feitos >= n.at; const atual = !ok && feitos >= ini;
      const passos = n.at - ini;
      const cheios = Math.max(0, Math.min(passos, feitos - ini));
      const marcas = Array.from({ length: passos }, (_, j) => `<span class="carimbo ${j < cheios ? 'cheio' : ''}" aria-hidden="true">${j < cheios ? pata : ''}</span>`).join('');
      const titulo = n.misterio ? `Nível ${k + 1} · ???` : `Nível ${k + 1} · ${n.nome}`;
      const sub = n.misterio ? 'Prêmio misterioso. Em breve.' : (ok ? 'Desbloqueado! Avise a gente no próximo banho.' : n.desc);
      return `<li class="nivel ${ok ? 'aberto' : ''} ${atual ? 'atual' : ''} ${n.misterio ? 'misterio' : ''}">
        <span class="nivel-icone" aria-hidden="true">${n.misterio ? '❓' : n.icone}</span>
        <div><h3>${titulo}</h3><p class="muted pequeno">${sub}</p><div class="carimbos-linha">${marcas}</div></div>
        <span class="nivel-estado">${ok ? '✓' : n.misterio ? '🔒' : `${cheios}/${passos}`}</span></li>`;
    }).join('');
    el.setAttribute('aria-label', `Trilha de fidelidade: ${feitos} ${feitos === 1 ? 'banho' : 'banhos'}`);
    document.getElementById('cartao-texto').textContent = feitos
      ? `Você tem ${feitos} ${feitos > 1 ? 'banhos' : 'banho'} na trilha.`
      : 'Cada banho vira um carimbo. Com 3, você ganha uma hidratação de brinde.';

    const btn = document.getElementById('btn-instalar');
    if (FA.instalado()) { btn.hidden = true; document.getElementById('ja-instalado').hidden = false; }
    btn.addEventListener('click', () => FA.oferecerInstalacao({ forcar: true }));
  }
  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
