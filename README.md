
# Focinhos Amados — Documentação Profissional

## Visão Geral
Focinhos Amados é um Progressive Web App (PWA) para agendamento de serviços, delivery e Táxi Dog, focado em experiência mobile, performance, acessibilidade e integração com WhatsApp.

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

## Comentários Inline — Exemplos Profissionais

### HTML
```html
<!-- Topbar: navegação principal, inclui menu e ações rápidas -->
<header class="topbar" role="banner"> ... </header>
```

### CSS
```css
/* Grid responsivo para galeria de pets */
.gallery { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
```

### JavaScript
```js
// Atualiza status de funcionamento (aberto/fechado) na home
function updateStatus() { ... }
```

### Service Worker
```js
// Network-first para HTML, fallback offline
self.addEventListener('fetch', (e) => { ... });
```

---

## Deploy
- Recomenda-se GitHub Pages ou servidor HTTPS.
- Para publicar:
  ```bash
  git push origin <branch>
  # Configure GitHub Pages para servir a partir da branch principal ou pasta /docs
  ```
- Sempre valide o funcionamento offline e instalação PWA após deploy.

---

## Configuração
- **config.json:** Edite dados do negócio, horários, templates e cores conforme necessidade.
- **manifest.webmanifest:** Atualize nome, ícones, cores e versão ao modificar assets ou branding.
- **sw.js:** Atualize versão e assets para garantir cache correto.

---

## Contribuição
- Padronize mensagens de commit: `tipo: descrição curta` (ex: `fix: corrige bug no agendamento`).
- Pull Requests devem ser revisados por outro desenvolvedor.
- Teste flows, acessibilidade e offline antes de aprovar PRs.
- Documente decisões técnicas relevantes nos arquivos alterados.

---

## Comandos Úteis
- Instalar dependências (se houver):
  ```bash
  npm install
  ```
- Rodar preview local:
  ```bash
  python -m http.server 8080
  ```
- Testar flows:
  ```bash
  npm run test:flows
  npm run test:a11y
  npm run test:matrix
  ```
- Commit e push:
  ```bash
  git add .
  git commit -m "docs: atualização de documentação"
  git push
  ```

---

> Documentação mantida por desenvolvedor contratado. Última atualização: 2025-09-01.

---

> Documentação mantida por desenvolvedor contratado. Última atualização: 2025-09-01.

