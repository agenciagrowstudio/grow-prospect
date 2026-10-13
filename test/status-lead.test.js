const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const carrega = () => import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/statusLead.js')).href);

describe('estado do lead', () => {
  it('a marcação vale mais que o histórico das campanhas', async () => {
    const S = await carrega();
    assert.equal(S.statusDoLead('a', { a: { status: 'sem_interesse' } }, [{ k: 'sent' }]), 'sem_interesse');
    assert.equal(S.statusDoLead('a', {}, [{ k: 'sent' }, { k: 'reply' }]), 'respondeu');
    assert.equal(S.statusDoLead('a', {}, [{ k: 'sent' }]), 'enviada');
    assert.equal(S.statusDoLead('a', {}, []), 'novo');
    assert.equal(S.statusDoLead('a', { a: { status: 'inventado' } }, []), 'novo');
  });

  it('marcar sem interesse cria o registro da Fila; para abordar apaga', async () => {
    const S = await carrega();
    const agora = new Date(2026, 9, 13, 10, 0);
    let log = S.aplicaStatus({}, { id: 'a', name: 'Yasmin House Cleaning' }, 'sem_interesse', agora);
    assert.equal(log.a.status, 'sem_interesse');
    assert.equal(log.a.nome, 'Yasmin House Cleaning');
    assert.equal(log.a.dia, '2026-10-13');
    assert.equal(log.a.origem, 'base');
    log = S.aplicaStatus(log, { id: 'a' }, 'novo', agora);
    assert.equal(log.a, undefined);
  });

  it('mudar o estado guarda o texto e os follow-ups que já existiam', async () => {
    const S = await carrega();
    const antes = { a: { status: 'enviada', texto: 'Oi!', followups: [{ n: 1 }], ts: 1, dia: '2026-10-10' } };
    const depois = S.aplicaStatus(antes, { id: 'a' }, 'respondeu', new Date(2026, 9, 13));
    assert.equal(depois.a.status, 'respondeu');
    assert.equal(depois.a.texto, 'Oi!');
    assert.deepEqual(depois.a.followups, [{ n: 1 }]);
    assert.equal(depois.a.dia, '2026-10-10');
    assert.equal(antes.a.status, 'enviada', 'não altera o registro antigo');
  });

  it('nomes e ordem para a coluna', async () => {
    const S = await carrega();
    assert.equal(S.nomeDoStatus('sem_interesse'), 'Sem interesse');
    assert.ok(S.ordemDoStatus('respondeu') > S.ordemDoStatus('sem_interesse'));
  });
});

describe('cidade do lead na Base', () => {
  const carregaDados = () => import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/leadData.js')).href);

  it('sai do endereço; sem endereço, da cidade da extração', async () => {
    const D = await carregaDados();
    const buscas = new Map([['s1', { id: 's1', area: { tipo: 'cidade', cidade: 'Framingham', uf: 'MA' } }]]);
    assert.deepEqual(D.localDoLead({ address: '62 Main St, Framingham, MA 01702, Estados Unidos' }, buscas), { cidade: 'Framingham', uf: 'MA', bairro: '', daBusca: false });
    assert.deepEqual(D.localDoLead({ searchId: 's1' }, buscas), { cidade: 'Framingham', uf: 'MA', bairro: '', daBusca: true });
    assert.equal(D.localDoLead({ address: 'Rua Augusta, 100 - Consolação, São Paulo - SP, 01304-000' }).bairro, 'Consolação');
    assert.equal(D.localDoLead({ searchId: 'x' }, buscas).cidade, '');
  });
});
