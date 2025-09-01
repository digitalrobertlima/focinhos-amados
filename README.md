# Focinhos Amados PWA

Este documento descreve a estrutura, funcionalidades e recomendações de uso/manutenção do app focinhos-amados, com foco em PWA.

## Estrutura de Pastas
- `index.html`, `agendar.html`, `delivery.html`, `taxi.html`, `sobre.html`, `404.html`: páginas principais do app.
- `assets/`: recursos estáticos.
  - `css/style.css`: estilos globais e responsivos.
  - `img/`: ícones, fotos, logotipos.
  - `js/config.js`, `js/main.js`: scripts de configuração e lógica principal.
- `manifest.webmanifest`: configurações PWA (instalação, ícones, tema).
- `sw.js`: service worker (cache, offline, atualização).
- `config.json`: configurações dinâmicas do app.
- `LICENSE`, `CHANGELOG.md`: licenciamento e histórico de mudanças.

## PWA
- **Manifest:** Define nome, ícones, cores, modo de exibição, escopo e start_url.
- **Service Worker:** Implementa cache-first para estáticos, network-first para HTML/config, fallback offline, atualização automática.
- **Instalação:** App pode ser instalado em dispositivos móveis e desktops.

## Responsividade & Acessibilidade
- CSS com variáveis, grid, media queries, foco visual, skip link, sr-only.
- HTML semântico, navegação por teclado, imagens com alt.

## SEO & Social
- Meta tags completas, Open Graph, JSON-LD LocalBusiness.

## Recomendações de Manutenção
- Sempre atualizar versão do service worker ao modificar arquivos estáticos.
- Testar com Lighthouse após cada deploy.
- Garantir HTTPS em produção.
- Validar acessibilidade com ferramentas como axe.

## Sugestões de Evolução
- Notificações push.
- Background sync.
- Banner de atualização automática.
- Ajustes para iOS/Safari.

---

Para detalhes técnicos de cada arquivo, consulte os comentários/documentação inline nos próprios arquivos.
