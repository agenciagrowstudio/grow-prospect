const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const carrega = (arq) => import(pathToFileURL(path.join(__dirname, '..', 'renderer/src', arq)).href);

describe('regras com o resultado da IA', () => {
  const americano = { lidas: 5, sobrenomesBr: 0, emPortugues: 0, respostaDonoPt: false, citamBrasil: 0 };
  const brasileiro = { lidas: 5, sobrenomesBr: 3, emPortugues: 4, respostaDonoPt: true, citamBrasil: 0 };

  it('público: a IA não decide; avaliações lidas sem sinal brasileiro viram americano', async () => {
    const R = await carrega('resultados.js');
    assert.equal(R.publicoDoLead({ pais: 'US', ia: { publico: 'us', confianca: 0.99 } }), 'verificar', 'IA antiga é ignorada');
    assert.equal(R.publicoDoLead({ pais: 'US', avaliacoesLidas: americano }), 'us');
    assert.equal(R.publicoDoLead({ pais: 'US', avaliacoesLidas: { ...americano, lidas: 2 } }), 'verificar', 'poucas avaliações não decidem');
    assert.equal(R.publicoDoLead({ pais: 'US', avaliacoesLidas: brasileiro, sinalBr: { nivel: 'alto' } }), 'brus');
    assert.equal(R.publicoDoLead({ pais: 'US', avaliacoesLidas: americano, sinalBr: { nivel: 'medio' } }), 'brus', 'outro sinal brasileiro vence');
    assert.equal(R.publicoDoLead({ pais: 'US', avaliacoesLidas: americano, publicoConfirmado: 'brus' }), 'brus', 'marcação manual manda');
  });

  it('idioma: americano pelas avaliações recebe em inglês; marcação manual manda', async () => {
    const A = await carrega('abordagem.js');
    assert.equal(A.idiomaDoLead({ pais: 'US', avaliacoesLidas: americano }), 'en');
    assert.equal(A.idiomaDoLead({ pais: 'US', avaliacoesLidas: americano, publicoConfirmado: 'brus' }), 'pt');
    assert.equal(A.idiomaDoLead({ pais: 'US', ia: { publico: 'us', confianca: 0.9 } }), 'pt', 'IA não decide idioma');
    assert.equal(A.idiomaDoLead({ pais: 'BR', avaliacoesLidas: americano }), 'pt');
  });

  it('serviço sai das regras, mesmo que o lead tenha sugestão antiga da IA', async () => {
    const Q = await carrega('qualificacaoLead.js');
    const lead = { name: 'X', phone: '+1 617 555 0101', rating: 4.9, reviews: 200, website: 'https://x.com', instagram: '@x', ia: { servico: 'google', motivoServico: 'ficha sem fotos' } };
    const q = Q.qualificaLead(lead);
    assert.ok(!q.servicos.some((s) => s.daIA));
    assert.ok(!q.servicos.some((s) => s.id === 'google'), 'Google forte não entra só porque a IA disse');
  });

  it('detalhe da IA entra antes da pergunta final e não duplica', async () => {
    const I = await carrega('iaLeads.js');
    const msg = 'Oi! Tudo bem?\n\nVi a ficha de vocês.\n\nVocês já têm site?';
    const com = I.insereGancho(msg, 'Vi que vocês atendem Framingham.');
    assert.equal(com, 'Oi! Tudo bem?\n\nVi a ficha de vocês.\n\nVi que vocês atendem Framingham.\n\nVocês já têm site?');
    assert.equal(I.insereGancho(com, 'Vi que vocês atendem Framingham.'), com);
    assert.equal(I.insereGancho(msg, ''), msg);
  });

  it('aplica resultados só em quem foi analisado', async () => {
    const I = await carrega('iaLeads.js');
    const leads = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const r = I.aplicaResultadosIA(leads, [{ id: 'a', sinalBr: { nivel: 'alto' }, ia: { gancho: 'Vi que vocês atendem Framingham.' } }]);
    assert.equal(r[0].ia.gancho, 'Vi que vocês atendem Framingham.');
    assert.equal(r[1], leads[1]);
  });
});
