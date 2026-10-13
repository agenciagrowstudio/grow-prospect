/**
 * Atalhos de nicho e de cidade da extração. Vivem fora do modal porque a
 * extração automática percorre exatamente estas listas.
 */

/**
 * Serviços mais buscados para brasileiros nos EUA, em inglês (é como o Google
 * de lá acha mais negócios), mais dois nichos que brasileiros procuram.
 */
export const ATALHOS_EUA = [
  'House cleaning', 'Landscaping', 'Painting contractor', 'Handyman', 'Flooring',
  'Remodeling', 'Moving company', 'Carpet cleaning', 'Pressure washing', 'Roofing',
  'Nail salon', 'Hair salon', 'Auto repair', 'Restaurante brasileiro', 'Padaria brasileira',
];

// Tradução que aparece com o mouse em cima; o nicho buscado continua em inglês.
export const TRADUCAO_EUA = {
  'House cleaning': 'Limpeza residencial',
  'Landscaping': 'Paisagismo e jardinagem',
  'Painting contractor': 'Pintura',
  'Handyman': 'Pequenos reparos',
  'Flooring': 'Instalação de pisos',
  'Remodeling': 'Reformas',
  'Moving company': 'Mudanças',
  'Carpet cleaning': 'Limpeza de carpetes',
  'Pressure washing': 'Lavagem a jato',
  'Roofing': 'Telhados',
  'Nail salon': 'Manicure',
  'Hair salon': 'Salão de cabelo',
  'Auto repair': 'Mecânica',
};

/**
 * Cidades com as maiores comunidades de brasileiros que prestam serviço
 * (limpeza, construção, pintura, jardinagem): região de Framingham e Grande
 * Boston, sul da Flórida, Orlando, Danbury e norte de Nova Jersey. Com o
 * centro de cada uma, para o mapa ir direto sem depender do OpenStreetMap.
 */
export const CIDADES_ATALHO = {
  US: [
    ['Framingham', 'MA', 42.2793, -71.4162], ['Marlborough', 'MA', 42.3459, -71.5523],
    ['Milford', 'MA', 42.1398, -71.5163], ['Hudson', 'MA', 42.3918, -71.5662],
    ['Everett', 'MA', 42.4084, -71.0537], ['Somerville', 'MA', 42.3876, -71.0995],
    ['Pompano Beach', 'FL', 26.2379, -80.1248], ['Deerfield Beach', 'FL', 26.3184, -80.0998],
    ['Boca Raton', 'FL', 26.3683, -80.1289], ['Orlando', 'FL', 28.5384, -81.3789],
    ['Kissimmee', 'FL', 28.2920, -81.4076], ['Danbury', 'CT', 41.3948, -73.4540],
    ['Newark', 'NJ', 40.7357, -74.1724], ['Long Branch', 'NJ', 40.3043, -73.9924],
    ['Marietta', 'GA', 33.9526, -84.5499],
  ],
  BR: [
    ['São Paulo', 'SP', -23.5505, -46.6333], ['Rio de Janeiro', 'RJ', -22.9068, -43.1729],
    ['Belo Horizonte', 'MG', -19.9167, -43.9345], ['Vitória', 'ES', -20.3155, -40.3128],
    ['Curitiba', 'PR', -25.4284, -49.2733], ['Florianópolis', 'SC', -27.5954, -48.5480],
  ],
};

/** O "lugar" de uma cidade dos atalhos, no formato que a extração e a cobertura usam. */
export function localDaCidade(nome, uf, pais, lat, lng) {
  return {
    nome,
    detalhe: uf,
    cidade: nome,
    uf,
    pais,
    tipo: 'cidade',
    chave: `cat-${pais}-${nome}-${uf}`,
    lat,
    lng,
  };
}
