const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CampaignScheduler } = require('../campaigns/campaign-scheduler');
const { DailyQuota } = require('../campaigns/daily-quota');

// Número pronto para enviar. Com sendTemplate, é da API oficial.
const webProvider = () => ({ isReady: () => true });
const metaProvider = () => ({ isReady: () => true, sendTemplate: async () => ({ success: true }) });

describe('cota de 24h e API oficial', () => {
  let dir;
  let quota;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-cota-meta-'));
    quota = new DailyQuota(dir);
    // 10 envios agora: a cota padrão de 10 por 24h está esgotada nos dois números.
    quota.recordSend('web', 10);
    quota.recordSend('meta', 10);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  function agendador(map) {
    const manager = { dailyQuota: quota, getCampaignSettings: () => ({ dailyLimit: 10 }) };
    return new CampaignScheduler(map, null, null, manager);
  }

  const campanha = (connectionId) => ({
    connectionId,
    connectionIds: [connectionId],
    leads: [{ status: 'pending', connectionId }],
  });

  it('número do WhatsApp Web com a cota esgotada para', () => {
    const s = agendador(new Map([['web', webProvider()]]));
    const pick = s._pickNextSend(campanha('web'));
    assert.equal(pick.blocked, true);
    assert.equal(pick.reason, 'daily_limit');
  });

  it('número da API oficial ignora a cota de 24h e segue enviando', () => {
    const s = agendador(new Map([['meta', metaProvider()]]));
    const pick = s._pickNextSend(campanha('meta'));
    assert.equal(pick.blocked, undefined);
    assert.equal(pick.connectionId, 'meta');
  });
});
