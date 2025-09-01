
# Acessibilidade

## Diretrizes Gerais

- Labels sempre associadas a inputs; nunca dependa apenas de placeholders.
- Estados de erro devem utilizar `aria-invalid` e apresentar mensagens de ajuda visíveis e acessíveis.
- Foco visível em todos os elementos interativos; Escape fecha drawers e modais.
- Diálogo do carrinho implementado com `role="dialog"`, trap de foco e botão de fechar acessível.

## Checks Automatizados

- Script `npm run test:a11y` executa verificação básica de acessibilidade nas páginas principais.

## Testes Manuais

- Navegação por teclado completa (Tab/Shift+Tab), leitura por leitores de tela.
- Contraste de cores conforme padrão WCAG AA.

---

Essas práticas garantem que o app seja utilizável por todos, promovendo inclusão e conformidade com padrões internacionais de acessibilidade.
