const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pickInternalUrls } = require('../lead-scoring/site-crawler');

describe('páginas internas que o motor visita', () => {
  it('escolhe links do mesmo site, sem repetir, sem arquivos e sem a própria página', () => {
    // Este caso quebrava: o filtro era chamado num Set, dava erro, e todo site
    // aparecia como "fora do ar" na Lead Scoring.
    const links = [
      'https://loja.com/',
      'https://loja.com/contato',
      'https://loja.com/contato#form',
      'https://loja.com/sobre?ref=menu',
      'https://loja.com/catalogo.pdf',
      'https://outro.com/contato',
      'https://loja.com/blog',
    ];
    const r = pickInternalUrls(links, 'https://loja.com/', 3);
    assert.deepEqual(r, ['https://loja.com/contato', 'https://loja.com/sobre', 'https://loja.com/blog']);
  });

  it('URL de origem inválida devolve lista vazia', () => {
    assert.deepEqual(pickInternalUrls(['https://a.com/x'], 'nao-e-url', 3), []);
  });
});
