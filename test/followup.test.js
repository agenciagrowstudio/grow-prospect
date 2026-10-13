const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let F;
let Rp;
const carrega = async () => {
  if (!F) F = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/followup.js')).href);
  if (!Rp) Rp = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/respostas.js')).href);
};

const HORA = 3600000;
const DIA = 24 * HORA;
const T0 = new Date(2026, 9, 13, 10, 0).getTime();

describe('follow-up da Fila do dia', () => {
  it('etapas em 2, 5 e 10 dias depois da primeira mensagem', async () => {
    await carrega();
    let r = { status: 'enviada', ts: T0 };
    let p = F.proximoFollowup(r, T0 + DIA);
    assert.deepEqual([p.n, p.liberado, p.liberaEm], [1, false, T0 + 2 * DIA]);
    assert.equal(F.proximoFollowup(r, T0 + 2 * DIA).liberado, true);
    r = F.marcaFollowup(r, 'oi', T0 + 2 * DIA);
    p = F.proximoFollowup(r, T0 + 3 * DIA);
    assert.deepEqual([p.n, p.liberaEm], [2, T0 + 5 * DIA]);
    r = F.marcaFollowup(r, 'oi', T0 + 5 * DIA);
    assert.equal(F.proximoFollowup(r, T0 + 10 * DIA).n, 3);
    r = F.marcaFollowup(r, 'tchau', T0 + 10 * DIA);
    assert.equal(F.proximoFollowup(r, T0 + 30 * DIA), null, 'depois do último, sai da sequência');
  });

  it('nunca libera antes de 24h da mensagem anterior, mesmo com o prazo vencido', async () => {
    await carrega();
    // Follow-up 1 mandado atrasado, no dia 4,5: o 2 (dia 5) só libera 24h depois.
    const r = F.marcaFollowup({ status: 'enviada', ts: T0 }, 'oi', T0 + 4.5 * DIA);
    const p = F.proximoFollowup(r, T0 + 5 * DIA);
    assert.equal(p.liberado, false);
    assert.equal(p.liberaEm, T0 + 5.5 * DIA);
  });

  it('quem respondeu, está sem interesse ou foi pulado não recebe follow-up', async () => {
    await carrega();
    for (const status of ['respondeu', 'sem_interesse', 'pulada', 'sem_whatsapp']) {
      assert.equal(F.proximoFollowup({ status, ts: T0 }, T0 + 30 * DIA), null, status);
    }
  });

  it('contador legível', async () => {
    await carrega();
    assert.equal(F.tempoAte(T0 + DIA + 4 * HORA, T0), 'libera em 1d 4h');
    assert.equal(F.tempoAte(T0 + 5 * HORA + 20 * 60000, T0), 'libera em 5h 20min');
    assert.equal(F.tempoAte(T0 - 1, T0), 'liberado');
  });

  it('texto do roteiro com e sem o nome do cliente', async () => {
    await carrega();
    assert.match(F.textoFollowup({ nome: 'Nayara' }, 1, 'pt'), /^Oi Nayara! Conseguiu ver minha última mensagem\?/);
    assert.match(F.textoFollowup({}, 3, 'pt'), /^Oi! Vou encerrar nosso contato/);
    assert.match(F.textoFollowup({}, 2, 'en'), /^Hi! Following up/);
  });

  it('respostas prontas sem nome continuam corretas', async () => {
    await carrega();
    const caro = Rp.RESPOSTAS.find((r) => r.titulo === 'Está caro');
    assert.match(caro.texto('Nayara'), /^Entendo, Nayara\. É importante/);
    assert.match(caro.texto(''), /^Entendo\. É importante/);
    const menor = Rp.RESPOSTAS.find((r) => r.titulo === 'Quero começar com algo menor');
    assert.match(menor.texto(''), /^Podemos avaliar/);
    assert.match(menor.texto('João'), /^João, podemos avaliar/);
    assert.ok(Rp.RESPOSTAS.every((r) => Rp.GRUPOS_RESPOSTAS.some((g) => g.id === r.grupo)));
  });
});
