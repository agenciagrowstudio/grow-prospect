const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const caminho = (rel) => pathToFileURL(path.join(__dirname, '..', rel)).href;
let A;
let Q;
const carrega = async () => {
  if (!A) {
    A = await import(caminho('renderer/src/abordagem.js'));
    Q = await import(caminho('renderer/src/qualificacaoLead.js'));
  }
};

const cfg = { nome: 'Alex', empresa: 'Grow+' };
const semSite = {
  id: 'a1', name: 'Clean Co', category: 'Serviços de faxina', city: 'Orlando', pais: 'US',
  phone: '+1 407-555-0101', rating: 4.8, reviews: 120, instagram: '@cleanco', sinalBr: { nivel: 'alto' },
};

describe('primeira mensagem de abordagem', () => {
  it('cita algo real do negócio e termina numa pergunta fácil', async () => {
    await carrega();
    const q = Q.qualificaLead(semSite);
    const r = A.gerarAbordagem(semSite, q, cfg);
    assert.equal(r.angulo, 'site');
    assert.equal(r.idioma, 'pt', 'brasileiro nos EUA recebe em português');
    assert.match(r.texto, /Clean Co/);
    assert.match(r.texto, /Aqui é Alex, da Grow\+/);
    assert.match(r.texto, /\?/);
  });

  it('segue as regras da copy: curta, sem link, sem preço, sem travessão', async () => {
    await carrega();
    const leads = [semSite, { id: 'b2', name: 'Barbearia Centro', category: 'Barbearia', city: 'Niterói', pais: 'BR', phone: '21999990000', rating: 4.2, reviews: 20, website: 'https://x.com.br' }];
    for (const lead of leads) {
      const q = Q.qualificaLead(lead);
      for (const angulo of ['site', 'google', 'redes', 'conteudo', 'sistema', 'qualquer']) {
        for (let v = 0; v < 4; v++) {
          const { texto } = A.gerarAbordagem(lead, q, { ...cfg, oferta: angulo }, v);
          assert.ok(texto.length <= 330, `longa demais (${texto.length}): ${texto}`);
          assert.doesNotMatch(texto, /https?:|www\.|R\$|US\$|\d+\s?reais|—|–/i, texto);
          assert.doesNotMatch(texto, /\{[a-zA-Z]+\}/, `marcador sobrou: ${texto}`);
          assert.match(texto, /\?/, `sem pergunta: ${texto}`);
        }
      }
    }
  });

  it('leads diferentes abrem com versões diferentes, e o mesmo lead sempre com a mesma', async () => {
    await carrega();
    const q = Q.qualificaLead(semSite);
    const textos = new Set();
    for (let i = 0; i < 12; i++) textos.add(A.gerarAbordagem({ ...semSite, id: `x${i}` }, q, cfg).texto.slice(0, 60));
    assert.ok(textos.size >= 2, 'todas iguais: parece robô');
    assert.equal(A.gerarAbordagem(semSite, q, cfg).texto, A.gerarAbordagem(semSite, q, cfg).texto);
    assert.notEqual(A.gerarAbordagem(semSite, q, cfg, 0).texto, A.gerarAbordagem(semSite, q, cfg, 1).texto);
  });

  it('americano de verdade recebe em inglês; o ângulo respeita o que o usuário quer oferecer', async () => {
    await carrega();
    const americano = { ...semSite, id: 'u1', sinalBr: { nivel: 'baixo' } };
    const q = Q.qualificaLead(americano);
    assert.equal(A.gerarAbordagem(americano, q, cfg).idioma, 'en');
    assert.equal(A.gerarAbordagem(semSite, Q.qualificaLead(semSite), { ...cfg, oferta: 'conteudo' }).angulo, 'conteudo');
    // pediu um ângulo que o lead não tem: cai no principal
    assert.equal(A.gerarAbordagem({ ...semSite, instagram: '' }, Q.qualificaLead({ ...semSite, instagram: '' }), { ...cfg, oferta: 'conteudo' }).angulo, 'site');
  });

  it('nome muito longo é encurtado e a nota só aparece quando é boa', async () => {
    await carrega();
    const lead = { ...semSite, id: 'n1', name: 'Clínica de Odontologia e Estética Avançada Sorriso Perfeito do Centro', rating: 3.2, reviews: 4 };
    const { texto } = A.gerarAbordagem(lead, Q.qualificaLead(lead), cfg);
    assert.ok(!texto.includes('Centro'), texto);
    assert.doesNotMatch(texto, /nota 3,2/);
  });

  it('o link abre a conversa com o texto já na caixa, em Web ou no aplicativo', async () => {
    await carrega();
    assert.equal(A.linkWhatsApp('+1 (407) 555-0101', 'Oi, tudo bem?'), 'https://web.whatsapp.com/send?phone=14075550101&text=Oi%2C%20tudo%20bem%3F');
    assert.equal(A.linkWhatsApp('5521999990000', 'Oi', 'app'), 'whatsapp://send?phone=5521999990000&text=Oi');
    assert.match(A.chaveDoDia(new Date(2026, 9, 8)), /^2026-10-08$/);
  });
});
