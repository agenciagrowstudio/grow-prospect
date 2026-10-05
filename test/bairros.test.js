const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sugereBairros, gradeDePontos, bairroDoPonto, escolheCidade } = require('../utils/bairros');
const { resolvePais } = require('../utils/paises');

describe('sugestão de bairros', () => {
  it('a grade cobre o retângulo da cidade por igual', () => {
    const pontos = gradeDePontos(['-23', '-22', '-44', '-43'], 2);
    assert.equal(pontos.length, 4);
    assert.deepEqual(pontos[0], { lat: -22.75, lon: -43.75 });
    assert.deepEqual(pontos[3], { lat: -22.25, lon: -43.25 });
  });

  it('escolhe a cidade, não uma rua com o mesmo nome', () => {
    const r = escolheCidade([
      { class: 'highway', type: 'residential', boundingbox: ['0', '0', '0', '0'] },
      { class: 'boundary', type: 'administrative', boundingbox: ['1', '2', '3', '4'] },
    ]);
    assert.equal(r.class, 'boundary');
  });

  it('ignora ponto fora da cidade e usa ZIP nos EUA quando falta bairro', () => {
    const us = resolvePais('US').sigla;
    assert.equal(bairroDoPonto({ address: { city: 'Niterói', suburb: 'Icaraí' } }, 'Niteroi', 'BR'), 'Icaraí');
    assert.equal(bairroDoPonto({ address: { city: 'São Gonçalo', suburb: 'Centro' } }, 'Niterói', 'BR'), null);
    assert.equal(bairroDoPonto({ address: { city: 'Orlando', postcode: '32801-1234' } }, 'Orlando', us), '32801');
    assert.equal(bairroDoPonto({ address: { city: 'Orlando', suburb: 'Orlando International Airport' } }, 'Orlando', us), null);
  });

  it('ordena pelo bairro que mais aparece e respeita o intervalo do Nominatim', async () => {
    const respostas = ['Icaraí', 'Centro', 'Icaraí', null];
    let reverso = 0;
    const esperas = [];
    const fetchFn = async (url) => ({
      ok: true,
      json: async () => {
        if (url.includes('/search')) {
          return [{ class: 'boundary', type: 'administrative', boundingbox: ['-23', '-22', '-44', '-43'], address: { city: 'Niterói' }, display_name: 'Niterói, RJ' }];
        }
        const nome = respostas[reverso++];
        return { address: nome ? { city: 'Niterói', suburb: nome } : { city: 'Outra' } };
      },
    });
    const r = await sugereBairros('Niterói, RJ', resolvePais('BR'), {
      fetchFn, lado: 2, semCache: true, espera: async (ms) => { esperas.push(ms); },
    });
    assert.deepEqual(r.bairros, ['Icaraí', 'Centro']);
    assert.equal(esperas.length, 4);
    assert.ok(esperas.every((ms) => ms >= 1000));
  });

  it('cidade que não existe vira mensagem clara', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => [] });
    await assert.rejects(
      sugereBairros('Cidade Inventada', resolvePais('BR'), { fetchFn, semCache: true, espera: async () => {} }),
      /Não achei essa cidade/,
    );
  });
});
