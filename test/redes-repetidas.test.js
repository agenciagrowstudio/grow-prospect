const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let R;
const carrega = async () => {
  if (!R) R = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/redesRepetidas.js')).href);
};

const lilypad = 'https://www.instagram.com/lilypadnails?igsh=b2U2&utm_source=qr';

describe('rede social vazada', () => {
  it('mesmo Instagram em vários leads de nomes diferentes é limpo', async () => {
    await carrega();
    const leads = [
      { name: 'Onix Cleaning', instagram: lilypad },
      { name: 'Vale Cleaning', instagram: 'https://instagram.com/lilypadnails/' },
      { name: 'Miss Clean', instagram: lilypad },
      { name: 'Lar Care Cleaning', instagram: lilypad },
      { name: 'CJ Home', instagram: 'https://www.instagram.com/cj_homeservices/' },
    ];
    const r = R.limpaRedesRepetidas(leads);
    assert.equal(r.limpos, 4);
    assert.deepEqual(r.leads.map((l) => l.instagram), ['', '', '', '', 'https://www.instagram.com/cj_homeservices/']);
  });

  it('perfil próprio e franquia pequena continuam', async () => {
    await carrega();
    const leads = [
      { name: 'MaidPro Boston', facebook: 'https://facebook.com/maidpro' },
      { name: 'MaidPro Arlington', facebook: 'https://facebook.com/maidpro' },
      { name: 'Soul Cleaning', facebook: 'https://facebook.com/soul' },
    ];
    const r = R.limpaRedesRepetidas(leads);
    assert.equal(r.limpos, 0);
    assert.equal(r.leads, leads, 'sem mudança, devolve a mesma lista');
  });

  it('normaliza o endereço do perfil', async () => {
    await carrega();
    assert.equal(R.normalizaPerfil('https://www.Instagram.com/Fulano/?igsh=1'), 'instagram.com/fulano');
    assert.equal(R.normalizaPerfil('https://m.facebook.com/fulano#x'), 'facebook.com/fulano');
  });
});
