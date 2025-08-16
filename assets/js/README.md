# Focinhos Amados — Site estático (PWA leve)

> **Stack:** HTML + CSS + JS vanilla (sem libs, sem bundlers). Publicação em GitHub Pages.

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
      ├─ logo.svg
      ├─ og.jpg           ← adicione (1200×630, ≤200KB)
      ├─ pwa-192.png      ← adicione (192×192)
      └─ pwa-512.png      ← adicione (512×512, maskable)
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

* **`assets/img/og.jpg`**: imagem 1200×630 (≤200KB). Usada em Open Graph.
* **`assets/img/pwa-192.png`** e **`assets/img/pwa-512.png`**: ícones PWA. O 512 deve ser **maskable** (fundo estendido).
* **`assets/img/logo.svg`**: logo monocromática (pode substituir).
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

## ☁️ Publicar no GitHub Pages

1. Crie um repositório e suba todos os arquivos na branch **main** (raiz do repo).
2. Em **Settings → Pages**:

   * *Source*: **Deploy from a branch**
   * *Branch*: **main** / **root**
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

---

Feito com 💚 para **Focinhos Amados (BH)** — publicação sem dor de cabeça, manutenção simples. Boa divulgação!
