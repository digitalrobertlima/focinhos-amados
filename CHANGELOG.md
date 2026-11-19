## 0.4.0
- Fidelidade sem servidor: selos assinados digitalmente (ECDSA P-256, WebCrypto).
  - `painel.html` (só para a loja): cria a chave da loja no celular da dona, dá selo de banho, entrega a hidratação e manda o selo pelo WhatsApp. Cópia de segurança da chave em arquivo.
  - O cliente se identifica só pelo celular (sem login, sem CPF, sem senha). O selo é cumulativo e só vale para o número dele.
  - O app confere a assinatura com `config.json → loyalty.publicKey`. Selos adulterados ou de outro número são recusados.
  - Agendar não dá mais selo: o selo só vem depois do banho feito.
- Vibração só depois de um toque (evita aviso do navegador).

## 0.3.1
- Vídeo: pedimos pelo menos 1 minuto.
- Horários de chegada agora vão até 18:00 (novos: 17:30 e 18:00).
- Capacidade: no máximo 2 cães e 1 tosa por horário; duas tosas no mesmo agendamento chegam em horários seguidos. A estrutura `booking.busy` está pronta para receber a ocupação da Agenda Google.
- Táxi Dog: novas opções "só busca" e "só entrega" além de "busca e devolve".
- Fidelidade: trilha por níveis (3 banhos = hidratação de brinde) + níveis misteriosos.

# Changelog
#
## [0.3.0] - 2026-11-19 (branch redesign/agendamento-v2, em teste)
### Changed: redesign completo baseado em pesquisa (docs/ux-pesquisa.md)
- **Agendamento em uma pergunta por tela:** nome → cachorro/gato → tamanho → pelo → manso/bravo → serviço → tipo de tosa → mimos → perfume → laço/gravata → saúde → outro pet → dia → hora → como vem → CEP/número (só Táxi Dog) → nome → WhatsApp → revisão → final.
- Escolhas de um toque avançam sozinhas. O botão "Continuar" só aparece quando precisa digitar.
- O progresso é por etapas (Seu pet · Horário · Você) e começa andado.
- A revisão tem compromisso ativo ("Eu confirmo: Thor chega sábado às 14:00").
- Tela final com 3D, WhatsApp, vídeo, sinal Pix (quando houver chave) e "Salvar na minha agenda" (.ics com aviso 3h antes).
- Cliente que volta: "Agendar Thor de novo" e escolha entre os pets salvos.
- O rascunho é salvo a cada passo (6h). Os botões voltar do app e do celular funcionam.
- Nova home com um único botão principal, Táxi Dog, galeria, depoimentos, onde estamos e abas embaixo.
- Ilustrações 3D originais em SVG (banheira, bolhas, osso, pata, shampoo, tesoura, cachorro, gato, carro, cofre, moedas).
### Added
- Aba **Fidelidade (em breve)** com cofre 3D que abre e cartão de carimbos (1º carimbo de boas-vindas).
- **Convite para instalar o app** depois de enviar o agendamento (Android: instalação nativa; iPhone: instruções).
- Manifest com atalhos "Agendar banho" e "Táxi Dog".
- **Segurança:** Content-Security-Policy, Meta Pixel em arquivo próprio, escape de todo texto digitado, sem GPS silencioso, botão "Apagar meus dados deste celular".
- Teste de ponta a ponta `tools/test-app.js` (`npm test`).
### Removed
- Formulários longos, `main.js` e `style.css` antigos, testes antigos, captura automática de localização.
- `taxi.html` agora redireciona para o agendamento com Táxi Dog.
### Fixed
- O `dist/` não incluía os ícones do app (pwa-192/512).
- Sitemap e robots apontavam para o GitHub Pages.

## [0.2.0] - 2026-11-19 (branch redesign/agendamento-v2, em teste)
### Removed
- Delivery saiu do site (página, menu, home, mensagens e testes). Delivery é da loja do 1º piso.
### Changed
- Horário: seg–sáb 13:30–20:00, domingo fechado. Sem horários de manhã.
- Agendamento: "Janela" virou "Horário de chegada" (13:30 a 17:00, de 30 em 30 min). Domingo bloqueado; hoje só mostra horários com 30 min de antecedência.
- Temperamento: só Manso ou Bravo, com explicação curta.
- Status aberto/fechado da home considera domingo fechado e mostra quando abre.
- Botões "Ver rota" funcionam mesmo antes do JavaScript carregar.
### Added
- Card "Como confirmar seu horário": pede vídeo do pet e mostra a chave Pix do sinal com botão copiar.
- `config.json`: blocos `booking` (regras de horário) e `payments` (chave Pix; vazio = escondido).
- Mensagem do WhatsApp avisa que o tutor vai mandar um vídeo do pet.
- Testes de domingo, horários, Manso/Bravo e pedido de vídeo.

## [0.1.11] - 2025-09-01
### Changed
- Atualização forçada de versão para 0.1.10 em todos os arquivos críticos do app (package.json, dist/package.json, config.json, manifest, service worker, .do/app.yaml).
- Garantida consistência de versão entre build, deploy e arquivos finais.
- Correção de estrutura JSON e automação do fluxo de release.
- Todos os fluxos de endereço (Delivery, Táxi Dog, Agendar) agora incluem campo de complemento (apartamento, bloco, etc.) na interface e nas mensagens do WhatsApp.
## [0.1.12-pre] - 2025-09-01
### Pre-release
- Versão de pré-release para validação final antes do lançamento estável.
- Atualização de versionamento e documentação.
- Testes automatizados recomendados antes do release final.

### Changed
- Validação e coleta do complemento de endereço garantidas em todos os fluxos, inclusive Taxi Dog no Agendar.
- Correção final: campo complemento presente em todos os formulários e lógicas de endereço, conforme revisão de QA.
All notable changes to this project will be documented in this file.
## [0.1.6] - 2025-08-23
### Fixed
- Agendar (opção loja): mensagem do WhatsApp agora inclui apenas “Localização do solicitante: lat,lng” (removidos blocos Origem/Destino nessa modalidade).
- Delivery: corrigido incremento duplo nos botões de quantidade (+/–) removendo handler duplicado.

### Docs
- Documentação profissional adicionada em `docs/` (arquitetura, desenvolvimento, testes, release, templates de WhatsApp, geolocalização e acessibilidade). Links no README principal.

## [0.1.2] - 2025-08-19
### Added
- Home: Indicador de status com ponto colorido (verde/brilho para “Aberto agora”; vermelho para “Fechado” com mensagem “Abre às HH:MM”). Atualiza automaticamente a cada minuto.

### Changed
- Página inicial: ícones dos serviços trocados por emojis para confiabilidade em todas as plataformas.
- Versão do app atualizada para `v0.1.2` (ajuda o Service Worker a atualizar dispositivos mais rápido).

## [0.1.0] - 2025-08-18
### Added
- First public release: lightweight PWA with Agendamento, Delivery and Táxi Dog flows.
- Service Worker with offline fallback and cache-first strategy for static assets.
- End-to-end automation: full flows, accessibility checks and a scenario matrix.

### Changed
- Bumped package version to `0.1.0`.
- SW version set to `fa-0.1.1` (forces cache refresh on deploy).
- Robust “Adicionar outro pet” handler for real-world click edge cases.
- Delivery quantity/cart handlers stabilized.
- SEO: `robots.txt` and `sitemap.xml` updated to GitHub Pages URL.

### Notes
- Hosted under GitHub Pages; `config.json` is fetched relatively to support subpaths.
- If you see stale assets after deploy, refresh once to update the SW.
