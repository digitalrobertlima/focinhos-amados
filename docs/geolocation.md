
# Geolocalização e Privacidade

## Funcionamento

- Utiliza `navigator.geolocation.watchPosition` para obter coordenadas com alta precisão durante um curto período.
- A melhor leitura (menor `accuracy`) é armazenada em memória (`Geo.get('default')`).
- Reverse geocoding realizado via Nominatim, com cache local em `localStorage` para otimizar consultas.

## Integração nos Fluxos

- Fluxos de Agendar, Delivery e Táxi incorporam latitude, longitude e precisão nas mensagens geradas (conforme template).
- No fluxo de Agendar, modalidade loja, apenas a localização do solicitante é enviada.

## Configuração

- Parâmetros ajustáveis em `config.json.geoloc`: `enabled`, `enableHighAccuracy`, `waitMs`, `requiredPrecisionM`.

## Privacidade

- Coordenadas não são enviadas ou armazenadas em servidores (site estático).
- Dados podem ser persistidos temporariamente em cache local para reverse geocode.
- Usuário pode negar permissão de localização; nesse caso, campos de endereço tornam-se obrigatórios nos formulários.

---

Essas práticas garantem privacidade, transparência e controle ao usuário, alinhadas às melhores práticas de apps web modernos.
