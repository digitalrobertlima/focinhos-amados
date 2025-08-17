/* Configuração do site — Focinhos Amados (BH)
   Editável pelo cliente. Disponível em window.CONFIG */

window.CONFIG = {
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
      holidays_note: "Feriados e outras datas: confirme pelo WhatsApp Status."
    },
  shopCoords: { lat: -19.9520894, lng: -43.9926409 }, // coordinates for Av. Padre José Maurício, 572 - Nova Cintra
    // placeId: "" // opcional
  },

  ui: {
    showDirectWhatsOnHome: false, // manter false — WhatsApp só no fim dos fluxos
    brand: "#029935", danger: "#FE0000", text: "#030302", muted: "#666666", bg: "#FFFCFE"
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
    agendar:
  `AGENDAMENTO — FOCINHOS AMADOS (BH)
  Pets:
  {petsLista}
  Serviços: {servicosLista}
  Preferências: Perfume={perfume}; Acessório={acessorio}; Escovação(espuma)={escovacao}
  Quando: {dataPreferida} • Janela: {janela}
  Tutor: {tutorNome} • Tel: {tutorTelefone}
  Modalidade de localização: {modalidade}
  Loja (end): {enderecoLoja}
  Origem: {origemEndereco} • Geo: {origemLat},{origemLng} (precisão {origemAccuracy}m @ {origemTimestamp})
  Destino: {destinoEndereco} • Geo: {destinoLat},{destinoLng} (precisão {destinoAccuracy}m @ {destinoTimestamp})
  Observações gerais: {observacoes}
  Obs preço: valores personalizados serão confirmados pela equipe.`,

    delivery:
`DELIVERY — FOCINHOS AMADOS (BH)
Itens:
{itensLista}
Recebedor: {nome} • Tel: {telefone}
Endereço: {enderecoCompleto}
Geo: {lat},{lng} (precisão {accuracy}m @ {timestamp})
Observações: {observacoes}
Obs preço: valores personalizados serão confirmados pela equipe.`,

    taxiBanho:
`TÁXI DOG — BANHO/TOSA (BH)
Modalidade: {modalidade}
Pet: {petNome} • Tutor: {tutorNome} • Tel: {tutorTelefone}
Origem: {origemEndereco} • Geo: {origemLat},{origemLng}
Destino: {destinoEndereco} • Geo: {destinoLat},{destinoLng}
Horário desejado: {horario}
Observações: {observacoes}
Obs preço: valores personalizados serão confirmados pela equipe.`,

    taxiAgendado:
`TÁXI DOG — AGENDADO (BH)
Origem: {origemEndereco} • Geo: {origemLat},{origemLng}
Destino: {destinoEndereco} • Geo: {destinoLat},{destinoLng}
Horário desejado: {horario}
Contato: {tutorNome} • {tutorTelefone}
Observações: {observacoes}
Obs preço: valores personalizados serão confirmados pela equipe.`
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
