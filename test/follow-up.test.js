const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFollowUp, planFollowUps, DAY_MS } = require('../campaigns/follow-up');

const T0 = Date.parse('2026-10-05T10:00:00');
const camp = (leads, followUp) => ({ followUp, leads });
const cfg = { enabled: true, steps: [{ afterDays: 2, text: 'Oi de novo' }, { afterDays: 3, text: 'Ultima' }] };

describe('follow-up', () => {
  it('normaliza: sem passos válidos fica desligado', () => {
    assert.equal(normalizeFollowUp({ enabled: true, steps: [{ text: '  ' }] }).enabled, false);
    assert.equal(normalizeFollowUp(undefined).enabled, false);
    assert.equal(normalizeFollowUp({ enabled: true, steps: [{ text: 'a' }] }).steps[0].afterDays, 2);
  });

  it('só vence depois do prazo e espera enquanto isso', () => {
    const c = camp([{ status: 'delivered', sentAt: T0 }], cfg);
    assert.deepEqual(planFollowUps(c, T0 + DAY_MS), { due: [], waiting: true });
    assert.deepEqual(planFollowUps(c, T0 + 2 * DAY_MS), { due: [0], waiting: false });
  });

  it('quem respondeu ou falhou nunca recebe follow-up', () => {
    const c = camp([
      { status: 'replied', sentAt: T0, repliedAt: T0 + 1 },
      { status: 'failed', sentAt: T0 },
      { status: 'read', sentAt: T0, repliedAt: T0 + 5 },
    ], cfg);
    assert.deepEqual(planFollowUps(c, T0 + 30 * DAY_MS), { due: [], waiting: false });
  });

  it('segundo passo conta a partir do primeiro follow-up e para no fim', () => {
    const lead = { status: 'sent', sentAt: T0, followUpCount: 1, followUpSentAt: T0 + 2 * DAY_MS };
    assert.equal(planFollowUps(camp([lead], cfg), T0 + 4 * DAY_MS).due.length, 0);
    assert.equal(planFollowUps(camp([lead], cfg), T0 + 5 * DAY_MS).due.length, 1);
    lead.followUpCount = 2;
    assert.deepEqual(planFollowUps(camp([lead], cfg), T0 + 99 * DAY_MS), { due: [], waiting: false });
  });

  it('desligado, nada acontece', () => {
    assert.deepEqual(planFollowUps(camp([{ status: 'sent', sentAt: T0 }], { enabled: false }), T0 + 99 * DAY_MS), { due: [], waiting: false });
  });
});
