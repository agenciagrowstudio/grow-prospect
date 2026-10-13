const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { analisaLeadsComIA, lerSite, sinaisComSite } = require('../lead-scoring/analise-ia-leads');

const respostaHtml = (html, tipo = 'text/html') => ({
  ok: true,
  headers: { get: () => tipo },
  text: async () => html,
});

const SITE_PT = '<html lang="pt-BR"><title>Limpeza Brasil</title><body>Falamos português! Serviços de limpeza residencial com qualidade. <a href="https://wa.me/5527999990000">Whats</a></body></html>';
const SITE_EN = '<html lang="en"><title>Sparkle Maids</title><body>Professional house cleaning in Boston since 1998. Book online.</body></html>';

describe('análise com IA dos leads', () => {
  it('lê o site e acha os sinais de brasileiro', async () => {
    const site = await lerSite('limpezabrasil.com', async () => respostaHtml(SITE_PT));
    assert.equal(site.ok, true);
    assert.equal(site.lang, 'pt-br');
    assert.equal(site.falaPortugues, true);
    assert.equal(site.whats55, true);
    const s = sinaisComSite({ name: 'Clean Co', pais: 'US' }, site);
    assert.equal(s.nivel, 'alto');
    assert.ok(s.sinais.includes('site diz que atende em português'));
  });

  it('não lê Instagram nem link de WhatsApp como site', async () => {
    let chamou = false;
    const r = await lerSite('https://instagram.com/x', async () => { chamou = true; return respostaHtml(''); });
    assert.equal(r.ok, false);
    assert.equal(chamou, false);
  });

  it('junta a decisão da IA: público, serviço e gancho', async () => {
    const leads = [
      { id: 'a', name: 'Limpeza Brasil', website: 'limpezabrasil.com', pais: 'US', city: 'Framingham' },
      { id: 'b', name: 'Sparkle Maids', website: 'sparkle.com', pais: 'US', city: 'Boston' },
      { id: 'c', name: 'Sem Site Cleaning', pais: 'US' },
    ];
    const fetchFalso = async (url) => respostaHtml(String(url).includes('limpeza') ? SITE_PT : SITE_EN);
    const analisador = {
      resolveProviderConfig: () => ({ apiKey: 'x', provider: 'gemini' }),
      requestChatCompletion: async (_cfg, payload) => {
        assert.equal(payload.negocios.length, 3);
        assert.equal(payload.negocios[0].site.idioma, 'pt-br');
        assert.equal(payload.negocios[2].site, null);
        assert.doesNotMatch(payload.tarefa, /brasileiro:|servico:/, 'a IA não decide público nem serviço');
        // Mesmo que a IA mande público e serviço, nada disso é usado.
        return { choices: [{ message: { content: JSON.stringify({ resultados: [
          { id: 'a', brasileiro: false, confianca: 0.99, servico: 'google', gancho: 'Vi que vocês atendem em português — em Framingham.', ganchoEn: 'I saw you serve Framingham.' },
          { id: 'b', brasileiro: true, confianca: 0.99, gancho: '' },
        ] }) } }] };
      },
    };
    const progresso = [];
    const r = await analisaLeadsComIA(leads, {}, { onProgresso: (p) => progresso.push(p.etapa), deps: { analisador, fetch: fetchFalso } });
    const [a, b, c] = r;
    assert.equal(a.sinalBr.nivel, 'alto', 'o site em português decide, não a IA');
    assert.equal(a.sinalBr.fonte, 'regras');
    assert.equal(a.ia.publico, undefined);
    assert.equal(a.ia.servico, undefined);
    assert.match(a.ia.gancho, /Framingham/);
    assert.doesNotMatch(a.ia.gancho, /—/, 'sem travessão no texto que vai para a mensagem');
    assert.equal(b.sinalBr.nivel, 'baixo', 'a IA dizer brasileiro não muda nada');
    assert.equal(c.ia, null, 'sem resposta da IA, fica só com os sinais');
    assert.ok(progresso.includes('sites') && progresso.includes('ia'));
  });

  it('chave recusada vira mensagem clara', async () => {
    const analisador = {
      resolveProviderConfig: () => ({ apiKey: 'x' }),
      requestChatCompletion: async () => { const e = new Error('HTTP 401'); e.status = 401; throw e; },
    };
    await assert.rejects(
      analisaLeadsComIA([{ id: 'a', name: 'X' }], {}, { deps: { analisador, fetch: async () => respostaHtml('') } }),
      /chave de IA foi recusada/,
    );
  });

  it('sem chave configurada avisa antes de começar', async () => {
    const analisador = { resolveProviderConfig: () => ({ apiKey: '' }), requestChatCompletion: async () => ({}) };
    await assert.rejects(analisaLeadsComIA([{ id: 'a' }], {}, { deps: { analisador } }), /Configure a chave/);
  });
});
