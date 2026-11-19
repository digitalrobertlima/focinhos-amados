/* Início: 1 ação principal. Cliente que volta: "Agendar o Thor de novo". */
(function () {
  'use strict';
  const FA = window.FA;
  function iniciar() {
    FA.bolhas(document.getElementById('palco-heroi'), 8);
    const perfil = FA.perfil.obter();
    const ultimo = (perfil.pets || [])[perfil.pets.length - 1];
    const cta = document.getElementById('cta-agendar');
    if (ultimo && ultimo.nome) {
      cta.textContent = `Agendar ${ultimo.nome} de novo`;
      cta.href = `agendar.html?pet=${encodeURIComponent(ultimo.nome)}`;
      document.getElementById('cta-outro').hidden = false;
    }
    const prox = FA.agenda.proximo();
    if (prox) {
      const sec = document.getElementById('proximo');
      sec.hidden = false;
      sec.innerHTML = `<div class="cartao lembrete"><span class="ico" aria-hidden="true">${window.FA3D.desenho('calendario')}</span>
        <span><span class="muted pequeno">Seu próximo horário</span><strong>${FA.esc(FA.dataLonga(prox.dia))} · ${FA.esc(prox.hora)}</strong>
        <span class="muted">${FA.esc((prox.pets || []).join(' e '))}</span></span></div>`;
    }
  }
  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
