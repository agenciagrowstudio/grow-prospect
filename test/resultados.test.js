const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let R;
const carrega = async () => {
  if (!R) R = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/resultados.js')).href);
};

const agora = new Date(2026, 9, 12, 15, 0).getTime();
const DIA = 86400000;

describe('painel de resultados', () => {
  it('soma os três canais e calcula a taxa de resposta', async () => {
    await carrega();
    const log = {
      a: { status: 'enviada', ts: agora - 1000, angulo: 'site', publico: 'brus' },
      b: { status: 'respondeu', ts: agora - DIA, angulo: 'site', publico: 'brus' },
      c: { status: 'pulada', ts: agora }, // pular não é abordagem
      d: { status: 'sem_whatsapp', ts: agora },
    };
    const campanhasWa = [{ id: 'w', leads: [
      { id: 1, sentAt: agora - 2 * DIA, repliedAt: agora - DIA },
      { id: 2, sentAt: agora - 2 * DIA },
      { id: 3, status: 'pending' }, // ainda não saiu
    ] }];
    const campanhasEmail = [{ enviados: 10, respondidos: 1 }];
    const r = R.resumoResultados({ log, campanhasWa, campanhasEmail, agora });
    assert.equal(r.enviadas, 2 + 2 + 10);
    assert.equal(r.respostas, 1 + 1 + 1);
    assert.equal(r.taxa, Math.round((3 / 14) * 100));
    assert.deepEqual(r.canais.map((c) => [c.id, c.enviadas, c.respostas]), [['fila', 2, 1], ['wa', 2, 1], ['email', 10, 1]]);
    assert.equal(r.enviadasHoje, 1);
  });

  it('série diária dos últimos dias e recortes por público e oferta', async () => {
    await carrega();
    const leads = [{ id: 'x', pais: 'US', sinalBr: { nivel: 'baixo' } }, { id: 'y', pais: 'BR' }];
    const log = {
      x: { status: 'respondeu', ts: agora, angulo: 'google' }, // público sai do lead: americano
      y: { status: 'enviada', ts: agora - 3 * DIA, angulo: 'site' },
    };
    const r = R.resumoResultados({ log, leads, agora, dias: 7 });
    assert.equal(r.serie.length, 7);
    assert.deepEqual(r.serie.at(-1), { ...r.serie.at(-1), enviadas: 1, respostas: 1 });
    assert.equal(r.serie.at(-4).enviadas, 1);
    assert.deepEqual(r.porPublico.map((p) => [p.id, p.enviadas, p.taxa]), [['br', 1, 0], ['us', 1, 100]]);
    assert.deepEqual(r.porOferta.map((p) => p.id), ['site', 'google']);
    assert.equal(r.ultimasRespostas[0].id, 'x');
  });

  it('sem nada enviado, tudo zerado e sem divisão por zero', async () => {
    await carrega();
    const r = R.resumoResultados({ agora });
    assert.equal(r.enviadas, 0);
    assert.equal(r.taxa, 0);
    assert.equal(r.porPublico.length, 0);
    assert.equal(r.serie.length, 30);
  });
});
