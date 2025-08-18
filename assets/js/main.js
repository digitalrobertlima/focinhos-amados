/* Focinhos Amados — main.js (vanilla, mobile-first)
   - Navegação mobile (drawer)
   - Bind de CONFIG (cidade, horários, rotas)
   - Geolocalização (watchPosition c/ melhor precisão)
   - Util: waLink(), interpolate()
   - Fluxos: agendar, delivery, taxi (resumo + WhatsApp)
   - SW register */
(function(){
  const $ = (s,sc=document)=>sc.querySelector(s);
  const $$ = (s,sc=document)=>Array.from(sc.querySelectorAll(s));
  const on = (el,ev,fn)=>el&&el.addEventListener(ev,fn);
  const byId = (id)=>document.getElementById(id);
  const now = ()=>new Date();
  const toISODate = (d)=>d instanceof Date?d.toISOString():new Date(d).toISOString();
  const fmtDate = (v)=>{
    try{
      const d = new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('pt-BR');
    }catch{ return v||'' }
  };
  const fmtDT = (v)=>{
    try{
      const d = new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('pt-BR');
    }catch{ return v||'' }
  };
  const onlyDigits = s=>String(s||'').replace(/\D+/g,'');
  const isTelBR = s=>{ const d=onlyDigits(s); return d.length===10 || d.length===11; };
  const fmtAcc = (n)=> typeof n==='number' ? Math.round(n) : '';
  const text = (el, v)=>{ if(el) el.textContent = v; };

  // ===== Cart storage & operations =====
  function getCartFromStorage(){
    try{ const raw = localStorage.getItem('focinhos:cart'); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }
  function saveCartToStorage(cart){
    try{ localStorage.setItem('focinhos:cart', JSON.stringify(cart||[])); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('focinhos:cart:changed', { detail:{ cart } })); }catch(e){}
  }
  function updateCartQty(idx, newQty){
    const cart = getCartFromStorage();
    if(cart[idx]){ cart[idx].qtd = Math.max(1, newQty||1); saveCartToStorage(cart); }
  }
  function removeCartItem(idx){
    const cart = getCartFromStorage();
    if(idx >= 0 && idx < cart.length){ cart.splice(idx,1); saveCartToStorage(cart); }
  }
  // Calculate cart totals (items count and optional prices)
  function cartTotals(cart){
    if(!cart || !Array.isArray(cart)) return { count: 0 };
    return { count: cart.reduce((s,it)=> s + (Number(it.qtd||1)||1), 0) };
  }
  function updateCartBadges(){
    const els = $$('[data-cart-count]');
    const cart = getCartFromStorage();
    const totals = cartTotals(cart);
    els.forEach(el=>{
      if(totals.count > 0) el.setAttribute('data-cart-count', String(totals.count));
      else el.removeAttribute('data-cart-count');
    });
  }
  window.addEventListener('focinhos:cart:changed', updateCartBadges);
  // Run once at startup to initialize badges
  try{ updateCartBadges(); }catch(e){}
  function waLink(text){
    const waNum = window.CONFIG?.business?.phones?.whatsappE164 || '';
    return `https://wa.me/${waNum}?text=${encodeURIComponent(text||'')}`;
  }

  // Interpolação simples {chave}
  function interpolate(template, map){
    return template.replace(/\{(.*?)\}/g, (_,k)=> String(map[k] ?? '').trim());
  }

  // Remove linhas vazias e seções órfãs para evitar mensagens com blocos vazios
  function tidyMessage(raw){
    if(!raw) return '';
    // split lines, trim, remove lines that are only separators or '-' or empty
    const lines = raw.split(/\r?\n/).map(l=> l.replace(/\s+$/,'')).map(l=> l.replace(/^\s+/,'')).filter(l=>{
      if(!l) return false; // drop empty
      // drop common placeholder markers or lines that are just punctuation
      if(/^[-•\*\s]+$/.test(l)) return false;
      // drop lines that are '—' or just a dash
      if(/^[-–—]{1,3}$/.test(l)) return false;
      return true;
    });
    // collapse multiple blank-ish separators into a single blank line between sections
    // join with single newline
    return lines.join('\n').replace(/\n{2,}/g,'\n\n').trim();
  }

  // ===== Utilities: clipboard copy + attach copy button =====
  function copyToClipboard(text){
    if(!text) return Promise.resolve();
    if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(String(text));
    return new Promise((resolve, reject)=>{
      try{
        const ta = document.createElement('textarea'); ta.value = String(text); ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select();
        const ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        if(ok) return resolve();
        return reject(new Error('copy-failed'));
      }catch(err){ try{ document.body.removeChild(ta); }catch(e){}; reject(err); }
    });
  }

  function attachCopyButton(parentEl, id, textProvider, label = 'Copiar mensagem'){
    try{
      if(!parentEl) return null;
      if(byId(id)) return byId(id);
  const btn = document.createElement('button'); btn.type='button'; btn.id = id; btn.className = 'btn btn--ghost'; btn.textContent = label;
  btn.setAttribute('aria-label', label);
  btn.title = label;
      // insert after the primary action if present
      const ref = parentEl.querySelector('button, a');
      if(ref && ref.parentNode === parentEl) parentEl.insertBefore(btn, ref.nextSibling); else parentEl.appendChild(btn);
      btn.addEventListener('click', async ()=>{
        try{
          const txt = (typeof textProvider === 'function') ? textProvider() : textProvider;
          await copyToClipboard(txt);
          const prev = btn.textContent; btn.textContent = 'Copiado'; setTimeout(()=> btn.textContent = prev, 1800);
        }catch(e){ console.warn('copy failed', e); const prev = btn.textContent; btn.textContent = 'Erro'; setTimeout(()=> btn.textContent = prev, 1800); }
      });
      return btn;
    }catch(e){ console.warn('attachCopyButton failed', e); return null; }
  }

  // ===== Reverse geocoding (resolve coords -> human address) =====
  // Uses OpenStreetMap Nominatim public endpoint with a small local cache to avoid repeated requests.
  function addrCacheKey(lat, lng){ return `focinhos:addr:${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`; }
  function getAddrFromCache(lat, lng){ try{ const raw = localStorage.getItem(addrCacheKey(lat,lng)); return raw? JSON.parse(raw): null; }catch(e){ return null; } }
  function saveAddrToCache(lat, lng, addrObj){ try{ localStorage.setItem(addrCacheKey(lat,lng), JSON.stringify(addrObj)); }catch(e){ } }
  function reverseGeocode(lat, lng, opts={timeout:8000}){
    return new Promise((resolve)=>{
      if(lat==null || lng==null) return resolve(null);
      try{
        const cached = getAddrFromCache(lat,lng);
        if(cached){ console.debug('[geo-addr] cache hit', cached); return resolve(cached); }
      }catch(e){}
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
      let done = false;
      const timer = setTimeout(()=>{ if(done) return; done = true; console.warn('[geo-addr] reverseGeocode timeout for', lat, lng); resolve(null); }, opts.timeout);
      fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } }).then(r=> r.ok? r.json() : null).then(json=>{
        if(done) return; done = true; clearTimeout(timer);
        if(!json) return resolve(null);
        // Build a readable address line
        const display = json.display_name || null;
        const addr = { display, details: json.address || null, provider: 'nominatim', fetchedAt: Date.now() };
        try{ saveAddrToCache(lat,lng, addr); }catch(e){}
        console.debug('[geo-addr] resolved', addr);
        resolve(addr);
      }).catch(err=>{ if(done) return; done = true; clearTimeout(timer); console.warn('[geo-addr] fetch failed', err); resolve(null); });
    });
  }

  // ===== Persistência de formulários (localStorage) =====
  function debounce(fn, wait=300){ let t; return function(...a){ clearTimeout(t); t = setTimeout(()=> fn.apply(this,a), wait); }; }
  const storageKey = (page)=> `focinhos:${page}`;

  function saveFormState(page){
    try{
      const scope = document.querySelector('body[data-page="'+page+'"]');
      if(!scope) return;
      const data = {};
      const els = scope.querySelectorAll('input,select,textarea');
      els.forEach(el=>{
        const id = el.id ? `#${el.id}` : (el.name ? `name:${el.name}` : (el.dataset.role? `role:${el.dataset.role}` : null));
        if(!id) return;
        if(el.type === 'checkbox' || el.type === 'radio') data[id] = !!el.checked; else data[id] = el.value || '';
      });
      localStorage.setItem(storageKey(page), JSON.stringify(data));
    }catch(e){ console.warn('saveFormState failed', e); }
  }

  function restoreFormState(page){
    try{
      const raw = localStorage.getItem(storageKey(page));
      if(!raw) return;
      const data = JSON.parse(raw);
      const scope = document.querySelector('body[data-page="'+page+'"]');
      if(!scope) return;
      Object.keys(data).forEach(key=>{
        let el = null;
        if(key.startsWith('#')) el = scope.querySelector(key);
        else if(key.startsWith('name:')) el = scope.querySelector(`[name="${key.slice(5)}"]`);
        else if(key.startsWith('role:')) el = scope.querySelector(`[data-role="${key.slice(5)}"]`);
        if(!el) return;
        if(el.type === 'checkbox' || el.type === 'radio') el.checked = !!data[key]; else el.value = data[key];
        // dispatch events so other listeners react (e.g. UI toggles)
        try{ el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true })); }catch(e){}
      });
    }catch(e){ console.warn('restoreFormState failed', e); }
  }

  function clearFormState(page){
    try{
      const scope = document.querySelector('body[data-page="'+page+'"]');
      if(!scope) return;
      const els = scope.querySelectorAll('input,select,textarea');
      els.forEach(el=>{
        if(el.type === 'checkbox' || el.type === 'radio') el.checked = false; else el.value = '';
        try{ el.dispatchEvent(new Event('input', { bubbles:true })); el.dispatchEvent(new Event('change', { bubbles:true })); }catch(e){}
      });
      localStorage.removeItem(storageKey(page));
    }catch(e){ console.warn('clearFormState failed', e); }
  }

  function initFormPersistence(){
    const page = document.body.dataset.page;
    if(!page) return;
    const scope = document.querySelector('body[data-page="'+page+'"]');
    if(!scope) return;
    // restore first so UI reflects saved values before other inits run
    restoreFormState(page);
    const els = Array.from(scope.querySelectorAll('input,select,textarea'));
    if(els.length===0) return;
    const saver = debounce(()=> saveFormState(page), 300);
    els.forEach(el=>{
      el.addEventListener('input', saver, { passive:true });
      el.addEventListener('change', saver, { passive:true });
    });
    // add a small clear button in the form actions area if present
    const actions = scope.querySelector('.actions');
    if(actions){
      const id = `btn-clear-data-${page}`;
      if(!byId(id)){
        const b = document.createElement('button');
        b.type = 'button'; b.id = id; b.className = 'btn btn--ghost'; b.textContent = 'Limpar dados salvos';
        b.addEventListener('click', ()=>{
          if(!confirm('Remover dados salvos desta página?')) return;
          clearFormState(page);
        });
        actions.appendChild(b);
      }
    }
  }

  // ===== Init cart panel (delivery) =====
  function initCartPanel(){
  // only enable cart UI on delivery page
  if(document.body.dataset.page !== 'delivery') return;
  let panel = null;

    function buildTeamMessage(){
      const tpl = window.CONFIG?.waTemplates?.teamReply || '';
      const cart = getCartFromStorage();
      const items = cart.map(it=> `${it.qtd}x ${it.nome}${it.variacao? ' '+it.variacao : ''}`).join('\n');
      const nome = (byId('recebedor')?.value|| byId('tutorNome')?.value || '').trim();
      const telefone = (byId('tel')?.value|| byId('tutorTelefone')?.value || '').trim();
      const observacoes = (byId('obs')?.value || byId('observacoes')?.value || '').trim();
      const map = { itensLista: items, nome, telefone, observacoes };
      return tidyMessage(interpolate(tpl, map));
    }

    function createPanel(){
      if(panel) return panel;
      panel = document.createElement('aside');
      panel.id = '__cart-panel'; panel.className = 'cart-panel';
      panel.setAttribute('role','region'); panel.setAttribute('aria-label','Carrinho');
      panel.innerHTML = `
        <div class="cart-panel__head">
          <strong>Seu carrinho</strong>
          <div><button id="__cart-panel-close" class="btn btn--ghost" aria-label="Fechar carrinho">Fechar</button></div>
        </div>
        <div class="cart-panel__body" id="__cart-panel-body"></div>
        <div class="cart-panel__footer">
          <div class="cart-note">Detalhes e confirmações serão combinados via WhatsApp.</div>
          <div>
            <button id="__cart-panel-copy" class="btn btn--ghost">Copiar modelo</button>
            <button id="__cart-panel-open" class="btn btn--primary">Abrir no WhatsApp</button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      const closeBtn = byId('__cart-panel-close'); if(closeBtn) on(closeBtn,'click', ()=> panel.classList.remove('open'));
      const copyBtn = byId('__cart-panel-copy'); const openBtn = byId('__cart-panel-open');
      if(copyBtn) on(copyBtn,'click', async ()=>{ try{ await copyToClipboard(buildTeamMessage()); copyBtn.textContent='Copiado'; setTimeout(()=> copyBtn.textContent='Copiar modelo',1800); }catch(e){ copyBtn.textContent='Erro'; setTimeout(()=> copyBtn.textContent='Copiar modelo',1800); } });
      if(openBtn) on(openBtn,'click', ()=>{ try{ const txt = buildTeamMessage(); window.open(waLink(txt), '_blank'); }catch(e){} });
      return panel;
    }

    function renderPanel(){
      const p = createPanel();
      const body = byId('__cart-panel-body');
      const cart = getCartFromStorage();
      if(!body) return;
      if(!cart || cart.length===0){ body.innerHTML = '<p>Seu carrinho está vazio.</p>'; return; }
      body.innerHTML = cart.map((it,idx)=> `
        <div class="cart-item" data-idx="${idx}">
          <div class="cart-item__main"><strong>${it.nome}</strong>${it.variacao? ' — '+it.variacao : ''}</div>
          <div class="cart-item__controls">
            <button class="item__btn qty-dec" data-idx="${idx}" aria-label="Diminuir quantidade">−</button>
            <input class="item__qty_input" data-idx="${idx}" type="number" min="1" value="${it.qtd}" aria-label="Quantidade" />
            <button class="item__btn qty-inc" data-idx="${idx}" aria-label="Aumentar quantidade">＋</button>
            <button class="item__btn item__remove" data-idx="${idx}" aria-label="Remover item">remover</button>
          </div>
        </div>
      `).join('');
      body.querySelectorAll('.qty-dec').forEach(b=> on(b,'click', ()=>{ const i = +b.dataset.idx; const c = getCartFromStorage(); const newQ = Math.max(1, (c[i].qtd||1)-1); updateCartQty(i,newQ); renderPanel(); }));
      body.querySelectorAll('.qty-inc').forEach(b=> on(b,'click', ()=>{ const i = +b.dataset.idx; const c = getCartFromStorage(); const newQ = (c[i].qtd||1)+1; updateCartQty(i,newQ); renderPanel(); }));
      body.querySelectorAll('.item__qty_input').forEach(inp=> on(inp,'change', ()=>{ const i = +inp.dataset.idx; const v = Math.max(1, Number(inp.value)||1); updateCartQty(i, v); renderPanel(); }));
      body.querySelectorAll('.item__remove').forEach(b=> on(b,'click', ()=>{ const i = +b.dataset.idx; removeCartItem(i); renderPanel(); }));
    }

    function openPanel(){ const p = createPanel(); renderPanel(); p.classList.add('open'); try{ p.focus(); }catch(e){} }

    const top = byId('topbar-cart'); if(top) on(top,'click', (e)=>{ e.preventDefault(); openPanel(); });
    const drawerCart = byId('drawer-cart'); if(drawerCart) on(drawerCart,'click', (e)=>{ e.preventDefault(); openPanel(); });

    function updateTopbarCount(){ try{ const b = byId('topbar-cart'); if(!b) return; const cart = getCartFromStorage(); const total = cart.reduce((s,it)=> s + (Number(it.qtd||1)||1), 0); if(total>0){ b.setAttribute('data-count', String(total)); } else { b.removeAttribute('data-count'); } }catch(e){}
    }
    updateTopbarCount();
  window.addEventListener('focinhos:cart:changed', ()=>{ updateTopbarCount(); renderPanel(); });
  }

  // ===== Init navigation (drawer) =====
  function initNav(){
    const btn = document.querySelector('.nav__btn');
    const drawer = byId('drawer');
    if(!btn || !drawer) return;
    const close = ()=>{ 
      drawer.classList.remove('open'); 
      btn.setAttribute('aria-expanded','false'); 
      drawer.setAttribute('aria-hidden','true'); 
      try{ btn.blur(); }catch(e){} 
    };
    const open = ()=>{ 
      drawer.classList.add('open');
      btn.setAttribute('aria-expanded','true'); 
      drawer.setAttribute('aria-hidden','false'); 
      try{ drawer.focus(); }catch(e){} 
    };
    on(btn,'click', ()=>{ 
      const isOpen = drawer.classList.contains('open');
      if(isOpen) close(); else open();
    });
    on(document,'keydown', (e)=>{ if(e.key==='Escape') close(); });
    $$('#drawer a').forEach(a=> on(a,'click', close));
    // Close on click outside
    document.addEventListener('click', (e)=>{
      if(!drawer.contains(e.target) && !btn.contains(e.target) && drawer.classList.contains('open')){
        close();
      }
    });
  }

  // ===== Bind de CONFIG em elementos =====
  function bindConfig(){
    const C = window.CONFIG;
    if(!C) return;
    $$('[data-bind="city"]').forEach(el=> text(el, C.business.city));
    $$('[data-bind="hoursLabel"]').forEach(el=> text(el, C.__format.hoursLabel()));
    const addr = C.business.addressLine || '';
    $$('[data-bind="address"]').forEach(el=> text(el, addr));
    $$('[data-bind="landline"]').forEach(el=> text(el, C.business.phones.landline || ''));
    $$('[data-bind="waHuman"]').forEach(el=> text(el, C.business.phones.whatsappHuman || ''));
    // Rotas
    const rurl = C.__format.routeUrl();
    ['route-link','route-link-foot','btn-rotas'].forEach(id=>{ const a=byId(id); if(a && rurl!=='#'){ a.href=rurl; } });
    // Preencher datalist de produtos (delivery)
    const dl = byId('lista-produtos');
    if(dl && Array.isArray(C.suggestions?.products)){
      dl.innerHTML = C.suggestions.products.map(p=>`<option value="${p}"></option>`).join('');
    }
    // Upsell services (agendar)
    const up = byId('upsell-services');
    if(up && Array.isArray(C.suggestions?.upsellServices)){
      up.innerHTML = C.suggestions.upsellServices.map(s=>
        `<label class="chip"><input type="checkbox" value="${s}"> <span>${s}</span></label>`
      ).join('');
    }
  }

  // ===== Geolocalização (watch melhor precisão) =====
  const Geo = (function(){
    const state = { watches:{}, best:{} };
    const cfg = window.CONFIG?.geoloc || { enabled:true, enableHighAccuracy:true, waitMs:30000, requiredPrecisionM:50 };
    function start(key, badge){
      if(!(navigator.geolocation && cfg.enabled)) return;
      // limpar watch antigo
      if(state.watches[key]){ navigator.geolocation.clearWatch(state.watches[key]); delete state.watches[key]; }
      state.best[key] = null;
      const opts = { enableHighAccuracy: !!cfg.enableHighAccuracy, maximumAge:0, timeout: cfg.waitMs };
      const startedAt = Date.now();
      const wid = navigator.geolocation.watchPosition(
        (pos)=>{
          const r = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            // will be populated asynchronously by reverseGeocode
            address: null
          };
          const best = state.best[key];
          if(!best || r.accuracy < best.accuracy){ state.best[key] = r; }
          const b = badge || byId(key.startsWith('origem')? 'geo-origem' : key.startsWith('destino')? 'geo-destino' : 'geo-badge');
          if(b){
            const when = new Date(state.best[key].timestamp).toLocaleTimeString('pt-BR');
            b.textContent = `~${fmtAcc(state.best[key].accuracy)}m @ ${when}`;
          }
          // If we don't have a resolved address yet, try to fetch one in background
          (async ()=>{
            try{
              const cur = state.best[key];
              if(cur && (!cur.address) && cur.lat!=null && cur.lng!=null){
                const addr = await reverseGeocode(cur.lat, cur.lng);
                if(addr){
                  state.best[key].address = addr;
                  // update UI badge to include a short form of the address if present
                  try{
                    if(b && addr.display){
                      const short = String(addr.display).split(',').slice(0,3).join(', ');
                      b.textContent = short + ` — ~${fmtAcc(cur.accuracy)}m`;
                    }
                  }catch(e){}
                  // if there is an input field for this key and it's empty, fill it to help the user
                  try{
                    const inpf = byId(key);
                    if(inpf && (inpf.value||'').trim() === '' && addr.display){ inpf.value = addr.display; inpf.dispatchEvent(new Event('input',{bubbles:true})); inpf.dispatchEvent(new Event('change',{bubbles:true})); }
                  }catch(e){ }
                  // notify listeners
                  try{ window.dispatchEvent(new CustomEvent('focinhos:geo:address:resolved', { detail: { key, address: addr } })); }catch(e){}
                }
              }
            }catch(e){ console.warn('[geo-addr] resolve background failed', e); }
          })();
          if(state.best[key].accuracy <= cfg.requiredPrecisionM){
            stop(key);
          }
        },
        (err)=>{
          const b = badge || byId('geo-badge');
          if(b){ b.textContent = '🔒 Permissão negada ou indisponível'; }
          stop(key);
        },
        opts
      );
      state.watches[key] = wid;
      // timeout para encerrar
      setTimeout(()=>{ stop(key); }, cfg.waitMs + 1000);
    }
    function stop(key){
      if(state.watches[key]){ navigator.geolocation.clearWatch(state.watches[key]); delete state.watches[key]; }
    }
    function get(key){ return state.best[key] || null; }
    return { start, stop, get };
  })();

  // ===== Validação básica =====
  function setErr(input, msg){
    if(!input) return;
    input.setAttribute('aria-invalid','true');
    const err = byId('err-' + input.id);
    if(err){ err.textContent = msg || ''; err.classList.add('help--error'); err.hidden = !msg; }
  }
  function clearErr(input){
    if(!input) return;
    input.removeAttribute('aria-invalid');
    const err = byId('err-' + input.id);
    if(err){ err.textContent = ''; err.hidden = true; err.classList.remove('help--error'); }
  }
  function required(input, msg){
    const v = (input.value||'').trim();
    if(!v){ setErr(input, msg); return false; } clearErr(input); return true;
  }

  // ====== Fluxo: AGENDAR ======
  function initAgendar(){
    if(document.body.dataset.page !== 'agendar') return;
    // Elementos estáticos
    const f = {
      tutorNome: byId('tutorNome'), tutorTelefone: byId('tutorTelefone'),
      srvBanho: byId('srv-banho'), srvTosa: byId('srv-tosa'), tosaTipo: byId('tosaTipo'),
      perfume: byId('perfume'), acessorio: byId('acessorio'), escovacao: byId('escovacao'),
      dataPreferida: byId('dataPreferida'), janela: byId('janela')
    };
    const btnGeo = byId('btn-use-geo');
    const badge = byId('geo-badge');
    const btnResumo = byId('btn-ver-resumo');
    const preResumo = byId('agendar-resumo');
    const btnWA = byId('btn-wa');
  const petsContainer = byId('pets');
    const tplPet = byId('tpl-pet');
    const btnAddPet = byId('btn-add-pet');
  console.debug('[agendar] init elements', { btnAddPet: !!btnAddPet, tplPet: !!tplPet, petsCount: (petsContainer? petsContainer.querySelectorAll('.pet').length:0) });
    const modalidadeEls = Array.from(document.querySelectorAll("input[name='modalidadeLocalizacao']"));
    const fieldOrigem = byId('field-origem');
    const fieldDestino = byId('field-destino');

  // Controle de pets: cria um array de pets com base no DOM; suportar múltiplos pets dinâmicos
  // Use a robust counter: start at current count so new pets get unique indexes
  let petIndexCounter = (petsContainer && petsContainer.querySelectorAll('.pet')?.length) || 0;
  console.debug('[agendar] petIndexCounter init', petIndexCounter);
    function readPetsFromDOM(){
      const pets = [];
      petsContainer.querySelectorAll('.pet').forEach((el, idx)=>{
        // Primeiro pet usa ids; outros usam data-role
        if(idx===0){
          pets.push({
            nome: (byId('petNome')?.value||'').trim(),
            especie: (byId('especie')?.value||'').trim(),
            porte: (byId('porte')?.value||'').trim(),
            pelagem: (byId('pelagem')?.value||'').trim() || '-',
            temperamento: (byId('temperamento')?.value||'').trim() || '-',
            observacoes: (byId('observacoes')?.value||'').trim() || '-'
          });
        } else {
          const get = (sel)=> el.querySelector(sel)?.value || '';
          pets.push({
            nome: (el.querySelector('[data-role="petNome"]')?.value||'').trim(),
            especie: (el.querySelector('[data-role="especie"]')?.value||'').trim(),
            porte: (el.querySelector('[data-role="porte"]')?.value||'').trim(),
            pelagem: (el.querySelector('[data-role="pelagem"]')?.value||'').trim() || '-',
            temperamento: (el.querySelector('[data-role="temperamento"]')?.value||'').trim() || '-',
            observacoes: (el.querySelector('[data-role="observacoes"]')?.value||'').trim() || '-'
          });
        }
      });
      return pets;
    }

    // Adicionar novo pet
    function addPet(){
      try{
        console.debug('[agendar] addPet clicked', {
          petIndexCounterBefore: petIndexCounter,
          focused: (document.activeElement && (document.activeElement.id || document.activeElement.tagName)) || null,
          firstPet: { nome: byId('petNome')?.value, especie: byId('especie')?.value, porte: byId('porte')?.value }
        });
        if(!tplPet){ console.warn('tpl-pet not found'); return; }
        if(!petsContainer){ console.warn('pets container not found'); return; }
        const idx = petIndexCounter++;
        const html = tplPet.innerHTML.replace(/__IDX__/g, String(idx));
        const frag = document.createRange().createContextualFragment(html);
        petsContainer.appendChild(frag);
        // scroll to new pet
        const newPet = petsContainer.querySelector(`.pet[data-pet-index="${idx}"]`);
        if(newPet) newPet.scrollIntoView({behavior:'smooth', block:'center'});
        console.debug('[agendar] addPet -> added index', idx, 'petsNow', petsContainer.querySelectorAll('.pet').length);
      }catch(err){ console.error('[agendar] addPet error', err); }
    }
  // Expose for tests / external triggers
  try{ window.addPet = addPet; }catch(e){}
    // Improved button handler that works reliably
    if(btnAddPet){
      function handleAddPet(e){
        e.preventDefault(); // Prevent double triggers
        try{
          addPet();
          // Give feedback
          btnAddPet.classList.add('clicked');
          setTimeout(()=> btnAddPet.classList.remove('clicked'), 200);
        }catch(err){ 
          console.error('[agendar] add pet click failed', err);
        }
      }
      btnAddPet.addEventListener('click', handleAddPet);
    } else { 
      console.warn('[agendar] btn-add-pet not found'); 
    }

  // Cart upsell removed: 'Ver carrinho' button disabled to restore original menu layout.
  // If you later want to re-enable a cart upsell, reintroduce a lightweight control here.

    on(btnGeo,'click', ()=> Geo.start('default', badge));
    // Geo buttons for origem/destino
    $$('button[data-geo]').forEach(btn=>{
      on(btn,'click', ()=>{
        const key = btn.getAttribute('data-geo');
        const badgeEl = byId('geo-'+key) || badge;
        Geo.start(key, badgeEl);
      });
    });

    // Toggle localizacao fields
    function updateLocalizacaoFields(){
      const sel = document.querySelector("input[name='modalidadeLocalizacao']:checked").value;
      fieldOrigem.classList.toggle('hide', !(sel==='taxi-both' || sel==='taxi-pickup'));
      fieldDestino.classList.toggle('hide', !(sel==='taxi-both' || sel==='taxi-dropoff'));
    }
    modalidadeEls.forEach(r=> on(r,'change', updateLocalizacaoFields));
    updateLocalizacaoFields();

  function getServicosLista(){
      const list = [];
      if(f.srvBanho.checked) list.push('Banho');
      if(f.srvTosa.checked){ list.push('Tosa' + (f.tosaTipo.value? ` (${f.tosaTipo.value})` : '')); }
      // upsell chips
      $$('#upsell-services input[type="checkbox"]').forEach(ch=>{ if(ch.checked) list.push(ch.value); });
      if(f.escovacao.checked) list.push('Escovação (espuma)');
      return list.join(', ');
    }

    function resumoTexto(){
    console.debug('[agendar] resumoTexto start', { petIndexCounter, petsCount: (petsContainer? petsContainer.querySelectorAll('.pet').length:0) });
      const geoDefault = Geo.get('default');
      const pets = readPetsFromDOM();
      // formatar lista de pets
      const petsTxt = pets.map((p, i)=> `Pet ${i+1}: ${p.nome || '-'} • Espécie: ${p.especie || '-'} • Porte: ${p.porte || '-'} • Pelagem: ${p.pelagem || '-'} • Temperamento: ${p.temperamento || '-'} • Observações: ${p.observacoes || '-'} `).join('\n');
      // Localização
      const modalidade = (document.querySelector("input[name='modalidadeLocalizacao']:checked")||{}).value || 'loja';
      const geoO = Geo.get('origem');
      const geoD = Geo.get('destino');
  const origemInputAddr = (byId('origem')?.value||'').trim() || '';
  const destinoInputAddr = (byId('destino')?.value||'').trim() || '';
  const origemAddr = (geoO && geoO.address && geoO.address.display) || (Geo.get('default') && Geo.get('default').address && Geo.get('default').address.display) || origemInputAddr || '';
  const destinoAddr = (geoD && geoD.address && geoD.address.display) || (Geo.get('default') && Geo.get('default').address && Geo.get('default').address.display) || destinoInputAddr || '';

      // Use empty strings as fallback so tidyMessage can remove empty sections
      const map = {
        petsLista: petsTxt,
        servicosLista: getServicosLista() || '',
        perfume: f.perfume.value || '',
        acessorio: f.acessorio.value || '',
        escovacao: f.escovacao.checked ? 'Sim' : '',
        dataPreferida: f.dataPreferida.value ? fmtDate(f.dataPreferida.value) : '',
        janela: f.janela.value || '',
        tutorNome: f.tutorNome.value.trim() || '',
        tutorTelefone: f.tutorTelefone.value.trim() || '',
        modalidade: modalidade || '',
        enderecoLoja: window.CONFIG?.business?.addressLine || '',
  origemEndereco: origemAddr || '',
  destinoEndereco: destinoAddr || '',
  origemLat: geoO? geoO.lat.toFixed(6) : (geoDefault? geoDefault.lat.toFixed(6) : ''),
  origemLng: geoO? geoO.lng.toFixed(6) : (geoDefault? geoDefault.lng.toFixed(6) : ''),
  destinoLat: geoD? geoD.lat.toFixed(6) : (geoDefault? geoDefault.lat.toFixed(6) : ''),
  destinoLng: geoD? geoD.lng.toFixed(6) : (geoDefault? geoDefault.lng.toFixed(6) : ''),
        origemAccuracy: geoO? fmtAcc(geoO.accuracy) : (geoDefault? fmtAcc(geoDefault.accuracy) : ''),
        destinoAccuracy: geoD? fmtAcc(geoD.accuracy) : (geoDefault? fmtAcc(geoDefault.accuracy) : ''),
        origemTimestamp: geoO? fmtDT(geoO.timestamp) : (geoDefault? fmtDT(geoDefault.timestamp) : ''),
        destinoTimestamp: geoD? fmtDT(geoD.timestamp) : (geoDefault? fmtDT(geoDefault.timestamp) : ''),
        observacoes: pets.map(p=>p.observacoes).filter(Boolean).join(' \n') || ''
      };
      const tpl = window.CONFIG.waTemplates.agendar;
  console.debug('[agendar] resumoTexto result preview', { petsLista: map.petsLista && map.petsLista.slice(0,80) });
      const raw = interpolate(tpl, map);
      return tidyMessage(raw);
    }

    // When a reverse-geocode result is available, suggest confirmation and show a
    // house-number input so the user can verify the detected street and add the
    // residence number.
    window.addEventListener('focinhos:geo:address:resolved', (ev)=>{
      try{
        const key = ev?.detail?.key || 'default';
        const addr = ev?.detail?.address?.display || '';
        if(!addr) return;
        // Map key to a likely input id on Agendar form
        const inputId = (key === 'default') ? 'origem' : key;
        const inp = byId(inputId);
        if(!inp) return;
        // Insert a lightweight confirmation area if not present
        const cid = `__geo-confirm-${inputId}`;
        if(!byId(cid)){
          const wrap = document.createElement('div'); wrap.id = cid; wrap.className = 'muted'; wrap.style.marginTop = '6px';
          wrap.innerHTML = `<div>Detectamos esta rua: <strong>${String(addr).split(',').slice(0,3).join(', ')}</strong></div>
            <div style="margin-top:6px"><button type="button" id="${cid}-confirm" class="btn btn--ghost">Confirmar rua</button> <button type="button" id="${cid}-edit" class="btn btn--ghost">Editar</button></div>`;
          inp.parentNode.insertBefore(wrap, inp.nextSibling);
          // handlers
          on(byId(`${cid}-confirm`),'click', ()=>{
            try{
              // mark input as confirmed (for later validation) and create number field
              inp.dataset.geoConfirmed = 'true';
              const numId = `${inputId}-numero`;
              if(!byId(numId)){
                const num = document.createElement('input'); num.id = numId; num.className='input'; num.placeholder='Nº'; num.style.marginTop='6px'; num.inputMode='numeric'; inp.parentNode.insertBefore(num, wrap.nextSibling);
              }
              // visually indicate confirmation
              wrap.innerHTML = `<div>Rua confirmada: <strong>${String(addr).split(',').slice(0,3).join(', ')}</strong></div>`;
            }catch(e){ console.warn('confirm geo addr', e); }
          });
          on(byId(`${cid}-edit`),'click', ()=>{ try{ inp.focus(); inp.select(); }catch(e){} });
        }
      }catch(e){ console.warn('geo confirm handler', e); }
    });

    function validar(){
  console.debug('[agendar] validar start', { petIndexCounter, petsCount: (petsContainer? petsContainer.querySelectorAll('.pet').length:0) });
      let ok = true;
      const pets = readPetsFromDOM();
      if(pets.length===0){ const t = byId('agendar-err'); t.classList.add('error'); t.textContent='Adicione ao menos um pet.'; ok=false; }
      // verificar campos obrigatórios em cada pet
      pets.forEach((p,idx)=>{
        if(!p.nome){ ok=false; const el = petsContainer.querySelectorAll('.pet')[idx]; const err = el.querySelector('[data-role="err-petNome"]') || byId('err-petNome'); if(err){ err.textContent = 'Preencha o nome do pet.'; err.hidden = false; }}
        if(!p.especie){ ok=false; const el = petsContainer.querySelectorAll('.pet')[idx]; const err = el.querySelector('[data-role="err-especie"]') || byId('err-especie'); if(err){ err.textContent = 'Selecione a espécie.'; err.hidden = false; }}
        if(!p.porte){ ok=false; const el = petsContainer.querySelectorAll('.pet')[idx]; const err = el.querySelector('[data-role="err-porte"]') || byId('err-porte'); if(err){ err.textContent = 'Selecione o porte.'; err.hidden = false; }}
      });
      ok &= required(f.tutorNome,'Informe seu nome.');
      ok &= required(f.tutorTelefone,'Informe um telefone válido.');
      if(ok && !isTelBR(f.tutorTelefone.value)) { setErr(f.tutorTelefone,'Informe um telefone válido.'); ok=false; }
      ok &= required(f.dataPreferida,'Escolha a data.');
      ok &= required(f.janela,'Selecione a janela.');
      // Pelo menos 1 serviço
      if(!(f.srvBanho.checked || f.srvTosa.checked)){
        const toast = byId('agendar-err');
        toast.classList.add('error');
        toast.textContent = 'Selecione pelo menos um serviço (Banho e/ou Tosa).';
        ok = false;
      } else { byId('agendar-err').textContent=''; byId('agendar-err').classList.remove('error'); }

      // Validação por modalidade de localização
      const modalidade = (document.querySelector("input[name='modalidadeLocalizacao']:checked")||{}).value || 'loja';
      const geoO = Geo.get('origem');
      const geoD = Geo.get('destino');
      if(modalidade==='taxi-both'){
        // exigir origem e destino (ou geolocalização)
        if(!geoO && !(byId('origem')?.value||'').trim()){ setErr(byId('origem'),'Informe o endereço de origem ou compartilhe a localização.'); ok=false; } else clearErr(byId('origem'));
        if(!geoD && !(byId('destino')?.value||'').trim()){ setErr(byId('destino'),'Informe o endereço de destino ou compartilhe a localização.'); ok=false; } else clearErr(byId('destino'));
      } else if(modalidade==='taxi-pickup'){
        if(!geoO && !(byId('origem')?.value||'').trim()){ setErr(byId('origem'),'Informe o endereço de origem ou compartilhe a localização.'); ok=false; } else clearErr(byId('origem'));
      } else if(modalidade==='taxi-dropoff'){
        if(!geoD && !(byId('destino')?.value||'').trim()){ setErr(byId('destino'),'Informe o endereço de destino ou compartilhe a localização.'); ok=false; } else clearErr(byId('destino'));
      }
      // Se loja, não requer endereço
  console.debug('[agendar] validar result', ok);
      return !!ok;
    }

  on(btnResumo,'click', ()=>{ console.debug('[agendar] btn-ver-resumo clicked'); try{ if(preResumo) preResumo.textContent = resumoTexto(); }catch(e){ console.warn('resumoTexto failed', e); if(preResumo) preResumo.textContent = 'Resumo indisponível no momento.'; } });
    on(btnWA,'click', (e)=>{
      console.debug('[agendar] btn-wa clicked', { focused: document.activeElement && (document.activeElement.id || document.activeElement.tagName) });
      e.preventDefault();
      if(!validar()){
        console.debug('[agendar] btn-wa blocked by validar');
        // Mostrar feedback visível e focar o primeiro campo com erro
        try{
          const toast = byId('agendar-err');
          if(toast){ toast.classList.add('error'); if(!toast.textContent) toast.textContent = 'Preencha os campos obrigatórios.'; toast.scrollIntoView({behavior:'smooth', block:'center'}); }
          const firstInvalid = document.querySelector('[aria-invalid="true"]');
          if(firstInvalid && typeof firstInvalid.focus === 'function') firstInvalid.focus();
        }catch(fe){ console.warn('[agendar] feedback error', fe); }
        return;
      }
      const url = waLink(resumoTexto());
      try{ if(location && (location.hostname==='localhost' || location.hostname==='127.0.0.1')) console.debug('[dev] btn-wa open ->', url); }catch(e){}
      // abrir em nova aba de forma robusta
      window.open(url, '_blank');
      // manter href atualizado por acessibilidade
      try{ btnWA.href = url; }catch(e){}
    });

    // Add 'Adicionar delivery a este agendamento' button to summary actions
    if(summaryActions && !byId('btn-add-delivery')){
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'btn-add-delivery'; b.className = 'btn btn--primary'; b.textContent = '➕ Adicionar delivery a este agendamento';
      b.addEventListener('click', ()=>{
        try{
          const geo = Geo.get('default');
          const draft = {
            itensLista: getServicosLista() || '',
            recebedor: (f.tutorNome.value||'').trim(),
            tel: (f.tutorTelefone.value||'').trim(),
            endereco: (byId('origem')?.value||'').trim() || (geo && geo.address && geo.address.display) || '',
            numero: (byId('origem-numero')?.value||'').trim() || '',
            observacoes: (byId('observacoes')?.value||'').trim() || ''
          };
          localStorage.setItem('focinhos:delivery:draft', JSON.stringify(draft));
          // navigate to delivery to finish flow
          window.location.href = 'delivery.html';
        }catch(e){ console.warn('add delivery from agendar failed', e); }
      });
      summaryActions.appendChild(b);
    }

  try{ attachCopyButton(btnWA && btnWA.parentNode || document.body, 'btn-copy-msg-agendar', resumoTexto); }catch(e){ console.warn('attach copy (agendar) failed', e); }

    // Attach quick listeners to first pet fields to help debugging focus/changes
    ['petNome','especie','porte'].forEach(id=>{
      const el = byId(id);
      if(!el) return;
      on(el,'focus', ()=> console.debug('[agendar] field focus', id));
      on(el,'blur', ()=> console.debug('[agendar] field blur', id, 'value', el.value));
      on(el,'change', ()=> console.debug('[agendar] field change', id, 'value', el.value));
      // input event to catch autofill that may not fire change
      on(el,'input', ()=> console.debug('[agendar] field input', id, 'value', el.value));
    });

    // Observe attribute/value changes in the first pet block to detect autofill
    if(petsContainer){
      const firstPet = petsContainer.querySelector('.pet');
      if(firstPet){
        const mo = new MutationObserver((mut)=>{
          mut.forEach(m=>{
            if(m.type === 'attributes' && (m.attributeName === 'value' || m.attributeName === 'class')){
              console.debug('[agendar] mutation observed on first pet', m.target, m.attributeName);
            }
            if(m.type === 'childList'){
              console.debug('[agendar] childList mutation on first pet', m);
            }
          });
        });
        try{ mo.observe(firstPet, { attributes: true, childList: true, subtree: true }); }catch(e){ console.warn('mo observe failed', e); }
      }
    }
  }

  // ====== Fluxo: DELIVERY ======
  function initDelivery(){
    if(document.body.dataset.page !== 'delivery') return;
    const els = {
      produto: byId('produto'), variacao: byId('variacao'), qtd: byId('qtd'), carrinho: byId('carrinho'),
      add: byId('btn-add-prod'), btnGeo: byId('btn-use-geo'), badge: byId('geo-badge'),
      recebedor: byId('recebedor'), tel: byId('tel'), endereco: byId('endereco'), obs: byId('obs'),
      preResumo: byId('delivery-resumo'), btnResumo: byId('btn-ver-resumo'), btnWA: byId('btn-wa')
    };
  let cart = getCartFromStorage();

    // Prefill from agendar draft if present
    try{
      const raw = localStorage.getItem('focinhos:delivery:draft');
      if(raw){ const draft = JSON.parse(raw); if(draft){
        if(draft.endereco && !els.endereco.value) els.endereco.value = draft.endereco;
        if(draft.numero && !byId('endereco-numero')){
          const num = document.createElement('input'); num.id='endereco-numero'; num.className='input'; num.placeholder='Nº'; num.style.marginTop='6px'; num.inputMode='numeric'; els.endereco.parentNode.insertBefore(num, els.endereco.nextSibling);
          if(draft.numero) num.value = draft.numero;
        }
        if(draft.recebedor && !els.recebedor.value) els.recebedor.value = draft.recebedor;
        if(draft.tel && !els.tel.value) els.tel.value = draft.tel;
        if(draft.observacoes && !els.obs.value) els.obs.value = draft.observacoes;
      } }
    }catch(e){ console.warn('prefill delivery draft failed', e); }

    function renderCart(){
      if(!els.carrinho) return;
      // render items without showing prices
      els.carrinho.innerHTML = cart.map((it,idx)=>{
        return (`<li class="cart-item" data-idx="${idx}"><div class="cart-item__main"><strong>${it.nome}</strong>${it.variacao? ` — ${it.variacao}`:''}</div><div class="cart-item__controls"><button class="item__btn qty-dec" data-act="dec" data-idx="${idx}" aria-label="Diminuir quantidade">−</button><input class="item__qty_input" type="number" min="1" value="${it.qtd}" data-idx="${idx}" aria-label="Quantidade" /><button class="item__btn qty-inc" data-act="inc" data-idx="${idx}" aria-label="Aumentar quantidade">＋</button><button class="item__btn item__remove" data-idx="${idx}" aria-label="Remover item">remover</button></div></li>`);
      }).join('');
      // show notice about prices being provided via WhatsApp at checkout
      try{
        let note = document.getElementById('__delivery-price-note');
  if(!note){ note = document.createElement('div'); note.id = '__delivery-price-note'; note.style.marginTop='8px'; note.className='cart-note'; note.textContent = 'Detalhes e confirmações serão combinados via WhatsApp.'; els.carrinho.parentNode.insertBefore(note, els.carrinho.nextSibling); }
      }catch(e){}

      // attach listeners
      // attach listeners
      els.carrinho.querySelectorAll('.qty-dec').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; const cart = getCartFromStorage(); const newQ = Math.max(1, (cart[i].qtd||1) - 1); updateCartQty(i,newQ); cart = getCartFromStorage(); renderCart(); }));
      els.carrinho.querySelectorAll('.qty-inc').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; const cart = getCartFromStorage(); const newQ = (cart[i].qtd||1) + 1; updateCartQty(i,newQ); renderCart(); }));
      els.carrinho.querySelectorAll('.item__qty_input').forEach(inp=> inp.addEventListener('change', (e)=>{ const i = +inp.dataset.idx; const v = Math.max(1, Number(inp.value)||1); if(v<1){ inp.value = 1; } updateCartQty(i, v); renderCart(); }));
      els.carrinho.querySelectorAll('.item__remove').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; removeCartItem(i); renderCart(); }));
    }

    function listagem(){
      return cart.map(it=> `${it.qtd}x ${it.nome}${it.variacao? ' '+it.variacao:''}`).join('\n');
    }

    on(els.add,'click', ()=>{
      const nome = (els.produto.value||'').trim();
      const variacao = (els.variacao.value||'').trim();
      const qtd = parseInt(els.qtd.value||'1',10) || 1;
      if(!nome) return;
  cart.push({nome, variacao, qtd});
  saveCartToStorage(cart);
      els.produto.value=''; els.variacao.value=''; els.qtd.value='1';
      renderCart();
    });

    on(els.carrinho,'click', (e)=>{
      const t = e.target.closest('button');
      if(!t) return;
      const idx = +t.dataset.idx; const act = t.dataset.act;
      if(act==='inc') cart[idx].qtd++;
      if(act==='dec') cart[idx].qtd = Math.max(1, cart[idx].qtd-1);
      if(act==='rm') cart.splice(idx,1);
  saveCartToStorage(cart);
      renderCart();
    });

    on(els.btnGeo,'click', ()=> Geo.start('default', els.badge));

    function resumoTexto(){
      const geo = Geo.get('default');
      const map = {
        itensLista: listagem() || '',
        nome: (els.recebedor.value||'').trim() || '',
        telefone: (els.tel.value||'').trim() || '',
  enderecoCompleto: (geo && geo.address && geo.address.display) || (els.endereco.value||'').trim() || '',
  lat: geo? geo.lat.toFixed(6) : '',
  lng: geo? geo.lng.toFixed(6) : '',
  accuracy: geo? fmtAcc(geo.accuracy) : '',
  timestamp: geo? fmtDT(geo.timestamp) : '',
        observacoes: (els.obs.value||'').trim() || ''
      };
      return tidyMessage(interpolate(window.CONFIG.waTemplates.delivery, map));
    }

    function validar(){
      let ok = true;
  if(cart.length===0){ ok=false; alert('Adicione pelo menos um produto.'); }
      ok &= required(els.recebedor, 'Informe o nome do recebedor.');
      ok &= required(els.tel, 'Informe um telefone válido.');
      if(ok && !isTelBR(els.tel.value)){ setErr(els.tel,'Informe um telefone válido.'); ok=false; }
  // require endereco and número if endereco provided and no precise geo
  const numEl = byId('endereco-numero');
  if(!Geo.get('default') && !(els.endereco.value||'').trim()){ setErr(els.endereco,'Informe o endereço ou compartilhe sua localização.'); ok=false; } else clearErr(els.endereco);
  if((els.endereco.value||'').trim() && (!numEl || !(numEl.value||'').trim())){ if(numEl) setErr(numEl,'Informe o número da residência.'); else setErr(els.endereco,'Informe também o número da residência.'); ok=false; } else if(numEl){ clearErr(numEl); }
      return !!ok;
    }

    on(els.btnResumo,'click', ()=>{ if(els.preResumo) els.preResumo.textContent = resumoTexto(); });
    on(els.btnWA,'click', (e)=>{
      e.preventDefault();
      if(!validar()){ return; }
      const url = waLink(resumoTexto());
      try{ if(location && (location.hostname==='localhost' || location.hostname==='127.0.0.1')) console.debug('[dev] btn-wa open ->', url); }catch(e){}
      window.open(url, '_blank');
      try{ els.btnWA.href = url; }catch(e){}
    });

  try{ attachCopyButton(els.btnWA && els.btnWA.parentNode || document.body, '__delivery-copy-msg', resumoTexto); }catch(e){ console.warn('attach copy (delivery) failed', e); }
  // react to external cart changes
  window.addEventListener('focinhos:cart:changed', ()=>{ cart = getCartFromStorage(); renderCart(); });
  }

  // ====== Fluxo: TÁXI ======
  function initTaxi(){
    if(document.body.dataset.page !== 'taxi') return;
    const R = {
      tipoBanho: byId('tipo-banho'), tipoAgendado: byId('tipo-agendado'),
      secBanho: byId('sec-banho'), secAgendado: byId('sec-agendado'),
      resumo: byId('taxi-resumo'), btnResumo: byId('btn-ver-resumo'), btnWA: byId('btn-wa'),
    };

    function toggleSections(){
      const banho = R.tipoBanho.checked;
      R.secBanho.classList.toggle('hide', !banho);
      R.secAgendado.classList.toggle('hide', banho);
    }
    $$("input[name='tipo']").forEach(r=> on(r,'change', toggleSections));
    toggleSections();

    // Botões de geo por campo
    $$('button[data-geo]').forEach(btn=>{
      on(btn,'click', ()=>{
        const key = btn.getAttribute('data-geo');
        const badge = byId('geo-'+key);
        Geo.start(key, badge);
      });
    });

    function resumoBanho(){
      const modalidade = ($("input[name='modalidade']:checked")||{}).value || '-';
      const geoO = Geo.get('origem') || Geo.get('origem2');
      const geoD = Geo.get('destino') || Geo.get('destino2');
      const map = {
        modalidade,
        petNome: (byId('petNome')?.value||'').trim() || '-',
        tutorNome: (byId('tutorNome')?.value||'').trim() || '-',
        tutorTelefone: (byId('tutorTelefone')?.value||'').trim() || '-',
        origemEndereco: (geoO && geoO.address && geoO.address.display) || (byId('origem')?.value||'').trim() || '-',
        destinoEndereco: (geoD && geoD.address && geoD.address.display) || (byId('destino')?.value||'').trim() || '-',
        origemLat: geoO? geoO.lat.toFixed(6) : '-',
        origemLng: geoO? geoO.lng.toFixed(6) : '-',
        destinoLat: geoD? geoD.lat.toFixed(6) : '-',
        destinoLng: geoD? geoD.lng.toFixed(6) : '-',
        horario: fmtDT(byId('horario')?.value||'') || '-',
        observacoes: (byId('obs')?.value||'').trim() || '-'
      };
  return tidyMessage(interpolate(window.CONFIG.waTemplates.taxiBanho, map));
    }

    function resumoAgendado(){
      const geoO = Geo.get('origem2');
      const geoD = Geo.get('destino2');
      const contato = (byId('contato2')?.value||'').trim();
      const [tutorNome, tutorTelefone] = contato.split(/•|\||-/).map(s=>s&&s.trim()) || ['',''];
      const map = {
  origemEndereco: (geoO && geoO.address && geoO.address.display) || (byId('origem2')?.value||'').trim() || '-',
  destinoEndereco: (geoD && geoD.address && geoD.address.display) || (byId('destino2')?.value||'').trim() || '-',
        origemLat: geoO? geoO.lat.toFixed(6) : '-',
        origemLng: geoO? geoO.lng.toFixed(6) : '-',
        destinoLat: geoD? geoD.lat.toFixed(6) : '-',
        destinoLng: geoD? geoD.lng.toFixed(6) : '-',
        horario: fmtDT(byId('horario2')?.value||'') || '-',
        tutorNome: tutorNome||'-',
        tutorTelefone: (tutorTelefone||'').trim() || '-',
        observacoes: (byId('obs2')?.value||'').trim() || '-'
      };
  return tidyMessage(interpolate(window.CONFIG.waTemplates.taxiAgendado, map));
    }

    function resumo(){ return byId('tipo-banho').checked ? resumoBanho() : resumoAgendado(); }
    on(R.btnResumo,'click', ()=>{ if(R.resumo) R.resumo.textContent = resumo(); });
    on(R.btnWA,'click', (e)=>{
      e.preventDefault();
      const url = waLink(resumo());
      try{ if(location && (location.hostname==='localhost' || location.hostname==='127.0.0.1')) console.debug('[dev] btn-wa open ->', url); }catch(e){}
      window.open(url, '_blank');
      try{ R.btnWA.href = url; }catch(e){}
    });

  try{ attachCopyButton(R.btnWA && R.btnWA.parentNode || document.body, '__taxi-copy-msg', resumo); }catch(e){ console.warn('attach copy (taxi) failed', e); }
  }

  // ===== SW Register =====
  function initSW(){
    if('serviceWorker' in navigator){
      window.addEventListener('load', ()=>{
  // register service worker using relative path so it works on GitHub Pages and subpaths
  try{
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg=>{
      // Poll for updates periodically (every 5 minutes) so deployed changes are noticed
      try{ setInterval(()=>{ try{ reg.update(); }catch(e){} }, 1000 * 60 * 5); }catch(e){}

      // If there's a waiting worker already, ask it to skipWaiting
      try{
        if(reg.waiting){ reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }
      }catch(e){}

      // When a new SW is found, listen for state changes and attempt to activate it immediately
      reg.addEventListener && reg.addEventListener('updatefound', ()=>{
        const inst = reg.installing;
        if(!inst) return;
        inst.addEventListener('statechange', ()=>{
          try{
            if(inst.state === 'installed' && navigator.serviceWorker.controller){
              // try to activate immediately
              try{ reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }catch(e){}
              // show a gentle prompt could be implemented here instead of forcing reload
            }
          }catch(e){ console.warn('sw statechange handler failed', e); }
        });
      });
    }).catch((err)=>{ console.warn('ServiceWorker register failed:', err); });
  }catch(err){ console.warn('ServiceWorker register throw:', err); }
      });
    }
  }

  // ===== Init cart modal (header) =====
  function initCartModal(){
    // open modal showing current cart
    function openCartModal(){
      const cart = getCartFromStorage();
      const modal = document.createElement('div');
      modal.className = 'modal'; modal.style.position='fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0'; modal.style.background='rgba(0,0,0,0.5)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
  const box = document.createElement('div'); box.style.background='#fff'; box.style.padding='16px'; box.style.maxWidth='520px'; box.style.width='95%'; box.style.maxHeight='80%'; box.style.overflow='auto';
  // accessibility: mark as dialog and focusable
  box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.tabIndex = -1;
  const totals = cartTotals(cart);
  box.innerHTML = `<h3 id="__cart-title">Seu carrinho</h3><div id="__cart-items"></div><div style="margin-top:12px" class="cart-note">Detalhes e confirmações serão combinados via WhatsApp.</div><div style="margin-top:12px;text-align:right"><button id="__cart-close" class="btn btn--ghost" aria-label="Fechar" title="Fechar">Fechar</button></div>`;
  box.setAttribute('aria-labelledby','__cart-title');
      modal.appendChild(box); document.body.appendChild(modal);
  // focus trap rudimentar
  const focusable = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstFocusable = focusable[0]; const lastFocusable = focusable[focusable.length-1];
  function trap(e){ if(e.key === 'Tab'){ if(e.shiftKey && document.activeElement === firstFocusable){ e.preventDefault(); lastFocusable.focus(); } else if(!e.shiftKey && document.activeElement === lastFocusable){ e.preventDefault(); firstFocusable.focus(); } } if(e.key==='Escape'){ closeModal(); } }
  function closeModal(){ try{ window.removeEventListener('keydown', trap); document.body.removeChild(modal); opener?.focus(); }catch(e){} }
  const opener = document.activeElement;
      const node = box.querySelector('#__cart-items');
      if(!cart || cart.length===0){ node.innerHTML = '<p>Seu carrinho está vazio.</p>'; }
      else{
  node.innerHTML = cart.map((it,idx)=> `<div class="modal-cart-row" data-idx="${idx}" style="display:flex;justify-content:space-between;margin:6px 0"><div><strong>${it.nome}</strong>${it.variacao? ' — '+it.variacao : ''}</div><div><button class="btn qty-dec" data-act="dec" data-idx="${idx}">−</button><input class="modal-qty" data-idx="${idx}" type="number" min="1" value="${it.qtd}" style="width:56px;text-align:center;margin:0 6px" /><button class="btn qty-inc" data-act="inc" data-idx="${idx}">＋</button><button data-idx="${idx}" class="btn btn--ghost modal-remove" data-act="rm">Remover</button></div></div>`).join('');
  // attach handlers
  node.querySelectorAll('.qty-dec').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; const c = getCartFromStorage(); const newQ = Math.max(1, (c[i].qtd||1)-1); updateCartQty(i,newQ); node.querySelector(`.modal-qty[data-idx="${i}"]`).value = newQ; window.dispatchEvent(new CustomEvent('focinhos:cart:changed',{detail:{cart:getCartFromStorage()}})); }));
  node.querySelectorAll('.qty-inc').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; const c = getCartFromStorage(); const newQ = (c[i].qtd||1)+1; updateCartQty(i,newQ); node.querySelector(`.modal-qty[data-idx="${i}"]`).value = newQ; window.dispatchEvent(new CustomEvent('focinhos:cart:changed',{detail:{cart:getCartFromStorage()}})); }));
  node.querySelectorAll('.modal-qty').forEach(inp=> inp.addEventListener('change',(e)=>{ const i = +inp.dataset.idx; const v = Math.max(1, Number(inp.value)||1); updateCartQty(i,v); window.dispatchEvent(new CustomEvent('focinhos:cart:changed',{detail:{cart:getCartFromStorage()}})); }));
  node.querySelectorAll('.modal-remove').forEach(btn=> btn.addEventListener('click', (e)=>{ const idx = +btn.dataset.idx; removeCartItem(idx); btn.closest('.modal-cart-row').remove(); window.dispatchEvent(new CustomEvent('focinhos:cart:changed',{detail:{cart:getCartFromStorage()}})); }));
      }
      // Add quick team actions: copiar modelo e abrir no WhatsApp
      try{
        const actionsWrap = document.createElement('div'); actionsWrap.style.marginTop='12px'; actionsWrap.style.display='flex'; actionsWrap.style.gap='8px'; actionsWrap.style.justifyContent='flex-end';
        const copyBtn = document.createElement('button'); copyBtn.className='btn btn--ghost'; copyBtn.textContent = 'Copiar modelo';
        const openBtn = document.createElement('button'); openBtn.className='btn btn--primary'; openBtn.textContent = 'Abrir no WhatsApp';
        actionsWrap.appendChild(copyBtn); actionsWrap.appendChild(openBtn);
        box.appendChild(actionsWrap);
        // build message from template
        function buildTeamMessage(){
          const tpl = window.CONFIG?.waTemplates?.teamReply || '';
          const items = cart.map(it=> `${it.qtd}x ${it.nome}${it.variacao? ' '+it.variacao:''}`).join('\n');
          // attempt to find contact fields on the page (delivery context)
          const nome = (byId('recebedor')?.value|| byId('tutorNome')?.value || '').trim();
          const telefone = (byId('tel')?.value|| byId('tutorTelefone')?.value || '').trim();
          const observacoes = (byId('obs')?.value || byId('observacoes')?.value || '').trim();
          const map = { itensLista: items, nome, telefone, observacoes };
          return tidyMessage(interpolate(tpl, map));
        }
        copyBtn.addEventListener('click', async ()=>{
          try{
            const txt = buildTeamMessage();
            await navigator.clipboard.writeText(txt);
            copyBtn.textContent = 'Copiado'; setTimeout(()=> copyBtn.textContent = 'Copiar modelo', 1800);
          }catch(e){ console.warn('copy failed', e); copyBtn.textContent = 'Erro'; setTimeout(()=> copyBtn.textContent = 'Copiar modelo', 1800); }
        });
        openBtn.addEventListener('click', ()=>{
          try{
            const txt = buildTeamMessage(); const url = waLink(txt); window.open(url, '_blank');
          }catch(e){ console.warn('open whatsapp failed', e); }
        });
      }catch(e){ console.warn('cart modal team actions failed', e); }
  box.querySelector('#__cart-close').addEventListener('click', ()=>{ closeModal(); });
  window.addEventListener('keydown', trap);
  // focus the dialog container for screen readers; fallback to first focusable element
  try{ if(box && typeof box.focus === 'function') box.focus(); else if(firstFocusable && typeof firstFocusable.focus === 'function') firstFocusable.focus(); }catch(e){}
    }

  const top = byId('topbar-cart'); if(top) on(top,'click', openCartModal);
    const drawer = byId('drawer-cart'); if(drawer) on(drawer,'click', (e)=>{ e.preventDefault(); openCartModal(); });
    // also respond to cart change events to show small badge (optional)
    window.addEventListener('focinhos:cart:changed', (ev)=>{
      try{ const b = byId('topbar-cart'); if(b){ b.classList.add('has-cart'); setTimeout(()=>b.classList.remove('has-cart'), 800); } }catch(e){}
    });
  // initialize count
  function updateTopbarCount(){ try{ const b = byId('topbar-cart'); if(!b) return; const cart = getCartFromStorage(); const total = cart.reduce((s,it)=> s + (Number(it.qtd||1)||1), 0); if(total>0){ b.setAttribute('data-count', String(total)); } else { b.removeAttribute('data-count'); } }catch(e){}}
  updateTopbarCount();
  window.addEventListener('focinhos:cart:changed', updateTopbarCount);
  }

  // Boot
  document.addEventListener('DOMContentLoaded', ()=>{
    // Load dynamic config first (network-first). If fetch fails, fall back to any inline `window.CONFIG`.
    (async ()=>{
      try{
        // Use relative path so it works on GitHub Pages subpaths too
        const resp = await fetch('./config.json', { cache: 'no-store' });
        if(resp && resp.ok){ const json = await resp.json(); window.CONFIG = Object.assign(window.CONFIG || {}, json); }
      }catch(e){ console.warn('config.json fetch failed, using inline CONFIG if present', e); }
      // Run each init inside try/catch so a failure in one doesn't stop others
  [initNav, bindConfig, initAgendar, initDelivery, initTaxi, initCartPanel, initCartModal, initSW].forEach(fn=>{
        try{ if(typeof fn === 'function') fn(); }catch(err){ console.error('[init error]', err); }
      });
      try{ initFormPersistence(); }catch(e){ console.warn('initFormPersistence failed', e); }
    })();
    // Global error handler to help identificar erros em produção/local
    window.addEventListener('error', (ev)=>{
      try{ console.error('Unhandled error:', ev.error || ev.message || ev); }catch(e){}
    });
  });

  // Reload the page when a new service worker takes control to ensure users get the latest UI
  if('serviceWorker' in navigator){
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      try{
        // Avoid forcing reload when running on localhost or under automated tests (puppeteer)
        const isLocal = location && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        const isAutomated = !!navigator.webdriver;
        if(isLocal || isAutomated) return; // do not reload in test/dev environments
        if(refreshing) return; refreshing = true; try{ window.location.reload(); }catch(e){}
      }catch(e){ /* silent */ }
    });
  }
})();
