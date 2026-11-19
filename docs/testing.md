# Testes

## Automatizados (Node + Puppeteer)

```bash
npm test
# Se o Chrome não estiver no caminho padrão:
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm test
# Testar o build publicado (dist/):
npm run build:dist && RAIZ=dist npm test
```

`tools/test-app.js` sobe um servidor local, simula um celular (390×844, toque) e verifica:

- **Início:** um único botão principal, abas, ilustrações 3D, nenhuma menção a delivery.
- **Alvos de toque** com pelo menos 44px.
- **Agendamento completo** com 2 pets (cachorro bravo com tosa, extras e saúde; gato manso), Táxi Dog com CEP (ViaCEP simulado), máscara de telefone, revisão com compromisso e a mensagem final do WhatsApp com todos os dados.
- **Cliente que volta:** a home oferece "Agendar X de novo" e o fluxo começa no serviço.
- **Voltar** mantém a resposta, e o **rascunho** sobrevive ao recarregar a página.
- **Editar pela revisão** volta direto para a revisão.
- **Segurança:** um nome com código (`<img onerror>`) não executa, e a CSP não tem `unsafe-inline` em scripts.
- **Fidelidade:** o cofre abre e os carimbos contam.
- **Sobre:** apagar os dados funciona.
- `taxi.html` redireciona para o agendamento com o Táxi Dog marcado.
- Nenhum erro de JavaScript em nenhuma página.

## Manual (antes de publicar)

- Celular real Android (Chrome): o convite para instalar aparece depois de enviar no WhatsApp.
- iPhone (Safari): as instruções de "Adicionar à Tela de Início" aparecem.
- Abrir a mensagem no WhatsApp de verdade e conferir a formatação.
- Leitor de tela (TalkBack/VoiceOver): o título de cada pergunta é anunciado.
