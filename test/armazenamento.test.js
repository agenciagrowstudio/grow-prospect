const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let A;
const carrega = async () => {
  if (!A) A = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/armazenamento.js')).href);
};

function armazemDe(obj) {
  const chaves = Object.keys(obj);
  return { length: chaves.length, key: (i) => chaves[i], getItem: (k) => obj[k] };
}

describe('armazenamento', () => {
  it('formata tamanhos em português', async () => {
    await carrega();
    assert.equal(A.formataTamanho(900), '900 B');
    assert.equal(A.formataTamanho(280 * 1024), '280 KB');
    assert.equal(A.formataTamanho(0.64 * 1024 * 1024), '655 KB');
    assert.equal(A.formataTamanho(1.5 * 1024 * 1024), '1,5 MB');
  });

  it('soma por grupo e calcula a porcentagem do limite', async () => {
    await carrega();
    const u = A.usoLocal(armazemDe({ sigma_leads: 'x'.repeat(1000), sigma_abordagem_log: 'y'.repeat(100), prospector_poligonos: 'z'.repeat(50), outra: 'w' }));
    assert.equal(u.porGrupo.find((g) => g.id === 'leads').tamanho, 1000 + 'sigma_leads'.length);
    assert.ok(u.porGrupo.some((g) => g.id === 'mapas'));
    assert.ok(u.pct > 0 && u.pct < 1);
  });

  it('tamanho por extração e quantos leads ainda cabem (o dobro com a nuvem)', async () => {
    await carrega();
    const leads = [{ id: 'a', searchId: 's1', name: 'Onix' }, { id: 'b', searchId: 's1', name: 'Vale' }, { id: 'c', searchId: 's2', name: 'Maria' }];
    const buscas = [{ id: 's1', nicho: 'house cleaning', area: { rotulo: 'Everett, MA' } }];
    const r = A.usoPorExtracao(leads, buscas, 0);
    assert.equal(r.porExtracao[0].rotulo, 'house cleaning · Everett, MA');
    assert.equal(r.porExtracao[0].leads, 2);
    assert.equal(r.porExtracao[1].rotulo, 'Extração removida');
    const comNuvem = A.usoPorExtracao(leads, buscas, 0, 2);
    assert.equal(comNuvem.cabemMais, Math.floor(r.cabemMais / 2));
  });
});
