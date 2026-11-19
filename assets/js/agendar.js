/* =========================================================================
   AGENDAR — uma pergunta por tela
   Pesquisa por trás (docs/ux-pesquisa.md):
   - uma coisa por página (GOV.UK) · poucas opções por tela (Hick)
   - perguntas de 1 toque primeiro, digitação por último (progresso rápido no início)
   - barra já começa andada (endowed progress) · confirmação ativa (Martin et al.)
   - final memorável (peak-end)
   Segurança: todo texto digitado passa por FA.esc() antes de ir para HTML.
   ========================================================================= */
(function () {
  'use strict';
  const FA = window.FA;
  const D = (...a) => window.FA3D.desenho(...a);
  const esc = FA.esc;

  const CHAVE_RASCUNHO = 'fa:rascunho:v1';
  const ATRASO_AUTO = 230; // ms entre o toque e a próxima tela (dá tempo de ver a escolha)

  /* ---------------- Estado ---------------- */
  const novoPet = () => ({
    nome: '', especie: '', porte: '', pelo: '', temperamento: '', servico: '', tosa: '',
    extras: [], perfume: '', acessorio: '', temSaude: null, saude: '', maisUm: null, salvo: false, novo: false,
  });
  let S = {
    pets: [novoPet()], dia: '', hora: '', vem: '',
    end: { cep: '', rua: '', bairro: '', cidade: '', numero: '', complemento: '', manual: false },
    tutor: { nome: '', tel: '' },
  };
  let pilha = []; // [{id, i}]
  let editando = false;
  const pet = (i = atual().i) => S.pets[i] || (S.pets[i] = novoPet());
  const atual = () => pilha[pilha.length - 1] || { id: 'nome', i: 0 };
  const nomeDo = (i = atual().i) => (pet(i).nome || 'seu pet').trim();
  const ehGato = (i) => pet(i).especie === 'Gato';
  const figPet = (i) => (ehGato(i) ? 'gato' : pet(i).especie === 'Outro' ? 'outro' : 'cachorro');

  /* ---------------- Regras de horário ---------------- */
  function regras() {
    return Object.assign({
      closedWeekdays: [0], arrivalTimes: ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'], minLeadMinutes: 30, askForVideo: true,
    }, (window.CONFIG && window.CONFIG.booking) || {});
  }
  function horariosDo(dia, ref = new Date()) {
    const d = FA.lerYmd(dia); const r = regras();
    if (!d || r.closedWeekdays.includes(d.getDay())) return [];
    if (dia !== FA.ymd(ref)) return r.arrivalTimes.slice();
    const limite = ref.getHours() * 60 + ref.getMinutes() + (Number(r.minLeadMinutes) || 0);
    return r.arrivalTimes.filter((t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m >= limite; });
  }
  function proximosDias(qtd = 6) {
    const out = []; const hoje = new Date();
    for (let i = 0; out.length < qtd && i < 30; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      const y = FA.ymd(d);
      if (horariosDo(y).length) out.push({ y, d, i });
    }
    return out;
  }

  /* ---------------- Telas ----------------
     Cada tela: etapa (0 pet · 1 horário · 2 você), mostrar(i), pronto(i), montar(i, tela) */
  const PET = ['quem', 'nome', 'especie', 'porte', 'pelo', 'temperamento', 'servico', 'tosa', 'extras', 'perfume', 'acessorio', 'saude', 'saudeTxt', 'outroPet'];
  const POS = ['dia', 'hora', 'vem', 'cep', 'numero', 'tutorNome', 'tutorTel', 'revisao', 'final'];

  const salvosDisponiveis = (i) => {
    const usados = new Set(S.pets.filter((_, k) => k !== i).map((p) => p.nome.toLowerCase()));
    return (FA.perfil.obter().pets || []).filter((p) => p.nome && !usados.has(p.nome.toLowerCase()));
  };

  const TELAS = {
    quem: {
      etapa: 0,
      mostrar: (i) => !pet(i).salvo && !pet(i).novo && salvosDisponiveis(i).length > 0,
      pronto: (i) => pet(i).salvo || pet(i).novo,
      montar(i) {
        const lista = salvosDisponiveis(i);
        return {
          fig: 'pata',
          pergunta: i === 0 ? 'Quem vem tomar banho?' : 'Quem mais vem junto?',
          corpo: `<div class="opcoes" role="group" aria-label="Escolha o pet">
            ${lista.map((p, k) => `<button type="button" class="opcao linha pet-salvo" data-salvo="${k}">
              <span class="fig">${D(p.especie === 'Gato' ? 'gato' : p.especie === 'Outro' ? 'outro' : 'cachorro')}</span>
              <span>${esc(p.nome)}<small>${esc([p.especie, p.porte, p.temperamento].filter(Boolean).join(' · '))}</small></span></button>`).join('')}
            <button type="button" class="opcao linha" data-salvo="novo"><span class="fig">${D('pata')}</span><span>Outro pet<small>Primeira vez aqui</small></span></button>
          </div>`,
          ligar(tela) {
            tela.querySelectorAll('[data-salvo]').forEach((b) => b.addEventListener('click', () => {
              marcar(b);
              if (b.dataset.salvo === 'novo') { S.pets[i] = Object.assign(novoPet(), { novo: true }); }
              else {
                const p = lista[+b.dataset.salvo];
                S.pets[i] = Object.assign(novoPet(), p, { extras: [], temSaude: p.saude ? true : null, maisUm: null, salvo: true });
              }
              avancarLogo();
            }));
          },
        };
      },
    },
    nome: {
      etapa: 0, mostrar: (i) => !pet(i).salvo, pronto: (i) => pet(i).nome.trim().length >= 2,
      montar(i) {
        return {
          fig: 'pata', pergunta: i === 0 ? 'Qual o nome do seu pet?' : 'Qual o nome do outro pet?',
          dica: 'Assim a gente já chama pelo nome 💚',
          corpo: `<div class="campo"><label class="sr-only" for="f-nome">Nome do pet</label>
            <input id="f-nome" class="entrada" maxlength="30" autocomplete="off" autocapitalize="words" enterkeyhint="next" placeholder="Ex.: Thor" value="${esc(pet(i).nome)}"></div>`,
          texto: true,
          ligar(tela) { const el = tela.querySelector('#f-nome'); el.addEventListener('input', () => { pet(i).nome = el.value.replace(/\s+/g, ' ').trimStart(); atualizarBase(); }); },
        };
      },
    },
    especie: {
      etapa: 0, mostrar: (i) => !pet(i).salvo, pronto: (i) => !!pet(i).especie,
      montar(i) {
        return {
          pergunta: `${esc(nomeDo(i))} é cachorro ou gato?`,
          corpo: escolhas('especie', i, [['Cachorro', 'cachorro', 'Cachorro'], ['Gato', 'gato', 'Gato'], ['Outro', 'outro', 'Outro']], 'tres'),
        };
      },
    },
    porte: {
      etapa: 0, mostrar: (i) => !pet(i).salvo, pronto: (i) => !!pet(i).porte,
      montar(i) {
        const f = figPet(i);
        return {
          pergunta: `Qual o tamanho ${ehGato(i) ? 'da' : 'do'} ${esc(nomeDo(i))}?`,
          corpo: `<div class="opcoes tres" role="group">
            ${[['Pequeno', 'até 10 kg', 0.62], ['Médio', '10 a 25 kg', 0.8], ['Grande', 'mais de 25 kg', 1]].map(([v, sub, esc2]) => `
              <button type="button" class="opcao" data-campo="porte" data-valor="${v}" aria-pressed="${pet(i).porte === v}">
                <span class="fig" style="transform:scale(${esc2});transform-origin:bottom center">${D(f)}</span>${v}<small>${sub}</small></button>`).join('')}
          </div>`,
        };
      },
    },
    pelo: {
      etapa: 0, mostrar: (i) => !pet(i).salvo, pronto: (i) => !!pet(i).pelo,
      montar(i) {
        return {
          pergunta: `E o pelo ${ehGato(i) ? 'da' : 'do'} ${esc(nomeDo(i))}?`,
          corpo: escolhas('pelo', i, [['Curto', 'pelo:curto', 'Curto'], ['Médio', 'pelo:medio', 'Médio'], ['Longo', 'pelo:longo', 'Longo']], 'tres'),
        };
      },
    },
    temperamento: {
      etapa: 0, mostrar: (i) => !pet(i).salvo, pronto: (i) => !!pet(i).temperamento,
      montar(i) {
        const f = figPet(i);
        return {
          pergunta: `${esc(nomeDo(i))} é manso ou bravo?`,
          dica: 'Bravo = rosna, morde ou não deixa mexer. Tudo bem! Só precisamos saber antes.',
          corpo: `<div class="opcoes duas" role="group">
            <button type="button" class="opcao" data-campo="temperamento" data-valor="Manso" aria-pressed="${pet(i).temperamento === 'Manso'}"><span class="fig">${D(f)}</span>Manso<small>tranquilo</small></button>
            <button type="button" class="opcao" data-campo="temperamento" data-valor="Bravo" aria-pressed="${pet(i).temperamento === 'Bravo'}"><span class="fig">${f === 'cachorro' ? D('cachorro', { humor: 'bravo' }) : D(f)}</span>Bravo<small>precisa de cuidado</small></button>
          </div>`,
        };
      },
    },
    servico: {
      etapa: 0, mostrar: () => true, pronto: (i) => !!pet(i).servico,
      montar(i) {
        return {
          pergunta: `O que ${esc(nomeDo(i))} vai fazer?`,
          corpo: `<div class="opcoes duas" role="group">
            <button type="button" class="opcao" data-campo="servico" data-valor="Banho" aria-pressed="${pet(i).servico === 'Banho'}"><span class="fig">${D('banheira')}</span>Banho</button>
            <button type="button" class="opcao" data-campo="servico" data-valor="Banho e tosa" aria-pressed="${pet(i).servico === 'Banho e tosa'}"><span class="fig">${D('tesoura')}</span>Banho e tosa</button>
          </div>`,
        };
      },
    },
    tosa: {
      etapa: 0, mostrar: (i) => pet(i).servico === 'Banho e tosa', pronto: (i) => !!pet(i).tosa,
      montar(i) {
        const op = [['Higiênica', 'patas, barriga e bumbum'], ['Na máquina', 'pelo bem curtinho'], ['Na tesoura', 'acabamento caprichado'], ['A tosadora decide', 'pelo vídeo, com você']];
        return {
          fig: 'tesoura', pergunta: 'Que tipo de tosa?',
          corpo: `<div class="opcoes" role="group">${op.map(([v, s]) => `<button type="button" class="opcao linha" data-campo="tosa" data-valor="${v}" aria-pressed="${pet(i).tosa === v}"><span>${v}<small>${s}</small></span></button>`).join('')}</div>`,
        };
      },
    },
    extras: {
      etapa: 0, mostrar: () => true, pronto: () => true,
      montar(i) {
        const lista = ['Hidratação', 'Banho de ozônio', 'Corte de unhas', 'Limpeza de ouvido', 'Higienização bucal'];
        return {
          fig: 'shampoo', pergunta: `Quer um mimo extra pro ${esc(nomeDo(i))}?`, dica: 'Pode escolher vários ou pular.',
          corpo: `<div class="chips" role="group" aria-label="Extras">${lista.map((x) => `<button type="button" class="chip" role="checkbox" data-extra="${x}" aria-checked="${pet(i).extras.includes(x)}">${x}</button>`).join('')}</div>`,
          botao: () => (pet(i).extras.length ? 'Continuar' : 'Pular, sem extras'),
          ligar(tela) {
            tela.querySelectorAll('[data-extra]').forEach((b) => b.addEventListener('click', () => {
              const x = b.dataset.extra; const l = pet(i).extras;
              const k = l.indexOf(x); if (k >= 0) l.splice(k, 1); else l.push(x);
              b.setAttribute('aria-checked', String(k < 0)); FA.vibrar(8); atualizarBase(); salvarRascunho();
            }));
          },
        };
      },
    },
    perfume: {
      etapa: 0, mostrar: () => true, pronto: (i) => !!pet(i).perfume,
      montar(i) {
        return {
          pergunta: 'Perfume no final?',
          corpo: escolhas('perfume', i, [['Suave', 'perfume:suave', 'Suave'], ['De impacto', 'perfume:impacto', 'De impacto'], ['Sem perfume', 'perfume:nenhum', 'Sem']], 'tres'),
        };
      },
    },
    acessorio: {
      etapa: 0, mostrar: () => true, pronto: (i) => !!pet(i).acessorio,
      montar(i) {
        return {
          pergunta: `${esc(nomeDo(i))} sai com laço ou gravata?`,
          corpo: escolhas('acessorio', i, [['Laço', 'laco', 'Laço'], ['Gravata', 'gravata', 'Gravata'], ['Nenhum', 'nada', 'Nenhum']], 'tres'),
        };
      },
    },
    saude: {
      etapa: 0, mostrar: () => true, pronto: (i) => pet(i).temSaude !== null,
      montar(i) {
        return {
          fig: figPet(i), pergunta: `${esc(nomeDo(i))} tem alergia ou algum problema de saúde?`,
          corpo: `<div class="opcoes duas" role="group">
            <button type="button" class="opcao" data-sim-nao="nao" aria-pressed="${pet(i).temSaude === false}">Não</button>
            <button type="button" class="opcao" data-sim-nao="sim" aria-pressed="${pet(i).temSaude === true}">Sim</button></div>`,
          ligar(tela) {
            tela.querySelectorAll('[data-sim-nao]').forEach((b) => b.addEventListener('click', () => {
              marcar(b); pet(i).temSaude = b.dataset.simNao === 'sim'; if (!pet(i).temSaude) pet(i).saude = ''; avancarLogo();
            }));
          },
        };
      },
    },
    saudeTxt: {
      etapa: 0, mostrar: (i) => pet(i).temSaude === true, pronto: (i) => pet(i).saude.trim().length >= 3,
      montar(i) {
        return {
          fig: figPet(i), pergunta: 'Conta pra gente o que é', dica: 'Alergia, remédio, cirurgia recente, pele sensível…',
          corpo: `<div class="campo"><label class="sr-only" for="f-saude">Saúde do pet</label>
            <textarea id="f-saude" class="entrada" maxlength="280" placeholder="Ex.: alergia a shampoo com perfume">${esc(pet(i).saude)}</textarea></div>`,
          texto: true,
          ligar(tela) { const el = tela.querySelector('#f-saude'); el.addEventListener('input', () => { pet(i).saude = el.value; atualizarBase(); }); },
        };
      },
    },
    outroPet: {
      etapa: 0, mostrar: () => true, pronto: (i) => pet(i).maisUm !== null,
      montar(i) {
        return {
          fig: 'pata', pergunta: 'Vai trazer outro pet junto?',
          corpo: `<div class="opcoes duas" role="group">
            <button type="button" class="opcao" data-mais="nao" aria-pressed="${pet(i).maisUm === false}">Não, só ${esc(nomeDo(i))}</button>
            <button type="button" class="opcao" data-mais="sim" aria-pressed="${pet(i).maisUm === true}">Sim, mais um</button></div>`,
          ligar(tela) {
            tela.querySelectorAll('[data-mais]').forEach((b) => b.addEventListener('click', () => {
              marcar(b); pet(i).maisUm = b.dataset.mais === 'sim';
              if (!pet(i).maisUm) S.pets = S.pets.slice(0, i + 1);
              avancarLogo();
            }));
          },
        };
      },
    },
    dia: {
      etapa: 1, mostrar: () => true, pronto: () => !!S.dia && horariosDo(S.dia).length > 0,
      montar() {
        const dias = proximosDias(6);
        const hoje = FA.ymd(new Date());
        const amanha = FA.ymd(new Date(Date.now() + 864e5));
        return {
          fig: 'calendario', pergunta: 'Que dia fica bom?', dica: 'De segunda a sábado, à tarde.',
          corpo: `<div class="dias" role="radiogroup" aria-label="Dia">${dias.map(({ y, d }) => `
            <button type="button" class="dia" role="radio" data-dia="${y}" aria-checked="${S.dia === y}" aria-label="${FA.dataLonga(y)}">
              <span>${FA.DIAS_CURTOS[d.getDay()]}</span><b>${d.getDate()}</b><em>${y === hoje ? 'hoje' : y === amanha ? 'amanhã' : FA.MESES[d.getMonth()]}</em></button>`).join('')}</div>`,
          ligar(tela) {
            tela.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
              marcar(b, 'aria-checked'); if (S.dia !== b.dataset.dia) S.hora = ''; S.dia = b.dataset.dia; avancarLogo();
            }));
          },
        };
      },
    },
    hora: {
      etapa: 1, mostrar: () => true, pronto: () => !!S.hora && horariosDo(S.dia).includes(S.hora),
      montar() {
        const hs = horariosDo(S.dia);
        return {
          pergunta: `Que horas ${esc(S.pets.length > 1 ? 'eles chegam' : nomeDo(0) + ' chega')}?`,
          dica: FA.dataLonga(S.dia).replace(/^./, (c) => c.toUpperCase()),
          corpo: hs.length ? `<div class="horas" role="radiogroup" aria-label="Horário de chegada">${hs.map((h) => `
            <button type="button" class="hora" role="radio" data-hora="${h}" aria-checked="${S.hora === h}">${h}</button>`).join('')}</div>`
            : '<p class="vazio">Esse dia não tem mais horário. Volte e escolha outro dia.</p>',
          ligar(tela) {
            tela.querySelectorAll('[data-hora]').forEach((b) => b.addEventListener('click', () => { marcar(b, 'aria-checked'); S.hora = b.dataset.hora; avancarLogo(); }));
          },
        };
      },
    },
    vem: {
      etapa: 1, mostrar: () => true, pronto: () => !!S.vem,
      montar() {
        const quem = S.pets.length > 1 ? 'eles vêm' : `${esc(nomeDo(0))} vem`;
        const op = [['loja', 'coleira', 'Eu levo até a loja', 'Av. Padre José Maurício, 572'], ['busca', 'carro', 'Táxi Dog busca', 'a gente busca, você pega depois'], ['buscaEntrega', 'carro:true', 'Táxi Dog busca e devolve', 'vai e volta sem você sair de casa']];
        return {
          pergunta: `Como ${quem}?`,
          corpo: `<div class="opcoes" role="group">${op.map(([v, f, t, s]) => {
            const [n, a] = f.split(':');
            return `<button type="button" class="opcao linha" data-campo-geral="vem" data-valor="${v}" aria-pressed="${S.vem === v}"><span class="fig">${D(n, a === 'true')}</span><span>${t}<small>${s}</small></span></button>`;
          }).join('')}</div>`,
          ligar(tela) {
            tela.querySelectorAll('[data-campo-geral="vem"]').forEach((b) => b.addEventListener('click', () => { marcar(b); S.vem = b.dataset.valor; avancarLogo(); }));
          },
        };
      },
    },
    cep: {
      etapa: 1, mostrar: () => S.vem && S.vem !== 'loja', pronto: () => S.end.rua.trim().length >= 3 && S.end.bairro.trim().length >= 2,
      montar() {
        const achado = S.end.rua && !S.end.manual ? `<div class="cep-achado" id="cep-achado">📍 ${esc(S.end.rua)} — ${esc(S.end.bairro)}</div>` : '<div id="cep-achado"></div>';
        return {
          fig: 'carro', pergunta: 'Qual o CEP de casa?', dica: 'É onde o Táxi Dog vai buscar.',
          corpo: `<div class="campo"><label class="sr-only" for="f-cep">CEP</label>
              <input id="f-cep" class="entrada" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${esc(S.end.cep)}"></div>
            <p class="erro" id="cep-erro" role="status"></p>${achado}
            <div id="cep-manual" ${S.end.manual ? '' : 'hidden'} class="campo-grupo" style="margin-top:12px">
              <div class="campo"><label for="f-rua">Rua</label><input id="f-rua" class="entrada" autocomplete="address-line1" value="${esc(S.end.rua)}"></div>
              <div class="campo"><label for="f-bairro">Bairro</label><input id="f-bairro" class="entrada" value="${esc(S.end.bairro)}"></div>
            </div>
            <button type="button" class="btn-texto" id="sem-cep" style="display:block;margin:8px auto 0">Não sei o CEP</button>`,
          texto: true,
          ligar(tela) {
            const cep = tela.querySelector('#f-cep'); const erro = tela.querySelector('#cep-erro');
            const manual = tela.querySelector('#cep-manual'); const achadoEl = tela.querySelector('#cep-achado');
            const abrirManual = () => { S.end.manual = true; manual.hidden = false; achadoEl.textContent = ''; tela.querySelector('#f-rua').focus(); };
            tela.querySelector('#sem-cep').addEventListener('click', abrirManual);
            tela.querySelector('#f-rua').addEventListener('input', (e) => { S.end.rua = e.target.value; atualizarBase(); });
            tela.querySelector('#f-bairro').addEventListener('input', (e) => { S.end.bairro = e.target.value; atualizarBase(); });
            let ultimo = '';
            cep.addEventListener('input', async () => {
              const d = cep.value.replace(/\D/g, '').slice(0, 8);
              cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; S.end.cep = cep.value;
              if (d.length < 8 || d === ultimo) return;
              ultimo = d; erro.textContent = 'Buscando…';
              try {
                const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
                const j = await r.json();
                if (j.erro) throw new Error('cep');
                Object.assign(S.end, { rua: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', manual: !j.logradouro });
                erro.textContent = '';
                if (j.logradouro) { achadoEl.className = 'cep-achado'; achadoEl.textContent = `📍 ${j.logradouro} — ${j.bairro}`; manual.hidden = true; }
                else abrirManual();
                tela.querySelector('#f-rua').value = S.end.rua; tela.querySelector('#f-bairro').value = S.end.bairro;
                atualizarBase();
              } catch (_) {
                erro.textContent = 'Não achamos esse CEP. Digite a rua e o bairro.'; abrirManual();
              }
            });
          },
        };
      },
    },
    numero: {
      etapa: 1, mostrar: () => S.vem && S.vem !== 'loja', pronto: () => S.end.numero.trim().length >= 1,
      montar() {
        return {
          fig: 'carro', pergunta: 'Qual o número?', dica: esc(S.end.rua),
          corpo: `<div class="campo-grupo" style="margin-top:22px"><div class="duas">
              <div class="campo"><label for="f-num">Número</label><input id="f-num" class="entrada" inputmode="numeric" maxlength="8" value="${esc(S.end.numero)}"></div>
              <div class="campo"><label for="f-comp">Complemento</label><input id="f-comp" class="entrada" maxlength="40" placeholder="apto, bloco…" value="${esc(S.end.complemento)}"></div>
            </div></div>`,
          texto: true,
          ligar(tela) {
            tela.querySelector('#f-num').addEventListener('input', (e) => { S.end.numero = e.target.value; atualizarBase(); });
            tela.querySelector('#f-comp').addEventListener('input', (e) => { S.end.complemento = e.target.value; });
          },
        };
      },
    },
    tutorNome: {
      etapa: 2, mostrar: () => true, pronto: () => S.tutor.nome.trim().length >= 2,
      montar() {
        return {
          fig: 'coleira', pergunta: 'E qual é o seu nome?', dica: 'Quase lá!',
          corpo: `<div class="campo"><label class="sr-only" for="f-tutor">Seu nome</label>
            <input id="f-tutor" class="entrada" maxlength="40" autocomplete="name" autocapitalize="words" enterkeyhint="next" value="${esc(S.tutor.nome)}"></div>`,
          texto: true,
          ligar(tela) { const el = tela.querySelector('#f-tutor'); el.addEventListener('input', () => { S.tutor.nome = el.value; atualizarBase(); }); },
        };
      },
    },
    tutorTel: {
      etapa: 2, mostrar: () => true, pronto: () => { const d = S.tutor.tel.replace(/\D/g, ''); return d.length === 10 || d.length === 11; },
      montar() {
        return {
          fig: 'coleira', pergunta: 'Seu WhatsApp', dica: 'É por lá que a gente confirma o horário.',
          corpo: `<div class="campo"><label class="sr-only" for="f-tel">WhatsApp com DDD</label>
            <input id="f-tel" class="entrada" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(31) 98888-7777" value="${esc(S.tutor.tel)}"></div>`,
          texto: true,
          ligar(tela) {
            const el = tela.querySelector('#f-tel');
            el.addEventListener('input', () => {
              const d = el.value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
              let v = d;
              if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
              if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length === 11 ? 7 : 6)}-${d.slice(d.length === 11 ? 7 : 6)}`;
              el.value = v; S.tutor.tel = v; atualizarBase();
            });
          },
        };
      },
    },
    revisao: {
      etapa: 2, mostrar: () => true, pronto: () => true,
      montar() {
        const quem = S.pets.map((p) => esc(p.nome)).join(' e ');
        return {
          pergunta: 'Confere pra gente?',
          corpo: `<div class="revisao">
            ${S.pets.map((p, k) => `<div class="cartao"><div class="rev-linha"><div><h3>🐾 ${esc(p.nome)}</h3><p>${esc(resumoPet(p))}</p></div>
              <button type="button" class="rev-editar" data-editar="servico" data-i="${k}" aria-label="Alterar ${esc(p.nome)}">Alterar</button></div></div>`).join('')}
            <div class="cartao"><div class="rev-linha"><div><h3>🗓️ ${esc(FA.dataLonga(S.dia))}</h3><p>Chegada às ${esc(S.hora)}</p></div>
              <button type="button" class="rev-editar" data-editar="dia" aria-label="Alterar dia e hora">Alterar</button></div></div>
            <div class="cartao"><div class="rev-linha"><div><h3>${S.vem === 'loja' ? '🚶 Você leva' : '🚕 Táxi Dog'}</h3><p>${esc(textoTransporte())}</p></div>
              <button type="button" class="rev-editar" data-editar="vem" aria-label="Alterar transporte">Alterar</button></div></div>
            <div class="cartao"><div class="rev-linha"><div><h3>👤 ${esc(S.tutor.nome)}</h3><p>${esc(S.tutor.tel)}</p></div>
              <button type="button" class="rev-editar" data-editar="tutorNome" aria-label="Alterar seus dados">Alterar</button></div></div>
          </div>
          <p class="compromisso">Eu confirmo: <strong>${quem}</strong> ${S.pets.length > 1 ? 'chegam' : 'chega'} <strong>${esc(FA.dataLonga(S.dia))}</strong> às <strong>${esc(S.hora)}</strong>.</p>`,
          botao: () => 'Confirmo o horário',
          ligar(tela) {
            tela.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => {
              editando = true; ir({ id: b.dataset.editar, i: +(b.dataset.i || 0) }, 'frente');
            }));
          },
        };
      },
    },
    final: { etapa: 3, mostrar: () => true, pronto: () => true, montar: montarFinal },
  };

  function escolhas(campo, i, op, classe) {
    return `<div class="opcoes ${classe}" role="group">${op.map(([v, fig, rot]) => {
      const [n, a] = fig.split(':');
      return `<button type="button" class="opcao" data-campo="${campo}" data-valor="${v}" aria-pressed="${pet(i)[campo] === v}"><span class="fig">${D(n, a)}</span>${rot}</button>`;
    }).join('')}</div>`;
  }

  /* ---------------- Textos ---------------- */
  function resumoPet(p) {
    const partes = [p.especie, p.porte, p.pelo && `pelo ${p.pelo.toLowerCase()}`, p.temperamento].filter(Boolean).join(' · ');
    const serv = p.servico === 'Banho e tosa' ? `Banho e tosa (${(p.tosa || '').toLowerCase()})` : 'Banho';
    const extras = p.extras.length ? ` + ${p.extras.join(', ')}` : '';
    return `${partes}. ${serv}${extras}.`;
  }
  function textoEndereco() {
    const e = S.end;
    return [e.rua && `${e.rua}, ${e.numero}`, e.complemento, e.bairro, e.cep && `CEP ${e.cep}`].filter(Boolean).join(' — ');
  }
  function textoTransporte() {
    if (S.vem === 'loja') return 'Eu levo o pet até a loja';
    const t = S.vem === 'busca' ? 'Buscar em casa (eu busco depois)' : 'Buscar e devolver em casa';
    return `${t}. ${textoEndereco()}`;
  }
  function mensagemZap() {
    const linhasPet = S.pets.map((p, k) => {
      const l = [`*${k + 1}. ${p.nome}* — ${[p.especie, p.porte, p.pelo && 'pelo ' + p.pelo.toLowerCase(), p.temperamento === 'Bravo' ? '⚠️ BRAVO' : 'Manso'].filter(Boolean).join(' • ')}`];
      l.push(`   ✂️ ${p.servico === 'Banho e tosa' ? `Banho e tosa (${p.tosa})` : 'Banho'}`);
      if (p.extras.length) l.push(`   ✨ Extras: ${p.extras.join(', ')}`);
      l.push(`   🌸 Perfume: ${p.perfume} • 🎀 ${p.acessorio === 'Nenhum' ? 'Sem acessório' : p.acessorio}`);
      if (p.temSaude && p.saude.trim()) l.push(`   ⚠️ Saúde: ${p.saude.trim()}`);
      return l.join('\n');
    }).join('\n\n');
    const r = regras();
    const map = {
      petsLista: linhasPet,
      dataPreferida: FA.dataLonga(S.dia).replace(/^./, (c) => c.toUpperCase()),
      janela: S.hora,
      transporte: textoTransporte(),
      tutorNome: S.tutor.nome.trim(),
      tutorTelefone: S.tutor.tel,
      enderecoLoja: (window.CONFIG.business && window.CONFIG.business.addressLine) || '',
      videoNota: r.askForVideo === false ? '' : `\n\n🎥 *Vídeo*\nVou mandar agora um vídeo ${S.pets.length > 1 ? 'dos pets' : 'do pet'} pra vocês verem o pelo e passarem o valor.`,
    };
    const tpl = (window.CONFIG.waTemplates && window.CONFIG.waTemplates.agendar) || '{petsLista}';
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? map[k] : '')).replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------------- Tela final (o "uau") ---------------- */
  function montarFinal() {
    const pay = (window.CONFIG && window.CONFIG.payments) || {};
    const chave = String(pay.pixKey || '').trim();
    const quem = S.pets.map((p) => esc(p.nome)).join(' e ');
    const fig = figPet(0);
    return {
      semTopo: true,
      corpo: `<div class="final">
        <div class="palco" aria-hidden="true"><div class="objeto cachorro">${D(fig)}</div></div>
        <h1 class="wz-pergunta" tabindex="-1">Agora é só confirmar no WhatsApp!</h1>
        <span class="quando">${quem} · ${esc(FA.dataLonga(S.dia))} · ${esc(S.hora)}</span>
        <ol class="passos">
          <li id="passo-zap"><h3>Envie a ficha no WhatsApp</h3><p>Ela já vai prontinha. É só tocar em enviar.</p>
            <a class="btn btn-zap" id="btn-zap" href="${esc(FA.linkZap(mensagemZap()))}" target="_blank" rel="noopener">Enviar no WhatsApp</a></li>
          ${regras().askForVideo === false ? '' : `<li><h3>Mande um vídeo ${S.pets.length > 1 ? 'dos pets' : (ehGato(0) ? 'da ' : 'do ') + quem}</h3><p>Uns 20 segundos, mostrando o pelo de perto. Com ele a gente vê o tempo de banho e passa o valor certinho.</p></li>`}
          ${chave ? `<li><h3>Garanta o horário com o sinal</h3><p>${esc(pay.depositNote || 'O sinal é descontado do valor final.')}</p>
            <div class="pix"><span class="pequeno muted">Chave Pix${pay.pixKeyType ? ' (' + esc(pay.pixKeyType) + ')' : ''}${pay.pixHolder ? ' · ' + esc(pay.pixHolder) : ''}</span>
            <code id="pix-chave">${esc(chave)}</code><button type="button" class="btn btn-claro" id="btn-pix">Copiar chave Pix</button></div></li>` : ''}
          <li><h3>Salve na sua agenda</h3><p>Pra não esquecer. Avisamos 3 horas antes.</p>
            <button type="button" class="btn btn-claro" id="btn-ics">Salvar na minha agenda</button></li>
        </ol>
        <p style="margin-top:18px"><a class="btn-texto" href="./">Voltar ao início</a></p>
      </div>`,
      ligar(tela) {
        tela.querySelector('#btn-zap').addEventListener('click', () => {
          tela.querySelector('#passo-zap').classList.add('feito');
          if (window.fbq) { try { window.fbq('track', 'Schedule'); } catch (_) { /* ok */ } }
          // Convite para instalar: quando a pessoa volta do WhatsApp (ou depois de alguns segundos)
          let feito = false;
          const oferecer = () => { if (feito) return; feito = true; FA.oferecerInstalacao({ nomePet: S.pets[0].nome }); };
          document.addEventListener('visibilitychange', function v() { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', v); setTimeout(oferecer, 700); } });
          setTimeout(oferecer, 6000);
        });
        const pix = tela.querySelector('#btn-pix');
        if (pix) pix.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(chave); pix.textContent = 'Chave copiada ✓'; } catch (_) { pix.textContent = 'Copie a chave acima'; }
          FA.vibrar(15); setTimeout(() => { pix.textContent = 'Copiar chave Pix'; }, 2500);
        });
        tela.querySelector('#btn-ics').addEventListener('click', () => FA.baixarIcs({
          dia: S.dia, hora: S.hora, titulo: `Banho: ${S.pets.map((p) => p.nome).join(' e ')} 🐾`,
          descricao: `Focinhos Amados — chegada às ${S.hora}. ${textoTransporte()}`,
        }));
      },
    };
  }

  /* ---------------- Navegação ---------------- */
  function seguinte(pos) {
    const { id, i } = pos;
    const k = PET.indexOf(id);
    if (k >= 0) {
      for (let j = k + 1; j < PET.length; j++) if (TELAS[PET[j]].mostrar(i)) return { id: PET[j], i };
      if (pet(i).maisUm) { pet(i + 1); return primeiraPet(i + 1); }
      return primeiraPos(0);
    }
    const q = POS.indexOf(id);
    for (let j = q + 1; j < POS.length; j++) if (TELAS[POS[j]].mostrar(0)) return { id: POS[j], i: 0 };
    return null;
  }
  function primeiraPet(i) { for (const id of PET) if (TELAS[id].mostrar(i)) return { id, i }; return { id: 'nome', i }; }
  function primeiraPos(desde) { for (let j = desde; j < POS.length; j++) if (TELAS[POS[j]].mostrar(0)) return { id: POS[j], i: 0 }; return { id: 'revisao', i: 0 }; }

  function avancar() {
    const a = atual(); const t = TELAS[a.id];
    if (!t.pronto(a.i)) { avisar(); return; }
    if (a.id === 'revisao') { finalizar(); return; }
    let prox = seguinte(a);
    // Editando pela revisão: pula as telas que já estão respondidas
    while (editando && prox && prox.id !== 'revisao' && TELAS[prox.id].pronto(prox.i)) prox = seguinte(prox);
    if (prox && prox.id === 'revisao') editando = false;
    if (prox) ir(prox, 'frente');
  }
  let timerAuto = null;
  function avancarLogo() { FA.vibrar(10); salvarRascunho(); clearTimeout(timerAuto); timerAuto = setTimeout(avancar, FA.reduzMovimento() ? 0 : ATRASO_AUTO); }
  function voltar() {
    if (pilha.length <= 1 || atual().id === 'final') { location.href = './'; return; }
    pilha.pop();
    const maxI = Math.max(...pilha.map((p) => p.i));
    if (S.pets.length > maxI + 1 && !(pet(maxI).maisUm)) S.pets = S.pets.slice(0, maxI + 1);
    if (atual().id === 'quem') { const p = pet(atual().i); p.salvo = false; p.novo = false; }
    desenhar('tras'); salvarRascunho();
  }
  function ir(pos, sentido) {
    pilha.push(pos);
    try { history.pushState({ fa: pilha.length }, ''); } catch (_) { /* ok */ }
    desenhar(sentido); salvarRascunho();
  }

  /* ---------------- Desenho ---------------- */
  let corpoEl, baseBtn, baseExtra, voltarBtn;
  function desenhar(sentido) {
    const a = atual(); const t = TELAS[a.id]; const m = t.montar(a.i) || {};
    const velha = corpoEl.querySelector('.wz-tela:not(.sai-esq):not(.sai-dir)');
    const tela = document.createElement('section');
    tela.className = 'wz-tela';
    tela.dataset.tela = a.id;
    tela.innerHTML = m.semTopo ? m.corpo : `
      ${m.fig !== null ? `<div class="wz-ilustra" aria-hidden="true"><div class="objeto">${D(m.fig || figPet(a.i))}</div></div>` : ''}
      <h1 class="wz-pergunta" tabindex="-1">${m.pergunta || ''}</h1>
      ${m.dica ? `<p class="wz-dica">${m.dica}</p>` : ''}
      ${m.corpo || ''}`;
    // Opções simples (data-campo) avançam sozinhas
    tela.querySelectorAll('[data-campo]').forEach((b) => b.addEventListener('click', () => {
      marcar(b); pet(a.i)[b.dataset.campo] = b.dataset.valor;
      if (b.dataset.campo === 'servico' && b.dataset.valor === 'Banho') pet(a.i).tosa = '';
      avancarLogo();
    }));
    if (m.ligar) m.ligar(tela);
    tela.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); avancar(); } });

    if (velha) {
      if (FA.reduzMovimento()) velha.remove();
      else { velha.classList.add(sentido === 'tras' ? 'sai-dir' : 'sai-esq'); setTimeout(() => velha.remove(), 300); }
    }
    if (!FA.reduzMovimento()) tela.classList.add(sentido === 'tras' ? 'entra-esq' : 'entra-dir');
    corpoEl.appendChild(tela);

    // Topo: progresso por etapas
    document.querySelector('.wz-topo').hidden = a.id === 'final';
    voltarBtn.hidden = pilha.length <= 1;
    pintarProgresso(a);

    // Base: botão principal só quando a tela precisa (texto, múltipla escolha, revisão)
    const precisaBotao = m.texto || m.botao;
    document.querySelector('.wz-base').hidden = !precisaBotao;
    baseBtn.dataset.rotulo = m.botao ? '' : 'Continuar';
    baseBtn._rotulo = m.botao || (() => 'Continuar');
    atualizarBase();

    // Foco: no campo de texto (teclado já abre) ou no título (leitor de tela)
    const campo = tela.querySelector('input, textarea');
    setTimeout(() => {
      if (campo && m.texto) { try { campo.focus({ preventScroll: true }); } catch (_) { campo.focus(); } }
      else { const h = tela.querySelector('.wz-pergunta'); if (h) h.focus({ preventScroll: true }); }
    }, FA.reduzMovimento() ? 0 : 280);
    const anuncio = document.getElementById('anuncio');
    if (anuncio) anuncio.textContent = `${['Seu pet', 'Horário', 'Você', 'Pronto'][t.etapa]}: ${tela.querySelector('.wz-pergunta')?.textContent || ''}`;
    if (a.id === 'final') { FA.confete(); FA.vibrar([20, 40, 20]); }
  }
  function pintarProgresso(a) {
    const etapa = TELAS[a.id].etapa;
    const ordem = etapa === 0 ? PET.filter((id) => TELAS[id].mostrar(a.i)) : POS.filter((id) => TELAS[id].etapa === etapa && TELAS[id].mostrar(0));
    const pos = Math.max(0, ordem.indexOf(a.id));
    // Começa andada (15%) e cresce rápido no início
    const frac = ordem.length ? 0.15 + 0.85 * Math.sqrt((pos + 1) / ordem.length) : 1;
    document.querySelectorAll('.wz-etapa').forEach((el, k) => {
      const p = k < etapa ? 100 : k === etapa ? Math.round(frac * 100) : 0;
      el.querySelector('i').style.setProperty('--p', `${p}%`);
      el.classList.toggle('ativa', k === etapa);
      el.setAttribute('aria-current', k === etapa ? 'step' : 'false');
    });
  }
  function atualizarBase() {
    const a = atual(); const ok = TELAS[a.id].pronto(a.i);
    baseBtn.textContent = baseBtn._rotulo ? baseBtn._rotulo() : 'Continuar';
    baseBtn.setAttribute('aria-disabled', String(!ok));
    salvarRascunhoLogo();
  }
  function avisar() {
    const tela = corpoEl.querySelector('.wz-tela:last-child');
    const campo = tela && tela.querySelector('input, textarea');
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); setTimeout(() => campo.removeAttribute('aria-invalid'), 1600); }
    FA.vibrar([30, 40, 30]);
  }
  function marcar(btn, attr = 'aria-pressed') {
    const grupo = btn.parentElement;
    grupo.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute(attr, 'false'));
    btn.setAttribute(attr, 'true');
  }

  /* ---------------- Rascunho (não perder nada) ---------------- */
  let timerRasc = null;
  function salvarRascunhoLogo() { clearTimeout(timerRasc); timerRasc = setTimeout(salvarRascunho, 400); }
  function salvarRascunho() {
    if (atual().id === 'final') return;
    try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ t: Date.now(), S, pilha })); } catch (_) { /* cheio/privado */ }
  }
  function lerRascunho() {
    try {
      const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null');
      if (r && Date.now() - r.t < 6 * 3600e3 && Array.isArray(r.pilha) && r.pilha.length) return r;
    } catch (_) { /* ok */ }
    return null;
  }

  function finalizar() {
    const tutor = { nome: S.tutor.nome.trim(), tel: S.tutor.tel };
    FA.perfil.salvar(tutor, S.pets);
    FA.agenda.adicionar({ dia: S.dia, hora: S.hora, pets: S.pets.map((p) => p.nome), vem: S.vem, criado: Date.now() });
    try { localStorage.removeItem(CHAVE_RASCUNHO); } catch (_) { /* ok */ }
    ir({ id: 'final', i: 0 }, 'frente');
  }

  /* ---------------- Início ---------------- */
  function iniciar() {
    corpoEl = document.querySelector('.wz-corpo');
    baseBtn = document.getElementById('wz-continuar');
    voltarBtn = document.getElementById('wz-voltar');
    baseBtn.addEventListener('click', avancar);
    voltarBtn.addEventListener('click', () => history.back());
    window.addEventListener('popstate', () => { if (atual().id === 'final') { location.href = './'; return; } voltar(); });

    const url = new URLSearchParams(location.search);
    const perfil = FA.perfil.obter();
    if (perfil.tutor) S.tutor = Object.assign({ nome: '', tel: '' }, perfil.tutor);

    const rasc = url.has('novo') ? null : lerRascunho();
    const petPedido = url.get('pet');
    const salvo = petPedido && (perfil.pets || []).find((p) => p.nome.toLowerCase() === petPedido.toLowerCase());
    if (url.get('vem') === 'taxi') S.vem = 'buscaEntrega';

    if (salvo) {
      S.pets = [Object.assign(novoPet(), salvo, { extras: [], temSaude: salvo.saude ? true : null, salvo: true })];
      pilha = [{ id: 'servico', i: 0 }];
    } else if (rasc) {
      S = Object.assign(S, rasc.S); S.pets = S.pets.map((p) => Object.assign(novoPet(), p));
      pilha = rasc.pilha.filter((p) => TELAS[p.id] && p.id !== 'final');
      if (!pilha.length) pilha = [primeiraPet(0)];
    } else {
      pilha = [primeiraPet(0)];
    }
    try { history.replaceState({ fa: 1 }, ''); for (let k = 1; k < pilha.length; k++) history.pushState({ fa: k + 1 }, ''); } catch (_) { /* ok */ }
    desenhar('frente');
  }

  // Para testes automatizados
  window.__faAgendar = { estado: () => S, tela: () => atual().id, mensagem: mensagemZap };

  if (FA.pronto) iniciar(); else document.addEventListener('fa:pronto', iniciar, { once: true });
})();
