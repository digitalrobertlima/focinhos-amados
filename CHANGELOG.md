# Changelog
#
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
