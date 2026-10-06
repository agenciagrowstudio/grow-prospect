const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buscaImagemCidade, imagemCidadeComCache, titulosProvaveis } = require('../utils/imagem-cidade');

const resposta = (pages) => ({ ok: true, json: async () => ({ query: { pages } }) });

describe('foto da cidade para o banner', () => {
  it('monta o título do artigo como a Wikipédia usa', () => {
    assert.deepEqual(titulosProvaveis('Orlando', 'FL', 'US'), ['Orlando, Florida', 'Orlando']);
    assert.deepEqual(titulosProvaveis('Viçosa', 'MG', 'BR'), ['Viçosa', 'Viçosa (Minas Gerais)']);
  });

  it('cidade dos EUA busca na Wikipédia em inglês e pula página de desambiguação', async () => {
    const urls = [];
    const fetchFn = async (url) => {
      urls.push(url);
      if (url.includes('Orlando%2C%20Florida')) {
        return resposta({ 1: { title: 'Orlando, Florida', thumbnail: { source: 'https://img/orlando.jpg' } } });
      }
      return resposta({ 2: { title: 'Orlando', pageprops: { disambiguation: '' }, thumbnail: { source: 'x' } } });
    };
    const r = await buscaImagemCidade({ cidade: 'Orlando', uf: 'FL', pais: 'US' }, { fetchFn });
    assert.equal(r.url, 'https://img/orlando.jpg');
    assert.ok(urls[0].startsWith('https://en.wikipedia.org'));
  });

  it('sem título exato, cai na busca; sem nada, devolve null e guarda no cache', async () => {
    let chamadas = 0;
    const vazio = async () => { chamadas++; return resposta({ '-1': { missing: '' } }); };
    const guardado = {};
    const cache = { get: (k) => guardado[k], set: (k, v) => { guardado[k] = v; } };
    assert.equal(await imagemCidadeComCache({ cidade: 'Lugar Nenhum', uf: 'RJ', pais: 'BR' }, cache, { fetchFn: vazio }), null);
    const antes = chamadas;
    assert.equal(await imagemCidadeComCache({ cidade: 'Lugar Nenhum', uf: 'RJ', pais: 'BR' }, cache, { fetchFn: vazio }), null);
    assert.equal(chamadas, antes, 'segunda vez sai do cache');
  });
});
