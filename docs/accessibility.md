# Acessibilidade

Diretrizes
- Labels associadas a inputs; não depender apenas de placeholders.
- Estados de erro com `aria-invalid` e mensagens de ajuda visíveis.
- Foco sempre visível; Escape fecha drawer/modais.
- Diálogo do carrinho: `role="dialog"`, trap de foco simples e botão fechar.

Checks automatizados
- `npm run test:a11y` executa verificação básica em páginas chaves.

Testes manuais
- Navegação por teclado completa (Tab/Shift+Tab) e leitura por leitor de telas.
- Contraste de cores de acordo com WCAG AA.
