const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DailyQuota, LIMIT_TIERS } = require('../campaigns/daily-quota');

describe('DailyQuota', () => {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-quota-'));
  });
  after(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('tiers are 10, 30, 60, 100', () => {
    assert.deepEqual(LIMIT_TIERS, [10, 30, 60, 100]);
  });

  it('blocks after daily limit per connection', () => {
    const q = new DailyQuota(dir);
    const cfg = { dailyLimit: 10, manualUnlimited: false };
    for (let i = 0; i < 10; i++) {
      assert.equal(q.check('conn-a', cfg).allowed, true);
      q.recordSend('conn-a');
    }
    assert.equal(q.check('conn-a', cfg).allowed, false);
    assert.equal(q.check('conn-a', cfg).remaining, 0);
    // other number still free
    assert.equal(q.check('conn-b', cfg).allowed, true);
  });

  it('libera a vaga 24h depois do envio, não à meia-noite', () => {
    const q = new DailyQuota(dir);
    const cfg = { dailyLimit: 10, manualUnlimited: false };
    const t0 = Date.parse('2026-10-05T23:00:00');
    for (let i = 0; i < 10; i++) q.recordSend('conn-w', 1, t0);
    const depoisDaMeiaNoite = t0 + 2 * 60 * 60 * 1000;
    assert.equal(q.check('conn-w', cfg, depoisDaMeiaNoite).allowed, false);
    const r = q.check('conn-w', cfg, t0 + 23 * 60 * 60 * 1000);
    assert.equal(r.allowed, false);
    assert.equal(r.nextFreeAt, t0 + 24 * 60 * 60 * 1000);
    assert.equal(q.check('conn-w', cfg, t0 + 24 * 60 * 60 * 1000 + 1).allowed, true);
  });

  it('manual unlimited never blocks', () => {
    const q = new DailyQuota(dir);
    const cfg = { manualUnlimited: true };
    q.recordSend('conn-x', 500);
    assert.equal(q.check('conn-x', cfg).allowed, true);
    assert.equal(q.check('conn-x', cfg).unlimited, true);
  });

  it('resolveLimitConfig falls back to unlocked max', () => {
    const r = DailyQuota.resolveLimitConfig({
      dailyLimit: 100,
      unlockedLimits: [10, 30],
      manualUnlimited: false,
    });
    assert.equal(r.dailyLimit, 30);
  });
});
