
# Focinhos Amados — Documentação Profissional

<<<<<<< HEAD
## 📦 Estrutura

```
/
├─ index.html
├─ agendar.html
├─ delivery.html
├─ taxi.html
├─ sobre.html
├─ 404.html
├─ manifest.webmanifest
├─ sw.js
├─ robots.txt
├─ sitemap.xml
  └─ assets/
  ├─ css/style.css
  ├─ js/config.js
  ├─ js/main.js
  └─ img/
    ├─ escultura_unique.png
    ├─ og.jpg
    ├─ pwa-192.png
    ├─ pwa-512.png
  └─ sprite.svg
```

## 🛠️ O que editar primeiro (CONFIG)

Arquivo: `assets/js/config.js`

```js
window.CONFIG = {
  business: {
    name: "Focinhos Amados",
    city: "Belo Horizonte/MG",
    addressLine: "Av. Padre José Maurício, 572 – Nova Cintra",
    phones: {
      landline: "+55 31 3322-3070",
      whatsappE164: "5531982339672",
      whatsappHuman: "+55 31 98233-9672"
    },
    hours: { mon_sat: "10:00–20:00", sun: "10:00–13:00" },
    shopCoords: { lat: null, lng: null } // ↺ preencha quando tiver as coords
  },
  suggestions: { products:[...], upsellServices:[...] },
  waTemplates: { agendar: `...`, delivery: `...`, taxiBanho: `...`, taxiAgendado: `...` }
};
```

* **`city`**: manter **Belo Horizonte/MG** (conforme SPEC).
* **`shopCoords`**: preencha `lat` e `lng` da loja para ativar o botão **🗺️ Ver rota no Google Maps** (formato decimal, ex.: `-19.956`, `-43.970`).
* **`whatsappE164`**: já configurado (5531982339672). Usado por `wa.me`.
* **Sugestões** (`suggestions.products` e `upsellServices`): edite os itens exibidos no Delivery e no upsell do Agendar.
* **Templates WhatsApp**: ajuste textos se desejar. As **chaves `{}`** são preenchidas automaticamente.

> Dica: rótulos como horários na Home e Sobre são renderizados via `CONFIG.__format.hoursLabel()`.

## 🖼️ Ícones e imagens

* **`assets/img/og.jpg`**: imagem 1200×630 (≤200KB). Usada em Open Graph (já presente).
* **`assets/img/pwa-192.png`** e **`assets/img/pwa-512.png`**: ícones PWA (já presentes). O 512 deve ser **maskable**.
* **`assets/img/escultura_unique.png`**: arquivo do logotipo usado atualmente; opcionalmente substitua por `logo.svg` para melhor escala.
* **`assets/img/sprite.svg`**: sprite SVG com ícones. Na Home, os serviços usam emojis para máxima compatibilidade.
* (Opcional) Adicione imagens reais para a galeria em `assets/img/placeholder-*.webp` ou ajuste o HTML.

## 🌐 SEO / Social

1. **`robots.txt`**: atualize a linha do Sitemap com seu domínio.

   ```
   Sitemap: https://SEU_USUARIO.github.io/SEU_REPO/sitemap.xml
   ```
2. **`sitemap.xml`**: atualize todas as URLs com o domínio do Pages (ou seu domínio customizado).
3. **Open Graph**: já configurado nos `<meta>` de cada página (usa `/assets/img/og.jpg`).
4. **JSON‑LD (Home)**: embutido no `index.html`. Se quiser melhorar a prévia externa, troque o `image` e `url` para absolutos quando publicado.

## 📱 PWA

* Manifesto em `manifest.webmanifest` (nome, cores, ícones, `start_url: "index.html"`).
* Service Worker em `sw.js`:

  * **Cache-first**: CSS/JS/imagens/manifest.
  * **Network-first**: HTML (mantém conteúdo fresco).
  * **Fallback offline**: HTML básico quando sem conexão.
* Registro do SW no `assets/js/main.js` (em `initSW`).

> Para atualizar agressivamente, incremente `SW_VERSION` no `sw.js` e faça um commit.

## ▶️ Como testar localmente

Sem dependências. Você pode apenas abrir o `index.html`. Para testar SW/PWA/rotas, use um servidor simples:

### Opção A — Python 3

```bash
# na pasta do projeto
python -m http.server 8080
# abra http://localhost:8080
```

### Opção B — VS Code (Live Server)

* Instale a extensão **Live Server** e clique em **Go Live**.

## 📚 Documentação

