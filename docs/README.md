
# Focinhos Amados — Documentação Técnica

## Sumário

- [Visão Geral da Arquitetura](./architecture.md)
- [Ambiente de Desenvolvimento](./development.md)
- [Testes (Automatizados e Manuais)](./testing.md)
- [Publicação e Releases](./release.md)
- [Templates de WhatsApp](./whatsapp-templates.md)
- [Geolocalização e Privacidade](./geolocation.md)
- [Acessibilidade](./accessibility.md)

---

## 1. Visão Geral da Arquitetura

- **Stack:** HTML, CSS e JavaScript puro (sem dependências externas).
- **PWA:** Service Worker para cache e funcionamento offline.
- **Configuração:** Centralizada em `config.json` (ou inline em `assets/js/config.js`).
- **Lógica:** `assets/js/main.js` gerencia navegação, persistência, geolocalização, geração de mensagens e fluxos.
- **Templates:** Mensagens de WhatsApp parametrizadas via placeholders.

## 2. Ambiente de Desenvolvimento

- **Pré-requisitos:** Navegador moderno e VS Code. Node.js apenas para testes automatizados.
- **Execução local:** Basta abrir `index.html` ou rodar um servidor simples (`python -m http.server 8080`).
- **Configuração:** Editar `config.json` para dados do negócio, horários, templates e sugestões.
- **Padrão de código:** Funções pequenas, JS vanilla, sem dependências externas.

## 3. Testes

- **Automatizados:** Scripts Node + Puppeteer para fluxos principais, cenários e acessibilidade.
- **Manuais:** Testes em mobile e desktop, navegação por teclado, validação de mensagens.
- **Cobertura:** Geração de links WhatsApp, validações obrigatórias, geolocalização mockada.

## 4. Publicação e Releases

- **Branch principal:** `v0.1-LTS` para produção (GitHub Pages).
- **Checklist:** Atualizar versão, rodar testes, subir commit/tag, garantir branch correta no deploy.
- **SW/Cache:** Incrementar versão para forçar atualização em clientes.

## 5. Templates de WhatsApp

- **Local:** `config.json > waTemplates`
- **Placeholders:** Chaves `{}` substituídas dinamicamente.
- **Boas práticas:** Frases curtas, labels claras, telefone em E.164.

## 6. Geolocalização e Privacidade

- **Funcionamento:** Usa `watchPosition` para alta precisão, reverse geocode com cache local.
- **Privacidade:** Dados não são enviados ao servidor; usuário pode negar permissão.
- **Configuração:** Parâmetros ajustáveis em `config.json.geoloc`.

## 7. Acessibilidade

- **Diretrizes:** Labels associadas, foco visível, estados de erro acessíveis, navegação por teclado.
- **Checks:** Automatizados via script, manuais em todos fluxos e dispositivos.
- **Conformidade:** WCAG AA para contraste e navegação.

---

Esta documentação foi elaborada para garantir clareza, padronização e facilitar onboarding, manutenção e auditoria do app. Para detalhes de cada área, consulte os arquivos específicos listados no sumário.
