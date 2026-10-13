const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let C;
const carrega = async () => {
  if (!C) C = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/cotacao.js')).href);
};

describe('cotação do dólar', () => {
  it('lê a resposta da AwesomeAPI e da reserva', async () => {
    await carrega();
    const a = C.leAwesome({ USDBRL: { bid: '5.4210', ask: '5.4250', pctChange: '-0.35', timestamp: '1792000000' } });
    assert.equal(a.compra, 5.421);
    assert.equal(a.venda, 5.425);
    assert.equal(a.variacao, -0.35);
    assert.equal(C.leAwesome({}), null);
    const b = C.leErApi({ result: 'success', rates: { BRL: 5.4 }, time_last_update_unix: 1792000000 });
    assert.equal(b.compra, 5.4);
    assert.equal(C.leErApi({ result: 'error' }), null);
  });

  it('entende o valor digitado em português ou inglês', async () => {
    await carrega();
    assert.equal(C.numeroDigitado('1.500'), 1500);
    assert.equal(C.numeroDigitado('1.234,56'), 1234.56);
    assert.equal(C.numeroDigitado('1,234.56'), 1234.56);
    assert.equal(C.numeroDigitado('US$ 2000'), 2000);
    assert.equal(C.numeroDigitado(''), 0);
  });

  it('calcula quanto se recebe descontando a taxa', async () => {
    await carrega();
    const r = C.calculaRecebimento(1000, 5.4, 1);
    assert.equal(r.bruto, 5400);
    assert.equal(Math.round(r.desconto * 100) / 100, 54);
    assert.equal(Math.round(r.liquido * 100) / 100, 5346);
    assert.equal(C.calculaRecebimento(1000, 5.4, 0).liquido, 5400);
  });
});
