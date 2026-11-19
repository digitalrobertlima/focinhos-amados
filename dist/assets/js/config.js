/* Configuração padrão — Focinhos Amados (BH)
   O arquivo config.json (editável) sobrescreve estes valores. Disponível em window.CONFIG */
window.CONFIG = {
  appVersion: "v0.4.1",
  business: {
    name: "Focinhos Amados",
    city: "Belo Horizonte/MG",
    addressLine: "Av. Padre José Maurício, 572 – Nova Cintra",
    phones: { landline: "+55 31 3322-3070", whatsappE164: "5531982339672", whatsappHuman: "+55 31 98233-9672" },
    hours: { mon_sat: "13:30–20:00", sun: "Fechado", holidays_note: "Feriados e outras datas: confirme pelo Status do WhatsApp." },
    shopCoords: { lat: -19.953147097101922, lng: -43.993680031948806 }
  },
  booking: {
    closedWeekdays: [0],
    arrivalTimes: ["13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"],
    minLeadMinutes: 30,
    petsAtSameTime: 2,
    tosasAtSameTime: 1,
    maxDaysAhead: 90,
    closedDates: [],
    seasonal: [],
    askForVideo: true
  },
  loyalty: { publicKey: null },
  payments: { pixKey: "", pixKeyType: "", pixHolder: "", depositNote: "" },
  waTemplates: {
    agendar: "📅 *AGENDAMENTO* — FOCINHOS AMADOS (BH)\n\n🐾 *Pets*\n{petsLista}\n\n⏰ *Quando*\n{dataPreferida} • Chegada: {janela}\n\n🚕 *Como vem*\n{transporte}\n\n👤 *Tutor*\n{tutorNome} • 📞 {tutorTelefone}{videoNota}"
  }
};
