# v0.1.6 — Notas de Release (branch: v0.1.6-location-fixed)

Data: 2025-08-23  
Tag sugerida: `v0.1.6`

## Resumo executivo
- Agendar (modalidade loja): mensagem do WhatsApp simplificada — envia somente “Localização do solicitante: lat,lng”.
- Delivery: correção de incremento duplo nos botões de quantidade (+/–).
- Melhorias amplas em validações, rascunhos, rótulos em PT-BR e mensagens do WhatsApp.
- Status “Aberto agora/Fechado” na Home com horário de fechamento.
- Documentação profissional adicionada em `docs/` (arquitetura, dev, testes, release, templates, geoloc, a11y).

## Alterações detalhadas (consolidadas dos commits)

Agendar
- Serviços por pet (banho/tosa e extras), inclusão no resumo e validações robustas (48c9a94, e93bf55, 1f82dcc, c519b68).
- Botão “Adicionar outro pet” mais confiável e botão “Remover pet” com correção de indexação (b553e49, d92944e, 5c1319b).
- Validação exige pelo menos um serviço por pet; atualização automática do resumo e do link do WhatsApp quando o formulário está completo (c519b68, 5857c66, a8c39cb).
- Modalidades de localização com obrigatoriedade de endereço por caso (buscar/entregar/ambos); marcação visual de obrigatórios (9441043).
- Traduções e labels amigáveis em PT-BR nas mensagens do WhatsApp (76c790e).
- Modalidade “Levarei na loja”: mensagem ajustada para incluir apenas a linha “Localização do solicitante: lat,lng” (5cc3b0b).

Delivery
- Criação do carrinho com armazenamento local, atualização e remoção de itens (6e65725, 8cdef54).
- Correção de handlers do carrinho e validações (23002b9).
- Correção do incremento duplo nos botões (+/–) removendo handler duplicado (5cc3b0b).
- Rascunho salvo (endereço/contato/observações) com restauração (aa1d942).

Táxi Dog
- Cenários de banho imediato e agendado com endereços por modalidade, integração de geolocalização e validações (fc62ab2, aa1d942).
- Traduções e labels PT-BR nas mensagens (76c790e).
- Auto-resumo e atualização automática do link do WhatsApp quando completo (a8c39cb).

Home / UI
- Indicador “Aberto agora/Fechado” com status dinâmico; exibe horário de fechamento quando aberto (638815e, 1726dcb).
- Ajustes em ícones, favicons e manifesto (e4dfbe4, 1b798a2, 78a49bb, b447150).

Mensagens do WhatsApp
- Revisões de templates e espaçamentos; correções em mensagens (21295b5, c260efa, 7f00117, 6ff57e5).
- Política: sem exibir preços; foco em consolidar detalhes via WhatsApp (aa1d942).

Geolocalização
- Precisão e tolerância ajustadas; apenas coordenadas são enviadas quando apropriado; reverse geocode com cache local (53eabbf, aa1d942).

Service Worker e Config
- Bump de versão e melhor controle de atualização de clientes; `appVersion` utilizada para cache busting (b553e49, 638815e).

Documentação e Testes
- Release notes, CHANGELOG e guia de release (f16abf2, 7bd7543).
- Testes E2E (fluxos), matriz de cenários e acessibilidade; estabilização de seletores e mocks de geoloc (ea79419, 512b22e, 500a9d0, fc62ab2).

Outros ajustes e correções
- Correções de HTML/CSS e pequenos bugs (422138c, e89749a, c6cd901, b2ad073, 23002b9, 920bd38).
- Padronizações em PT-BR (cd3257a).

> Observação: commits experimentais/revertidos de teste foram consolidados neste resumo para refletir o estado final da branch.

## Qualidade e testes
- Testes automatizados: `npm run test:flows`, `npm run test:matrix`, `npm run test:a11y`.
- Geolocalização mockada para estabilidade (lat/lng e reverse geocode stubs).

## Itens técnicos
- `config.json`: `appVersion = 0.1.6` (para atualização mais rápida via SW).
- `assets/js/main.js`: composição das mensagens (inclui caso loja), carrinho (fix +/–), auto-resumos e validações.
- `sw.js`: usa `appVersion` na query para forçar atualização de cache no registro.

## Como testar localmente (opcional)
```
# Dependências de teste
npm install

# Testes
npm run test:flows
npm run test:matrix
npm run test:a11y

# Servidor estático
python -m http.server 8080
# ou
npx http-server -p 8080
```

## Observações de publicação
- Após deploy, um refresh pode ser necessário para o SW ativar a versão nova.
- Em GitHub Pages, confirme a branch de deploy e, se houver mudança de URL, atualize `robots.txt` e `sitemap.xml`.
