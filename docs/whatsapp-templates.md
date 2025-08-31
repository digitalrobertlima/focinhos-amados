# Templates de WhatsApp

Local: `config.json → waTemplates`

Placeholders
- Chaves `{nome}` são substituídas via `interpolate()` em `main.js`.
- `tidyMessage()` remove linhas vazias e seções sem conteúdo.
- `processMessageForPlatform()` pode remover emojis quando necessário.

Templates disponíveis
- `agendar`, `delivery`, `taxiBanho`, `taxiAgendado`, `teamReply`.

Comportamentos especiais
- Agendar, modalidade `loja`: a mensagem substitui os blocos “Onde buscar o pet?” e “Onde entregar o pet?” por uma linha única:
  `Localização do solicitante: <lat>,<lng>`

Boas práticas
- Prefira frases curtas, labels claras e consistentes.
- Evite links longos no corpo; deixe a equipe compartilhar quando necessário.
- Mantenha o telefone em E.164 no `config.json.phones.whatsappE164` para compatibilidade com `wa.me`.
