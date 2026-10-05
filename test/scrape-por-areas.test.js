const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { scrapePorAreas } = require('../utils/scrape-por-areas');

const base = { nicho: 'Dentistas', cidade: 'Niterói, RJ', onProgress: () => {}, pais: 'BR' };

describe('busca dividida por bairro', () => {
  it('faz uma busca por bairro e soma, sem passar do total pedido', async () => {
    const consultas = [];
    const scrape = async (q, max) => {
      consultas.push([q, max]);
      return { success: true, data: Array.from({ length: Math.min(max, 3) }, (_, i) => ({ name: `${q}-${i}` })), statistics: { withPhone: 2 } };
    };
    const r = await scrapePorAreas(scrape, { ...base, areas: ['Icaraí', 'Centro', 'Ingá'], maxResults: 7, cancelToken: {} });
    assert.deepEqual(consultas, [
      ['Dentistas Icaraí Niterói, RJ', 7],
      ['Dentistas Centro Niterói, RJ', 4],
      ['Dentistas Ingá Niterói, RJ', 1],
    ]);
    assert.equal(r.data.length, 7);
    assert.equal(r.data[0].bairroBusca, 'Icaraí');
    assert.equal(r.statistics.withPhone, 6);
  });

  it('um bairro que falha não derruba os outros', async () => {
    const scrape = async (q) => {
      if (q.includes('Centro')) throw new Error('timeout');
      return { success: true, data: [{ name: q }] };
    };
    const r = await scrapePorAreas(scrape, { ...base, areas: ['Icaraí', 'Centro'], maxResults: 50, cancelToken: {} });
    assert.equal(r.success, true);
    assert.equal(r.data.length, 1);
    assert.equal(r.partial, true);
    assert.match(r.warnings[0], /Centro: timeout/);
  });

  it('cancelar para na hora', async () => {
    const token = { cancelled: false };
    const scrape = async () => { token.cancelled = true; return { success: true, data: [{ name: 'a' }] }; };
    await assert.rejects(
      scrapePorAreas(scrape, { ...base, areas: ['A', 'B'], maxResults: 50, cancelToken: token }),
      (e) => e.code === 'SCRAPE_CANCELLED',
    );
  });
});
