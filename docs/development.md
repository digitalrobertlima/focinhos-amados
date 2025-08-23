# Ambiente de Desenvolvimento

Pré-requisitos
- Navegador moderno (Chrome/Edge/Firefox) e VS Code.
- Node.js apenas se for rodar testes automatizados (Puppeteer).

Rodando localmente
- Abra `index.html` direto ou use um servidor simples para testar PWA/rotas.
- Com Python 3: `python -m http.server 8080` e acesse `http://localhost:8080`.

Páginas e atributos
- Cada página define `data-page` no `<body>` que habilita a lógica correspondente no `main.js`.

Configuração
- Edite `config.json` (recomendado) ou `assets/js/config.js` inline.
- Campos principais: telefones, endereço, horários, templates de WhatsApp, sugestões.

Padrões de código
- JS vanilla, funções pequenas, utilitários no topo do `main.js`.
- Evite dependências externas. Priorize compatibilidade e tamanho reduzido.

Debug
- `console.debug` está espalhado em pontos-chave (resumos, validações, geoloc, pets).
- Para ver mensagens sem emoji, use `?emoji=0` na URL.
