const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extraiEmails, ordenaEmails, linksDeContato, temEmailDoDominio, primeiroEmail, decodificaCfemail,
} = require('../utils/emails-site');

// "contato@loja.com.br" cifrado com a chave 0x2a, como o Cloudflare faz.
function cifra(email, chave = 0x2a) {
  return chave.toString(16).padStart(2, '0')
    + [...email].map((c) => (c.charCodeAt(0) ^ chave).toString(16).padStart(2, '0')).join('');
}

describe('e-mail do site do lead', () => {
  it('lê o e-mail escondido pelo Cloudflare', () => {
    assert.equal(decodificaCfemail(cifra('contato@loja.com.br')), 'contato@loja.com.br');
    const html = `<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${cifra('vendas@loja.com.br')}">[email protected]</a>`;
    assert.deepEqual(extraiEmails({ html }), ['vendas@loja.com.br']);
  });

  it('acha mailto, texto e e-mail ofuscado, e descarta lixo', () => {
    const html = '<a href="mailto:Contato@Loja.com.br?subject=Oi">fale</a><img src="logo@2x.png">';
    const texto = 'Escreva para comercial [at] loja [dot] com [dot] br ou veja icone@sprite.png e erro@sentry.io';
    const r = extraiEmails({ html, texto });
    assert.ok(r.includes('contato@loja.com.br'));
    assert.ok(r.includes('comercial@loja.com.br'));
    assert.equal(r.some((e) => /png|sentry/.test(e)), false);
  });

  it('põe o e-mail do próprio site e o comercial na frente, e tira o noreply', () => {
    const r = ordenaEmails(
      ['noreply@loja.com.br', 'fulano.silva@gmail.com', 'agencia@webdesign.com', 'contato@loja.com.br'],
      'https://www.loja.com.br/',
    );
    assert.equal(r[0], 'contato@loja.com.br');
    assert.equal(r.includes('noreply@loja.com.br'), false);
  });

  it('escolhe páginas de contato do mesmo site, contato antes de sobre', () => {
    const links = [
      { href: '/sobre-nos', texto: 'Sobre' },
      { href: 'https://instagram.com/loja', texto: 'Contato no Insta' },
      { href: '/fale-conosco', texto: 'Fale conosco' },
      { href: '/produtos', texto: 'Produtos' },
      { href: '/fale-conosco#form', texto: 'Contato' },
    ];
    assert.deepEqual(linksDeContato(links, 'https://loja.com.br/'), [
      'https://loja.com.br/fale-conosco',
      'https://loja.com.br/sobre-nos',
    ]);
  });

  it('sabe quando já achou e-mail do domínio e pega o primeiro de uma lista', () => {
    assert.equal(temEmailDoDominio(['oi@gmail.com'], 'https://loja.com.br'), false);
    assert.equal(temEmailDoDominio(['oi@loja.com.br'], 'https://www.loja.com.br'), true);
    assert.equal(primeiroEmail('Contato@Loja.com.br, outro@x.com'), 'contato@loja.com.br');
    assert.equal(primeiroEmail('sem email'), '');
  });
});
