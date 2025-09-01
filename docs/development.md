
# Ambiente de Desenvolvimento

## Pré-requisitos

- Navegador moderno (Chrome, Edge, Firefox) e editor de código (VS Code recomendado).
- Node.js apenas para execução de testes automatizados (Puppeteer).

## Execução Local

- Basta abrir `index.html` diretamente no navegador para testar funcionalidades básicas.
- Para testar PWA, Service Worker e rotas, utilize um servidor local:
	- Python 3: `python -m http.server 8080` (acesse `http://localhost:8080`)
	- Alternativamente, use extensões como Live Server no VS Code.

## Estrutura das Páginas

- Cada página define o atributo `data-page` no elemento `<body>`, ativando a lógica específica em `main.js`.

## Configuração do App

- Edite `config.json` (recomendado) ou `assets/js/config.js` inline para personalizar dados do negócio, horários, templates de WhatsApp e sugestões.
- Principais campos: telefones, endereço, horários, templates, sugestões de produtos/serviços.

## Padrões de Código

- JavaScript vanilla, funções pequenas e utilitários organizados no topo de `main.js`.
- Evite dependências externas para garantir compatibilidade e tamanho reduzido.

## Debug e Diagnóstico

- Utilize `console.debug` para inspecionar resumos, validações, geolocalização e manipulação de pets.
- Para visualizar mensagens sem emojis, acrescente `?emoji=0` à URL.

---

Este ambiente foi pensado para facilitar o desenvolvimento, testes e manutenção, promovendo agilidade e qualidade no ciclo de vida do app.
