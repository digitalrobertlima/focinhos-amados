
# Templates de WhatsApp

## Localização dos Templates

- Os templates de mensagens estão definidos em `config.json > waTemplates`.

## Placeholders Dinâmicos

- Chaves entre `{}` são substituídas automaticamente via função `interpolate()` em `main.js`.
- Função `tidyMessage()` remove linhas vazias e seções sem conteúdo.
- Função `processMessageForPlatform()` pode remover emojis para compatibilidade com dispositivos antigos.

## Templates Disponíveis

- `agendar`, `delivery`, `taxiBanho`, `taxiAgendado`, `teamReply`.

## Comportamentos Especiais

- No fluxo de agendamento, modalidade loja, a mensagem substitui os blocos de endereço por:
  `Localização do solicitante: <lat>,<lng>`

## Boas Práticas

- Utilize frases curtas, labels claras e consistentes.
- Evite links longos no corpo da mensagem; compartilhe separadamente quando necessário.
- Mantenha o telefone em formato E.164 em `config.json.phones.whatsappE164` para garantir compatibilidade com `wa.me`.

---

Essas diretrizes garantem mensagens claras, funcionais e compatíveis com todos os dispositivos e plataformas.
