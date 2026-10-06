const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { distanciaKm, zoomParaRaio, urlBuscaNaArea, filtraPorRaio, areaValida } = require('../utils/area-busca');

const ORLANDO = { lat: 28.5384, lng: -81.3789 };

describe('busca por raio', () => {
  it('mede a distância real entre dois pontos', () => {
    // Orlando a Ocoee: uns 18 km.
    const km = distanciaKm(ORLANDO, { lat: 28.6061, lng: -81.5398 });
    assert.ok(km > 15 && km < 20, `deu ${km}`);
  });

  it('raio maior pede zoom menor (janela maior)', () => {
    const z5 = zoomParaRaio(ORLANDO.lat, 5);
    const z30 = zoomParaRaio(ORLANDO.lat, 30);
    const z50 = zoomParaRaio(ORLANDO.lat, 50);
    assert.ok(z5 > z30 && z30 > z50, `${z5} ${z30} ${z50}`);
    assert.ok(z5 >= 12 && z5 <= 15);
  });

  it('a URL abre a busca centrada no ponto', () => {
    const url = urlBuscaNaArea('Limpeza residencial', { ...ORLANDO, raioKm: 10 });
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\/Limpeza%20residencial\/@28\.5384,-81\.3789,\d+z$/);
  });

  it('descarta o que ficou fora do raio e mantém quem não tem coordenada', () => {
    const itens = [
      { name: 'Centro', latitude: 28.54, longitude: -81.38 },
      { name: 'Ocoee', latitude: 28.6061, longitude: -81.5398 },
      { name: 'Texas', latitude: 31.17, longitude: -99.51 },
      { name: 'Sem endereço', latitude: '', longitude: '' },
    ];
    const r = filtraPorRaio(itens, { ...ORLANDO, raioKm: 10 });
    assert.deepEqual(r.dentro.map((i) => i.name), ['Centro', 'Sem endereço']);
    assert.equal(r.fora, 2);
    assert.equal(r.semCoordenada, 1);
    assert.ok(typeof r.dentro[0].distanciaKm === 'number');
  });

  it('recusa ponto ou raio absurdos vindos da tela', () => {
    assert.equal(areaValida({ lat: 200, lng: 0, raioKm: 10 }), null);
    assert.equal(areaValida({ lat: 28, lng: -81, raioKm: 500 }), null);
    assert.deepEqual(areaValida({ lat: '28.5', lng: '-81.3', raioKm: '30' }), { lat: 28.5, lng: -81.3, raioKm: 30 });
  });
});
