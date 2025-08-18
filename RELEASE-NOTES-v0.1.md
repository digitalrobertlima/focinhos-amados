# v0.1 — Primeira tag pública

Data: 2025-08-18
Tag: `v0.1`

## Destaques
- PWA leve e estável com três fluxos principais:
  - Agendamento (banho/tosa) com suporte a múltiplos pets e resumo via WhatsApp.
  - Delivery com carrinho local, resumo e envio por WhatsApp.
  - Táxi Dog (banho/tosa imediato e agendado) com origem/destino por endereço ou geolocalização.
- Service Worker atualizado (`fa-0.1.1`) com pré-cache de estáticos, offline básico e update coordenado.
- Melhorias de UX e robustez:
  - Clique confiável em “Adicionar outro pet” mesmo com overlays/extra listeners.
  - Handlers do carrinho/quantidade corrigidos para evitar estados inconsistentes.
  - Datas/horários formatados com fallback seguro.
- SEO e hospedagem:
  - `robots.txt` e `sitemap.xml` atualizados para a URL do GitHub Pages.
  - `config.json` carregado via caminho relativo para subpaths.

## Qualidade e testes
- Testes E2E de fluxos principais (agendar, delivery, táxi) com interceptação de WhatsApp.
- Testes de acessibilidade leves (presença de seções, modal do carrinho quando aplicável).
- Matriz de cenários abrangente com combinações de validações e caminhos felizes (todos verdes na tag).

## Itens técnicos
- Frontend: HTML/CSS/JS vanilla.
- Persistência: `localStorage` (carrinho e drafts de formulários pontuais).
- Geolocalização: `navigator.geolocation.watchPosition` + cache local de reverse geocode.
- PWA: `manifest.webmanifest` e `sw.js` (network-first para HTML/config; cache-first para estáticos).

## Como testar localmente (opcional)
```
# 1) Instale dependências de teste
npm install

# 2) Execute os testes
npm run test:flows
npm run test:a11y
npm run test:matrix

# 3) Servidor local (qualquer server estático funciona)
python -m http.server 8080
# ou
npx http-server -p 8080
```

## Observações
- Se após deploy os assets parecerem antigos, atualize a página para forçar o SW a baixar a versão nova.
- O botão de carrinho não aparece na Home por design; os testes de a11y já consideram isso.

## Próximos passos sugeridos
- Pequenos testes de unidade nas funções de formatação e validação.
- Métricas de uso do SW e de conversões de WhatsApp (respeitando privacidade).
- Ajustes de UI responsiva e microcopys conforme feedback real.
