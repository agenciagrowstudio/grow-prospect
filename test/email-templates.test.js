const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const carrega = () => import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/emailTemplates.js')).href);

describe('templates de e-mail', () => {
  it('preenche os campos do lead no assunto, no HTML e no texto', async () => {
    const T = await carrega();
    const [tpl] = T.templatesPadrao();
    const dados = T.dadosDoLead({ name: 'Yasmin House Cleaning', pais: 'US', category: 'House cleaning service', address: '1 Main St, Framingham, MA 01702', sinalBr: { nivel: 'alto' } }, { remetente: 'Matheus' });
    const r = T.renderizaEmail(tpl, dados);
    assert.match(r.assunto, /Yasmin House Cleaning/);
    assert.match(r.html, /Oi, pessoal da Yasmin House Cleaning!/);
    assert.match(r.html, /Framingham/);
    assert.match(r.html, /logo-grow\.png/);
    assert.match(r.html, /<strong>/, 'negrito vira <strong>');
    assert.doesNotMatch(r.html, /\{empresa\}|\{cidade\}/, 'nenhum campo fica sem preencher');
    assert.match(r.texto, /Matheus/);
    assert.doesNotMatch(r.texto, /\*\*/);
  });

  it('escapa HTML vindo do lead e do template', async () => {
    const T = await carrega();
    const tpl = { assunto: 'Oi {empresa}', blocos: [{ tipo: 'texto', texto: 'Olá <b>{empresa}</b>' }] };
    const r = T.renderizaEmail(tpl, { empresa: '<script>alert(1)</script>' });
    assert.doesNotMatch(r.html, /<script>alert/);
    assert.match(r.html, /&lt;b&gt;/);
  });

  it('botão só com link seguro; imagem só com https', async () => {
    const T = await carrega();
    const tpl = { assunto: 'x', blocos: [
      { tipo: 'botao', texto: 'Ruim', link: 'javascript:alert(1)' },
      { tipo: 'botao', texto: 'Bom', link: 'https://wa.me/15085551234' },
      { tipo: 'imagem', url: 'http://inseguro.com/a.png' },
    ] };
    const r = T.renderizaEmail(tpl, {});
    assert.doesNotMatch(r.html, /javascript:/);
    assert.match(r.html, /https:\/\/wa\.me\/15085551234/);
    assert.doesNotMatch(r.html, /inseguro\.com/);
  });

  it('sugere o template pela língua e pelo país do lead', async () => {
    const T = await carrega();
    const lista = T.templatesPadrao();
    assert.equal(T.templateSugerido({ pais: 'BR' }, lista).id, 'tpl-br-presenca');
    assert.equal(T.templateSugerido({ pais: 'US', sinalBr: { nivel: 'alto' } }, lista).id, 'tpl-brus-google');
    const americano = { pais: 'US', avaliacoesLidas: { lidas: 5, sobrenomesBr: 0, emPortugues: 0, respostaDonoPt: false, citamBrasil: 0 } };
    assert.equal(T.templateSugerido(americano, lista).id, 'tpl-us-google');
  });

  it('acha o primeiro e-mail válido do lead', async () => {
    const T = await carrega();
    assert.equal(T.emailDoLead({ email: 'contato@yasmin.com, outro@x.com' }), 'contato@yasmin.com');
    assert.equal(T.emailDoLead({ email: 'sem email' }), '');
  });

  it('padrões sem travessão e sem emoji', async () => {
    const T = await carrega();
    const tudo = JSON.stringify(T.templatesPadrao());
    assert.doesNotMatch(tudo, /[—–]/);
    assert.doesNotMatch(tudo, /\p{Extended_Pictographic}/u);
  });
});

describe('assinatura', () => {
  it('sem nome do remetente, a linha some em vez de ficar vazia', async () => {
    const T = await carrega();
    const tpl = { assunto: 'x', blocos: [{ tipo: 'assinatura', texto: 'Um abraço,\n{remetente}\nGrow+ Marketing' }] };
    assert.match(T.renderizaEmail(tpl, { remetente: '' }).texto, /^Um abraço,\nGrow\+ Marketing$/);
    assert.match(T.renderizaEmail(tpl, { remetente: 'Matheus' }).texto, /Matheus\nGrow\+ Marketing/);
  });
});
