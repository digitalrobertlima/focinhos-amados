# Fidelidade sem servidor (selos assinados)

## A ideia
Igual a uma carteira de blockchain: a loja tem uma **chave privada** (só no celular da dona) e o site publica a **chave pública**.
Cada selo é um recibo assinado: "o celular X tem N banhos e já resgatou R prêmios". O app do cliente confere a assinatura sozinho, sem perguntar a nenhum servidor.

- Ninguém inventa selo sem a chave privada.
- O selo só vale para o número de celular dele (o selo leva um resumo criptográfico do número, não o número).
- O selo é cumulativo: o último vale por todos. Se o cliente trocar de celular, a loja reenvia o último.

## Fluxo
1. Banho feito → dona abre `painel.html`, digita o celular, toca **Banho feito**.
2. Toca **Enviar selo no WhatsApp** → o cliente recebe a mensagem com o link.
3. Cliente toca o link → o app abre na aba Fidelidade e guarda o selo.
4. Com 3 banhos, aparece **Entregar a hidratação** no painel; ao entregar, sai um selo novo marcando o prêmio como resgatado.

## Configuração (uma vez, com a dona)
1. No celular dela: abrir `https://focinhosamados.com.br/painel.html` → **Criar a chave da loja**.
2. **Segurança e chave → Baixar cópia de segurança** e guardar (Drive ou WhatsApp pra ela mesma). Não compartilhar.
3. **Copiar chave pública** e colar em `config.json → loyalty.publicKey`. Publicar.
4. Adicionar o painel à tela de início do celular dela.

## Limites conhecidos
- Se ela perder o celular **sem** a cópia de segurança, precisa criar chave nova e trocar no site; os selos antigos deixam de valer (os clientes mostram o histórico e ela reemite).
- O histórico de clientes fica no celular dela (também vai na cópia de segurança).
- No iPhone, o app instalado e o Safari guardam dados separados: se o link abrir no Safari, o cliente pode colar o link na aba Fidelidade do app ("Recebeu um selo e ele não apareceu?").
