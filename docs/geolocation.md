# Geolocalização e Privacidade

Como funciona
- Usa `navigator.geolocation.watchPosition` (alta precisão) por um curto período.
- Guarda a melhor leitura (menor `accuracy`) em memória (`Geo.get('default')`).
- Faz reverse geocoding (Nominatim) com cache local no `localStorage`.

Uso nos fluxos
- Agendar/Delivery/Taxi incorporam lat/lng e precisão nas mensagens (conforme template).
- Em Agendar (modo loja), só envia “Localização do solicitante: lat,lng”.

Configuração
- `config.json.geoloc`: `enabled`, `enableHighAccuracy`, `waitMs`, `requiredPrecisionM`.

Privacidade
- Coordenadas não são armazenadas no servidor (site estático). Podem ser persistidas temporariamente em cache local para reverse geocode.
- Usuário pode negar permissão; nesse caso, campos de endereço passam a ser obrigatórios.
