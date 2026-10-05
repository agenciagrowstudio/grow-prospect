const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CampaignManager } = require('../campaigns/campaign-manager');
const { EmailCampanhas } = require('../email/email-campanhas');

describe('lead já abordado em outra campanha', () => {
  let dir;
  let manager;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-abord-')); });
  afterEach(() => {
    manager?.shutdown();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('WhatsApp: só conta quem recebeu, acha com ou sem o 55 e traz a campanha mais recente', () => {
    manager = new CampaignManager(dir);
    const c1 = manager.create({ name: 'Antiga', template: { text: 'oi' }, leadIds: [{ phone: '5521999990000' }, { phone: '5521988880000' }] });
    const c2 = manager.create({ name: 'Nova', template: { text: 'oi' }, leadIds: [{ phone: '5521999990000' }] });
    const leads1 = manager.get(c1.id).leads;
    leads1[0] = { ...leads1[0], status: 'sent', sentAt: 1000 };
    leads1[1] = { ...leads1[1], status: 'failed', sentAt: 1000 };
    manager.store.update(c1.id, { leads: leads1 });
    const leads2 = manager.get(c2.id).leads;
    leads2[0] = { ...leads2[0], status: 'replied', sentAt: 2000, repliedAt: 2500 };
    manager.store.update(c2.id, { leads: leads2 });

    const r = manager.jaAbordados(['21999990000', '5521988880000', '5521977770000']);
    assert.deepEqual(r['21999990000'], { canal: 'whatsapp', campanha: 'Nova', quando: 2000, respondeu: true });
    assert.equal(r['5521988880000'], undefined, 'falhou, nunca recebeu');
    assert.equal(r['5521977770000'], undefined);
  });

  it('e-mail: acha quem recebeu e marca quem pediu para sair', () => {
    const settings = { data: {}, senha: () => '', pronta: () => true };
    const motor = new EmailCampanhas(dir, { settings, gmail: {} });
    const c = motor.criar({
      nome: 'Outubro',
      modelos: { br: { assunto: 'a', corpo: 'b' } },
      leads: [{ email: 'a@loja.com.br', pais: 'BR' }, { email: 'b@loja.com.br', pais: 'BR' }],
    });
    motor.campanhas[c.id].leads[0].sentAt = 5000;
    motor.supressao.add('c@loja.com.br');
    const r = motor.jaAbordados(['A@loja.com.br, outro@x.com', 'b@loja.com.br', 'c@loja.com.br']);
    assert.deepEqual(r['a@loja.com.br'], { canal: 'email', campanha: 'Outubro', quando: 5000, respondeu: false });
    assert.equal(r['b@loja.com.br'], undefined);
    assert.equal(r['c@loja.com.br'].bloqueado, true);
  });
});
