const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ehInstagram, normalizaUrl } = require('../utils/janelaInstagram');

describe('janela do Instagram da prospecção', () => {
  it('reconhece só links do Instagram', () => {
    assert.equal(ehInstagram('https://instagram.com/yasmincleaning'), true);
    assert.equal(ehInstagram('https://www.instagram.com/p/abc/'), true);
    assert.equal(ehInstagram('http://instagram.com/x'), true);
    assert.equal(ehInstagram('https://instagram.com.golpe.net/x'), false);
    assert.equal(ehInstagram('https://facebook.com/x'), false);
    assert.equal(ehInstagram('javascript:alert(1)'), false);
    assert.equal(ehInstagram('@yasmincleaning'), false);
  });

  it('abre sempre em https://www.instagram.com, para usar a mesma sessão', () => {
    assert.equal(normalizaUrl('http://instagram.com/yasmincleaning'), 'https://www.instagram.com/yasmincleaning');
    assert.equal(normalizaUrl('https://www.instagram.com/p/abc/'), 'https://www.instagram.com/p/abc/');
  });
});
