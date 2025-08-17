/* Focinhos Amados — main.js (vanilla, mobile-first)
   - Navegação mobile (drawer)
   - Bind de CONFIG (cidade, horários, rotas)
   - Geolocalização (watchPosition c/ melhor precisão)
   - Util: waLink(), interpolate()
   - Fluxos: agendar, delivery, taxi (resumo + WhatsApp)
   - SW register */
(function(){
  function getCliente(){ try{return window.Cliente?.get?.()||{};}catch{return {};}}
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

  // Link do WhatsApp com encode
  function waLink(msg){
    const phone = (window.CONFIG?.business?.phones?.whatsappE164) || '5531982339672';
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }
  window.waLink = waLink; // expõe globalmente conforme SPEC

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
  function getCliente(){ try{return window.Cliente?.get?.()||{};}catch{return {};}}
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
            timestamp: pos.timestamp
          };
          const best = state.best[key];
          if(!best || r.accuracy < best.accuracy){ state.best[key] = r; }
          const b = badge || byId(key.startsWith('origem')? 'geo-origem' : key.startsWith('destino')? 'geo-destino' : 'geo-badge');
          if(b){
            const when = new Date(state.best[key].timestamp).toLocaleTimeString('pt-BR');
            b.textContent = `~${fmtAcc(state.best[key].accuracy)}m @ ${when}`;
          }
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
    const f = {
      petNome: byId('petNome'), especie: byId('especie'), porte: byId('porte'), pelagem: byId('pelagem'),
      temperamento: byId('temperamento'), observacoes: byId('observacoes'), tutorNome: byId('tutorNome'), tutorTelefone: byId('tutorTelefone'),
      srvBanho: byId('srv-banho'), srvTosa: byId('srv-tosa'), tosaTipo: byId('tosaTipo'),
      perfume: byId('perfume'), acessorio: byId('acessorio'), escovacao: byId('escovacao'),
      dataPreferida: byId('dataPreferida'), janela: byId('janela'), endereco: byId('endereco')
    };
    const btnGeo = byId('btn-use-geo');
    const badge = byId('geo-badge');
    const btnResumo = byId('btn-ver-resumo');
    const preResumo = byId('agendar-resumo');
    const btnWA = byId('btn-wa');

    on(btnGeo,'click', ()=> Geo.start('default', badge));

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
      const geo = Geo.get('default');
      const map = {
        petNome: f.petNome.value.trim(),
        especie: f.especie.value,
        porte: f.porte.value,
        pelagem: f.pelagem.value || '-',
        servicosLista: getServicosLista() || '-',
        perfume: f.perfume.value,
        acessorio: f.acessorio.value,
        escovacao: f.escovacao.checked ? 'Sim' : 'Não',
        dataPreferida: fmtDate(f.dataPreferida.value),
        janela: f.janela.value,
        tutorNome: (f.tutorNome.value.trim() || getCliente().nome || ''),
        tutorTelefone: (f.tutorTelefone.value.trim() || getCliente().telefone || ''),
        enderecoCompleto: (f.endereco.value.trim() || getCliente().endereco || ''),
        lat: geo? geo.lat.toFixed(6) : '-',
        lng: geo? geo.lng.toFixed(6) : '-',
        accuracy: geo? fmtAcc(geo.accuracy) : '-',
        timestamp: geo? fmtDT(geo.timestamp) : '-',
        observacoes: f.observacoes.value.trim() || '-'
      };
      const tpl = window.CONFIG.waTemplates.agendar;
      return interpolate(tpl, map);
    }

    function validar(){
      let ok = true;
      ok &= required(f.petNome,'Preencha o nome do seu pet.');
      ok &= required(f.especie,'Selecione a espécie.');
      ok &= required(f.porte,'Selecione o porte.');
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
      // Se geoloc ausente, endereço deve vir
      if(!Geo.get('default') && !f.endereco.value.trim()){
        setErr(f.endereco,'Informe um endereço ou compartilhe sua localização.');
        ok=false;
      } else clearErr(f.endereco);
      return !!ok;
    }

    on(btnResumo,'click', ()=>{ preResumo.textContent = resumoTexto(); });
    on(btnWA,'click', (e)=>{ if(!validar()){ e.preventDefault(); return; } btnWA.href = waLink(resumoTexto()); });
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
    const cart = [];

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
      renderCart();
    });

    on(els.btnGeo,'click', ()=> Geo.start('default', els.badge));

    function resumoTexto(){
      const geo = Geo.get('default');
      const map = {
        itensLista: listagem() || '-',
        nome: (els.recebedor.value||'').trim(),
        telefone: (els.tel.value||'').trim(),
        enderecoCompleto: (els.endereco.value||'').trim(),
        lat: geo? geo.lat.toFixed(6) : '-',
        lng: geo? geo.lng.toFixed(6) : '-',
        accuracy: geo? fmtAcc(geo.accuracy) : '-',
        timestamp: geo? fmtDT(geo.timestamp) : '-',
        observacoes: (els.obs.value||'').trim() || '-'
      };
      return interpolate(window.CONFIG.waTemplates.delivery, map);
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

    on(els.btnResumo,'click', ()=> els.preResumo.textContent = resumoTexto());
    on(els.btnWA,'click', (e)=>{ if(!validar()){ e.preventDefault(); return; } els.btnWA.href = waLink(resumoTexto()); });
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
        origemEndereco: (byId('origem')?.value||'').trim() || '-',
        destinoEndereco: (byId('destino')?.value||'').trim() || '-',
        origemLat: geoO? geoO.lat.toFixed(6) : '-',
        origemLng: geoO? geoO.lng.toFixed(6) : '-',
        destinoLat: geoD? geoD.lat.toFixed(6) : '-',
        destinoLng: geoD? geoD.lng.toFixed(6) : '-',
        horario: fmtDT(byId('horario')?.value||'') || '-',
        observacoes: (byId('obs')?.value||'').trim() || '-'
      };
      return interpolate(window.CONFIG.waTemplates.taxiBanho, map);
    }

    function resumoAgendado(){
      const geoO = Geo.get('origem2');
      const geoD = Geo.get('destino2');
      const contato = (byId('contato2')?.value||'').trim();
      const [tutorNome, tutorTelefone] = contato.split(/•|\||-/).map(s=>s&&s.trim()) || ['',''];
      const map = {
        origemEndereco: (byId('origem2')?.value||'').trim() || '-',
        destinoEndereco: (byId('destino2')?.value||'').trim() || '-',
        origemLat: geoO? geoO.lat.toFixed(6) : '-',
        origemLng: geoO? geoO.lng.toFixed(6) : '-',
        destinoLat: geoD? geoD.lat.toFixed(6) : '-',
        destinoLng: geoD? geoD.lng.toFixed(6) : '-',
        horario: fmtDT(byId('horario2')?.value||'') || '-',
        tutorNome: tutorNome||'-',
        tutorTelefone: (tutorTelefone||'').trim() || '-',
        observacoes: (byId('obs2')?.value||'').trim() || '-'
      };
      return interpolate(window.CONFIG.waTemplates.taxiAgendado, map);
    }

    function resumo(){ return byId('tipo-banho').checked ? resumoBanho() : resumoAgendado(); }
    on(R.btnResumo,'click', ()=> R.resumo.textContent = resumo());
    on(R.btnWA,'click', (e)=>{ R.btnWA.href = waLink(resumo()); });
  }

  // ===== SW Register =====
  function initSW(){
    if('serviceWorker' in navigator){
      window.addEventListener('load', ()=>{
        navigator.serviceWorker.register('./sw.js').catch(()=>{});
      });
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', ()=>{
    initNav();
    bindConfig();
    initAgendar();
    initDelivery();
    initTaxi();
    initSW();
  });
})();
