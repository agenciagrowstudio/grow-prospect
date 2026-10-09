const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let B;
const carrega = async () => {
  if (!B) B = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/localBusca.js')).href);
};

const orlando = {
  osm_type: 'relation', osm_id: 1, lat: '28.5421', lon: '-81.3790',
  address: { suburb: 'Lake Eola Heights', city: 'Orlando', 'ISO3166-2-lvl4': 'US-FL', country_code: 'us' },
};

describe('clique no mapa vira cidade ou bairro', () => {
  it('de longe escolhe a cidade, com país e estado', async () => {
    await carrega();
    const l = B.localDoReverso(orlando, 'cidade');
    assert.equal(l.tipo, 'cidade');
    assert.equal(l.nome, 'Orlando');
    assert.equal(l.uf, 'FL');
    assert.equal(l.pais, 'US');
    assert.equal(l.lat, 28.5421);
  });

  it('de perto escolhe o bairro, guardando a cidade', async () => {
    await carrega();
    const l = B.localDoReverso(orlando, 'bairro');
    assert.equal(l.tipo, 'bairro');
    assert.equal(l.nome, 'Lake Eola Heights');
    assert.equal(l.cidade, 'Orlando');
    assert.equal(l.detalhe, 'Orlando, FL');
  });

  it('bairro sem nome mapeado cai na cidade; fora de Brasil e EUA não vale', async () => {
    await carrega();
    const semBairro = { ...orlando, address: { town: 'Niterói', 'ISO3166-2-lvl4': 'BR-RJ', country_code: 'br' } };
    assert.equal(B.localDoReverso(semBairro, 'bairro').tipo, 'cidade');
    assert.equal(B.localDoReverso(semBairro, 'bairro').pais, 'BR');
    assert.equal(B.localDoReverso({ ...orlando, address: { city: 'Havana', country_code: 'cu' } }), null);
    assert.equal(B.localDoReverso({ error: 'Unable to geocode' }), null);
  });
});
