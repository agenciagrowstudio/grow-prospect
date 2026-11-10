const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let C;
const carrega = async () => {
  if (!C) C = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/comandosRemotos.js')).href);
};

const vilaVelha = {
  niche: 'Dentista',
  neigh: '',
  bairros: [],
  city: 'Vila Velha, ES',
  pais: 'BR',
  limit: 1000,
  area: null,
  localLabel: 'Vila Velha, ES',
  local: { nome: 'Vila Velha', detalhe: 'ES', cidade: 'Vila Velha', uf: 'ES', pais: 'BR', tipo: 'cidade', lat: -20.33, lng: -40.29, chave: 'osm-r-1' },
  searchId: 'scrape_1762790000000',
};

describe('extração pedida pela web', () => {
  it('pedido completo passa e mantém o id da busca', async () => {
    await carrega();
    const r = C.limpaPedido(vilaVelha);
    assert.equal(r.ok, true);
    assert.equal(r.pedido.niche, 'Dentista');
    assert.equal(r.pedido.city, 'Vila Velha, ES');
    assert.equal(r.pedido.searchId, 'scrape_1762790000000');
    assert.equal(r.pedido.local.tipo, 'cidade');
    assert.equal(C.rotuloDoPedido(r.pedido), 'Dentista em Vila Velha, ES');
  });

  it('sem serviço ou sem lugar não vira extração', async () => {
    await carrega();
    assert.equal(C.limpaPedido({ ...vilaVelha, niche: ' ' }).ok, false);
    assert.equal(C.limpaPedido({ ...vilaVelha, city: '', localLabel: '' }).ok, false);
    assert.equal(C.limpaPedido(null).ok, false);
  });

  it('o que vem da nuvem é limpo antes de chegar no robô', async () => {
    await carrega();
    const r = C.limpaPedido({
      ...vilaVelha,
      niche: 'Dentista\n\u0000'.padEnd(500, 'x'),
      limit: 999999,
      pais: 'XX',
      searchId: '../../etc',
      bairros: Array.from({ length: 200 }, (_, i) => `Bairro ${i}`),
      local: { ...vilaVelha.local, tipo: 'script', lat: 999 },
    });
    assert.equal(r.ok, true);
    assert.ok(r.pedido.niche.length <= 80);
    assert.ok(!/[\u0000-\u001f]/.test(r.pedido.niche));
    assert.equal(r.pedido.limit, 1000);
    assert.equal(r.pedido.pais, 'BR');
    assert.equal(r.pedido.searchId, undefined, 'id fora do padrão não passa');
    assert.equal(r.pedido.bairros.length, 60);
    assert.equal(r.pedido.local.tipo, 'lugar');
    assert.equal(r.pedido.local.lat, undefined, 'coordenada impossível sai');
  });

  it('busca por raio dispensa a cidade', async () => {
    await carrega();
    const r = C.limpaPedido({ niche: 'House cleaning', pais: 'US', area: { lat: 28.53, lng: -81.37, raioKm: 10 }, localLabel: 'Orlando, FL' });
    assert.equal(r.ok, true);
    assert.equal(r.pedido.city, '');
    assert.deepEqual(r.pedido.area, { lat: 28.53, lng: -81.37, raioKm: 10 });
    assert.equal(C.rotuloDoPedido(r.pedido), 'House cleaning em 10 km de Orlando, FL');
  });

  it('acompanha o pedido: fila, rodando e fim', async () => {
    await carrega();
    const pcLivre = { pc_id: 'pc_a', nome: 'ESCRITORIO', ligado: true, ocupado: false };
    let r = C.resumoDoPedido({ computadores: [], comandos: [{ id: 'c1', status: 'pendente' }] }, 'c1');
    assert.equal(r.final, false);
    assert.equal(r.pcLigado, false);
    assert.match(C.textoDeEspera(r, 'Dentista em Vila Velha').detalhe, /fica na fila/);

    r = C.resumoDoPedido({ computadores: [{ ...pcLivre, ocupado: true }], comandos: [{ id: 'c1', status: 'pendente' }] }, 'c1');
    assert.equal(r.pcOcupado, true);
    assert.match(C.textoDeEspera(r, 'X').titulo, /na fila/);

    r = C.resumoDoPedido({ computadores: [pcLivre], comandos: [{ id: 'c1', status: 'rodando', progresso: 40, pc_nome: 'ESCRITORIO' }] }, 'c1');
    assert.equal(r.progresso, 40);
    assert.match(C.textoDeEspera(r, 'Dentista em Vila Velha').titulo, /^Extraindo/);
    assert.match(C.textoDeEspera(r, 'X').detalhe, /ESCRITORIO/);

    r = C.resumoDoPedido({ computadores: [pcLivre], comandos: [{ id: 'c1', status: 'concluido', resultado: { novos: 12, repetidos: 3 } }] }, 'c1');
    assert.equal(r.final, true);
    assert.equal(C.textoDoResultado(r.comando), '12 leads novos. 3 já estavam na base.');

    r = C.resumoDoPedido({ computadores: [], comandos: [] }, 'c1');
    assert.equal(r.final, true, 'pedido que sumiu da nuvem não fica esperando para sempre');
  });
});
