const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let C;
const carrega = async () => {
  if (!C) C = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/cobertura.js')).href);
};

const groveland = { nome: 'Groveland', cidade: 'Groveland', uf: 'FL', pais: 'US', tipo: 'cidade', lat: 28.558, lng: -81.851 };
const buscaCidade = {
  id: 's1', nicho: 'House cleaning', timestamp: 1000, pais: 'US',
  area: { ...groveland, raioKm: null, rotulo: 'Groveland, FL' },
};

describe('cobertura das extrações', () => {
  it('mesmo nicho na mesma cidade conta como já extraído, sem ligar para maiúscula e acento', async () => {
    await carrega();
    const areas = C.areasExtraidas([buscaCidade], [{ searchId: 's1' }, { searchId: 's1' }]);
    assert.equal(areas.length, 1);
    assert.equal(areas[0].leads, 2);
    assert.equal(C.jaExtraida(areas, 'house  CLEANING', { ...groveland, lat: undefined })?.id, 's1');
    assert.equal(C.jaExtraida(areas, 'house cleaning', { ...groveland, cidade: 'Clermont', nome: 'Clermont' }), null, 'outra cidade');
    assert.equal(C.jaExtraida(areas, 'painter', groveland), null, 'outro nicho');
    assert.equal(C.jaExtraida(areas, 'house cleaning', { ...groveland, uf: 'MA' }), null, 'cidade de mesmo nome em outro estado');
  });

  it('raio novo dentro de um raio já feito conta como extraído', async () => {
    await carrega();
    const busca = { id: 'r1', nicho: 'house cleaning', timestamp: 1, area: { tipo: 'raio', lat: 42.36, lng: -71.06, raioKm: 10, pais: 'US' } };
    const areas = C.areasExtraidas([busca], []);
    assert.equal(C.jaExtraida(areas, 'house cleaning', { lat: 42.37, lng: -71.06 }, 5)?.id, 'r1');
    assert.equal(C.jaExtraida(areas, 'house cleaning', { lat: 42.36, lng: -71.06 }, 30), null, 'raio maior sai da área');
  });

  it('extração antiga, sem área guardada, vira área aproximada pelos leads', async () => {
    await carrega();
    const antiga = { id: 'old', label: 'house cleaning · 10 km de Massachusetts, MA · EUA', timestamp: 5 };
    const leads = [
      { searchId: 'old', latitude: 42.36, longitude: -71.06 },
      { searchId: 'old', latitude: 42.40, longitude: -71.10 },
      { searchId: 'old', latitude: 42.30, longitude: -71.00 },
    ];
    const [a] = C.areasExtraidas([antiga], leads);
    assert.equal(a.aproximada, true);
    assert.equal(a.nicho, 'house cleaning');
    assert.ok(a.raioKm >= 1 && a.raioKm < 15);
    assert.equal(C.areasExtraidas([{ id: 'x', label: 'y' }], []).length, 0, 'sem leads com coordenada não desenha nada');
  });

  it('separa os leads novos dos que já estavam na base', async () => {
    await carrega();
    const base = [{ placeId: 'A', name: 'Onix' }, { name: 'Maria Clean', address: '1 Main St' }];
    const { novos, repetidos } = C.separaNovos([
      { placeId: 'A', name: 'Onix' },
      { name: 'maria clean', address: '1 Main St' },
      { placeId: 'B', name: 'Nova' },
      { placeId: 'B', name: 'Nova' },
    ], base);
    assert.deepEqual(novos.map((l) => l.placeId), ['B']);
    assert.equal(repetidos, 3);
  });

  it('lead que reaparece ganha os dados novos do Google sem perder o que é do usuário', async () => {
    await carrega();
    const base = [{ id: 'x', placeId: 'A', searchId: 's1', rating: 4.9, reviews: 0, reviewCount: 0, publicoConfirmado: 'brus' }];
    const { base: nova, atualizados } = C.atualizaExistentes(base, [{ placeId: 'A', rating: 4.9, reviews: 60, reviewCount: 60, phone: '' }]);
    assert.equal(atualizados, 1);
    assert.deepEqual(nova[0], { id: 'x', placeId: 'A', searchId: 's1', rating: 4.9, reviews: 60, reviewCount: 60, publicoConfirmado: 'brus' });
    assert.equal(C.atualizaExistentes(nova, [{ placeId: 'A', reviews: 0 }]).atualizados, 0, 'zero não apaga o que já tinha');
  });
});
