/* Sobre: botão para apagar os dados salvos neste celular (LGPD). */
(function () {
  'use strict';
  const FA = window.FA;
  function iniciar() {
    const btn = document.getElementById('btn-esquecer');
    const msg = document.getElementById('esquecido');
    btn.addEventListener('click', () => {
      FA.perfil.esquecer();
      msg.textContent = 'Pronto. Apagamos os dados deste celular.';
    });
  }
  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
