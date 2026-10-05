const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { MetaProvider, soDigitos } = require('../whatsapp/meta-provider');

function metaFalsa(respostas = {}) {
  const chamadas = [];
  const fetchFn = async (url, opcoes = {}) => {
    chamadas.push({ url, opcoes, corpo: opcoes.body ? JSON.parse(opcoes.body) : null });
    const chave = Object.keys(respostas).find((k) => url.includes(k));
    const r = chave ? respostas[chave] : { ok: true, json: {} };
    return { ok: r.ok !== false, status: r.status || 200, json: async () => r.json };
  };
  return { fetchFn, chamadas };
}

describe('API oficial da Meta', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-meta-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('sem credenciais não tenta conectar', async () => {
    const p = new MetaProvider({}, () => {}, dir, metaFalsa().fetchFn);
    await assert.rejects(p.connect(), /ID do número e o token/);
  });

  it('conecta, lê o telefone e manda o token no cabeçalho, não na URL', async () => {
    const { fetchFn, chamadas } = metaFalsa({
      '123?fields': { json: { display_phone_number: '+55 21 99999-0000', quality_rating: 'GREEN' } },
    });
    const p = new MetaProvider({ phoneNumberId: '123', accessToken: 'TOKEN' }, () => {}, dir, fetchFn);
    await p.connect();
    assert.equal(p.isReady(), true);
    assert.equal(p.getPhoneNumber(), '5521999990000');
    assert.equal(chamadas[0].url.includes('TOKEN'), false);
    assert.equal(chamadas[0].opcoes.headers.Authorization, 'Bearer TOKEN');
  });

  it('reabre com a configuração salva, sem pedir o token de novo', async () => {
    const { fetchFn } = metaFalsa({ '123?fields': { json: { display_phone_number: '15551234567' } } });
    await new MetaProvider({ phoneNumberId: '123', accessToken: 'TOKEN', wabaId: '9' }, () => {}, dir, fetchFn).connect();
    const reaberto = new MetaProvider({}, () => {}, dir, fetchFn);
    assert.equal(reaberto.phoneNumberId, '123');
    assert.equal(reaberto.accessToken, 'TOKEN');
    assert.equal(reaberto.wabaId, '9');
  });

  it('abordagem sai como modelo aprovado, com as variáveis no corpo', async () => {
    const { fetchFn, chamadas } = metaFalsa({
      '123?fields': { json: { display_phone_number: '1' } },
      '123/messages': { json: { messages: [{ id: 'wamid.1' }] } },
    });
    const p = new MetaProvider({ phoneNumberId: '123', accessToken: 'T' }, () => {}, dir, fetchFn);
    await p.connect();
    const r = await p.sendTemplate('5521999990000@s.whatsapp.net', { nome: 'abordagem_v1', idioma: 'pt_BR', parametros: ['Padaria Sol'] });
    assert.deepEqual(r, { success: true, messageId: 'wamid.1', jid: '5521999990000' });
    const corpo = chamadas[1].corpo;
    assert.equal(corpo.to, '5521999990000');
    assert.equal(corpo.template.name, 'abordagem_v1');
    assert.deepEqual(corpo.template.components[0].parameters, [{ type: 'text', text: 'Padaria Sol' }]);
  });

  it('texto livre fora da janela de 24h vira explicação em português', async () => {
    const { fetchFn } = metaFalsa({
      '123?fields': { json: { display_phone_number: '1' } },
      '123/messages': { ok: false, status: 400, json: { error: { code: 131047, message: 'Re-engagement message' } } },
    });
    const p = new MetaProvider({ phoneNumberId: '123', accessToken: 'T' }, () => {}, dir, fetchFn);
    await p.connect();
    const r = await p.sendMessage('5521999990000', { text: 'Oi' });
    assert.equal(r.success, false);
    assert.match(r.error, /24h/);
  });

  it('lista só o que a tela precisa dos modelos aprovados', async () => {
    const { fetchFn } = metaFalsa({
      message_templates: { json: { data: [{ name: 'abordagem_v1', language: 'pt_BR', category: 'MARKETING', components: [{ type: 'BODY', text: 'Oi {{1}}, tudo bem? Vi a {{2}}.' }] }] } },
    });
    const p = new MetaProvider({ phoneNumberId: '1', accessToken: 'T', wabaId: '9' }, () => {}, dir, fetchFn);
    const modelos = await p.listTemplates();
    assert.deepEqual(modelos[0], { nome: 'abordagem_v1', idioma: 'pt_BR', categoria: 'MARKETING', corpo: 'Oi {{1}}, tudo bem? Vi a {{2}}.', variaveis: 2 });
  });

  it('destino sempre só com dígitos', () => {
    assert.equal(soDigitos('+1 (555) 123-4567'), '15551234567');
    assert.equal(soDigitos('5521999990000@s.whatsapp.net'), '5521999990000');
  });
});
