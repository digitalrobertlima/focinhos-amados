# Testes

Automatizados (Node + Puppeteer)
- Scripts:
  - `npm run test:flows` — fluxos principais (agendar, delivery, taxi, home links).
  - `npm run test:matrix` — cenários variados e validações.
  - Variantes `:ui` para modo headful.
- Requisitos: `npm install` (devDependencies). Em Windows, Edge/Chrome são autodetectados.

O que é verificado
- Geração de links do WhatsApp (`https://wa.me/...`).
- Validações obrigatórias por fluxo (serviços, telefone, endereços por modalidade).
- Geolocalização mockada: lat/lng precisos e reverse geocode stub.

Testes manuais
- Mobile (≤390px) e desktop (≥1280px).
- Navegação por teclado (foco visível, Escape fecha o drawer).
- Mensagens do WhatsApp: conferir sections e placeholders resolvidos.
