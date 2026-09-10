const assert = require('node:assert/strict');
const test = require('node:test');

const { calculateScore } = require('../lead-scoring/scoring-engine');
const { normalizeLead } = require('../lead-scoring/normalizer');

// Empresa com site saudavel, para o piso de "sem site" nao mascarar a
// diferenca que estes testes medem.
function empresa(extra) {
  return {
    company: {
      name: 'Negocio',
      category: 'Restaurante',
      phone: '',
      whatsapp: '',
      email: '',
      website: 'https://exemplo.com',
      reviewCount: 60,
      rating: 4.6,
      ...extra,
    },
  };
}

// Sem botao de WhatsApp de proposito: ele sozinho vale 5 pontos de
// contatabilidade e mascararia o sinal de rede social, que e o que estes
// testes medem.
const SITE_SAUDAVEL = {
  digitalPresence: { reachable: true },
  hasHttps: true,
  hasOwnDomain: true,
  mobile: { isResponsive: true },
  conversion: { hasWhatsappButton: false, hasForm: true, ctaStrength: 'alta' },
  tracking: { googleAnalytics: true, metaPixel: true },
  content: { title: 'Um titulo suficientemente longo', description: 'ok', h1: 'ok' },
  performance: { loadTimeMs: 800 },
  crawl: { httpErrors: [] },
};

function contatabilidade(extra) {
  return calculateScore(empresa(extra), SITE_SAUDAVEL, {}, {}).components.contactability;
}

test('no Brasil o Instagram pesa mais que o Facebook', () => {
  assert.equal(contatabilidade({ pais: 'BR', instagram: 'ig' }), 3);
  assert.equal(contatabilidade({ pais: 'BR', facebook: 'fb' }), 1);
});

test('nos Estados Unidos o Facebook pesa mais que o Instagram', () => {
  // Na comunidade brasileira nos EUA o canal do negocio local ainda e o
  // Facebook. Pontuar igual nos dois paises erra nos dois.
  assert.equal(contatabilidade({ pais: 'US', facebook: 'fb' }), 3);
  assert.equal(contatabilidade({ pais: 'US', instagram: 'ig' }), 1);
});

test('ter as duas redes soma, sem estourar o teto do componente', () => {
  assert.equal(contatabilidade({ pais: 'US', facebook: 'fb', instagram: 'ig' }), 4);
  const cheio = contatabilidade({
    pais: 'BR', instagram: 'ig', facebook: 'fb',
    phone: '2199999999', whatsapp: '+5521999998888', email: 'a@b.com',
  });
  assert.equal(cheio, 15);
});

test('sem pais informado o comportamento e o brasileiro', () => {
  assert.equal(contatabilidade({ instagram: 'ig' }), 3);
  assert.equal(contatabilidade({ facebook: 'fb' }), 1);
});

test('o motivo cita a rede certa para o pais', () => {
  const semSite = { ...empresa({ pais: 'US', facebook: 'fb' }).company, website: '' };
  const r = calculateScore({ company: semSite }, {}, {}, {});
  assert.ok(r.reasons.some((m) => m.includes('Facebook')), r.reasons.join(' | '));

  const semSiteBr = { ...empresa({ pais: 'BR', instagram: 'ig' }).company, website: '' };
  const rBr = calculateScore({ company: semSiteBr }, {}, {}, {});
  assert.ok(rBr.reasons.some((m) => m.includes('Instagram')), rBr.reasons.join(' | '));
});

test('o facebook coletado sobrevive a normalizacao do lead', () => {
  // Ate agora o campo era descartado: o scraper so olhava para o facebook
  // para decidir NAO rastrear e-mail, e nunca guardava o endereco.
  const lead = normalizeLead(
    { name: 'Padaria', facebook: 'https://facebook.com/padaria', instagram: '', phone: '(617) 555-0123' },
    { pais: 'US' },
  );
  assert.equal(lead.company.facebook, 'https://facebook.com/padaria');
  assert.equal(lead.company.pais, 'US');
});
