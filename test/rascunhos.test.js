const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

// localStorage e window de mentira: o módulo roda no navegador.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
};
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent = class { constructor(tipo) { this.type = tipo; } };

let Rz;
const carrega = async () => {
  if (!Rz) Rz = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/rascunhos.js')).href);
};

describe('rascunhos da Fila no WhatsApp do Prospector', () => {
  beforeEach(() => memoria.clear());

  it('reconhece o mesmo número com e sem o 9 do celular brasileiro e com o sufixo do WhatsApp', async () => {
    await carrega();
    assert.equal(Rz.mesmoNumero('5527996934731', '552796934731@s.whatsapp.net'), true);
    assert.equal(Rz.mesmoNumero('+1 (617) 555-0101', '16175550101@s.whatsapp.net'), true);
    assert.equal(Rz.mesmoNumero('16175550101', '16175550102'), false);
  });

  it('enviar o rascunho apaga ele e marca o lead como enviado na meta', async () => {
    await carrega();
    Rz.criaRascunhos([{ numero: '+1 617 555 0101', texto: 'Oi, tudo bem?', nome: 'Onix', chave: 'lead-1', angulo: 'site', publico: 'brus', idioma: 'pt' }]);
    assert.ok(Rz.rascunhoDoNumero(Rz.lerRascunhos(), '16175550101@s.whatsapp.net'));
    assert.equal(Rz.concluiRascunho('16175550101@s.whatsapp.net', 'Oi, tudo bem? (editado)'), true);
    assert.deepEqual(Rz.lerRascunhos(), {});
    const log = JSON.parse(localStorage.getItem('sigma_abordagem_log'));
    assert.equal(log['lead-1'].status, 'enviada');
    assert.equal(log['lead-1'].texto, 'Oi, tudo bem? (editado)');
    assert.equal(Rz.concluiRascunho('16175550101', 'de novo'), false, 'sem rascunho, não mexe na meta');
  });

  it('rascunho sem texto ou sem número não é criado', async () => {
    await carrega();
    Rz.criaRascunhos([{ numero: '', texto: 'Oi' }, { numero: '16175550101', texto: '   ' }]);
    assert.deepEqual(Rz.lerRascunhos(), {});
  });
});
