/* Configuração do site — Focinhos Amados (BH)
   Editável pelo cliente. Disponível em window.CONFIG */

window.CONFIG = {
  appVersion: "v0.2.0-beta",
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
      mon_sat: "10:00–20:00",
      sun: "10:00–13:00",
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

  geoloc: {
    enabled: true,
    enableHighAccuracy: true,
    waitMs: 40000,          // aguardar até 40s para melhor precisão
    requiredPrecisionM: 20  // aceitar leituras até 20m; acima, pedir confirmação manual
  },

  suggestions: {
    // usado no delivery com <datalist> (top-sellers, editável)
    products: [
      "QUATREE GOURMET ADULTOS 1kg",
      "PIPICAT CLASSIC 4kg",
      "GOLDEN GATOS CASTRADOS 1kg",
      "SPECIAL DOG PRIME BIONATURAL 1kg"
    ],
    upsellServices: [
      "Hidratação de pelagem",
      "Corte de unhas",
      "Limpeza de ouvido",
      "Tratamento de hálito (espuma)"
    ]
  },

  waTemplates: {
  agendar: `📅 *AGENDAMENTO* — FOCINHOS AMADOS (BH)

🐾 *Pets*
{petsLista}

⏰ *Quando*
{dataPreferida} • Janela: {janela}

👤 *Tutor*
{tutorNome} • 📞 {tutorTelefone}

🚕 *Modalidade de localização*
{modalidade}

📍 *Origem*
{origemEndereco}
Geo: {origemLat},{origemLng}
Precisão: {origemAccuracy}m @ {origemTimestamp}

📍 *Destino*
{destinoEndereco}
Geo: {destinoLat},{destinoLng}
Precisão: {destinoAccuracy}m @ {destinoTimestamp}

📝 *Observações gerais*
{observacoes}

🏪 *Loja física*
{enderecoLoja}`,

    delivery:
`📦 *DELIVERY* — FOCINHOS AMADOS (BH)

📋 *Itens*  
{itensLista}

👤 *Recebedor*  
{nome} • 📞 {telefone}

📍 *Endereço*  
{enderecoCompleto}  
Geo: {lat},{lng}  
Precisão: {accuracy}m @ {timestamp}

📝 *Observações*  
{observacoes}

🏪 *Loja física*
{enderecoLoja}`,

    taxiBanho:
`🚕 *TÁXI DOG — BANHO/TOSA* (BH)

🚦 *Modalidade*  
{modalidade}

🐾 *Pet*  
{petNome}  

👤 *Tutor*  
{tutorNome} • 📞 {tutorTelefone}

📍 *Origem*  
{origemEndereco}  
Geo: {origemLat},{origemLng}

📍 *Destino*  
{destinoEndereco}  
Geo: {destinoLat},{destinoLng}

⏰ *Horário desejado*  
{horario}

📝 *Observações*  
{observacoes}
`,

  taxiAgendado:
`🚕 *TÁXI DOG — AGENDADO* (BH)

📍 *Origem*  
{origemEndereco}  
Geo: {origemLat},{origemLng}

📍 *Destino*  
{destinoEndereco}  
Geo: {destinoLat},{destinoLng}

⏰ *Horário desejado*  
{horario}

👤 *Contato*  
{tutorNome} • 📞 {tutorTelefone}

📝 *Observações*  
{observacoes}
`
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
    return `Seg–Sáb ${h.mon_sat} • Dom ${h.sun}`;
  },
  routeUrl(){
    const c = window.CONFIG.business.shopCoords;
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
      return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    }
    return '#';
  }
};
