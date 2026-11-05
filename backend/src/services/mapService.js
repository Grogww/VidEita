/**
 * mapService.js
 * Serviço de geolocalização — estrutura preparada para integração futura
 * com Google Maps ou Mapbox.
 */

/**
 * Calcula distância entre dois pontos usando a fórmula de Haversine (em km)
 * @param {number} lat1 - Latitude do ponto A
 * @param {number} lon1 - Longitude do ponto A
 * @param {number} lat2 - Latitude do ponto B
 * @param {number} lon2 - Longitude do ponto B
 * @returns {number} Distância em quilômetros
 */
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => (value * Math.PI) / 180;

/**
 * Filtra registros por proximidade a um ponto
 * @param {Array} registros - Lista de objetos com latitude e longitude
 * @param {number} latRef - Latitude de referência
 * @param {number} lonRef - Longitude de referência
 * @param {number} raioKm - Raio de busca em km (padrão: 5km)
 * @returns {Array} Registros dentro do raio, ordenados por distância
 */
const filtrarPorProximidade = (registros, latRef, lonRef, raioKm = 5) => {
  return registros
    .map((r) => ({
      ...r.toJSON ? r.toJSON() : r,
      distancia_km: calcularDistancia(
        latRef,
        lonRef,
        parseFloat(r.latitude),
        parseFloat(r.longitude)
      ),
    }))
    .filter((r) => r.distancia_km <= raioKm)
    .sort((a, b) => a.distancia_km - b.distancia_km);
};

/**
 * TODO: Integração com Google Maps Geocoding API
 * Converte endereço em coordenadas
 * Requer: GOOGLE_MAPS_API_KEY no .env
 */
const geocodificarEndereco = async (endereco) => {
  // Exemplo de implementação futura:
  // const response = await axios.get(
  //   `https://maps.googleapis.com/maps/api/geocode/json`,
  //   { params: { address: endereco, key: process.env.GOOGLE_MAPS_API_KEY } }
  // );
  // return response.data.results[0]?.geometry?.location;
  throw new Error('Geocodificação ainda não implementada');
};

/**
 * TODO: Integração com Mapbox Reverse Geocoding
 * Converte coordenadas em endereço legível
 */
const geocodificacaoReversa = async (latitude, longitude) => {
  // Implementação futura com Mapbox ou Google Maps
  throw new Error('Geocodificação reversa ainda não implementada');
};

module.exports = {
  calcularDistancia,
  filtrarPorProximidade,
  geocodificarEndereco,
  geocodificacaoReversa,
};
