/* main.js (v2.1)
   Ajustes:
   - Delivery: interpreta textarea (delivery.texto) ⇄ lista (delivery.itens)
   - Binds extras: logistica.tipo_label, logistica.subtexto, logistica.endereco.full
   - data-if: render condicional simples
   ————————————————————————————————————————————————————————————————
   Estado persistente (localStorage), autosave/restore, injeção de componentes,
   wizard, resumo, upsell, LGPD, WhatsApp. Zero libs externas.
*/
(function(){
  'use strict';

  // ————————————————————————————————————————————————————————————————
  // Helpers DOM
  // ————————————————————————————————————————————————————————————————
  const byId = (id,root=document)=>root.getElementById(id);
  const qs = (sel,root=document)=>root.querySelector(sel);
  const qsa = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const on = (el,ev,fn,opts)=>el && el.addEventListener(ev,fn,opts);

  function toast(msg){
    let t = byId('resumo-toast') || qs('.toast');
    if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-visible');
    setTimeout(()=>t.classList.remove('is-visible'), 1800);
  }

  // ————————————————————————————————————————————————————————————————
  // Estado + persistência
  // ————————————————————————————————————————————————————————————————
  const DEFAULT_STATE = {
    lgpd: false,
    cliente: { nome: '', telefone: '' },
    pet: { nome: '', porte: '', observacoes: '' },
    servicos: { banho:false, tosa:false, unhas:false, limpeza_ouvido:false, hidratacao:false, perfume:false, add_taxi:false },
    agenda: { data: '', janela: '', observacoes: '' },
    logistica: { tipo:'', usar_geo:false, lat:null, lng:null, endereco:{ rua:'', numero:'', bairro:'', cidade:'', ref:'' } },
    delivery: { itens: [], texto: '' },
    sugestoes: [], // títulos selecionados
    _meta: { updatedAt: 0 }
  };

  const STORAGE_KEY = (window.CONFIG && window.CONFIG.STORAGE && window.CONFIG.STORAGE.KEY) || 'fa_state_v1';
  const TTL_MS = (window.CONFIG && window.CONFIG.STORAGE && window.CONFIG.STORAGE.TTL_MS) || 7*24*60*60*1000;

  let state = clone(DEFAULT_STATE);
  let saveTimer = null;
  let saveListeners = new Set();

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  function deepGet(obj, path){
    if(!path) return undefined; const parts = String(path).split('.');
    let cur = obj; for(const p of parts){ if(cur==null) return undefined; cur = cur[p]; }
    return cur;
  }
  function deepSet(obj, path, value){
    const parts = String(path).split('.'); let cur = obj;
    for(let i=0;i<parts.length-1;i++){ const p=parts[i]; if(!(p in cur) || typeof cur[p]!== 'object' || cur[p]==null){ cur[p] = {}; } cur = cur[p]; }
    cur[parts[parts.length-1]] = value; return obj;
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return clone(DEFAULT_STATE);
      const data = JSON.parse(raw);
      if(!data._meta || !data._meta.updatedAt || (Date.now()-data._meta.updatedAt)>TTL_MS){
        return clone(DEFAULT_STATE);
      }
      // garante novas chaves (ex.: delivery.texto)
      const merged = Object.assign(clone(DEFAULT_STATE), data);
      if(!merged.delivery) merged.delivery = { itens: [], texto: '' };
      if(!Array.isArray(merged.delivery.itens)) merged.delivery.itens = [];
      if(typeof merged.delivery.texto !== 'string') merged.delivery.texto = stringifyDeliveryItems(merged.delivery.itens);
      return merged;
    }catch(e){ console.warn('loadState err',e); return clone(DEFAULT_STATE); }
  }

  function saveState(immediate=false){
    const doSave = ()=>{
      state._meta = state._meta || {}; state._meta.updatedAt = Date.now();
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('saveState err',e); }
      renderSaveIndicator('saved');
      saveListeners.forEach(fn=>{ try{ fn(state); }catch{} });
    };
    if(immediate){ doSave(); return; }
    renderSaveIndicator('saving');
    clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 300);
  }

  function clearState(){ state = clone(DEFAULT_STATE); saveState(true); renderAll(); }

  function renderSaveIndicator(status){
    const txt = status==='saving' ? 'Salvando…' : 'Rascunho salvo';
    qsa('[data-bind="saveIndicator"]').forEach(el=> el.textContent = txt);
    qsa('.save-indicator').forEach(el=> el.textContent = 'Rascunho salvo');
  }

  // ————————————————————————————————————————————————————————————————
  // Delivery helpers
  // ————————————————————————————————————————————————————————————————
  function parseDeliveryText(text){
    if(!text) return [];
    // separa por quebras de linha ou vírgulas/semicolon
    const parts = String(text).split(/\r?\n|,|;/g).map(s=>s.trim()).filter(Boolean);
    // remove duplicatas mantendo ordem
    const seen = new Set();
    const out = [];
    for(const p of parts){ const key = p.toLowerCase(); if(!seen.has(key)){ seen.add(key); out.push(p); } }
    return out;
  }
  function stringifyDeliveryItems(arr){ return (arr||[]).join('\n'); }

  // ————————————————————————————————————————————————————————————————
  // Data‑bind (inputs & spans)
  // ————————————————————————————————————————————————————————————————
  function bindInputs(root=document){
    qsa('[data-bind]', root).forEach(el=>{
      const path = el.getAttribute('data-bind');
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type')||'').toLowerCase();

      const isInput = tag==='input' || tag==='textarea' || tag==='select';
      const isRadio = isInput && type==='radio';
      const isCheckbox = isInput && type==='checkbox';

      // ——— Caso especial: delivery.texto (textarea ⇄ itens) ———
      if(isInput && path === 'delivery.texto'){
        // Inicializa textarea a partir de state.delivery.texto OU itens
        const current = state?.delivery?.texto || stringifyDeliveryItems(state?.delivery?.itens||[]);
        el.value = current;
        on(el, 'input', ()=>{
          const val = el.value;
          state.delivery.texto = val;
          state.delivery.itens = parseDeliveryText(val);
          saveState();
        });
        return; // não aplicar o restante da lógica padrão
      }

      // Initialize value from state
      const curVal = deepGet(state, path);
      if(isRadio){
        const val = el.value; el.checked = (curVal === val);
      } else if(isCheckbox){
        el.checked = !!curVal;
      } else if(isInput){
        if(curVal!=null) el.value = curVal;
      } else {
        applyTextBind(el, path);
      }

      // Attach listeners para inputs
      if(isInput){
        const ev = (tag==='select' || type==='date' || type==='radio' || type==='checkbox') ? 'change' : 'input';
        on(el, ev, ()=>{
          let v;
          if(isRadio){ v = el.value; if(el.checked){ deepSet(state, path, v); saveState(); renderAll(); } return; }
          if(isCheckbox){ v = !!el.checked; deepSet(state, path, v); saveState(); return; }
          v = el.value; deepSet(state, path, v); saveState();
        });
      }
    });
  }

  function applyTextBind(el, path){
    // computed binds
    if(path === 'servicos._resumo'){
      el.textContent = window.CONFIG.__format.servicesSummary(state); return;
    }
    if(path === 'logistica._resumo'){
      el.textContent = window.CONFIG.__format.logisticaSummary(state); return;
    }
    if(path === 'agenda.obs_edit'){
      if(el.tagName.toLowerCase()==='textarea'){
        el.value = state?.agenda?.observacoes || '';
        on(el,'input',()=>{ state.agenda.observacoes = el.value; saveState(); });
      } else { el.textContent = state?.agenda?.observacoes || ''; }
      return;
    }
    if(path === 'logistica.tipo_label'){
      el.textContent = window.CONFIG.__format.logisticaLabel(state?.logistica?.tipo); return;
    }
    if(path === 'logistica.subtexto'){
      el.textContent = window.CONFIG.__format.logisticaSub(state?.logistica?.tipo); return;
    }
    if(path === 'logistica.endereco.full'){
      el.textContent = window.CONFIG.__format.fullAddress(state?.logistica?.endereco); return;
    }
    // generic
    const v = deepGet(state, path);
    el.textContent = (v==null || v==='') ? '—' : v;
  }

  function renderTextBinds(root=document){
    qsa('[data-bind]', root).forEach(el=>{
      const tag=el.tagName.toLowerCase(); const type=(el.getAttribute('type')||'').toLowerCase();
      if(tag!=='input' && tag!=='textarea' && tag!=='select'){
        applyTextBind(el, el.getAttribute('data-bind'));
      }
    });
  }

  function renderConditionals(root=document){
    qsa('[data-if]', root).forEach(el=>{
      try{
        const path = el.getAttribute('data-if');
        const val = !!deepGet(state, path);
        el.hidden = !val;
      }catch{ el.hidden = true; }
    });
  }

  // Mask phone (BR) — gentil
  function setupPhoneMask(){
    const tel = byId('cli-tel'); if(!tel) return;
    on(tel,'input',()=>{
      let v = tel.value.replace(/\D+/g,'');
      if(v.startsWith('55')) v = v.slice(2);
      const ddd = v.slice(0,2), p1 = v.slice(2,7), p2 = v.slice(7,11);
      let out = '';
      if(ddd){ out += `(${ddd})`; }
      if(p1){ out += ` ${p1}`; }
      if(p2){ out += `-${p2}`; }
      tel.value = out.trim();
      deepSet(state,'cliente.telefone', tel.value); saveState();
    });
  }

  // ————————————————————————————————————————————————————————————————
  // Componentes (carregar e injetar)
  // ————————————————————————————————————————————————————————————————
  async function injectComponents(){
    if(!byId('resumo-modal')){
      try{ const r = await fetch('components/resumo.html'); const html = await r.text(); const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild); }
      catch(e){ console.warn('resumo component',e); }
    }
    if(!byId('wizard')){
      try{ const r = await fetch('components/wizard.html'); const html = await r.text(); const wrap = document.createElement('div'); wrap.innerHTML = html; const el = wrap.firstElementChild; const target = qs('main') || document.body; target.insertBefore(el, target.firstChild || null); }
      catch(e){ console.warn('wizard component',e); }
    }
  }

  // ————————————————————————————————————————————————————————————————
  // Wizard
  // ————————————————————————————————————————————————————————————————
  let wizardEl, stepsEls, currentStep = 0;
  function setupWizard(){
    wizardEl = byId('wizard'); if(!wizardEl) return;
    wizardEl.hidden = false;
    stepsEls = qsa('.wizard__step', wizardEl);

    updateWizardStep(0, true);

    on(qs('[data-action="next"]', wizardEl),'click',()=>{ updateWizardStep(currentStep+1); });
    on(qs('[data-action="back"]', wizardEl),'click',()=>{ updateWizardStep(currentStep-1); });

    qsa('[data-goal]', wizardEl).forEach(btn=> on(btn,'click',()=>{ updateWizardStep(1); }));

    qsa('[data-action="geolocate"]', wizardEl).forEach(btn=> on(btn,'click', geolocate));

    qsa('[data-action="open-resumo"]', wizardEl).forEach(btn=> on(btn,'click', openResumo));
    qsa('[data-action="edit-from-resumo"]', wizardEl).forEach(btn=> on(btn,'click', ()=> updateWizardStep(1)));

    const d = byId('ag-data'); if(d){ const today = new Date(); d.min = today.toISOString().slice(0,10); }

    bindInputs(wizardEl);
    renderTextBinds(wizardEl);
    renderConditionals(wizardEl);
  }

  function updateWizardStep(next, init=false){
    if(!stepsEls || !stepsEls.length) return;
    currentStep = Math.max(0, Math.min(stepsEls.length-1, next));
    stepsEls.forEach((sec,i)=>{ sec.hidden = i!==currentStep; });
    qsa('.wizard__steps li', wizardEl).forEach(li=>{ const idx = +li.getAttribute('data-step-index'); li.classList.toggle('is-current', idx===currentStep); });
    const prog = qs('[data-bind="wizard.progress"]', wizardEl);
    if(prog) prog.textContent = `Passo ${currentStep+1} de ${stepsEls.length}`;
    if(!init) window.scrollTo({top:0, behavior:'smooth'});
  }

  // ————————————————————————————————————————————————————————————————
  // Geolocalização
  // ————————————————————————————————————————————————————————————————
  function geolocate(){
    if(!navigator.geolocation){ toast('Geolocalização não disponível'); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      const { latitude, longitude } = pos.coords;
      state.logistica.usar_geo = true; state.logistica.lat = +latitude.toFixed(6); state.logistica.lng = +longitude.toFixed(6);
      saveState(); renderAll(); toast('Localização adicionada');
    }, err=>{ console.warn('geo err',err); toast('Não foi possível obter a localização'); }, { enableHighAccuracy:true, timeout:8000, maximumAge:0 });
  }

  // ————————————————————————————————————————————————————————————————
  // Resumo Modal
  // ————————————————————————————————————————————————————————————————
  let resumoModal;
  function setupResumo(){
    resumoModal = byId('resumo-modal'); if(!resumoModal) return;

    qsa('[data-action="open-resumo"]').forEach(el=> on(el,'click', openResumo));
    qsa('[data-action="close"]', resumoModal).forEach(el=> on(el,'click', closeResumo));
    on(qs('.modal__overlay', resumoModal),'click', closeResumo);
    on(document,'keydown',e=>{ if(e.key==='Escape' && !resumoModal.hidden) closeResumo(); });

    const btnWA = byId('btn-wa-resumo');
    const btnCopy = byId('btn-copy-resumo');
    const btnClear = byId('btn-clear-resumo');
    const lgpdBox = byId('lgpd-consent-resumo');

    on(btnWA,'click', ()=>{ const url = buildWhatsAppURL(); if(!url){ toast('Complete seus dados para enviar.'); return; } window.open(url, '_blank'); });
    on(btnCopy,'click', ()=>{ const text = buildWhatsappMessage(); navigator.clipboard.writeText(text).then(()=>toast('Resumo copiado')); });
    on(btnClear,'click', ()=>{ clearState(); toast('Rascunho limpo'); });

    if(lgpdBox){ on(lgpdBox,'change', ()=>{ state.lgpd = !!lgpdBox.checked; saveState(); gateWhatsApp(); }); }

    qsa('[data-edit]', resumoModal).forEach(btn=> on(btn,'click', ()=>{
      const key = btn.getAttribute('data-edit');
      if(wizardEl){ const map = { cliente:5, pet:2, servicos:1, agenda:3, logistica:4, delivery:null }; if(map[key]!=null){ closeResumo(); updateWizardStep(map[key]); return; } }
      const href = key==='delivery' ? 'delivery.html' : (key==='logistica' || key==='servicos' || key==='pet' || key==='agenda' || key==='cliente') ? 'agendar.html' : 'index.html';
      window.location.href = href;
    }));

    on(qs('[data-action="dismiss-upsell"]', resumoModal),'click', ()=>{ const until = Date.now() + 30*24*60*60*1000; try{ localStorage.setItem('fa_upsell_dismiss_until', String(until)); }catch{} renderUpsell(); });

    bindInputs(resumoModal);
  }

  function openResumo(){
    if(!resumoModal) return;
    resumoModal.hidden = false; document.body.style.overflow='hidden';
    renderResumo(); gateWhatsApp();
    const first = qs('[data-sentinel="start"]', resumoModal); first && first.focus();
  }
  function closeResumo(){ if(!resumoModal) return; resumoModal.hidden = true; document.body.style.overflow=''; }

  function renderResumo(){
    const ulServ = byId('resumo-servicos-list'); if(ulServ){ ulServ.innerHTML=''; window.CONFIG.__format.servicesList(state).forEach(item=>{ const li=document.createElement('li'); li.textContent=item; ulServ.appendChild(li); }); }
    const ulDel = byId('resumo-delivery-list'); if(ulDel){ ulDel.innerHTML=''; const items=(state.delivery?.itens||[]); if(items.length){ items.forEach(item=>{ const li=document.createElement('li'); li.textContent=item; ulDel.appendChild(li); }); } else { const li=document.createElement('li'); li.className='muted'; li.textContent='Sem itens'; ulDel.appendChild(li); } }

    // LGPD
    const lgpdSection = byId('lgpd-section'); const lgpdBox = byId('lgpd-consent-resumo');
    if(lgpdSection){ lgpdSection.hidden = !!state.lgpd; if(lgpdBox) lgpdBox.checked = !!state.lgpd; }

    // Raw WA
    const raw = byId('resumo-text-raw'); if(raw){ raw.value = buildWhatsappMessage(); }

    renderUpsell();
    renderTextBinds(resumoModal);
    renderConditionals(resumoModal);
  }

  function renderUpsell(){
    const list = byId('upsell-list'); const empty = byId('upsell-empty'); if(!list) return;
    const dismissUntil = +(localStorage.getItem('fa_upsell_dismiss_until')||0);
    const now = Date.now();
    list.innerHTML='';
    let suggestions = computeSuggestions(state);
    if(now < dismissUntil){ suggestions = []; }

    if(!suggestions.length){ if(empty) empty.hidden=false; return; } else { if(empty) empty.hidden=true; }

    const tpl = byId('tpl-upsell-chip');
    suggestions.forEach(sg=>{
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.suggestId = sg.id;
      qs('.chip__title', node).textContent = sg.title;
      qs('.chip__sub', node).textContent = sg.sub || '';

      const selected = (state.sugestoes||[]).includes(sg.title);
      node.setAttribute('aria-checked', selected?'true':'false');

      on(node,'click',()=>{
        const cur = new Set(state.sugestoes||[]);
        if(cur.has(sg.title)) cur.delete(sg.title); else cur.add(sg.title);
        state.sugestoes = Array.from(cur);
        node.setAttribute('aria-checked', cur.has(sg.title)?'true':'false');
        saveState();
      });

      list.appendChild(node);
    });
  }

  function computeSuggestions(s){
    const rules = (window.CONFIG && window.CONFIG.UPSELL && window.CONFIG.UPSELL.rules) || [];
    const arr = [];
    for(const r of rules){ try{ if(r.when && r.when(s)){ arr.push({ id:r.id, priority:r.priority||999, title: (typeof r.title==='function'? r.title(s): r.title), sub:(typeof r.sub==='function'? r.sub(s): r.sub) }); } }catch{} }
    arr.sort((a,b)=> a.priority-b.priority);
    return arr.slice(0,3);
  }

  function gateWhatsApp(){
    const btnWA = byId('btn-wa-resumo'); if(!btnWA) return;
    const hasTel = (state?.cliente?.telefone||'').replace(/\D+/g,'').length >= 10;
    const ok = !!state.lgpd && hasTel;
    btnWA.toggleAttribute('disabled', !ok);
    if(!ok){ btnWA.removeAttribute('href'); }
  }

  function buildWhatsappMessage(){
    const template = window.CONFIG.whatsapp.template;
    return template(state, { footer: null });
  }
  function buildWhatsAppURL(){
    if(!state.lgpd) return '';
    const msg = buildWhatsappMessage();
    const base = window.CONFIG.whatsapp.base;
    const phone = window.CONFIG.whatsapp.phone;
    if(!phone) return '';
    return `${base}${phone}?text=${encodeURIComponent(msg)}`;
  }

  // ————————————————————————————————————————————————————————————————
  // Open badge (Home)
  // ————————————————————————————————————————————————————————————————
  function setupOpenBadge(){
    const el = byId('open-badge'); if(!el) return;
    const refresh = ()=>{ el.textContent = window.CONFIG.__format.openBadgeText(); };
    refresh(); setInterval(refresh, 60000);
  }

  // ————————————————————————————————————————————————————————————————
  // Render geral
  // ————————————————————————————————————————————————————————————————
  function renderAll(){
    renderTextBinds(document);
    renderConditionals(document);
    renderResumo();
  }

  // ————————————————————————————————————————————————————————————————
  // Init
  // ————————————————————————————————————————————————————————————————
  document.addEventListener('DOMContentLoaded', async ()=>{
    await injectComponents();
    state = loadState();

    bindInputs(document);
    setupWizard();
    setupResumo();
    setupOpenBadge();
    setupPhoneMask();
    renderAll();

    window.addEventListener('beforeunload', ()=> saveState(true));
  });
})();
