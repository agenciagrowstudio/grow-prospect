const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizePhone } = require('../whatsapp/phone-normalizer');
const { resolvePais, PAISES } = require('../utils/paises');

test('resolve pais por sigla, por codigo telefonico e no padrao', () => {
  assert.equal(resolvePais('US').sigla, 'US');
  assert.equal(resolvePais('us').sigla, 'US');
  assert.equal(resolvePais('1').sigla, 'US');
  assert.equal(resolvePais('55').sigla, 'BR');
  assert.equal(resolvePais(PAISES.US).sigla, 'US');
  // Entrada desconhecida nao pode quebrar caminho de chamada nenhum.
  assert.equal(resolvePais('XX').sigla, 'BR');
  assert.equal(resolvePais(null).sigla, 'BR');
  assert.equal(resolvePais(undefined).sigla, 'BR');
});

test('telefone americano sem + recebe o codigo 1, nao o 55', () => {
  // Este era o defeito: (617) 555-0123 saia como 556175550123, que e um
  // telefone real em Brasilia. A campanha falaria com um estranho.
  assert.deepEqual(normalizePhone('(617) 555-0123', 'US'), {
    valid: true,
    number: '16175550123',
  });
});

test('telefone americano que ja traz o 1 na frente nao ganha outro', () => {
  assert.deepEqual(normalizePhone('1 617 555 0123', 'US'), {
    valid: true,
    number: '16175550123',
  });
});

test('numero brasileiro segue igual, com e sem pais informado', () => {
  const esperado = { valid: true, number: '5521999998888' };
  assert.deepEqual(normalizePhone('(21) 99999-8888'), esperado);
  assert.deepEqual(normalizePhone('(21) 99999-8888', 'BR'), esperado);
  assert.deepEqual(normalizePhone('(21) 99999-8888', '55'), esperado);
});

test('fixo brasileiro de dez digitos continua valido', () => {
  assert.deepEqual(normalizePhone('(21) 2555-8888', 'BR'), {
    valid: true,
    number: '552125558888',
  });
});

test('recusa numero que nao cabe no plano do pais', () => {
  // Onze digitos nacionais nao existem no plano americano.
  const onze = normalizePhone('617 555 01234', 'US');
  assert.equal(onze.valid, false);
  assert.match(onze.reason, /Estados Unidos/);

  const curto = normalizePhone('12345', 'BR');
  assert.equal(curto.valid, false);
});

test('internacional explicito e respeitado em qualquer pais', () => {
  // Mesmo pedindo Brasil, o + manda: o numero e americano e continua assim.
  assert.deepEqual(normalizePhone('+1 212 555 1234', 'BR'), {
    valid: true,
    number: '12125551234',
  });
  assert.deepEqual(normalizePhone('+55 21 99999-8888', 'US'), {
    valid: true,
    number: '5521999998888',
  });
});
