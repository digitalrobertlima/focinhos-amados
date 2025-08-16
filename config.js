/* config.js (v2) — estado, labels, horários, regras de sugestão
   - Zero libs externas; configurações + pequenos helpers puros
   - Tudo que é texto/label/regra fica aqui; a lógica de UI/estado fica no main.js
*/
(function(){
  // ————————————————————————————————————————————————————————————————
  // Identidade do negócio & canais
  // ————————————————————————————————————————————————————————————————
  const BUSINESS = {
    name: "Focinhos Amados",
    city: "Contagem, MG",
    // Horários fixos solicitados: seg–sáb 10:00–20:00; dom 10:00–13:00
    hours: {
      mon_sat: "10:00–20:00",
      sun: "10:00–13:00"
    }
  };

  const WHATSAPP = {
    // E.164 Brasil: 55 + DDD + número (sem espaços). (31) 98233-9672
    phone: "5531982339672",
    base: "https://wa.me/",
    // Mensagem padrão (pode ser sobrescrita pelo main.js se necessário)
    template(state, extras){
      const f = CONFIG.__format;
      const servicos = f.servicesSummary(state) || "—";
      const quando = `${state?.agenda?.data || "—"} ${state?.agenda?.janela || ""}`.trim();
      const onde = f.logisticaSummary(state) || "—";
      const delivery = f.deliveryItemsSummary(state) || "—";
      const upsell = (state?.sugestoes || []).filter(Boolean).join(", ");

      const linhas = [
        `${BUSINESS.name} — Pedido`,
        `Cliente: ${state?.cliente?.nome || "—"} (${state?.cliente?.telefone || "—"})`,
        `Pet: ${state?.pet?.nome || "—"}/${state?.pet?.porte || "—"}`,
        `Serviços: ${servicos}`,
        `Quando: ${quando}`,
        `Onde: ${onde}`,
        delivery ? `Delivery: ${delivery}` : null,
        upsell ? `Adicionais: ${upsell}` : null,
        state?.agenda?.observacoes ? `Obs.: ${state.agenda.observacoes}` : null,
        `LGPD: ${state?.lgpd ? "ok" : "pendente"}`
      ].filter(Boolean);

      if(extras?.footer) linhas.push(extras.footer);
      return linhas.join("\n");
    }
  };

  // ————————————————————————————————————————————————————————————————
  // Armazenamento local (estado persistente)
  // ————————————————————————————————————————————————————————————————
  const STORAGE = {
    KEY: "fa_state_v1",
    TTL_DAYS: 7,
    get TTL_MS(){ return this.TTL_DAYS * 24 * 60 * 60 * 1000; }
  };

  // ————————————————————————————————————————————————————————————————
  // Rótulos e mapeamentos
  // ————————————————————————————————————————————————————————————————
  const LABELS = {
    porte: { pequeno: "Pequeno", medio: "Médio", grande: "Grande" },
    janela: { manha: "manhã", tarde: "tarde", noite: "noite" },
    logistica: {
      loja: { label: "Vou levar na loja", sub: "Entrega e retirada na unidade" },
      ida: { label: "Buscar em casa (ida)", sub: "Buscamos seu pet no endereço informado" },
      volta: { label: "Levar de volta (volta)", sub: "Levamos seu pet após o serviço" },
      ida_e_volta: { label: "Buscar e levar (ida e volta)", sub: "Cuidamos da ida e da volta" }
    },
    lgpd_hint: "Usamos seus dados apenas para atendimento via WhatsApp.",
  };

  // ————————————————————————————————————————————————————————————————
  // Catálogo simples (exemplos — pode ser ampliado; sem preços)
  // ————————————————————————————————————————————————————————————————
  const CATALOG = {
    racoes: [
      "Premier Raças Médias 10kg",
      "Golden Seleção Natural 10kg",
      "Special Dog Prime 12kg",
      "GranPlus Menu 10kg"
    ],
    petiscos: [
      "Petisco dental",
      "Bifinho macio",
      "Ossinho mastigável"
    ],
    higiene: [
      "Tapete higiênico",
      "Shampoo hipoalergênico"
    ]
  };

  // ————————————————————————————————————————————————————————————————
  // Regras de sugestão (upsell/cross‑sell)
  //  - computeSuggestions(state) no main.js vai percorrer esta lista
  //  - cada item define: id, prioridade, quando exibir e como textualizar
  // ————————————————————————————————————————————————————————————————
  const UPSELL = {
    rules: [
      {
        id: "taxi_volta",
        priority: 10,
        title: s => "Taxi Dog (volta)",
        sub: s => "Quer que a gente leve seu pet de volta? Confirmamos pelo WhatsApp.",
        when: s => (s?.servicos?.banho || s?.servicos?.tosa) && (s?.logistica?.tipo === "loja" || s?.logistica?.tipo === "ida"),
      },
      {
        id: "hidratacao",
        priority: 20,
        title: s => "Hidratação",
        sub: s => "Pelos macios e fáceis de pentear. Incluo no banho?",
        when: s => (s?.servicos?.banho || s?.servicos?.tosa) && s?.pet?.porte === "grande",
      },
      {
        id: "unhas",
        priority: 30,
        title: s => "Corte de unhas",
        sub: s => "Aproveito o banho para aparar as unhas.",
        when: s => (s?.servicos?.banho || s?.servicos?.tosa) && !s?.servicos?.unhas,
      },
      {
        id: "racao_habitual",
        priority: 40,
        title: s => `Ração do ${s?.pet?.nome || "pet"}`,
        sub: s => "Deixo separada para levar? Combinamos pelo WhatsApp.",
        when: s => !!(s?.pet?.nome),
      },
      {
        id: "tapete_higienico",
        priority: 50,
        title: s => "Tapete higiênico",
        sub: s => "Quer aproveitar e incluir?",
        when: s => s?.agenda?.janela === "manha",
      },
      {
        id: "assinatura_racao",
        priority: 60,
        title: s => "Assinatura de ração",
        sub: s => "Nunca mais ficar sem — combinamos entrega mensal.",
        when: s => s?.history?.comprou_racao === true,
      }
    ]
  };

  // ————————————————————————————————————————————————————————————————
  // Helpers de formatação e horários (sem dependências)
  // ————————————————————————————————————————————————————————————————
  const __format = {
    strToMin(s){ const [h, m] = String(s || "0:0").split(":").map(n => +n || 0); return h*60 + m; },
    fullAddress(addr){
      if(!addr) return "—";
      const parts = [addr.rua, addr.numero, addr.bairro, addr.cidade].filter(Boolean);
      const base = parts.join(", ");
      return addr.ref ? `${base} (ref.: ${addr.ref})` : (base || "—");
    },
    logisticaLabel(tipo){ return LABELS.logistica[tipo]?.label || "—"; },
    logisticaSub(tipo){ return LABELS.logistica[tipo]?.sub || ""; },
    servicesList(state){
      const S = state?.servicos || {};
      const items = [];
      if(S.banho) items.push("Banho");
      if(S.tosa) items.push("Tosa");
      if(S.unhas) items.push("Corte de unhas");
      if(S.limpeza_ouvido) items.push("Limpeza de ouvido");
      if(S.hidratacao) items.push("Hidratação");
      if(S.perfume) items.push("Perfume hipoalergênico");
      if(S.add_taxi) items.push("Taxi Dog");
      return items;
    },
    servicesSummary(state){
      const items = this.servicesList(state);
      return items.length ? items.join(", ") : "—";
    },
    logisticaSummary(state){
      const L = state?.logistica || {};
      const label = this.logisticaLabel(L.tipo);
      const addr = this.fullAddress(L.endereco);
      let geo = "";
      if(L.usar_geo && (L.lat || L.lng)) geo = ` — Geo: ${L.lat || "?"}, ${L.lng || "?"}`;
      return [label, addr].filter(Boolean).join(" — ") + geo;
    },
    deliveryItemsSummary(state){
      const items = (state?.delivery?.itens || []).slice();
      return items.length ? items.join(", ") : "";
    },
    // Horários/abertura
    openStatus(date = new Date()){
      const { mon_sat, sun } = BUSINESS.hours;
      const wd = date.getDay(); // 0=Dom..6=Sáb
      const def = (wd === 0) ? sun : mon_sat;
      const [openStr, closeStr] = String(def).split("–");
      if(!openStr || !closeStr) return { open:false, openAt:null, closeAt:null, nextOpen:null };
      const nowMin = date.getHours()*60 + date.getMinutes();
      const openMin = this.strToMin(openStr);
      const closeMin = this.strToMin(closeStr);
      const open = nowMin >= openMin && nowMin < closeMin;

      let nextOpen = null;
      if(!open){
        if(nowMin < openMin){
          nextOpen = { dayOffset: 0, time: openStr };
        } else {
          // Próximo dia: se hoje é sábado (6) → domingo (usa sun), senão mantém mon_sat
          const nextWd = (wd + 1) % 7;
          const nxt = (nextWd === 0) ? sun : mon_sat;
          nextOpen = { dayOffset: 1, time: String(nxt).split("–")[0] };
        }
      }
      return { open, openAt: openStr, closeAt: closeStr, nextOpen };
    },
    openBadgeText(date = new Date()){
      const st = this.openStatus(date);
      if(st.open) return "🟢 Aberto agora";
      if(st.nextOpen) return `🔴 Fechado — abre às ${st.nextOpen.time}`;
      return "🔴 Fechado";
    }
  };

  // ————————————————————————————————————————————————————————————————
  // Exposição global
  // ————————————————————————————————————————————————————————————————
  const CONFIG = {
    VERSION: "2025-08-16.v2",
    business: BUSINESS,
    whatsapp: WHATSAPP,
    STORAGE,
    LABELS,
    CATALOG,
    UPSELL,
    __format: __format,
    wizard: {
      steps: ["Objetivo","Serviços","Pet","Quando","Onde","Contato","Resumo"],
    }
  };

  // Evita sobrescrever caso já exista e deseje comparar versões
  if(window.CONFIG){ window.CONFIG = Object.assign({}, window.CONFIG, CONFIG); }
  else { window.CONFIG = CONFIG; }
})();
