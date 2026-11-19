/* Fidelidade: cofre 3D + trilha de selos assinados pela loja (sem servidor; ver selo.js). */
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

    trilha();

    const btn = document.getElementById('btn-instalar');
    if (FA.instalado()) { btn.hidden = true; document.getElementById('ja-instalado').hidden = false; }
    btn.addEventListener('click', () => FA.oferecerInstalacao({ forcar: true }));
  }
  /* ---------- Selos assinados (sem servidor) ---------- */
  const SL = window.FA_SELO;
  const CHAVE = 'fa:selo:v1';
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (_) { return {}; } };
  const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch (_) { /* ok */ } };
  const pub = () => (window.CONFIG && window.CONFIG.loyalty && window.CONFIG.loyalty.publicKey) || null;
  let pendente = '';

  function aviso(txt, tipo = '') {
    const el = document.getElementById('selo-aviso');
    el.hidden = !txt; el.textContent = txt || ''; el.className = 'selo-aviso ' + tipo;
  }
  function telConhecido() {
    const s = ler(); if (s.tel) return s.tel;
    const p = FA.perfil.obter(); return (p.tutor && SL.telValido(p.tutor.tel)) ? SL.normTel(p.tutor.tel) : '';
  }
  function mostrarTel(sim) {
    document.getElementById('form-tel').hidden = !sim;
    if (sim) setTimeout(() => document.getElementById('f-tel-selo').focus(), 50);
  }

  async function receber(texto) {
    const token = SL.extrair(texto);
    if (!token) { aviso('Esse link não parece um selo da Focinhos.', 'erro'); return; }
    if (!pub()) { aviso('O programa de selos começa em breve. Guarde esse link!', 'erro'); return; }
    const p = await SL.verificar(token, pub());
    if (!p) { aviso('Esse selo não é válido. Peça um novo pelo WhatsApp.', 'erro'); return; }
    const tel = telConhecido();
    if (!tel) { pendente = token; aviso('Chegou um selo! Confirme seu celular para guardar.', 'ok'); mostrarTel(true); return; }
    if (p.h !== await SL.hashTel(tel)) {
      pendente = token; aviso('Esse selo é de outro número. Se você trocou de celular, confirme o número abaixo.', 'erro'); mostrarTel(true); return;
    }
    const atual = ler();
    const novo = !atual.n || p.n > atual.n || (p.n === atual.n && p.r > (atual.r || 0));
    if (novo || !atual.token) gravar({ tel, token, n: p.n, r: p.r, d: p.d });
    pendente = ''; mostrarTel(false);
    aviso(novo ? `Selo guardado! Agora você tem ${p.n} ${p.n === 1 ? 'banho' : 'banhos'} na trilha.` : 'Esse selo você já tinha. Está tudo certo.', 'ok');
    if (novo) { FA.vibrar([20, 60, 30]); if (FA.confete) FA.confete(); }
    trilha();
  }

  function trilha() {
    const s = ler();
    const n = s.n || 0; const r = s.r || 0;
    const pata = window.FA3D.desenho('pata', '#ffffff');
    const N = SL.NIVEIS;
    document.getElementById('trilha').innerHTML = N.map((nv, k) => {
      const ini = k === 0 ? 0 : N[k - 1].at;
      const ok = n >= nv.at; const resgatado = k < r; const atual = !ok && n >= ini;
      const passos = nv.at - ini;
      const cheios = Math.max(0, Math.min(passos, n - ini));
      const marcas = Array.from({ length: passos }, (_, j) => `<span class="carimbo ${j < cheios ? 'cheio' : ''}" aria-hidden="true">${j < cheios ? pata : ''}</span>`).join('');
      const titulo = nv.misterio ? `Nível ${k + 1} · ???` : `Nível ${k + 1} · ${nv.nome}`;
      const sub = nv.misterio ? 'Prêmio misterioso. Em breve.' : resgatado ? 'Resgatado. Aproveite!' : ok ? 'Desbloqueado! Mostre esta tela no próximo banho.' : nv.desc;
      return `<li class="nivel ${ok ? 'aberto' : ''} ${atual ? 'atual' : ''} ${nv.misterio ? 'misterio' : ''} ${resgatado ? 'resgatado' : ''}">
        <span class="nivel-icone" aria-hidden="true">${nv.misterio ? '❓' : nv.icone}</span>
        <div><h3>${titulo}</h3><p class="muted pequeno">${sub}</p><div class="carimbos-linha">${marcas}</div></div>
        <span class="nivel-estado">${resgatado ? '✓' : ok && !nv.misterio ? '🎁' : nv.misterio ? '🔒' : `${cheios}/${passos}`}</span></li>`;
    }).join('');
    document.getElementById('trilha').setAttribute('aria-label', `Trilha de fidelidade: ${n} ${n === 1 ? 'banho' : 'banhos'}`);
    document.getElementById('cartao-texto').textContent = n
      ? `Você tem ${n} ${n > 1 ? 'banhos' : 'banho'} na trilha.`
      : 'Cada banho vira um selo. Com 3, você ganha uma hidratação de brinde. O selo chega pelo WhatsApp depois do banho.';
    const num = document.getElementById('selo-numero');
    num.hidden = !s.tel;
    if (s.tel) num.textContent = `Selos do celular final ${s.tel.slice(-4)}.`;
  }

  function ligarSelos() {
    document.getElementById('form-tel').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = document.getElementById('f-tel-selo').value;
      if (!SL.telValido(v)) { aviso('Confira o número com DDD.', 'erro'); return; }
      const tel = SL.normTel(v);
      const s = ler();
      if (pendente) {
        const p = await SL.verificar(pendente, pub());
        if (p && p.h !== await SL.hashTel(tel)) { aviso('Esse selo foi feito para outro número. Peça o seu pelo WhatsApp.', 'erro'); return; }
        if (s.tel && s.tel !== tel) gravar({ tel }); else gravar(Object.assign(s, { tel }));
        await receber(pendente);
      } else { gravar(Object.assign(s, { tel })); mostrarTel(false); trilha(); }
    });
    document.getElementById('btn-colar-selo').addEventListener('click', () => receber(document.getElementById('f-selo').value));
    const m = location.hash.match(/selo=([A-Za-z0-9_.-]+)/);
    if (m) { history.replaceState(null, '', location.pathname); receber('selo=' + m[1]); }
  }

  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
  if (FA.pronto) ligarSelos(); else document.addEventListener('fa:pronto', ligarSelos, { once: true });
  window.__faSelo = { receber, ler };
})();
