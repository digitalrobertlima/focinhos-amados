# Visão Geral da Arquitetura

Stack: HTML + CSS + JS vanilla, sem build step. PWA com Service Worker.

Camadas principais
- UI/HTML: páginas em raiz (index, agendar, delivery, taxi, sobre).
- Estilos: `assets/css/style.css` (mobile-first, utilitários simples).
- Lógica: `assets/js/main.js` concentra navegação, persistência, geoloc, geração de mensagens, e fluxos (agendar/delivery/taxi).
- Configuração dinâmica: `config.json` carregado no boot; pode ser substituído por `assets/js/config.js` inline se necessário.
- PWA: `sw.js` e `manifest.webmanifest`.

Pontos de extensão
- Templates WhatsApp em `config.json.waTemplates` com placeholders `{chave}`. A interpolação é feita por `interpolate()` em `main.js`.
- Sugestões (produtos/serviços) via `config.json.suggestions`.
- Cores/tema básicos em `config.json.ui`.

Mensageria (WhatsApp)
- Link gerado por `waLink(text) -> https://wa.me/<E164>?text=<encoded>`.
- `tidyMessage()` sanitiza linhas vazias e seções órfãs.
- `processMessageForPlatform()` remove emojis em devices antigos (opcionalidade via `emoji=0|1`).
- Agendar (modo loja): substitui Origem/Destino por “Localização do solicitante: lat,lng”.

Geolocalização
- Wrapper `Geo.start/get/stop` usa `watchPosition` (alta precisão), salva a “melhor” leitura e resolve endereço via Nominatim com cache local.
- Precisão alvo configurável em `config.json.geoloc.requiredPrecisionM`.

Persistência
- Campos do formulário são persistidos com `localStorage` por página (`focinhos:<page>`), com debounce e botão de limpar.
- Agendar possui rascunho próprio por ser multi-pet.

Carrinho (Delivery)
- Itens guardados em `localStorage` (`focinhos:cart`). UI renderizada dinamicamente e sincronizada em tempo real via evento `focinhos:cart:changed`.
