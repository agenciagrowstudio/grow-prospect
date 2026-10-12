const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let N;
const carrega = async () => {
  if (!N) N = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/nuvem.js')).href);
};
const ids = (lista) => lista.map((l) => l.id);

describe('sincronização entre computadores (mescla em três vias)', () => {
  it('primeira vez: junta o que existe dos dois lados', async () => {
    await carrega();
    const pcA = [{ id: 1, name: 'A' }];
    const nuvem = [{ id: 2, name: 'B' }];
    assert.deepEqual(ids(N.mesclar3(undefined, pcA, nuvem)), [1, 2]);
    assert.deepEqual(N.mesclar3(undefined, undefined, nuvem), nuvem, 'computador novo recebe tudo');
    assert.deepEqual(N.mesclar3(undefined, pcA, undefined), pcA, 'nuvem vazia recebe tudo');
  });

  it('lead novo nos dois computadores ao mesmo tempo: os dois ficam', async () => {
    await carrega();
    const base = [{ id: 1 }];
    const r = N.mesclar3(base, [{ id: 1 }, { id: 'a' }], [{ id: 1 }, { id: 'b' }]);
    assert.deepEqual(ids(r), [1, 'a', 'b']);
  });

  it('editado só de um lado: vale a edição, venha de onde vier', async () => {
    await carrega();
    const base = [{ id: 1, stage: 'novo' }, { id: 2, stage: 'novo' }];
    const local = [{ id: 1, stage: 'contato' }, { id: 2, stage: 'novo' }];
    const remoto = [{ id: 1, stage: 'novo' }, { id: 2, stage: 'fechado' }];
    const r = N.mesclar3(base, local, remoto);
    assert.equal(r.find((l) => l.id === 1).stage, 'contato');
    assert.equal(r.find((l) => l.id === 2).stage, 'fechado');
  });

  it('apagado de um lado sai; mas se o outro editou, a edição vence', async () => {
    await carrega();
    const base = [{ id: 1, n: 'x' }, { id: 2, n: 'y' }];
    const local = [{ id: 2, n: 'y' }]; // apagou o 1 aqui
    assert.deepEqual(ids(N.mesclar3(base, local, base)), [2]);
    const remotoEditou = [{ id: 1, n: 'editado' }, { id: 2, n: 'y' }];
    assert.deepEqual(ids(N.mesclar3(base, local, remotoEditou)), [2, 1]);
  });

  it('mapa (registro da Fila do dia): mescla por lead', async () => {
    await carrega();
    const base = { a: { status: 'enviada' } };
    const local = { a: { status: 'respondeu' } };
    const remoto = { a: { status: 'enviada' }, b: { status: 'enviada' } };
    assert.deepEqual(N.mesclar3(base, local, remoto), { a: { status: 'respondeu' }, b: { status: 'enviada' } });
  });

  it('nada mudou: devolve o mesmo, sem gravar à toa', async () => {
    await carrega();
    const v = [{ id: 1 }];
    assert.equal(N.mesclar3(v, v, [{ id: 1 }]), v);
  });

  it('a nuvem devolve as chaves em outra ordem: não conta como mudança', async () => {
    await carrega();
    const local = [{ id: 1, nome: 'Onix', pais: 'US' }];
    const daNuvem = [{ pais: 'US', id: 1, nome: 'Onix' }];
    assert.equal(N.mesclar3(local, local, daNuvem), local, 'devolve o local, sem recarregar a tela');
    const cfg = { nome: 'Matheus', oferta: 'site' };
    assert.equal(N.mesclar3(cfg, cfg, { oferta: 'site', nome: 'Matheus' }), cfg);
  });

  it('limpeza feita na nuvem chega aqui', async () => {
    await carrega();
    const base = [{ id: 'd0' }, { id: 'real' }];
    assert.deepEqual(ids(N.mesclar3(base, base, [{ id: 'real' }])), ['real']);
  });

  it('só dados de trabalho sincronizam; segredos e preferências ficam no computador', async () => {
    await carrega();
    assert.ok(N.CHAVES_SINCRONIZADAS.includes('sigma_leads'));
    assert.ok(N.CHAVES_SINCRONIZADAS.includes('sigma_abordagem_log'));
    for (const local of ['sigma_ai', 'sigma_wa_profile', 'sigma_menu_aberto', 'sigma_busca_ativa']) {
      assert.ok(!N.CHAVES_SINCRONIZADAS.includes(local), local);
    }
  });
});
