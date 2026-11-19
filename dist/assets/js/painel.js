/* Painel da loja: dá selos de fidelidade assinados. A chave privada fica só neste celular (localStorage).
   Nenhum servidor: o selo vai pro cliente por um link no WhatsApp. */
(function () {
  'use strict';
  const FA = window.FA; const SL = window.FA_SELO;
  const CHAVE = 'fa:painel:v1';
  const $ = (id) => document.getElementById(id);
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || null; } catch (_) { return null; } };
  const gravar = (v) => localStorage.setItem(CHAVE, JSON.stringify(v));
  let D = null;

  const fmtTel = (t) => (t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 3)} ${t.slice(3, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t);
  const cliente = (tel) => D.clientes[tel] || { nome: '', n: 0, r: 0 };

  function telAtual() { const v = $('p-tel').value; return SL.telValido(v) ? SL.normTel(v) : ''; }

  function atualizarStatus() {
    const tel = telAtual();
    if (!tel) { $('p-status').textContent = 'Digite o celular com DDD.'; $('btn-resgate').disabled = true; $('btn-reenviar').hidden = true; return; }
    const c = cliente(tel); const s = SL.situacao(c.n, c.r);
    if (c.nome && !$('p-nome').value) $('p-nome').value = c.nome;
    $('p-status').textContent = c.n
      ? `${c.nome ? c.nome + ': ' : ''}${c.n} ${c.n === 1 ? 'banho' : 'banhos'}${c.r ? `, ${c.r} prêmio resgatado` : ''}. ${s.podeResgatar ? '🎁 Tem hidratação pra entregar!' : s.proximo && !s.proximo.misterio ? `Faltam ${s.faltam} pra hidratação.` : ''}`
      : 'Cliente novo. O primeiro selo começa a trilha.';
    $('btn-resgate').disabled = !s.podeResgatar;
    $('btn-reenviar').hidden = !c.ult;
  }

  function lista() {
    const tels = Object.keys(D.clientes).sort((a, b) => (D.clientes[b].atualizado || 0) - (D.clientes[a].atualizado || 0));
    $('p-clientes').innerHTML = tels.map((t) => `<option value="${fmtTel(t)}">${FA.esc(D.clientes[t].nome || '')}</option>`).join('');
    $('p-lista').innerHTML = tels.length ? tels.slice(0, 30).map((t) => {
      const c = D.clientes[t]; const s = SL.situacao(c.n, c.r);
      return `<li><button type="button" data-tel="${t}"><span><b>${FA.esc(c.nome || fmtTel(t))}</b><small>${fmtTel(t)}</small></span><span>${c.n} 🛁${s.podeResgatar ? ' · 🎁' : ''}</span></button></li>`;
    }).join('') : '<li class="muted pequeno">Ninguém ainda. O primeiro selo aparece aqui.</li>';
    $('p-lista').querySelectorAll('[data-tel]').forEach((b) => b.addEventListener('click', () => {
      $('p-tel').value = fmtTel(b.dataset.tel); $('p-nome').value = D.clientes[b.dataset.tel].nome || '';
      atualizarStatus(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }

  function linkSelo(token) { return new URL('fidelidade.html', location.href).href.split('#')[0] + '#selo=' + token; }

  function prepararEnvio(tel, c, motivo) {
    const quem = c.nome ? ` ${c.nome}` : '';
    const txt = motivo === 'resgate'
      ? `🐾 *Focinhos Amados*\nHidratação entregue${quem}! 💧 Sua trilha continua, e o próximo prêmio é surpresa.\n\nToque pra atualizar seus selos:\n${linkSelo(c.ult)}`
      : `🐾 *Focinhos Amados*\nObrigada pelo banho${quem}! Seu selo chegou: agora são *${c.n} ${c.n === 1 ? 'banho' : 'banhos'}* na trilha.${SL.situacao(c.n, c.r).podeResgatar ? '\n🎁 Você ganhou uma *hidratação de brinde*! É só avisar no próximo banho.' : ''}\n\nToque pra guardar no app:\n${linkSelo(c.ult)}`;
    $('btn-enviar').href = `https://wa.me/55${tel}?text=${encodeURIComponent(txt)}`;
    $('enviar').hidden = false;
    $('enviar').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function emitir(motivo) {
    const tel = telAtual(); if (!tel) { atualizarStatus(); return; }
    const c = Object.assign({}, cliente(tel));
    if (motivo === 'banho') c.n += 1;
    if (motivo === 'resgate') { if (!SL.situacao(c.n, c.r).podeResgatar) return; c.r += 1; }
    c.nome = $('p-nome').value.trim().slice(0, 40) || c.nome || '';
    const payload = { v: 1, h: await SL.hashTel(tel), n: c.n, r: c.r, d: FA.ymd(new Date()), i: SL.b64u(crypto.getRandomValues(new Uint8Array(6))) };
    c.ult = await SL.assinar(payload, D.priv);
    c.atualizado = Date.now();
    D.clientes[tel] = c; gravar(D);
    FA.vibrar(20);
    atualizarStatus(); lista(); prepararEnvio(tel, c, motivo);
  }

  function baixarBackup() {
    const blob = new Blob([JSON.stringify(Object.assign({ tipo: 'focinhos-painel', versao: 1 }, D), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `focinhos-chave-da-loja-${FA.ymd(new Date())}.json`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    D.backup = Date.now(); gravar(D); verificarChave();
  }

  function verificarChave() {
    const pub = window.CONFIG && window.CONFIG.loyalty && window.CONFIG.loyalty.publicKey;
    const av = $('aviso-chave');
    if (!pub || !pub.x) { av.hidden = false; av.textContent = 'O site ainda não tem a chave pública desta loja. Copie em "Segurança e chave" e mande pro Robert colar no site. Até lá os clientes não conseguem guardar os selos.'; }
    else if (!SL.mesmaChave(pub, D.pub)) { av.hidden = false; av.textContent = 'Atenção: a chave deste celular é diferente da que está no site. Os selos daqui não vão valer. Restaure a cópia de segurança certa.'; }
    else if (!D.backup) { av.hidden = false; av.className = 'selo-aviso'; av.textContent = 'Faça uma cópia de segurança da chave (em "Segurança e chave"). Se perder este celular sem ela, os selos param.'; }
    else av.hidden = true;
  }

  function mostrar() {
    D = ler();
    $('sem-chave').hidden = !!D; $('com-chave').hidden = !D;
    if (!D) return;
    D.clientes = D.clientes || {};
    $('p-pub').textContent = JSON.stringify(D.pub);
    verificarChave(); lista(); atualizarStatus();
  }

  function iniciar() {
    if (!window.crypto || !crypto.subtle) { document.querySelector('main').innerHTML = '<p class="secao">Este navegador não consegue assinar selos. Abra pelo Chrome ou Safari atualizados.</p>'; return; }
    $('btn-criar').addEventListener('click', async () => {
      if (ler()) return mostrar();
      const k = await SL.gerarChaves();
      gravar({ priv: k.priv, pub: k.pub, clientes: {}, criado: Date.now() });
      mostrar();
    });
    $('f-restaurar').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (j.tipo !== 'focinhos-painel' || !j.priv || !j.pub) throw new Error('arquivo');
        delete j.tipo; delete j.versao; j.backup = j.backup || Date.now(); gravar(j); mostrar();
      } catch (_) { alert('Esse arquivo não é uma cópia de segurança do painel.'); }
    });
    $('p-tel').addEventListener('input', () => { $('enviar').hidden = true; atualizarStatus(); });
    $('btn-banho').addEventListener('click', () => emitir('banho'));
    $('btn-resgate').addEventListener('click', () => emitir('resgate'));
    $('btn-reenviar').addEventListener('click', () => { const t = telAtual(); if (t && cliente(t).ult) prepararEnvio(t, cliente(t), 'banho'); });
    $('btn-backup').addEventListener('click', baixarBackup);
    $('btn-copiar-pub').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('p-pub').textContent); $('btn-copiar-pub').textContent = 'Copiada ✓'; } catch (_) { /* ok */ }
    });
    mostrar();
  }
  window.__faPainel = { emitir, ler };
  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