- Visão geral e arquitetura: `docs/architecture.md`
- Ambiente de desenvolvimento: `docs/development.md`
- Testes (fluxos, matrix, acessibilidade): `docs/testing.md`
- Publicação e releases: `docs/release.md`
- Templates de WhatsApp e placeholders: `docs/whatsapp-templates.md`
- Geolocalização e privacidade: `docs/geolocation.md`
- Acessibilidade: `docs/accessibility.md`

## ☁️ Publicar no GitHub Pages

1. Crie um repositório e suba todos os arquivos na branch **v0.1-LTS** (raiz do repo) — ela é a estável.
2. Em **Settings → Pages**:

  * *Source*: **Deploy from a branch**
  * *Branch*: **v0.1-LTS** / **root**
3. Aguarde a URL do Pages. Atualize:

   * `robots.txt` → `Sitemap: https://SEU_USUARIO.github.io/SEU_REPO/sitemap.xml`
   * `sitemap.xml` → troque `https://seu-dominio` pela sua URL final.
4. (Opcional) Se usar **domínio customizado**, configure o CNAME em Settings → Pages e o DNS.

## 🧭 Geolocalização

* Botões **📍 Usar minha localização** usam `navigator.geolocation.watchPosition` com alta precisão (até 30 s).
* O melhor fix é salvo (precisão mínima desejada: `CONFIG.geoloc.requiredPrecisionM = 50`).
* Se o usuário **negar** a permissão, os formulários exigem **endereço manual**.

## 🧾 Fluxos (checagem rápida)

* **Home**: sem CTA direto de WhatsApp. Apenas direciona para Agendar/Delivery/Táxi.
* **Agendar**: serviços (Banho/Tosa), preferências (perfume, acessório, escovação), upsell, data/janela, localização/ endereço → **Resumo** → **WhatsApp**.
* **Delivery**: datalist de produtos → carrinho → endereço/geo → **Resumo** → **WhatsApp**.
* **Táxi Dog**: (1) Banho/Tosa: buscar/entregar/buscar+entregar **ou** (2) Agendado livre → origens/destinos com geo por campo → **Resumo** → **WhatsApp**.

## 🔒 Acessibilidade (WCAG AA)

* Labels associadas via `for/id`; placeholders não substituem label.
* Focus visível (`outline` em var `--focus`).
* Estados de erro com `aria-invalid="true"` + ajuda ligada por id.
* Navegação mobile com `aria-expanded`, `aria-controls`, `aria-hidden`.
* Ícones são decorativos (`aria-hidden="true"`), botões têm texto visível.

## ⚡ Performance

* **Meta**: LCP < 2,5 s | TTI < 3,5 s | JS < 60KB gzip (todo o projeto está bem abaixo) | imagens ≤200KB (hero) / ≤120KB (thumbs).
* Imagens com `loading="lazy"` e `decoding="async"`.
* Sem fontes externas (usa system UI).

## 🧪 Testes manuais

* **Mobile ≤390px** e **Desktop ≥1280px** (Chrome/Android e Safari/iOS).
* Drawer abre/fecha, foco acessível, Escape fecha.
* Botões **🗺️ Ver rota no Google Maps** aparecem se `shopCoords` preenchido.
* Mensagens do WhatsApp geradas corretamente (confira URLs `wa.me`).
* Service Worker registrado sem erros; modo offline mostra fallback.

## 🧩 Dúvidas comuns

* **Onde altero os horários exibidos?** `assets/js/config.js` → `business.hours`.
* **Onde mudo a cidade e o endereço?** `business.city` e `business.addressLine`.
* **Posso remover campos dos formulários?** Sim; mantenha os `id` atualizados e ajuste o `main.js` se necessário.
* **Posso ligar o WhatsApp na Home?** Não. Requisito do SPEC: finalizar no WhatsApp **só ao fim dos fluxos**.
=======
## Visão Geral
Focinhos Amados é um Progressive Web App (PWA) para agendamento de serviços, delivery e Táxi Dog, focado em experiência mobile, performance, acessibilidade e integração com WhatsApp.
>>>>>>> v0.1.11

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

<<<<<<< HEAD
Use the web menu to produce files and then copie-os manualmente para os caminhos correspondentes do repositório.

## Deploy (DigitalOcean App Platform)

- Output directory: `dist`
- Build command: `npm ci && npm run build:dist`
- App spec: see `.do/app.yaml` (configures repo, branch, build, and output_dir).

If you deploy via DO’s detected settings and see: “could not find the output directory”, point the Output Directory to `dist` or enable the provided `.do/app.yaml` in App Spec mode.
=======
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
>>>>>>> v0.1.11
