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
  // Format helpers: Brazilian standard
  function pad2(n){ return String(n).padStart(2,'0'); }
  const fmtDate = (v)=>{
    try{
      const d = new Date(v);
      if (isNaN(d.getTime())) return '';
      const dd = pad2(d.getDate());
      const mm = pad2(d.getMonth()+1);
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`; // DD-MM-AAAA
    }catch{ return v||'' }
  };
  const fmtDT = (v)=>{
    try{
      const d = new Date(v);
      if (isNaN(d.getTime())) return '';
      const dd = pad2(d.getDate());
      const mm = pad2(d.getMonth()+1);
      const yyyy = d.getFullYear();
      const hh = pad2(d.getHours());
      const mi = pad2(d.getMinutes());
      return `${dd}-${mm}-${yyyy} ${hh}:${mi}`; // DD-MM-AAAA HH:mm (24h)
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
    // 1) normalize and pre-filter trivial empties
    let lines = raw.split(/\r?\n/).map(l=> String(l).replace(/\s+$/,'')).map(l=> l.replace(/^\s+/,'')).filter(l=>{
      const t = l.trim();
      if(!t) return false; // drop empty
      if(/^[‑\-•\*\s]+$/.test(t)) return false; // only bullets/dashes
      if(/^[\-–—]{1,3}$/.test(t)) return false; // separators
      return true;
    });

    // 2) remove lines with empty dynamic content patterns
    const isEmptyGeo = (s)=> /^Geo:\s*(?:-|)?,\s*(?:-|)?$/i.test(s);
    const isEmptyPrec = (s)=> /^Precis[aã]o:\s*(?:-|)?\s*(?:m)?\s*(?:@\s*)?$/i.test(s);
    const isEmptyLabelColon = (s)=> /[:：]\s*$/.test(s) && !/https?:\/\//i.test(s); // e.g., "Acessório:" with nothing
    lines = lines.filter(l=> !(isEmptyGeo(l) || isEmptyPrec(l) || isEmptyLabelColon(l)));

    // 3) drop section headers that ended up with no content
    const isHeader = (s)=> /\*[^*]+\*/.test(s); // lines with *Header*
    const keep = [];
    for(let i=0;i<lines.length;i++){
      const line = lines[i];
      if(i===0){ keep.push(line); continue; } // keep top title
      if(!isHeader(line)){ keep.push(line); continue; }
      // look ahead for next non-empty, non-blank line that is not removed later
      let j=i+1; let hasBody=false;
      while(j<lines.length){
        const nxt = lines[j].trim();
        if(!nxt){ j++; continue; }
        if(isHeader(nxt)) break; // next section reached without body
        // found body content line
        hasBody = true; break;
      }
      if(hasBody) keep.push(line); // keep header only if followed by some body content
    }

    // 4) collapse excessive blank lines again and return
    const out = keep.join('\n').replace(/\n{2,}/g,'\n\n').trim();
    return out;
  }

  // ===== Emoji compatibility (fallback to ASCII when device likely lacks glyphs) =====
  function shouldUsePlainText(){
    try{
      // Explicit overrides first
      const url = new URL(location.href);
      const q = url.searchParams.get('emoji');
      if(q === '0') return true;
      if(q === '1') return false;
      const ls = localStorage.getItem('focinhos:disableEmoji');
      if(ls === '1') return true;
      // Config hint
      if(window.CONFIG?.ui?.preferPlainTextMessages) return true;
      // Rough UA heuristic: Android < 8 tends to miss newer emoji
      const m = navigator.userAgent.match(/Android\s(\d+)(?:\.(\d+))?/i);
      if(m){ const major = parseInt(m[1]||'0',10); if(major && major < 8) return true; }
    }catch(e){}
    return false;
  }
  const EMOJI_MAP = new Map(Object.entries({
    '📅':'[Agenda]','🐾':'[Pets]','⏰':'[Quando]','👤':'[Contato]','🚕':'[Táxi]',
    '📍':'[Local]','📝':'[Obs]','🏪':'[Loja]','📦':'[Delivery]','🚦':'[Modalidade]'
  }));
  function stripEmojis(s){
    if(!s) return s;
    let out = s;
    EMOJI_MAP.forEach((rep, emo)=>{ out = out.split(emo).join(rep); });
    return out;
  }
  function addVS16IfNeeded(s){
    if(!s) return s; const VS16='\uFE0F';
    // Apply to a small set that benefits from emoji presentation on some platforms
    return s
      .replace(/⏰(?!\uFE0F)/g, '⏰\uFE0F');
  }
  function processMessageForPlatform(s){
    try{ return shouldUsePlainText() ? stripEmojis(s) : addVS16IfNeeded(s); }catch(_){ return s; }
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
  // Allow pages to opt-out of the generic persistence to use a custom flow
  if(document.body.hasAttribute('data-disable-generic-persist')) return;
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
      return processMessageForPlatform(tidyMessage(interpolate(tpl, map)));
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
  $$('[data-bind="version"]').forEach(el=> text(el, C.appVersion || ''));
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

    // Home: status aberto/fechado com ponto colorido e mensagem "Abre às" quando fechado
    try{
      if(document.body.dataset.page === 'home'){
        const dot = byId('status-dot');
        const txt = byId('status-text');
        if(dot && txt){
          const hours = C.business?.hours || { mon_sat:'10:00–20:00', sun:'10:00–13:00' };
          function parseRange(range){
            if(!range) return null;
            const m = String(range).match(/^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/);
            if(!m) return null; return { fromH:+m[1], fromM:+m[2], toH:+m[3], toM:+m[4] };
          }
      function nextOpenInfo(now){
            // Return {open:true} if open now; else {open:false, label:"Abre às HH:MM"}
            const d = new Date(now);
            const day = d.getDay(); // 0=Sun,1=Mon...6=Sat
            const isSun = day === 0;
            const rangeStr = isSun ? hours.sun : hours.mon_sat;
            const r = parseRange(rangeStr);
            // Helper to build label HH:MM
            const hhmm = (h,m)=> `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            if(!r){ return { open:false, label:'' }; }
            const curMin = d.getHours()*60 + d.getMinutes();
            const fromMin = r.fromH*60 + r.fromM;
            const toMin = r.toH*60 + r.toM;
            if(curMin >= fromMin && curMin < toMin){
        return { open:true, closesAt: hhmm(r.toH, r.toM) };
            }
            if(curMin < fromMin){
              return { open:false, label: `Abre às ${hhmm(r.fromH, r.fromM)}` };
            }
            // After closing today: compute next open
            // Next day open is Monday-Saturday or Sunday accordingly
            const nextDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 0, 0, 0);
            const nextIsSun = nextDay.getDay() === 0;
            const nr = parseRange(nextIsSun ? hours.sun : hours.mon_sat);
            if(nr){ return { open:false, label:`Abre às ${hhmm(nr.fromH, nr.fromM)}` }; }
            return { open:false, label:'' };
          }
      function updateStatus(){
            const info = nextOpenInfo(new Date());
            dot.classList.remove('is-open','is-closed');
            if(info.open){
              dot.classList.add('is-open');
        txt.textContent = info.closesAt ? `Aberto agora — Fecha às ${info.closesAt}` : 'Aberto agora';
            } else {
              dot.classList.add('is-closed');
              txt.textContent = info.label || 'Fechado';
            }
          }
          updateStatus();
          // refresh every minute to keep accurate
          setInterval(updateStatus, 60000);
        }
      }
    }catch(e){ console.warn('status aberto/fechado init falhou', e); }
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
          // Sem badge na UI
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
          // Sem badge na UI
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
      // todos os serviços/preferências são por pet agora
      dataPreferida: byId('dataPreferida'), janela: byId('janela')
    };
  // geolocalização inicia automaticamente; sem botões na UI
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

  // Sem botões de geo na UI

  // Controle de pets: cria um array de pets com base no DOM; suportar múltiplos pets dinâmicos
  // Use a robust counter: start at current count so new pets get unique indexes
  let petIndexCounter = (petsContainer && petsContainer.querySelectorAll('.pet')?.length) || 0;
  console.debug('[agendar] petIndexCounter init', petIndexCounter);
    function readPetsFromDOM(){
      const pets = [];
      petsContainer.querySelectorAll('.pet').forEach((el)=>{
        const getVal = (role, id) => {
          const r = el.querySelector(`[data-role="${role}"]`);
          if(r) return (r.value||'').trim();
          if(id) return (byId(id)?.value||'').trim();
          return '';
        };
        const getChk = (role) => !!el.querySelector(`[data-role="${role}"]:checked`);
        pets.push({
          nome: getVal('petNome','petNome'),
          especie: getVal('especie','especie'),
          porte: getVal('porte','porte'),
          pelagem: getVal('pelagem','pelagem') || '-',
          temperamento: getVal('temperamento','temperamento') || '-',
          observacoes: getVal('observacoes','observacoes') || '-',
          srvBanho: getChk('srv-banho'),
          srvTosa: getChk('srv-tosa'),
          tosaTipo: getVal('tosaTipo'),
          ozonio: getChk('srv-ozonio'),
          perfume: getVal('perfume'),
          acessorio: getVal('acessorio'),
          escovacao: getChk('escovacao'),
          hidratacao: getChk('hidratacao'),
          corteUnhas: getChk('corte-unhas'),
          limpezaOuvido: getChk('limpeza-ouvido')
        });
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
  try{ saveAgendarDraftDebounced(); }catch(e){}
      }catch(err){ console.error('[agendar] addPet error', err); }
    }
  // Expose for tests / external triggers
  try{ window.addPet = addPet; }catch(e){}
    // Improved button handler that works reliably
    if(btnAddPet){
      function handleAddPet(e){
        e.preventDefault(); // Prevent double triggers
        try{ e.stopPropagation && e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_){}
        try{
          addPet();
          // Give feedback
          btnAddPet.classList.add('clicked');
          setTimeout(()=> btnAddPet.classList.remove('clicked'), 200);
        }catch(err){ 
          console.error('[agendar] add pet click failed', err);
        }
      }
      // Direct binding
      btnAddPet.addEventListener('click', handleAddPet);
      // Delegated fallback to survive odd event blockers or overlays
      document.addEventListener('click', (ev)=>{
        try{
          const t = ev.target && (ev.target.id==='btn-add-pet' ? ev.target : (ev.target.closest && ev.target.closest('#btn-add-pet')));
          if(t){ handleAddPet(ev); }
        }catch(_){ /* noop */ }
      }, true);
    } else { 
      console.warn('[agendar] btn-add-pet not found'); 
    }
    // Remover pet: delegate click to container, keep at least one pet block
    if(petsContainer){
      petsContainer.addEventListener('click', (ev)=>{
        const btn = ev.target && (ev.target.classList && ev.target.classList.contains('btn-remove-pet') ? ev.target : (ev.target.closest && ev.target.closest('.btn-remove-pet')));
        if(!btn) return;
        ev.preventDefault();
        try{
          const card = btn.closest('.pet');
          if(!card) return;
          const total = petsContainer.querySelectorAll('.pet').length;
          if(total <= 1){
            // Instead of removing the only card, clear its fields
            card.querySelectorAll('input,select,textarea').forEach(el=>{
              if(el.type==='checkbox' || el.type==='radio') el.checked = false; else el.value='';
              try{ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){ }
            });
          } else {
            card.remove();
          }
          try{ saveAgendarDraftDebounced(); }catch(_){ }
          try{ const preResumo = byId('agendar-resumo'); if(preResumo) preResumo.textContent = resumoTexto(); }catch(_){ }
        }catch(err){ console.warn('[agendar] remove pet failed', err); }
      });
    }

  // Cart upsell removed: 'Ver carrinho' button disabled to restore original menu layout.
  // If you later want to re-enable a cart upsell, reintroduce a lightweight control here.

  // Sem botões de geo na UI

    // Toggle localizacao fields
    function updateLocalizacaoFields(){
      const sel = document.querySelector("input[name='modalidadeLocalizacao']:checked").value;
      fieldOrigem.classList.toggle('hide', !(sel==='taxi-both' || sel==='taxi-pickup'));
      fieldDestino.classList.toggle('hide', !(sel==='taxi-both' || sel==='taxi-dropoff'));
    }
    modalidadeEls.forEach(r=> on(r,'change', updateLocalizacaoFields));
    updateLocalizacaoFields();

  function getServicosGlobaisLista(){
      // Mantido apenas para compat; hoje não há serviços globais.
      const list = [];
      $$('#upsell-services input[type="checkbox"]').forEach(ch=>{ if(ch.checked) list.push(ch.value); });
      return list.join(', ');
    }

    // Map modalidade (agendar) code to user-friendly PT label for WhatsApp
    function labelModalidadeAgendar(code){
      switch(String(code||'loja')){
        case 'taxi-both': return 'Táxi Dog (Buscar e Levar)';
        case 'taxi-pickup': return 'Táxi Dog (Somente Buscar)';
        case 'taxi-dropoff': return 'Táxi Dog (Somente Levar)';
        case 'loja':
        default: return 'Levarei na loja';
      }
    }

    function resumoTexto(){
    console.debug('[agendar] resumoTexto start', { petIndexCounter, petsCount: (petsContainer? petsContainer.querySelectorAll('.pet').length:0) });
      const geoDefault = Geo.get('default');
      const pets = readPetsFromDOM();
      // formatar lista de pets (omitindo campos vazios ou '-')
  const petsTxt = pets.map((p, i)=>{
        const valOk = (v)=> !!v && String(v).trim() !== '-' && String(v).trim() !== '';
        const details = [];
        if(valOk(p.especie)) details.push(`Espécie: ${p.especie}`);
        if(valOk(p.porte)) details.push(`Porte: ${p.porte}`);
        if(valOk(p.pelagem)) details.push(`Pelagem: ${p.pelagem}`);
        if(valOk(p.temperamento)) details.push(`Temperamento: ${p.temperamento}`);
        if(valOk(p.observacoes)) details.push(`Observações: ${p.observacoes}`);
        const perPetServ = [];
        if(p.srvBanho) perPetServ.push('Banho');
        if(p.srvTosa) perPetServ.push('Tosa' + (p.tosaTipo? ` (${p.tosaTipo})` : ''));
  if(p.ozonio) perPetServ.push('Banho de ozônio');
        if(valOk(p.perfume)) perPetServ.push(`Perfume: ${p.perfume}`);
        if(valOk(p.acessorio)) perPetServ.push(`Acessório: ${p.acessorio}`);
  if(p.escovacao) perPetServ.push('Higienização bucal');
  if(p.hidratacao) perPetServ.push('Hidratação');
        if(p.corteUnhas) perPetServ.push('Corte de unhas');
        if(p.limpezaOuvido) perPetServ.push('Limpeza de ouvido');
        if(perPetServ.length) details.push(`Serviços: ${perPetServ.join(', ')}`);
        const head = `Pet ${i+1}: ${p.nome || ''}`.trim();
        if(details.length>0) return `${head} • ${details.join(' • ')}`; else return head;
      }).filter(Boolean).join('\n');
  // Localização
  const modalidadeCode = (document.querySelector("input[name='modalidadeLocalizacao']:checked")||{}).value || 'loja';
  const modalidade = labelModalidadeAgendar(modalidadeCode);
  const origemAddr = ['origem-rua','origem-numero','origem-bairro','origem-cep'].map(id=> (byId(id)?.value||'').trim()).filter(Boolean).join(', ');
  const destinoAddr = ['destino-rua','destino-numero','destino-bairro','destino-cep'].map(id=> (byId(id)?.value||'').trim()).filter(Boolean).join(', ');

      // Use empty strings as fallback so tidyMessage can remove empty sections
      const map = {
        petsLista: petsTxt,
  servicosLista: getServicosGlobaisLista() || '',
  // Preferências agora já vêm por pet dentro de petsLista
  perfume: '',
  acessorio: '',
  escovacao: '',
        dataPreferida: f.dataPreferida.value ? fmtDate(f.dataPreferida.value) : '',
        janela: f.janela.value || '',
        tutorNome: f.tutorNome.value.trim() || '',
        tutorTelefone: f.tutorTelefone.value.trim() || '',
  modalidade: modalidade || '',
        enderecoLoja: window.CONFIG?.business?.addressLine || '',
  origemEndereco: origemAddr || '',
  destinoEndereco: destinoAddr || '',
  origemLat: geoDefault? geoDefault.lat.toFixed(6) : '',
  origemLng: geoDefault? geoDefault.lng.toFixed(6) : '',
  destinoLat: geoDefault? geoDefault.lat.toFixed(6) : '',
  destinoLng: geoDefault? geoDefault.lng.toFixed(6) : '',
        origemAccuracy: geoDefault? fmtAcc(geoDefault.accuracy) : '',
        destinoAccuracy: geoDefault? fmtAcc(geoDefault.accuracy) : '',
        origemTimestamp: geoDefault? fmtDT(geoDefault.timestamp) : '',
        destinoTimestamp: geoDefault? fmtDT(geoDefault.timestamp) : '',
        observacoes: pets.map(p=>p.observacoes).filter(Boolean).join(' \n') || ''
      };
      const tpl = window.CONFIG.waTemplates.agendar;
  console.debug('[agendar] resumoTexto result preview', { petsLista: map.petsLista && map.petsLista.slice(0,80) });
      let raw = interpolate(tpl, map);
  // Serviços avulsos removidos (não há seção global)
  return processMessageForPlatform(tidyMessage(raw));
    }

    // When a reverse-geocode result is available, show a confirmation helper that
    // lets the user edit the street before confirming. Confirmation stores the
    // CURRENT input value, not the suggested value.
    window.addEventListener('focinhos:geo:address:resolved', (ev)=>{
    // Requisito: não preencher endereço automaticamente; apenas coletar coordenadas.
    // Ignorar sugestões de endereço do GPS.
    return;
      try{
        const key = ev?.detail?.key || 'default';
        const addr = ev?.detail?.address?.display || '';
        if(!addr) return;
        const page = document.body.dataset.page || '';
        // Map key -> input id per page
        let inputId = key;
        if(key === 'default'){
          inputId = (page === 'delivery') ? 'endereco' : 'origem';
        }
        const inp = byId(inputId);
        if(!inp) return;
        const short = (s)=> String(s||'').split(',').slice(0,3).join(', ');

        // Prefill only if empty to avoid overwriting user input
        if((inp.value||'').trim() === '' && addr){ inp.value = addr; try{ inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){} }

        // Insert or update confirmation helper
        const cid = `__geo-confirm-${inputId}`;
        let wrap = byId(cid);
        if(!wrap){
          wrap = document.createElement('div'); wrap.id = cid; wrap.className = 'muted'; wrap.style.marginTop = '6px';
          wrap.innerHTML = `
            <div>Sugerido pelo GPS: <strong class="__addr-suggest">${short(addr)}</strong></div>
            <div style="margin-top:6px">
              <button type="button" id="${cid}-confirm" class="btn btn--ghost">Confirmar rua</button>
              <button type="button" id="${cid}-edit" class="btn btn--ghost">Editar</button>
            </div>`;
    inp.parentNode.insertBefore(wrap, inp.nextSibling);
        } else {
          const sEl = wrap.querySelector('.__addr-suggest'); if(sEl) sEl.textContent = short(addr);
        }

        // Bind handlers (idempotent)
        const confirmBtn = byId(`${cid}-confirm`);
        const editBtn = byId(`${cid}-edit`);
        if(confirmBtn && !confirmBtn.__bound){
          confirmBtn.__bound = true;
          on(confirmBtn,'click', ()=>{
            try{
              // If user hasn't entered anything, use the suggestion first and focus for quick adjust
              if((inp.value||'').trim() === '' && addr){ inp.value = addr; try{ inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){} }
              const chosen = (inp.value||'').trim();
              inp.dataset.geoConfirmed = 'true';
              // ensure number field exists (id depends on input id)
              const numId = `${inputId}-numero`;
              if(!byId(numId)){
                const num = document.createElement('input'); num.id = numId; num.className='input'; num.placeholder='Nº'; num.style.marginTop='6px'; num.inputMode='numeric'; inp.parentNode.insertBefore(num, wrap.nextSibling);
              }
              wrap.innerHTML = `<div>Rua confirmada: <strong>${short(chosen)}</strong></div>`;
            }catch(e){ console.warn('confirm geo addr', e); }
          });
        }
        if(editBtn && !editBtn.__bound){
          editBtn.__bound = true;
          on(editBtn,'click', ()=>{ try{ if((inp.value||'').trim()==='' && addr){ inp.value = addr; } inp.focus(); inp.select(); }catch(e){} });
        }

        // If user edits after confirmation, clear confirmation state and show helper again
        if(!inp.__geoConfirmBound){
          inp.__geoConfirmBound = true;
          on(inp,'input', ()=>{
            try{
              if(inp.dataset.geoConfirmed){ delete inp.dataset.geoConfirmed; }
              const helper = byId(cid);
              if(helper){ helper.innerHTML = `
                <div>Sugerido pelo GPS: <strong class="__addr-suggest">${short(addr)}</strong></div>
                <div style="margin-top:6px">
                  <button type="button" id="${cid}-confirm" class="btn btn--ghost">Confirmar rua</button>
                  <button type="button" id="${cid}-edit" class="btn btn--ghost">Editar</button>
                </div>`;
                // rebind buttons after reset
                const c2 = byId(`${cid}-confirm`); const e2 = byId(`${cid}-edit`);
                if(c2 && !c2.__bound){ c2.__bound = true; on(c2,'click', ()=>{ try{ if((inp.value||'').trim()==='' && addr){ inp.value = addr; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); } const chosen=(inp.value||'').trim(); inp.dataset.geoConfirmed='true'; const numId=`${inputId}-numero`; if(!byId(numId)){ const num=document.createElement('input'); num.id=numId; num.className='input'; num.placeholder='Nº'; num.style.marginTop='6px'; num.inputMode='numeric'; inp.parentNode.insertBefore(num, helper.nextSibling); } helper.innerHTML = `<div>Rua confirmada: <strong>${short(chosen)}</strong></div>`; }catch(e){} }); }
                if(e2 && !e2.__bound){ e2.__bound = true; on(e2,'click', ()=>{ try{ if((inp.value||'').trim()==='' && addr){ inp.value = addr; } inp.focus(); inp.select(); }catch(e){} }); }
              }
            }catch(e){}
          });
        }
      }catch(e){ console.warn('geo confirm handler', e); }
    });

    function validar(){
  console.debug('[agendar] validar start', { petIndexCounter, petsCount: (petsContainer? petsContainer.querySelectorAll('.pet').length:0) });
      let ok = true;
  // Reset toast before validations to avoid an empty green bar
  try{ const t = byId('agendar-err'); if(t){ t.textContent=''; t.classList.remove('error'); } }catch(e){}
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
      // Pelo menos 1 serviço (qualquer um: Banho, Tosa, Ozônio, Higienização bucal, Hidratação, Corte de unhas, Limpeza de ouvido)
      const hasAnyService = pets.some(p=> p && (p.srvBanho || p.srvTosa || p.ozonio || p.escovacao || p.hidratacao || p.corteUnhas || p.limpezaOuvido));
      if(!hasAnyService){
        const toast = byId('agendar-err');
        toast.classList.add('error');
        toast.textContent = 'Selecione pelo menos um serviço.';
        ok = false;
      } else { byId('agendar-err').textContent=''; byId('agendar-err').classList.remove('error'); }

      // Validação por modalidade de localização — exigir Rua, Nº, Bairro e CEP
      const modalidade = (document.querySelector("input[name='modalidadeLocalizacao']:checked")||{}).value || 'loja';
      function reqAddr(prefix){
        const rua = byId(prefix+'-rua'); const numero = byId(prefix+'-numero'); const bairro = byId(prefix+'-bairro'); const cep = byId(prefix+'-cep');
        let lok = true;
        lok &= required(rua, 'Informe a rua.');
        lok &= required(numero, 'Informe o número.');
        lok &= required(bairro, 'Informe o bairro.');
        lok &= required(cep, 'Informe o CEP.');
        return !!lok;
      }
      if(modalidade==='taxi-both'){
        ok &= reqAddr('origem');
        ok &= reqAddr('destino');
      } else if(modalidade==='taxi-pickup'){
        ok &= reqAddr('origem');
      } else if(modalidade==='taxi-dropoff'){
        ok &= reqAddr('destino');
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

  // Show delivery guidance note under actions (no add-delivery button)
  const summaryActions = (btnWA && btnWA.parentNode) || null;
  if(summaryActions && !byId('__agendar-delivery-note')){
      const note = document.createElement('p');
      note.id = '__agendar-delivery-note';
      note.className = 'muted';
  // spacing handled by CSS (.actions .muted)
  try{ note.style.removeProperty('margin-top'); }catch(_){ note.style.marginTop = ''; }
      note.textContent = 'Se precisar de delivery, conclua este agendamento e depois volte ao site para combinar pelo Delivery.';
      summaryActions.appendChild(note);
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

    // ===== Agendar custom persistence (multi-pet aware) =====
    const AGENDAR_DRAFT_KEY = 'focinhos:agendar:v2';
    function saveAgendarDraft(){
      try{
        const pets = readPetsFromDOM();
        const modalidade = (document.querySelector("input[name='modalidadeLocalizacao']:checked")||{}).value || 'loja';
        const draft = {
          pets,
          tutorNome: (byId('tutorNome')?.value||'').trim(),
          tutorTelefone: (byId('tutorTelefone')?.value||'').trim(),
          dataPreferida: byId('dataPreferida')?.value || '',
          janela: byId('janela')?.value || '',
          modalidade,
          origemRua: byId('origem-rua')?.value || '',
          origemNumero: byId('origem-numero')?.value || '',
          origemBairro: byId('origem-bairro')?.value || '',
          origemCep: byId('origem-cep')?.value || '',
          destinoRua: byId('destino-rua')?.value || '',
          destinoNumero: byId('destino-numero')?.value || '',
          destinoBairro: byId('destino-bairro')?.value || '',
          destinoCep: byId('destino-cep')?.value || ''
        };
        localStorage.setItem(AGENDAR_DRAFT_KEY, JSON.stringify(draft));
      }catch(e){ console.warn('saveAgendarDraft failed', e); }
    }
    const saveAgendarDraftDebounced = debounce(saveAgendarDraft, 300);

    function restoreAgendarDraft(){
      try{
        const raw = localStorage.getItem(AGENDAR_DRAFT_KEY);
        if(!raw) return;
        const d = JSON.parse(raw);
        if(!d || typeof d !== 'object') return;
        // restore pets
        const pets = Array.isArray(d.pets) ? d.pets : [];
        const ensurePetsCount = Math.max(1, pets.length);
        // Add missing pet blocks
        const existingCount = petsContainer.querySelectorAll('.pet').length;
        for(let i=existingCount; i<ensurePetsCount; i++){ addPet(); }
        // Fill each pet block
        const petBlocks = Array.from(petsContainer.querySelectorAll('.pet'));
        pets.forEach((p, idx)=>{
          const el = petBlocks[idx]; if(!el) return;
          if(idx===0){
            if(byId('petNome')) byId('petNome').value = p.nome||'';
            if(byId('especie')) byId('especie').value = p.especie||'';
            if(byId('porte')) byId('porte').value = p.porte||'';
            if(byId('pelagem')) byId('pelagem').value = p.pelagem||'';
            if(byId('temperamento')) byId('temperamento').value = p.temperamento||'';
            if(byId('observacoes')) byId('observacoes').value = p.observacoes||'';
          } else {
            const set = (sel, val)=>{ const e = el.querySelector(sel); if(e) e.value = val||''; };
            set('[data-role="petNome"]', p.nome||'');
            set('[data-role="especie"]', p.especie||'');
            set('[data-role="porte"]', p.porte||'');
            set('[data-role="pelagem"]', p.pelagem||'');
            set('[data-role="temperamento"]', p.temperamento||'');
            set('[data-role="observacoes"]', p.observacoes||'');
          }
          // shared per-pet services/extras for both first and subsequent blocks
          const setChk = (role, val)=>{ const e = el.querySelector(`[data-role="${role}"]`); if(e) e.checked = !!val; };
          const setVal = (role, val)=>{ const e = el.querySelector(`[data-role="${role}"]`); if(e) e.value = val||''; };
          setChk('srv-banho', p.srvBanho);
          setChk('srv-tosa', p.srvTosa);
          setVal('tosaTipo', p.tosaTipo||'');
          setChk('srv-ozonio', p.ozonio);
          setVal('perfume', p.perfume||'');
          setVal('acessorio', p.acessorio||'');
          setChk('escovacao', p.escovacao);
          setChk('hidratacao', p.hidratacao);
          setChk('corte-unhas', p.corteUnhas);
          setChk('limpeza-ouvido', p.limpezaOuvido);
        });

        // restore other fields
        if(byId('tutorNome')) byId('tutorNome').value = d.tutorNome||'';
        if(byId('tutorTelefone')) byId('tutorTelefone').value = d.tutorTelefone||'';
        if(byId('dataPreferida')) byId('dataPreferida').value = d.dataPreferida||'';
        if(byId('janela')) byId('janela').value = d.janela||'';
        if(typeof d.modalidade === 'string'){
          const r = Array.from(document.querySelectorAll("input[name='modalidadeLocalizacao']")).find(x=> x.value === d.modalidade);
          if(r){ r.checked = true; updateLocalizacaoFields(); }
        }
  // restore address fields (new structure)
  if(byId('origem-rua')) byId('origem-rua').value = d.origemRua||'';
  if(byId('origem-numero')) byId('origem-numero').value = d.origemNumero||'';
  if(byId('origem-bairro')) byId('origem-bairro').value = d.origemBairro||'';
  if(byId('origem-cep')) byId('origem-cep').value = d.origemCep||'';
  if(byId('destino-rua')) byId('destino-rua').value = d.destinoRua||'';
  if(byId('destino-numero')) byId('destino-numero').value = d.destinoNumero||'';
  if(byId('destino-bairro')) byId('destino-bairro').value = d.destinoBairro||'';
  if(byId('destino-cep')) byId('destino-cep').value = d.destinoCep||'';
  // seção global de serviços avulsos foi removida

        // dispatch change/input to update any dependent UI
        document.querySelectorAll('#form-agendar input, #form-agendar select, #form-agendar textarea').forEach(el=>{
          try{ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){}
        });
      }catch(e){ console.warn('restoreAgendarDraft failed', e); }
    }

    // Hook save on any change within the form
    try{
      const form = byId('form-agendar');
      if(form){ form.addEventListener('input', saveAgendarDraftDebounced, { passive:true }); form.addEventListener('change', saveAgendarDraftDebounced, { passive:true }); }
    }catch(e){ console.warn('bind agendar save failed', e); }

    // Restore immediately on init
    restoreAgendarDraft();
  }

  // ====== Fluxo: DELIVERY ======
  function initDelivery(){
    if(document.body.dataset.page !== 'delivery') return;
    const els = {
      produto: byId('produto'), variacao: byId('variacao'), qtd: byId('qtd'), carrinho: byId('carrinho'),
      add: byId('btn-add-prod'),
      recebedor: byId('recebedor'), tel: byId('tel'),
      rua: byId('end-rua'), numero: byId('end-numero'), bairro: byId('end-bairro'), cep: byId('end-cep'),
      obs: byId('obs'), preResumo: byId('delivery-resumo'), btnResumo: byId('btn-ver-resumo'), btnWA: byId('btn-wa')
    };
  let cart = getCartFromStorage();

    // Prefill from agendar draft if present
    try{
      const raw = localStorage.getItem('focinhos:delivery:draft');
      if(raw){ const draft = JSON.parse(raw); if(draft){
        if(draft.rua && !els.rua.value) els.rua.value = draft.rua;
        if(draft.numero && !els.numero.value) els.numero.value = draft.numero;
        if(draft.bairro && !els.bairro.value) els.bairro.value = draft.bairro;
        if(draft.cep && !els.cep.value) els.cep.value = draft.cep;
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
  els.carrinho.querySelectorAll('.qty-dec').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; const c = getCartFromStorage(); const newQ = Math.max(1, (c[i].qtd||1) - 1); updateCartQty(i,newQ); renderCart(); }));
  els.carrinho.querySelectorAll('.qty-inc').forEach(b=> b.addEventListener('click', ()=>{ const i = +b.dataset.idx; const c = getCartFromStorage(); const newQ = (c[i].qtd||1) + 1; updateCartQty(i,newQ); renderCart(); }));
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

  // Sem botão de geo; geoloc inicia globalmente no boot

    function resumoTexto(){
      const geo = Geo.get('default');
      const map = {
        itensLista: listagem() || '',
        nome: (els.recebedor.value||'').trim() || '',
        telefone: (els.tel.value||'').trim() || '',
  enderecoCompleto: [els.rua?.value, els.numero?.value, els.bairro?.value, els.cep?.value].map(s=> (s||'').trim()).filter(Boolean).join(', '),
        lat: geo? geo.lat.toFixed(6) : '',
        lng: geo? geo.lng.toFixed(6) : '',
        accuracy: geo? fmtAcc(geo.accuracy) : '',
        timestamp: geo? fmtDT(geo.timestamp) : '',
        observacoes: (els.obs.value||'').trim() || ''
      };
  return processMessageForPlatform(tidyMessage(interpolate(window.CONFIG.waTemplates.delivery, map)));
    }

    function validar(){
      let ok = true;
  if(cart.length===0){ ok=false; alert('Adicione pelo menos um produto.'); }
  ok &= required(els.recebedor, 'Informe o nome do recebedor.');
  ok &= required(els.tel, 'Informe um telefone válido.');
      if(ok && !isTelBR(els.tel.value)){ setErr(els.tel,'Informe um telefone válido.'); ok=false; }
  // exigir Rua, Nº, Bairro e CEP
  ok &= required(els.rua, 'Informe a rua.');
  ok &= required(els.numero, 'Informe o número.');
  ok &= required(els.bairro, 'Informe o bairro.');
  ok &= required(els.cep, 'Informe o CEP.');
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

    // Save minimal delivery draft (address/contact) on changes
    try{
      const DELIV_DRAFT_KEY = 'focinhos:delivery:draft';
      const saveDraft = debounce(()=>{
        try{
          const d = {
            rua: els.rua?.value || '',
            numero: els.numero?.value || '',
            bairro: els.bairro?.value || '',
            cep: els.cep?.value || '',
            recebedor: els.recebedor?.value || '',
            tel: els.tel?.value || '',
            observacoes: els.obs?.value || ''
          };
          localStorage.setItem(DELIV_DRAFT_KEY, JSON.stringify(d));
        }catch(e){ /* ignore */ }
      }, 300);
      ['recebedor','tel','end-rua','end-numero','end-bairro','end-cep','obs'].forEach(id=>{
        const el = byId(id); if(!el) return;
        el.addEventListener('input', saveDraft, { passive:true });
        el.addEventListener('change', saveDraft, { passive:true });
      });
    }catch(e){ console.warn('delivery draft save bind failed', e); }
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

  // Sem botões de geo

    function labelModalidadeTaxi(code){
      switch(String(code||'')){
        case 'Buscar apenas': return 'Táxi Dog (Buscar apenas)';
        case 'Entregar apenas': return 'Táxi Dog (Entregar apenas)';
        case 'Buscar e entregar': return 'Táxi Dog (Buscar e entregar)';
        default: return '';
      }
    }

    function resumoBanho(){
      const modalidadeCode = ($("input[name='modalidade']:checked")||{}).value || '';
      const modalidade = labelModalidadeTaxi(modalidadeCode);
      const geo = Geo.get('default');
      const map = {
        modalidade,
        petNome: (byId('petNome')?.value||'').trim() || '',
        tutorNome: (byId('tutorNome')?.value||'').trim() || '',
        tutorTelefone: (byId('tutorTelefone')?.value||'').trim() || '',
        origemEndereco: ['origem-rua','origem-numero','origem-bairro','origem-cep'].map(id=> (byId(id)?.value||'').trim()).filter(Boolean).join(', '),
        destinoEndereco: ['destino-rua','destino-numero','destino-bairro','destino-cep'].map(id=> (byId(id)?.value||'').trim()).filter(Boolean).join(', '),
        origemLat: geo? geo.lat.toFixed(6) : '',
        origemLng: geo? geo.lng.toFixed(6) : '',
        destinoLat: geo? geo.lat.toFixed(6) : '',
        destinoLng: geo? geo.lng.toFixed(6) : '',
        horario: fmtDT(byId('horario')?.value||'') || '',
        observacoes: (byId('obs')?.value||'').trim() || ''
      };
  return processMessageForPlatform(tidyMessage(interpolate(window.CONFIG.waTemplates.taxiBanho, map)));
    }

    function resumoAgendado(){
      const geo = Geo.get('default');
      const contato = (byId('contato2')?.value||'').trim();
      const [tutorNome, tutorTelefone] = contato.split(/•|\||-/).map(s=>s&&s.trim()) || ['',''];
      const map = {
        origemEndereco: ['origem2-rua','origem2-numero','origem2-bairro','origem2-cep'].map(id=> (byId(id)?.value||'').trim()).filter(Boolean).join(', '),
        destinoEndereco: ['destino2-rua','destino2-numero','destino2-bairro','destino2-cep'].map(id=> (byId(id)?.value||'').trim()).filter(Boolean).join(', '),
        origemLat: geo? geo.lat.toFixed(6) : '',
        origemLng: geo? geo.lng.toFixed(6) : '',
        destinoLat: geo? geo.lat.toFixed(6) : '',
        destinoLng: geo? geo.lng.toFixed(6) : '',
        horario: fmtDT(byId('horario2')?.value||'') || '',
        tutorNome: tutorNome||'',
        tutorTelefone: (tutorTelefone||'').trim() || '',
        observacoes: (byId('obs2')?.value||'').trim() || ''
      };
  return processMessageForPlatform(tidyMessage(interpolate(window.CONFIG.waTemplates.taxiAgendado, map)));
    }

    function resumo(){ return byId('tipo-banho').checked ? resumoBanho() : resumoAgendado(); }
    on(R.btnResumo,'click', ()=>{ if(R.resumo) R.resumo.textContent = resumo(); });

    // Validation helpers
    function reqAddr(prefix){
      let ok = true;
      ok &= required(byId(prefix+'-rua'), 'Informe a rua.');
      ok &= required(byId(prefix+'-numero'), 'Informe o número.');
      ok &= required(byId(prefix+'-bairro'), 'Informe o bairro.');
      ok &= required(byId(prefix+'-cep'), 'Informe o CEP.');
      return !!ok;
    }

    function validarTaxi(){
      let ok = true;
      const toast = byId('taxi-err'); if(toast){ toast.textContent=''; toast.classList.remove('error'); }
      const isBanho = R.tipoBanho.checked;
      if(isBanho){
        const modalidade = ($("input[name='modalidade']:checked")||{}).value || '';
        ok &= required(byId('petNome'), 'Informe o nome do pet.');
        ok &= required(byId('tutorNome'), 'Informe o nome do tutor.');
        ok &= required(byId('tutorTelefone'), 'Informe um telefone válido.');
        if(ok && !isTelBR(byId('tutorTelefone').value)){ setErr(byId('tutorTelefone'),'Informe um telefone válido.'); ok=false; }
        if(!modalidade){ ok=false; if(toast){ toast.classList.add('error'); toast.textContent='Selecione a modalidade (Buscar/Entregar/Buscar e entregar).'; } }
        if(modalidade === 'Buscar e entregar'){
          ok &= reqAddr('origem');
          ok &= reqAddr('destino');
        } else if(modalidade === 'Buscar apenas'){
          ok &= reqAddr('origem');
        } else if(modalidade === 'Entregar apenas'){
          ok &= reqAddr('destino');
        }
      } else {
        // Agendado (livre): exigir endereço completo de origem e destino, e um contato com telefone válido
        ok &= reqAddr('origem2');
        ok &= reqAddr('destino2');
        const contatoEl = byId('contato2');
        ok &= required(contatoEl, 'Informe um contato (nome e telefone).');
        const hasTel = isTelBR(contatoEl.value);
        if(ok && !hasTel){ setErr(contatoEl, 'Informe um telefone válido no contato.'); ok=false; }
      }
      if(!ok && toast){ toast.classList.add('error'); if(!toast.textContent) toast.textContent = 'Preencha os campos obrigatórios.'; toast.scrollIntoView({behavior:'smooth', block:'center'}); }
      return !!ok;
    }

    on(R.btnWA,'click', (e)=>{
      e.preventDefault();
      if(!validarTaxi()){
        try{ const firstInvalid = document.querySelector('[aria-invalid="true"]'); if(firstInvalid && firstInvalid.focus) firstInvalid.focus(); }catch(_){ }
        return;
      }
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
    const ver = (window.CONFIG && window.CONFIG.appVersion) ? String(window.CONFIG.appVersion) : '';
    const swUrl = ver ? `./sw.js?v=${encodeURIComponent(ver)}` : './sw.js';
    navigator.serviceWorker.register(swUrl, { scope: './' }).then(reg=>{
      // Poll for updates periodically (every 5 minutes) so deployed changes are noticed
      try{
        // Check more frequently to speed up propagation on devices (every 60s)
        setInterval(()=>{ try{ reg.update(); }catch(e){} }, 1000 * 60);
        // Also trigger an early update once after a short delay
        setTimeout(()=>{ try{ reg.update(); }catch(e){} }, 5000);
      }catch(e){}

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
          return processMessageForPlatform(tidyMessage(interpolate(tpl, map)));
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
        // Persist emoji override from URL if present (emoji=0|1)
        try{
          const u = new URL(location.href);
          const em = u.searchParams.get('emoji');
          if(em === '0'){ localStorage.setItem('focinhos:disableEmoji','1'); }
          else if(em === '1'){ localStorage.setItem('focinhos:disableEmoji','0'); }
        }catch(_){}
        // Use relative path so it works on GitHub Pages subpaths too
        const resp = await fetch('./config.json', { cache: 'no-store' });
        if(resp && resp.ok){ const json = await resp.json(); window.CONFIG = Object.assign(window.CONFIG || {}, json); }
      }catch(e){ console.warn('config.json fetch failed, using inline CONFIG if present', e); }
      // Run each init inside try/catch so a failure in one doesn't stop others
  [initNav, bindConfig, initAgendar, initDelivery, initTaxi, initCartPanel, initCartModal, initSW].forEach(fn=>{
        try{ if(typeof fn === 'function') fn(); }catch(err){ console.error('[init error]', err); }
      });
      try{ initFormPersistence(); }catch(e){ console.warn('initFormPersistence failed', e); }
  // Auto-start geolocation to capture coordinates silently
  try{ Geo.start('default'); }catch(e){}
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
