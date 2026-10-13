const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const carrega = (arq) => import(pathToFileURL(path.join(__dirname, '..', 'renderer/src', arq)).href);

describe('regras com o resultado da IA', () => {
  it('público: marcação manual vence a IA, e a IA só vale com confiança', async () => {
    const R = await carrega('resultados.js');
    const ia = (publico, confianca) => ({ publico, confianca });
    assert.equal(R.publicoDoLead({ pais: 'US', ia: ia('us', 0.9) }), 'us');
    assert.equal(R.publicoDoLead({ pais: 'US', ia: ia('brus', 0.8) }), 'brus');
    assert.equal(R.publicoDoLead({ pais: 'US', ia: ia('us', 0.5) }), 'verificar', 'pouca confiança não decide');
    assert.equal(R.publicoDoLead({ pais: 'US', ia: ia('us', 0.95), publicoConfirmado: 'brus' }), 'brus');
  });

  it('idioma: americano pela IA recebe em inglês; marcação manual manda', async () => {
    const A = await carrega('abordagem.js');
    assert.equal(A.idiomaDoLead({ pais: 'US', ia: { publico: 'us', confianca: 0.8 } }), 'en');
    assert.equal(A.idiomaDoLead({ pais: 'US', ia: { publico: 'us', confianca: 0.8 }, publicoConfirmado: 'brus' }), 'pt');
    assert.equal(A.idiomaDoLead({ pais: 'US', ia: { publico: 'us', confianca: 0.4 } }), 'pt');
    assert.equal(A.idiomaDoLead({ pais: 'BR', ia: { publico: 'us', confianca: 0.9 } }), 'pt');
  });

  it('serviço sugerido pela IA vira o primeiro a oferecer, com o motivo dela', async () => {
    const Q = await carrega('qualificacaoLead.js');
    const lead = { name: 'X', phone: '+1 617 555 0101', rating: 4.9, reviews: 200, website: 'https://x.com', ia: { servico: 'google', motivoServico: 'ficha sem fotos' } };
    const q = Q.qualificaLead(lead);
    assert.equal(q.servicos[0].id, 'google');
    assert.equal(q.servicos[0].motivo, 'ficha sem fotos');
    assert.equal(q.servicos[0].daIA, true);
    assert.equal(q.servicos.filter((s) => s.id === 'google').length, 1);
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
    const r = I.aplicaResultadosIA(leads, [{ id: 'a', sinalBr: { nivel: 'alto' }, ia: { publico: 'brus', confianca: 0.9 } }]);
    assert.equal(r[0].ia.publico, 'brus');
    assert.equal(r[1], leads[1]);
  });
});
