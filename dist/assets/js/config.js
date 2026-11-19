/* Configuração do site — Focinhos Amados (BH)
   Editável pelo cliente. Disponível em window.CONFIG */

window.CONFIG = {
  appVersion: "v0.2.0",
  appVersion: "v0.2.0",

  business: {
    name: "Focinhos Amados",
    city: "Belo Horizonte/MG",
    addressLine: "Av. Padre José Maurício, 572 – Nova Cintra",
    phones: {
      landline: "+55 31 3322-3070",
      whatsappE164: "5531982339672", // usado em wa.me/{E164}
      whatsappHuman: "+55 31 98233-9672"
    },
    hours: {
      mon_sat: "13:30–20:00",
      sun: "Fechado",
      holidays_note: "Feriados e outras datas: confirme pelo Status do WhatsApp."
    },
    shopCoords: { lat: -19.953147097101922, lng: -43.993680031948806 }, // coordinates for Av. Padre José Maurício, 572 - Nova Cintra
    // placeId: "" // opcional
  },

  ui: {
  showDirectWhatsOnHome: false, // manter false — WhatsApp só no fim dos fluxos
  brand: "#029935", danger: "#FE0000", text: "#030302", muted: "#666666", bg: "#FFFCFE",
  // Se true, os cabeçalhos de mensagens usam rótulos ASCII em vez de emoji para máxima compatibilidade
  preferPlainTextMessages: false
  },

  booking: {
    closedWeekdays: [0],               // 0 = domingo
    arrivalTimes: ["13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
    minLeadMinutes: 30,
    petsAtSameTime: 2,
    askForVideo: true,
    temperamentOptions: ["Manso","Bravo"]
  },

  payments: { pixKey: "", pixKeyType: "", pixHolder: "", depositNote: "" },

  geoloc: {
    enabled: true,
    enableHighAccuracy: true,
    waitMs: 40000,          // aguardar até 40s para melhor precisão
    requiredPrecisionM: 20  // aceitar leituras até 20m; acima, pedir confirmação manual
  },

  suggestions: {
    upsellServices: [
      "Hidratação de pelagem",
      "Corte de unhas",
      "Limpeza de ouvido",
      "Higienização bucal"
    ]
  },

  waTemplates: {
  agendar: `📅 *AGENDAMENTO* — FOCINHOS AMADOS (BH)

🐾 *Pets*
{petsLista}

⏰ *Quando*
{dataPreferida} • Chegada: {janela}

👤 *Tutor*
{tutorNome} • 📞 {tutorTelefone}

🚕 *Modalidade de localização*
{modalidade}

📍 *Onde buscar o pet?*
{origemEndereco}

📍 *Onde entregar o pet?*
{destinoEndereco}

📝 *Observações gerais*
{observacoes}

🏪 *Loja física*
{enderecoLoja}{videoNota}`,

  // Tracking técnico (apêndice) para o template Agendar
  agendarTracking:
`\n—\nTracking\nOrigem: {origemLat},{origemLng} • ±{origemAccuracy}m @ {origemTimestamp}\nDestino: {destinoLat},{destinoLng} • ±{destinoAccuracy}m @ {destinoTimestamp}`,

    taxiBanho:
`🚕 *TÁXI DOG — BANHO/TOSA* (BH)

🚦 *Modalidade*  
{modalidade}

🐾 *Pet*  
{petNome}  

👤 *Tutor*  
{tutorNome} • 📞 {tutorTelefone}

📍 *Onde buscar o pet?*  
{origemEndereco}  

📍 *Onde entregar o pet?*  
{destinoEndereco}  

⏰ *Horário desejado*  
{horario}

📝 *Observações*  
{observacoes}
`,

  // Tracking técnico (apêndice) para o template Táxi Banho/Tosa
  taxiBanhoTracking:
`\n—\nTracking\nOrigem: {origemLat},{origemLng}\nDestino: {destinoLat},{destinoLng}`,

  taxiAgendado:
`🚕 *TÁXI DOG — AGENDADO* (BH)

📍 *Onde buscar o pet?*  
{origemEndereco}  

📍 *Onde entregar o pet?*  
{destinoEndereco}  

⏰ *Horário desejado*  
{horario}

👤 *Contato*  
{tutorNome} • 📞 {tutorTelefone}

📝 *Observações*  
{observacoes}
`,

  // Tracking técnico (apêndice) para o template Táxi Agendado
  taxiAgendadoTracking:
`\n—\nTracking\nOrigem: {origemLat},{origemLng}\nDestino: {destinoLat},{destinoLng}`
  ,
  // Template para equipe agilizar respostas de confirmação (modelo de mensagem)
  teamReply: `*Pedido recebido — Focinhos Amados (BH)*

📋 *Itens*  
{itensLista}

👤 *Contato*  
{nome} • {telefone}

📝 *Observações*  
{observacoes}

—
Detalhes e confirmações serão combinados via WhatsApp.`,
  }
};

// Helpers leves para outras partes do site (usados pelo main.js)
window.CONFIG.__format = {
  hoursLabel(){
    const h = window.CONFIG.business.hours;
    const sun = (!h.sun || /fechad/i.test(h.sun)) ? 'Dom fechado' : `Dom ${h.sun}`;
    return `Seg–Sáb ${h.mon_sat} • ${sun}`;
  },
  routeUrl(){
    const c = window.CONFIG.business.shopCoords;
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
      return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    }
    return '#';
  }
};
