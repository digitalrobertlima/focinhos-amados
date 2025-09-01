
# Visão Geral da Arquitetura

Este projeto utiliza uma arquitetura simples e eficiente, baseada em tecnologias web nativas para garantir máxima compatibilidade, desempenho e facilidade de manutenção.

## Camadas Principais

- **UI/HTML:** Páginas principais na raiz do projeto (`index.html`, `agendar.html`, `delivery.html`, `taxi.html`, `sobre.html`, `404.html`).
- **Estilos:** `assets/css/style.css` — abordagem mobile-first, com utilitários e variáveis para temas.
- **Lógica:** `assets/js/main.js` — centraliza navegação, persistência, geolocalização, geração de mensagens e controle dos fluxos de agendamento, delivery e táxi.
- **Configuração:** `config.json` (ou `assets/js/config.js` inline) — define dados do negócio, horários, templates de WhatsApp, sugestões e temas.
- **PWA:** `sw.js` (Service Worker) e `manifest.webmanifest` — garantem funcionamento offline, atualização de assets e experiência de aplicativo.

## Pontos de Extensão

- **Templates de WhatsApp:** Definidos em `config.json.waTemplates` com placeholders `{chave}`. Interpolação dinâmica via função `interpolate()` em `main.js`.
- **Sugestões de Produtos/Serviços:** Configuráveis em `config.json.suggestions`.
- **Tema e Cores:** Personalizáveis em `config.json.ui`.

## Mensageria (WhatsApp)

- Geração de links via `waLink(text) -> https://wa.me/<E164>?text=<encoded>`.
- Sanitização de mensagens com `tidyMessage()`.
- Adaptação para dispositivos antigos com `processMessageForPlatform()` (remoção de emojis opcional).
- Fluxo especial para agendamento na loja: substituição dos campos de endereço por localização do solicitante.

## Geolocalização

- Wrapper `Geo.start/get/stop` utiliza `navigator.geolocation.watchPosition` para alta precisão.
- Melhor leitura salva e reverse geocoding via Nominatim, com cache local.
- Precisão alvo ajustável em `config.json.geoloc.requiredPrecisionM`.

## Persistência

- Dados de formulários persistidos em `localStorage` por página (`focinhos:<page>`), com debounce e opção de limpeza.
- Rascunho especial para agendamento multi-pet.

## Carrinho (Delivery)

- Itens do delivery armazenados em `localStorage` (`focinhos:cart`).
- UI sincronizada em tempo real via evento customizado `focinhos:cart:changed`.

---

Esta arquitetura foi desenhada para ser robusta, escalável e facilmente auditável, facilitando futuras evoluções e integrações.
