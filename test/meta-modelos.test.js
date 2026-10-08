const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { nomeDoModelo, validaModelo, montaPedido, leModelo } = require('../whatsapp/meta-modelos');
const { MetaProvider } = require('../whatsapp/meta-provider');

const valido = () => ({
  nome: 'abordagem_limpeza',
  categoria: 'MARKETING',
  idioma: 'pt_BR',
  cabecalho: 'Grow+',
  corpo: 'Oi {{1}}, vi que a {{2}} atende Orlando. Posso te mandar uma ideia?',
  exemplos: ['Maria', 'Clean Co'],
  rodape: 'Responda SAIR para não receber mais.',
  botoes: [{ tipo: 'resposta', texto: 'Quero ver' }, { tipo: 'link', texto: 'Ver site', url: 'https://growmais.com' }],
});

describe('modelos da Meta: regras', () => {
  it('transforma o nome digitado no formato que a Meta aceita', () => {
    assert.equal(nomeDoModelo('Promoção de Outubro!'), 'promocao_de_outubro');
    assert.equal(nomeDoModelo('  Abordagem  EUA 2.0 '), 'abordagem_eua_2_0');
  });

  it('um modelo completo passa sem erro', () => {
    assert.deepEqual(validaModelo(valido()), []);
  });

  it('pega os erros que a Meta rejeitaria', () => {
    const erros = validaModelo({
      ...valido(),
      nome: 'Nome Com Espaço',
      corpo: '{{1}}, oferta {{3}}',
      exemplos: ['Maria'],
      botoes: [{ tipo: 'link', texto: 'Ver', url: 'http://inseguro.com' }],
    }).join(' | ');
    assert.match(erros, /Nome:/);
    assert.match(erros, /em sequência/);
    assert.match(erros, /começar nem terminar/);
    assert.match(erros, /exemplo para a variável \{\{3\}\}/);
    assert.match(erros, /https:\/\//);
  });

  it('monta o pedido no formato da Graph API', () => {
    const p = montaPedido(valido());
    assert.equal(p.name, 'abordagem_limpeza');
    assert.deepEqual(p.components.map((c) => c.type), ['HEADER', 'BODY', 'FOOTER', 'BUTTONS']);
    assert.deepEqual(p.components[1].example, { body_text: [['Maria', 'Clean Co']] });
    assert.deepEqual(p.components[3].buttons, [
      { type: 'QUICK_REPLY', text: 'Quero ver' },
      { type: 'URL', text: 'Ver site', url: 'https://growmais.com' },
    ]);
  });

  it('lê a situação e explica a rejeição em português', () => {
    const m = leModelo({ name: 'x', status: 'REJECTED', rejected_reason: 'TAG_CONTENT_MISMATCH', components: [{ type: 'BODY', text: 'Oi {{1}}!' }] });
    assert.equal(m.situacao, 'rejeitado');
    assert.match(m.motivo, /categoria/);
    assert.equal(m.variaveis, 1);
    assert.equal(leModelo({ status: 'PENDING' }).rotuloSituacao, 'Em análise');
  });
});

describe('modelos da Meta: envio', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-meta-mod-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('cria o modelo na conta (WABA) e devolve a situação inicial', async () => {
    const chamadas = [];
    const fetchFn = async (url, opcoes = {}) => {
      chamadas.push({ url, corpo: opcoes.body ? JSON.parse(opcoes.body) : null });
      return { ok: true, status: 200, json: async () => ({ id: '123', status: 'PENDING', category: 'MARKETING' }) };
    };
    const p = new MetaProvider({ phoneNumberId: '1', accessToken: 'T', wabaId: '987' }, () => {}, dir, fetchFn);
    const r = await p.createTemplate(valido());
    assert.deepEqual(r, { id: '123', situacao: 'PENDING', categoria: 'MARKETING' });
    assert.match(chamadas[0].url, /\/987\/message_templates$/);
    assert.equal(chamadas[0].corpo.language, 'pt_BR');
  });

  it('modelo inválido nem chega a ser enviado', async () => {
    let chamou = false;
    const fetchFn = async () => { chamou = true; return { ok: true, json: async () => ({}) }; };
    const p = new MetaProvider({ phoneNumberId: '1', accessToken: 'T', wabaId: '987' }, () => {}, dir, fetchFn);
    await assert.rejects(p.createTemplate({ ...valido(), corpo: '' }), /Escreva o texto/);
    assert.equal(chamou, false);
  });
});
