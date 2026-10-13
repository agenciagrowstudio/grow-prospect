const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const carrega = (arq) => import(pathToFileURL(path.join(__dirname, '..', 'renderer/src', arq)).href);

describe('funil (Kanban)', () => {
  it('se monta sozinho a partir da Fila do dia', async () => {
    const F = await carrega('funil.js');
    const leads = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }, { id: 'e', name: 'E' }];
    const log = {
      a: { status: 'enviada', ts: 1 },
      b: { status: 'enviada', ts: 2, followups: [{ ts: 5 }] },
      c: { status: 'respondeu', ts: 3 },
      d: { status: 'sem_interesse', ts: 4 },
      e: { status: 'pulada', ts: 5 },
    };
    const f = F.montaFunil(leads, log, {});
    assert.deepEqual(f.abordados.map((x) => x.lead.id), ['a']);
    assert.deepEqual(f.followup.map((x) => x.lead.id), ['b']);
    assert.deepEqual(f.responderam.map((x) => x.lead.id), ['c']);
    assert.deepEqual(f.perdidos.map((x) => x.lead.id), ['d']);
    assert.equal(Object.values(f).flat().some((x) => x.lead.id === 'e'), false, 'pulado fica fora do funil');
  });

  it('etapa manual vale depois da resposta, mas sem interesse vence', async () => {
    const F = await carrega('funil.js');
    assert.equal(F.etapaDoLead({ status: 'respondeu' }, { etapa: 'proposta' }), 'proposta');
    assert.equal(F.etapaDoLead({ status: 'sem_interesse' }, { etapa: 'proposta' }), 'perdidos');
    assert.equal(F.etapaDoLead(undefined, { etapa: 'proposta' }), null);
  });

  it('mover para colunas automáticas muda o estado do lead; para as manuais guarda a etapa', async () => {
    const F = await carrega('funil.js');
    const log = { a: { status: 'enviada', ts: 1, texto: 'Oi' } };
    let r = F.moveNoFunil({ log, etapas: {}, id: 'a', para: 'proposta', agora: 10 });
    assert.equal(r.log.a.status, 'respondeu');
    assert.equal(r.log.a.texto, 'Oi');
    assert.deepEqual(r.etapas.a, { etapa: 'proposta', ts: 10 });
    r = F.moveNoFunil({ log: r.log, etapas: r.etapas, id: 'a', para: 'perdidos', agora: 20 });
    assert.equal(r.log.a.status, 'sem_interesse');
    assert.equal(r.etapas.a, undefined);
    const igual = F.moveNoFunil({ log, etapas: {}, id: 'a', para: 'followup' });
    assert.equal(igual.log, log, 'follow-up é só automático');
  });

  it('canal: marcação da Fila é WhatsApp; da Base sem canal fica sem', async () => {
    const F = await carrega('funil.js');
    assert.equal(F.canalDa({ status: 'enviada' }), 'whatsapp');
    assert.equal(F.canalDa({ status: 'enviada', origem: 'base' }), '');
    assert.equal(F.canalDa({ status: 'enviada', origem: 'base', canal: 'instagram' }), 'instagram');
    assert.equal(F.nomeDoCanal('ligacao'), 'Ligação');
  });

  it('o estado marcado na Base guarda o canal', async () => {
    const S = await carrega('statusLead.js');
    const log = S.aplicaStatus({}, { id: 'a', name: 'A' }, 'enviada', new Date(2026, 9, 13), 'instagram');
    assert.equal(log.a.canal, 'instagram');
    const depois = S.aplicaStatus(log, { id: 'a' }, 'respondeu', new Date(2026, 9, 14));
    assert.equal(depois.a.canal, 'instagram', 'mudar o estado sem canal mantém o que havia');
  });
});
