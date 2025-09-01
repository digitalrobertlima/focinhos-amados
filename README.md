
# Focinhos Amados — Documentação Profissional

## Visão Geral
Focinhos Amados é um Progressive Web App (PWA) para agendamento de serviços, delivery e Táxi Dog, focado em experiência mobile, performance, acessibilidade e integração com WhatsApp.

---

## Arquitetura
- **Frontend:** HTML5, CSS3, JavaScript puro (sem frameworks pesados).
- **PWA:** Manifesto, Service Worker, cache offline, instalação em dispositivos.
- **Assets:** Organizados em `assets/` (CSS, JS, imagens, ícones SVG/PNG/WebP).
- **Configuração dinâmica:** `config.json` centraliza dados do negócio, horários, templates de WhatsApp, cores e sugestões.

---

## Estrutura de Diretórios
- `index.html`, `agendar.html`, `delivery.html`, `taxi.html`, `sobre.html`, `404.html`: páginas principais.
- `assets/`
  - `css/style.css`: estilos globais, responsivos e acessíveis.
  - `img/`: ícones, fotos, logotipos, sprites SVG.
  - `js/config.js`: carrega configurações dinâmicas.
  - `js/main.js`: lógica principal, interações, integração WhatsApp.
- `manifest.webmanifest`: configurações PWA (nome, ícones, tema, escopo, display).
- `sw.js`: Service Worker (cache, offline, atualização, fallback).
- `config.json`: dados do negócio, templates, sugestões, cores.
- `LICENSE`, `CHANGELOG.md`, `README.md`: licenciamento, histórico e documentação.

---

## Fluxo PWA
1. **Instalação:** Manifesto permite instalação em Android/iOS/desktop.
2. **Service Worker:**
  - Pré-cache de assets essenciais.
  - Cache-first para estáticos, network-first para HTML/config.
  - Fallback offline para HTML.
  - Atualização automática via versão e postMessage.
3. **Experiência Offline:** Usuário pode navegar e acessar recursos mesmo sem conexão após o primeiro acesso.

---

## Onboarding de Desenvolvedores
1. **Clonar o repositório:**
  ```bash
  git clone <repo-url>
  cd focinhos-amados
  ```
2. **Pré-requisitos:**
  - Node.js (para scripts de teste e build)
  - Python (para preview local)
3. **Preview local:**
  ```bash
  python -m http.server 8080
  ```
4. **Testes:**
  - Flows: `npm run test:flows`
  - Acessibilidade: `npm run test:a11y`
  - Matrix: `npm run test:matrix`

---

## Manutenção e Boas Práticas
- **Versão:** Sempre atualize a versão do Service Worker e do manifest ao modificar arquivos estáticos.
- **Cache:** Use query param `?v=` para bust de cache em deploys.
- **Acessibilidade:** Teste com Lighthouse e axe; mantenha navegação por teclado e contraste.
- **SEO:** Mantenha meta tags, Open Graph e JSON-LD atualizados.
- **HTTPS:** Obrigatório em produção para funcionamento do Service Worker.
- **Documentação Inline:** Consulte comentários nos arquivos principais para entender cada bloco de código.

---

## Padrões de Código
- **HTML:** Semântico, com ARIA, skip links, alt em imagens.
- **CSS:** Mobile-first, variáveis, grid/flex, media queries, foco visual.
- **JS:** Modular, funções puras, integração com WhatsApp, manipulação de DOM sem dependências externas.

---

## Evolução Recomendada
- Notificações push (Web Push API).
- Background sync para pedidos offline.
- Banner de atualização automática (quando há nova versão).
- Ajustes para limitações do iOS/Safari.
- Internacionalização (i18n) se expandir para outras cidades/idiomas.

---

## Referências
- [Google PWA Docs](https://web.dev/progressive-web-apps/)
- [Acessibilidade Web](https://www.w3.org/WAI/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

## Contato e Suporte
- Para dúvidas técnicas, consulte o README e comentários inline.
- Para suporte ao negócio, veja dados em `config.json` ou acesse o WhatsApp da loja.

---

> Documentação mantida por desenvolvedor contratado. Última atualização: 2025-09-01.
