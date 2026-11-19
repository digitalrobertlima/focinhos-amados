/* =========================================================================
   Focinhos Amados — núcleo compartilhado (todas as páginas)
   - Carrega config (config.js como padrão + config.json editável)
   - Status aberto/fechado, abas, service worker
   - Perfil salvo NESTE aparelho (tutor + pets) e histórico de agendamentos
   - Convite para instalar o app (Android: prompt nativo; iPhone: instruções)
   Segurança: nada de innerHTML com dado digitado pelo usuário sem FA.esc().
   ========================================================================= */
(function (global) {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduzMovimento = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vibrar = (p) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (_) { /* sem vibração */ } };

  /* ---------------- Config ---------------- */
  function mesclar(base, extra) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(extra || {}).forEach((k) => {
      const v = extra[k];
      out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && !Array.isArray(base[k]))
        ? mesclar(base[k], v) : v;
    });
    return out;
  }
  let pronto = null;
  function config() {
    if (pronto) return pronto;
    pronto = (async () => {
      let json = {};
      try {
        const r = await fetch('./config.json', { cache: 'no-store' });
        if (r.ok) json = await r.json();
      } catch (_) { /* offline: usa padrão do config.js */ }
      global.CONFIG = mesclar(global.CONFIG || {}, json);
      return global.CONFIG;
    })();
    return pronto;
  }

  /* ---------------- Armazenamento local (só neste aparelho) ---------------- */
  const CHAVE_PERFIL = 'fa:perfil:v1';
  const CHAVE_AGENDA = 'fa:agendamentos:v1';
  const CHAVE_INSTALAR = 'fa:instalar:dispensado';
  const CHAVE_RASCUNHO = 'fa:rascunho:v1';
  const CHAVE_SELO = 'fa:selo:v1';
  /* Todos os dados do CLIENTE guardados neste celular. A chave da loja (fa:painel:v1) fica de fora de propósito:
     apagar os dados do cliente nunca pode apagar a chave que dá selos. */
  const CHAVES_CLIENTE = [CHAVE_PERFIL, CHAVE_AGENDA, CHAVE_RASCUNHO, CHAVE_SELO, CHAVE_INSTALAR];
  function ler(chave, padrao) {
    try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (_) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch (_) { return false; }
  }
  const perfil = {
    obter: () => ler(CHAVE_PERFIL, { tutor: null, pets: [] }),
    salvar(tutor, pets) {
      const atual = perfil.obter();
      const porNome = new Map((atual.pets || []).map((p) => [p.nome.toLowerCase(), p]));
      pets.forEach((p) => {
        const limpo = {
          nome: p.nome, especie: p.especie, porte: p.porte, pelo: p.pelo, temperamento: p.temperamento,
          saude: p.saude || '', servico: p.servico, tosa: p.tosa || '', perfume: p.perfume || '', acessorio: p.acessorio || '',
        };
        porNome.set(p.nome.toLowerCase(), limpo);
      });
      return gravar(CHAVE_PERFIL, { tutor, pets: Array.from(porNome.values()).slice(-8) });
    },
    /* Tira um pet do app (sem perguntar motivo): some das sugestões e dos próximos horários. */
    removerPet(nome) {
      const n = String(nome || '').toLowerCase();
      const atual = perfil.obter();
      gravar(CHAVE_PERFIL, Object.assign(atual, { pets: (atual.pets || []).filter((p) => String(p.nome).toLowerCase() !== n) }));
      const hoje = ymd(new Date());
      const l = ler(CHAVE_AGENDA, []).map((a) => (a.dia >= hoje ? Object.assign({}, a, { pets: (a.pets || []).filter((x) => String(x).toLowerCase() !== n) }) : a))
        .filter((a) => a.dia < hoje || (a.pets || []).length);
      gravar(CHAVE_AGENDA, l);
      // o rascunho em andamento também esquece esse pet (senão ele volta ao tocar em "Agendar")
      const r = ler(CHAVE_RASCUNHO, null);
      if (r && r.S && (r.S.pets || []).some((p) => String(p.nome || '').toLowerCase() === n)) {
        try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) { /* ok */ }
      }
    },
    /* "Apagar meus dados": tudo do cliente, nunca a chave da loja. */
    esquecer() { CHAVES_CLIENTE.forEach((k) => { try { localStorage.removeItem(k); } catch (_) { /* ok */ } }); },
  };
  const agenda = {
    lista: () => ler(CHAVE_AGENDA, []),
    adicionar(item) { const l = agenda.lista(); l.push(item); return gravar(CHAVE_AGENDA, l.slice(-60)); },
    marcarEnviado(id) { gravar(CHAVE_AGENDA, agenda.lista().map((a) => (a.id === id ? Object.assign(a, { enviado: true }) : a))); },
    proximo() {
      const hoje = ymd(new Date());
      return agenda.lista().filter((a) => a.dia >= hoje && a.enviado !== false).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora))[0] || null;
    },
  };

  /* ---------------- Datas e horários ---------------- */
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function lerYmd(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function dataLonga(s) {
    const d = lerYmd(s); if (!d) return '';
    const hoje = new Date(); const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const pre = s === ymd(hoje) ? 'hoje, ' : s === ymd(amanha) ? 'amanhã, ' : '';
    return `${pre}${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  function faixa(txt) {
    const m = String(txt || '').match(/^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/);
    return m ? { de: +m[1] * 60 + +m[2], ate: +m[3] * 60 + +m[4], deTxt: `${m[1].padStart(2, '0')}:${m[2]}` } : null;
  }
  function horarioDoDia(d) {
    const h = (global.CONFIG && global.CONFIG.business && global.CONFIG.business.hours) || {};
    return faixa(d.getDay() === 0 ? h.sun : h.mon_sat);
  }
  function estadoLoja(agora = new Date()) {
    const hoje = horarioDoDia(agora);
    const min = agora.getHours() * 60 + agora.getMinutes();
    if (hoje && min >= hoje.de && min < hoje.ate) return { aberto: true, texto: 'Aberto agora' };
    if (hoje && min < hoje.de) return { aberto: false, texto: `Abre às ${hoje.deTxt}` };
    for (let i = 1; i < 8; i++) {
      const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i);
      const f = horarioDoDia(d);
      if (f) return { aberto: false, texto: `Abre ${i === 1 ? 'amanhã' : DIAS[d.getDay()]} às ${f.deTxt}` };
    }
    return { aberto: false, texto: 'Fechado' };
  }
  function rotuloHorario() {
    const h = (global.CONFIG && global.CONFIG.business && global.CONFIG.business.hours) || {};
    const dom = (!h.sun || /fechad/i.test(h.sun)) ? 'domingo fechado' : `dom ${h.sun}`;
    return `Seg a sáb, ${String(h.mon_sat || '').replace('–', ' às ')} • ${dom}`;
  }
  function urlRota() {
    const c = global.CONFIG && global.CONFIG.business && global.CONFIG.business.shopCoords;
    return (c && typeof c.lat === 'number') ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : '#';
  }
  function linkZap(texto) {
    const n = (global.CONFIG && global.CONFIG.business && global.CONFIG.business.phones && global.CONFIG.business.phones.whatsappE164) || '';
    return `https://wa.me/${n}?text=${encodeURIComponent(texto || '')}`;
  }

  /* Arquivo .ics para "Salvar na minha agenda" (compromisso ativo) */
  function baixarIcs({ dia, hora, titulo, descricao, minutos = 120 }) {
    const d = lerYmd(dia); if (!d) return;
    const [h, m] = String(hora || '14:00').split(':').map(Number);
    const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
    const fim = new Date(ini.getTime() + minutos * 60000);
    const f = (x) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}T${String(x.getHours()).padStart(2, '0')}${String(x.getMinutes()).padStart(2, '0')}00`;
    const limpa = (s) => String(s || '').replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
    const end = (global.CONFIG && global.CONFIG.business && global.CONFIG.business.addressLine) || '';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Focinhos Amados//Agendamento//PT', 'BEGIN:VEVENT',
      `UID:${Date.now()}@focinhosamados.com.br`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(ini)}`, `DTEND:${f(fim)}`,
      `SUMMARY:${limpa(titulo)}`, `DESCRIPTION:${limpa(descricao)}`, `LOCATION:${limpa(end)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:Banho no Focinhos Amados', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = 'banho-focinhos-amados.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------------- Instalação do app ---------------- */
  let promptGuardado = null;
  global.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptGuardado = e; });
  global.addEventListener('appinstalled', () => { promptGuardado = null; fecharFolha(); });
  const instalado = () => (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function fecharFolha() {
    document.querySelectorAll('.folha, .folha-fundo').forEach((el) => el.remove());
    if (fecharFolha.voltarPara) { try { fecharFolha.voltarPara.focus(); } catch (_) { /* ok */ } }
  }
  function oferecerInstalacao({ nomePet = '', forcar = false } = {}) {
    if (instalado()) return false;
    const dispensado = ler(CHAVE_INSTALAR, 0);
    if (!forcar && dispensado && Date.now() - dispensado < 14 * 864e5) return false;
    if (!promptGuardado && !ehIOS() && !forcar) return false;

    fecharFolha.voltarPara = document.activeElement;
    const fundo = document.createElement('div'); fundo.className = 'folha-fundo';
    const folha = document.createElement('div'); folha.className = 'folha';
    folha.setAttribute('role', 'dialog'); folha.setAttribute('aria-modal', 'true'); folha.setAttribute('aria-labelledby', 'folha-titulo');
    const quem = nomePet ? esc(nomePet) : 'seu pet';
    const comoIOS = `<p class="pequeno muted" style="margin-bottom:14px">No iPhone: toque em <span class="passo-ios">Compartilhar ⬆︎</span> e depois em <span class="passo-ios">Adicionar à Tela de Início</span>.</p>`;
    folha.innerHTML = `
      <div class="palco" aria-hidden="true"><div class="objeto icone-app"><img src="assets/img/pwa-192.png" alt=""></div></div>
      <h2 id="folha-titulo">Leve a Focinhos Amados no seu celular</h2>
      <ul>
        <li>Agendar ${quem} de novo em 2 toques</li>
        <li>Seus horários sempre à mão</li>
        <li>Primeiro a saber do programa de fidelidade com prêmios</li>
      </ul>
      ${promptGuardado ? '' : (ehIOS() ? comoIOS : '<p class="pequeno muted" style="margin-bottom:14px">No menu do navegador, escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>')}
      <div style="display:grid;gap:6px">
        ${promptGuardado ? '<button type="button" class="btn btn-principal btn-largo btn-gigante" data-acao="instalar">Instalar o app grátis</button>' : '<button type="button" class="btn btn-principal btn-largo" data-acao="ok">Entendi</button>'}
        <button type="button" class="btn-texto" data-acao="depois">Agora não</button>
      </div>`;
    document.body.append(fundo, folha);
    const sair = () => { gravar(CHAVE_INSTALAR, Date.now()); fecharFolha(); };
    fundo.addEventListener('click', sair);
    folha.addEventListener('keydown', (e) => { if (e.key === 'Escape') sair(); });
    folha.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-acao]'); if (!b) return;
      if (b.dataset.acao === 'instalar' && promptGuardado) {
        promptGuardado.prompt();
        try { await promptGuardado.userChoice; } catch (_) { /* ok */ }
        promptGuardado = null; fecharFolha();
      } else { sair(); }
    });
    const primeiro = folha.querySelector('button'); if (primeiro) primeiro.focus();
    return true;
  }
  const podeInstalar = () => !instalado() && (!!promptGuardado || ehIOS());

  /* ---------------- Página ---------------- */
  function marcarAba() {
    const pagina = document.body.dataset.page;
    document.querySelectorAll('.abas a[data-aba]').forEach((a) => {
      if (a.dataset.aba === pagina) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function status() {
    const el = byId('status'); if (!el) return;
    const pinta = () => {
      const s = estadoLoja();
      el.classList.toggle('aberto', s.aberto);
      el.querySelector('span').textContent = s.texto;
    };
    pinta(); setInterval(pinta, 60000);
  }
  function preencherBinds() {
    const C = global.CONFIG || {}; const b = C.business || {};
    const map = {
      endereco: b.addressLine, cidade: b.city, horario: rotuloHorario(), zapHumano: b.phones && b.phones.whatsappHuman,
      fixo: b.phones && b.phones.landline, versao: C.appVersion,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => { const v = map[el.dataset.bind]; if (v) el.textContent = v; });
    document.querySelectorAll('[data-rota]').forEach((a) => { a.href = urlRota(); });
    document.querySelectorAll('[data-tel]').forEach((a) => { const t = (b.phones && b.phones.landline || '').replace(/[^\d+]/g, ''); if (t) a.href = `tel:${t}`; });
    document.querySelectorAll('[data-zap]').forEach((a) => { a.href = linkZap('Olá! Vim pelo site da Focinhos Amados 🐾'); });
  }
  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    const v = (global.CONFIG && global.CONFIG.appVersion) || '';
    global.addEventListener('load', () => {
      navigator.serviceWorker.register(`sw.js?v=${encodeURIComponent(v.replace(/^v/, ''))}`).catch(() => { /* sem SW */ });
    });
  }

  /* Bolhas subindo (decorativas) */
  function bolhas(container, n = 7) {
    if (!container || reduzMovimento()) return;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'bolha-solta';
      const tam = 14 + Math.round(Math.random() * 26);
      b.style.cssText = `left:${8 + Math.random() * 84}%;bottom:-10px;width:${tam}px;height:${tam}px;--dur:${6 + Math.random() * 5}s;--atraso:${-Math.random() * 8}s;--deriva:${Math.round(Math.random() * 40 - 20)}px`;
      b.innerHTML = global.FA3D ? global.FA3D.desenho('bolha') : '';
      container.appendChild(b);
    }
  }
  function confete(n = 26) {
    if (reduzMovimento()) return;
    const c = document.createElement('div'); c.className = 'confete'; c.setAttribute('aria-hidden', 'true');
    const tipos = ['bolha', 'bolha', 'bolha', 'osso', 'pata'];
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div'); b.className = 'bolha-solta';
      const tam = 16 + Math.round(Math.random() * 30);
      b.style.cssText = `left:${Math.random() * 100}%;bottom:-40px;width:${tam}px;height:${tam}px;--dur:${2.4 + Math.random() * 2}s;--atraso:${Math.random() * .8}s;--deriva:${Math.round(Math.random() * 80 - 40)}px;animation-iteration-count:1`;
      b.innerHTML = global.FA3D.desenho(tipos[i % tipos.length]);
      c.appendChild(b);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5200);
  }

  async function iniciar() {
    await config();
    marcarAba(); status(); preencherBinds(); registrarSW();
    document.querySelectorAll('[data-3d]').forEach((el) => {
      const [nome, ...args] = el.dataset['3d'].split(':');
      el.innerHTML = global.FA3D ? global.FA3D.desenho(nome, ...args.map((a) => (a === 'true' ? true : a))) : '';
    });
    global.FA.pronto = true;
    document.dispatchEvent(new CustomEvent('fa:pronto'));
  }

  global.FA = {
    $, byId, esc, vibrar, reduzMovimento, config, perfil, agenda, ymd, lerYmd, dataLonga, DIAS, DIAS_CURTOS, MESES,
    estadoLoja, rotuloHorario, urlRota, linkZap, baixarIcs, oferecerInstalacao, podeInstalar, instalado, bolhas, confete,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
