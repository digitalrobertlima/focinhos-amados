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
  const fmtDate = (v)=>{ try{const d=new Date(v);return d.toLocaleDateString('pt-BR');}catch{return v||''} };
  const fmtDT = (v)=>{ try{const d=new Date(v);return d.toLocaleString('pt-BR');}catch{return v||''} };
  const onlyDigits = s=>String(s||'').replace(/\D+/g,'');
  const isTelBR = s=>{ const d=onlyDigits(s); return d.length===10 || d.length===11; };
  const fmtAcc = (n)=> typeof n==='number' ? Math.round(n) : '';
  const text = (el, v)=>{ if(el) el.textContent = v; };

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

  // ===== Carrinho persistido (localStorage) =====
  const CART_KEY = 'focinhos:cart';
  function getCartFromStorage(){
    try{ const raw = localStorage.getItem(CART_KEY); return raw? JSON.parse(raw): []; }catch(e){ return []; }
  }
  function saveCartToStorage(cart){
    try{ localStorage.setItem(CART_KEY, JSON.stringify(cart||[])); }catch(e){ console.warn('saveCartToStorage failed', e); }
  }
  function addToCartItem(item){
    try{
      const cart = getCartFromStorage();
      // normalize item
      const it = { nome: item.nome || item, variacao: item.variacao || '', qtd: Number(item.qtd||1) || 1 };
      // try merge by name+variacao
      const found = cart.find(c=> c.nome === it.nome && c.variacao === it.variacao);
      if(found){ found.qtd = (found.qtd||0) + it.qtd; } else { cart.push(it); }
      saveCartToStorage(cart);
      console.debug('[cart] added', it, 'cartLen', cart.length);
      // show lightweight feedback
      const t = byId('agendar-err'); if(t){ t.textContent = `Adicionado: ${it.nome}`; t.classList.add('ok'); setTimeout(()=>{ t.textContent=''; t.classList.remove('ok'); }, 2500); }
      // notify other pages by dispatching storage event (for same-window listeners)
      try{ window.dispatchEvent(new CustomEvent('focinhos:cart:changed', { detail: { cart } })); }catch(e){}
      return cart;
    }catch(e){ console.warn('addToCartItem failed', e); return null; }
  }

  // Link do WhatsApp com encode
  function waLink(msg){
    const phone = (window.CONFIG?.business?.phones?.whatsappE164) || '5531982339672';
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }
  window.waLink = waLink; // expõe globalmente conforme SPEC
  // Dev helper: log quando em localhost para depuração rápida
  try{
    if(location && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')){
      console.debug('[dev] waLink ready ->', waLink('teste-de-conexao'));
    }
  }catch(e){}

  // ===== Navegação mobile =====
  function initNav(){
    const btn = $('.nav__btn');
    const drawer = byId('drawer');
    if(!btn || !drawer) return;
    const close = ()=>{ btn.setAttribute('aria-expanded','false'); drawer.setAttribute('aria-hidden','true'); };
    const open = ()=>{ btn.setAttribute('aria-expanded','true'); drawer.setAttribute('aria-hidden','false'); };
    on(btn,'click', ()=>{
      const exp = btn.getAttribute('aria-expanded')==='true';
      exp?close():open();
    });
    on(document,'keydown', (e)=>{ if(e.key==='Escape') close(); });
    $$('#drawer a').forEach(a=> on(a,'click', close));
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
    // attach pointerdown to handle cases where browser autofill overlay steals the first click
    let _lastAddPetAt = 0;
    function invokeAddPetOnce(){ const t = Date.now(); if(t - _lastAddPetAt > 500){ _lastAddPetAt = t; addPet(); } }
    if(btnAddPet){
      on(btnAddPet,'pointerdown', (e)=>{ try{ invokeAddPetOnce(); }catch(e){ console.error(e); } });
      on(btnAddPet,'click', addPet);
    } else { console.warn('[agendar] btn-add-pet not found'); }

    // Add "Ver carrinho" button near summary to encourage upsell
    const summaryActions = document.querySelector('.card--summary .actions');
    if(summaryActions && !byId('btn-view-cart')){
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'btn-view-cart'; b.className = 'btn btn--ghost'; b.textContent = '🛒 Ver carrinho';
      b.addEventListener('click', ()=>{
        // build modal content from suggestions
        const products = window.CONFIG?.suggestions?.products || [];
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.position='fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0'; modal.style.background='rgba(0,0,0,0.5)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
        const box = document.createElement('div'); box.style.background='#fff'; box.style.padding='16px'; box.style.maxWidth='420px'; box.style.width='90%'; box.style.maxHeight='80%'; box.style.overflow='auto';
        box.innerHTML = `<h3>Produtos sugeridos</h3><div id="__cart-suggest-list"></div><div style="margin-top:12px;text-align:right"><button id="__cart-close" class="btn btn--ghost">Fechar</button></div>`;
        modal.appendChild(box);
        document.body.appendChild(modal);
        const list = box.querySelector('#__cart-suggest-list');
        products.forEach(p=>{
          const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.margin='6px 0';
          const name = document.createElement('div'); name.textContent = p;
          const add = document.createElement('button'); add.className='btn btn--primary'; add.textContent='Adicionar'; add.addEventListener('click', ()=>{ addToCartItem({ nome:p, qtd:1 }); });
          row.appendChild(name); row.appendChild(add); list.appendChild(row);
        });
        box.querySelector('#__cart-close').addEventListener('click', ()=>{ document.body.removeChild(modal); });
      });
      summaryActions.insertBefore(b, summaryActions.firstChild);
    }

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

    on(btnResumo,'click', ()=>{ console.debug('[agendar] btn-ver-resumo clicked'); if(preResumo) preResumo.textContent = resumoTexto(); });
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

    function renderCart(){
      if(!els.carrinho) return;
      els.carrinho.innerHTML = cart.map((it,idx)=>
        `<li>
          <div><strong>${it.nome}</strong>${it.variacao? ` — ${it.variacao}`:''}</div>
          <div class="item__qty">
            <button class="item__btn" data-act="dec" data-idx="${idx}">−</button>
            <span>${it.qtd}</span>
            <button class="item__btn" data-act="inc" data-idx="${idx}">＋</button>
            <button class="item__btn item__remove" data-act="rm" data-idx="${idx}">remover</button>
          </div>
        </li>`
      ).join('');
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
      if(!Geo.get('default') && !(els.endereco.value||'').trim()){ setErr(els.endereco,'Informe o endereço ou compartilhe sua localização.'); ok=false; } else clearErr(els.endereco);
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
  }

  // ===== SW Register =====
  function initSW(){
    if('serviceWorker' in navigator){
      window.addEventListener('load', ()=>{
  // register service worker using relative path so it works on GitHub Pages and subpaths
  try{
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((err)=>{ console.warn('ServiceWorker register failed:', err); });
  }catch(err){ console.warn('ServiceWorker register throw:', err); }
      });
    }
  }

  // ===== Init cart menu (header/drawer) =====
  function initCartMenu(){
    // open modal showing current cart
    function openCartModal(){
      const cart = getCartFromStorage();
      const modal = document.createElement('div');
      modal.className = 'modal'; modal.style.position='fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0'; modal.style.background='rgba(0,0,0,0.5)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
      const box = document.createElement('div'); box.style.background='#fff'; box.style.padding='16px'; box.style.maxWidth='520px'; box.style.width='95%'; box.style.maxHeight='80%'; box.style.overflow='auto';
      box.innerHTML = `<h3>Seu carrinho</h3><div id="__cart-items"></div><div style="margin-top:12px;text-align:right"><button id="__cart-close" class="btn btn--ghost">Fechar</button></div>`;
      modal.appendChild(box); document.body.appendChild(modal);
      const node = box.querySelector('#__cart-items');
      if(!cart || cart.length===0){ node.innerHTML = '<p>Seu carrinho está vazio.</p>'; }
      else{
        node.innerHTML = cart.map((it,idx)=> `<div style="display:flex;justify-content:space-between;margin:6px 0"><div><strong>${it.nome}</strong>${it.variacao? ' — '+it.variacao : ''}</div><div><span style="margin-right:8px">${it.qtd}x</span><button data-idx="${idx}" class="btn btn--ghost" data-act="rm">Remover</button></div></div>`).join('');
        node.querySelectorAll('button[data-act="rm"]').forEach(btn=> btn.addEventListener('click', (e)=>{
          const idx = +btn.dataset.idx; const c = getCartFromStorage(); c.splice(idx,1); saveCartToStorage(c); // update UI
          btn.closest('div').remove();
        }));
      }
      box.querySelector('#__cart-close').addEventListener('click', ()=>{ document.body.removeChild(modal); });
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
    // Run each init inside try/catch so a failure in one doesn't stop others
  [initNav, bindConfig, initAgendar, initDelivery, initTaxi, initSW, initCartMenu].forEach(fn=>{
      try{ if(typeof fn === 'function') fn(); }catch(err){ console.error('[init error]', err); }
    });
  try{ initFormPersistence(); }catch(e){ console.warn('initFormPersistence failed', e); }
    // Global error handler to help identificar erros em produção/local
    window.addEventListener('error', (ev)=>{
      try{ console.error('Unhandled error:', ev.error || ev.message || ev); }catch(e){}
    });
  });
})();
