
# Testes

## Testes Automatizados

- Utilizam Node.js e Puppeteer para simular fluxos completos do usuário.
- Scripts principais:
  - `npm run test:flows` — cobre agendamento, delivery, táxi e navegação da home.
  - `npm run test:matrix` — explora cenários variados e validações de campos.
  - Variantes `:ui` executam testes em modo visual (headful).
- Requisitos: `npm install` para instalar dependências de desenvolvimento.
- Compatibilidade: Edge/Chrome autodetectados em Windows.

### Cobertura dos Testes

- Geração correta de links do WhatsApp (`https://wa.me/...`).
- Validações obrigatórias em todos os fluxos (serviços, telefone, endereços por modalidade).
- Geolocalização simulada: lat/lng precisos e reverse geocode stub.

## Testes Manuais

- Testes em dispositivos móveis (≤390px) e desktop (≥1280px).
- Navegação por teclado: foco visível, Escape fecha o drawer.
- Conferência das mensagens do WhatsApp: sections e placeholders resolvidos corretamente.

---

O processo de testes garante robustez, acessibilidade e experiência consistente para todos os usuários.
