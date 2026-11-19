# Focinhos Amados: pesquisa de UX e roteiro do redesign

Branch: `redesign/agendamento-v2` · nov/2026

## Objetivo

Encher a agenda de banho e tosa e reduzir faltas, sem perder a ficha completa que a tosadora precisa. A experiência tem que ser tão simples que a dona olhe e diga: "uau, mudou tudo".

## O que a pesquisa diz

| Achado | Fonte | O que fazemos |
|---|---|---|
| Começar com uma coisa por página: uma informação, uma decisão ou uma pergunta. No celular, uma pergunta por página é mais simples de navegar. | GOV.UK Service Manual (form structure); GOV.UK blog (2015); NHS Service Manual | Uma pergunta por tela, com transição de tela. |
| Saber por que cada pergunta existe. | GOV.UK (form structure) | Toda pergunta serve à tosadora ou à agenda. O que não serve sai. |
| Muitos campos intimidam e aumentam o abandono. 26% abandonaram checkout por ser longo ou complexo. | Baymard Institute | O cliente vê 1 campo por vez, nunca a lista inteira. |
| Mais opções aumentam o tempo de decisão (Hick-Hyman). | Hick (1952), Hyman | No máximo 2 a 4 cartões por pergunta. Um único botão principal na home. |
| Progresso "dado" de presente aumenta a conclusão: 34% contra 19% no lava-jato. | Nunes & Drèze (2006), JCR | A barra já começa com um passo feito. As primeiras perguntas são as mais fáceis. |
| Barra de progresso lenta no começo aumenta o abandono. Rápida no começo reduz. | Conrad, Couper et al. (2010) | Perguntas de 1 toque no início. O texto livre fica pro fim. Progresso por etapas (Pet · Horário · Você), sem porcentagem. |
| Alvos de toque: 44pt (Apple) e 48dp (Google). O uso com uma mão é o mais comum. | Apple HIG, Material, Hoober (2013) | Botões de 56px ou mais, ação principal na parte de baixo da tela. |
| Quem escreve o próprio cartão de consulta falta 18% menos. Repetir a data e a hora em voz alta reduz as faltas. | Martin, Bassi & Dunbar-Rees (2015), JRSM | Tela de revisão em que o tutor confirma ativamente: "Confirmo: Thor, sábado, 14h". Botão "Salvar na minha agenda". |
| Lembretes por SMS aumentam o comparecimento (revisões sistemáticas e meta-análises). | Guy et al. (2012); Hasvold & Wootton (2011); Cochrane | Fase da agenda: lembrete na véspera. |
| Sinal/depósito reduziu as faltas em 51% num laboratório do sono. | NUHS (2018) | Sinal via Pix depois do vídeo. A política de remarcação é clara e gentil. |
| Pico e fim definem a memória da experiência (peak-end). | Kahneman et al. (1993) | A tela final é o "uau": celebração, resumo bonito e próximos passos claros. |

**Cuidado honesto:** quase tudo acima vem de psicologia comportamental e de testes de usabilidade, não de imagem cerebral. "Neurociência" aqui quer dizer como as pessoas percebem, decidem e lembram.

## Princípios do design

1. **Uma pergunta por tela.** Só uma ação, só um botão principal.
2. **Tocar em vez de digitar.** Cartões grandes com ícone. A escolha única avança sozinha.
3. **Fácil primeiro, difícil por último.** Nome do pet → espécie → porte → … → endereço e contato.
4. **Linguagem da dona, não de sistema.** "O Thor é manso ou bravo?", não "Temperamento".
5. **Personalizar com o nome do pet** em todas as telas depois da primeira.
6. **Ramificar, não mostrar tudo.** O tipo de tosa só aparece se escolheu tosa. O endereço só aparece se for Táxi Dog.
7. **Nunca perder dados.** Rascunho salvo a cada passo. O cliente recorrente começa com o perfil do pet pronto.
8. **Polegar.** O botão principal fica fixo embaixo, com voltar sempre visível em cima.
9. **Movimento curto e calmo** (até 250ms). Respeitar `prefers-reduced-motion`.
10. **Fim memorável.** Confirmação ativa e celebração, depois WhatsApp, vídeo e Pix.

## Roteiro de telas: agendar banho

| # | Tela | Tipo | Observação |
|---|---|---|---|
| 0 | Home: "Seu pet limpinho e cheiroso. Agendar banho" | 1 botão gigante | Táxi Dog como link secundário. Cliente recorrente: "Agendar o Thor de novo?" |
| 1 | Qual o nome do seu pet? | texto curto | Primeiro passo rápido |
| 2 | {Pet} é cachorro ou gato? | 2 cartões | Avança sozinho |
| 3 | Qual o porte? | 3 cartões com silhueta | Pequeno / Médio / Grande |
| 4 | O pelo é curto, médio ou longo? | 3 cartões | |
| 5 | {Pet} é manso ou bravo? | 2 cartões | "Bravo = rosna, morde ou não deixa mexer. Tudo bem!" |
| 6 | O que {pet} vai fazer? | Banho / Banho + tosa | |
| 6b | Que tosa? | cartões | Só se escolheu tosa |
| 7 | Quer algum mimo? | chips opcionais + "Pular" | Hidratação, unhas, ouvido, bucal, perfume, laço |
| 8 | Alguma alergia ou problema de saúde? | Não / Sim → texto | |
| 9 | Vai trazer outro pet junto? | Não / Sim → volta ao 1 | |
| 10 | Que dia fica bom? | cartões dos próximos dias úteis | Domingo não aparece |
| 11 | Que horas {pet} chega? | grade de horários | 13:30 a 18:00. Máx. 2 cães e 1 tosa por horário. Futuramente, só os livres |
| 12 | Como {pet} vem? | Eu levo / Táxi busca / Táxi busca e entrega | |
| 12b | Endereço | CEP → número/complemento | Só se for Táxi Dog |
| 13 | Seu nome | texto | |
| 14 | Seu WhatsApp | telefone | |
| 15 | Revisão + compromisso | resumo bonito + "Confirmo" | Comprometimento ativo |
| 16 | Final "uau" | celebração + 3 passos | WhatsApp com a ficha, vídeo, Pix, salvar na agenda (.ics) |

## Métricas pra acompanhar (Meta Pixel já instalado)

- Início do fluxo → envio pro WhatsApp (taxa de conclusão)
- Em qual tela as pessoas desistem
- Faltas por mês (anotado pela dona), antes e depois do sinal
