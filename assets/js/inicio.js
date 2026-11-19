/* Início: 1 ação principal. Cliente que volta: "Agendar o Thor de novo". */
(function () {
  'use strict';
  const FA = window.FA;
  function iniciar() {
    FA.bolhas(document.getElementById('palco-heroi'), 8);
    montar();
  }
  function montar() {
    const perfil = FA.perfil.obter();
    const ultimo = (perfil.pets || [])[perfil.pets.length - 1];
    const cta = document.getElementById('cta-agendar');
    cta.textContent = 'Agendar banho'; cta.href = 'agendar.html';
    document.getElementById('cta-outro').hidden = true;
    if (ultimo && ultimo.nome) {
      cta.textContent = `Agendar ${ultimo.nome} de novo`;
      cta.href = `agendar.html?pet=${encodeURIComponent(ultimo.nome)}`;
      document.getElementById('cta-outro').hidden = false;
    }
    const prox = FA.agenda.proximo();
    const sec = document.getElementById('proximo');
    sec.hidden = !prox;
    if (prox) {
      sec.innerHTML = `<div class="cartao lembrete"><span class="ico" aria-hidden="true">${window.FA3D.desenho('calendario')}</span>
        <span><span class="muted pequeno">Seu próximo horário</span><strong>${FA.esc(FA.dataLonga(prox.dia))} · ${FA.esc(prox.hora)}</strong>
        <span class="muted">${FA.esc((prox.pets || []).join(' e '))}</span></span></div>`;
    }
    meusPets(perfil.pets || []);
  }

  /* "Seus pets": dá pra tirar um pet do app com cuidado, sem perguntar o motivo. */
  function meusPets(pets) {
    const sec = document.getElementById('meus-pets');
    const ul = document.getElementById('lista-pets');
    sec.hidden = !pets.length;
    const fig = (p) => window.FA3D.desenho(p.especie === 'Gato' ? 'gato' : p.especie === 'Outro' ? 'outro' : 'cachorro');
    ul.innerHTML = pets.map((p, k) => `<li data-k="${k}">
        <div class="mp-linha"><span class="mp-fig" aria-hidden="true">${fig(p)}</span>
          <span class="mp-nome">${FA.esc(p.nome)}</span>
          <button type="button" class="btn-texto mp-tirar" aria-label="Tirar ${FA.esc(p.nome)} do app">Tirar do app</button></div>
        <div class="mp-confirma" hidden>
          <p>Tirar <b>${FA.esc(p.nome)}</b> do app? O nome não vai mais aparecer aqui nem nos agendamentos.</p>
          <div class="mp-botoes"><button type="button" class="btn btn-claro mp-manter">Manter</button>
          <button type="button" class="btn btn-principal mp-sim">Tirar</button></div>
        </div></li>`).join('');
    ul.querySelectorAll('li').forEach((li) => {
      const p = pets[+li.dataset.k]; const box = li.querySelector('.mp-confirma');
      li.querySelector('.mp-tirar').addEventListener('click', () => { box.hidden = false; li.querySelector('.mp-manter').focus(); });
      li.querySelector('.mp-manter').addEventListener('click', () => { box.hidden = true; li.querySelector('.mp-tirar').focus(); });
      li.querySelector('.mp-sim').addEventListener('click', () => { FA.perfil.removerPet(p.nome); montar(); });
    });
  }
  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
