/**
 * Qualificação instantânea do lead para a Grow+.
 *
 * Usa só o que a extração já trouxe (canais, nota do Google, avaliações,
 * categoria), sem internet. Responde três perguntas que decidem a ordem de
 * trabalho: vale abordar (nota e temperatura), o que oferecer (serviços) e por
 * onde falar (canais).
 *
 * Se o lead já passou pela tela de Lead Scoring, a nota de lá vale mais: ela
 * olhou o site de verdade.
 */

const SERVICOS = {
  site: { id: 'site', rotulo: 'Site' },
  sistema: { id: 'sistema', rotulo: 'Sistema' },
  google: { id: 'google', rotulo: 'Google Negócio' },
  redes: { id: 'redes', rotulo: 'Gestão de redes' },
  conteudo: { id: 'conteudo', rotulo: 'Conteúdo' },
};

// Negócio que vive de agenda ou pedido: o sistema resolve dor real.
const AGENDA_OU_PEDIDO = /barbear|sal[aã]o|beleza|est[eé]tica|cl[ií]nica|odont|dentist|ortodon|fisio|psic|academia|crossfit|personal|pet|veterin|restaurante|pizz|hamburg|lanchonete|delivery|a[cç]a[ií]|padaria|limpeza|faxina|cleaning|oficina|mec[aâ]nic|lava|auto|nail|manicure|spa|massag|barber|salon|clinic|dental|gym|repair|handyman|landscap|painter|pintor/i;
// Ticket alto: mais chance de pagar por site, sistema e gestão.
const TICKET_ALTO = /cl[ií]nica|odont|dentist|ortodon|est[eé]tica|advoc|lawyer|imobili|realtor|arquitet|constru|contrac|engenh|m[eé]dic|clinic|dental|roofing|remodel|hvac|plumb|eletric/i;
// "Site" que na verdade é rede social ou agregador de links.
const NAO_E_SITE = /instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp\.com|linkbio|bio\.link|beacons\.ai|tiktok\.com/i;

function numero(v) {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function canaisDoLead(l = {}) {
  const site = String(l.website || l.site || '');
  return {
    whatsapp: String(l.whatsapp || l.phone || l.tel || ''),
    instagram: String(l.instagram || l.ig || ''),
    email: String(l.email || l.mail || '').split(/[\s,;]+/).find((e) => e.includes('@')) || '',
    site: site && !NAO_E_SITE.test(site) ? site : '',
  };
}

function temperaturaDa(nota) {
  if (nota >= 70) return { id: 'quente', rotulo: 'Quente', funil: 'Abordar agora' };
  if (nota >= 45) return { id: 'morno', rotulo: 'Morno', funil: 'Nutrir' };
  return { id: 'frio', rotulo: 'Frio', funil: 'Baixa prioridade' };
}

/**
 * @param {object} lead registro da Base de Leads
 * @param {object} [analise] resultado salvo pelo Lead Scoring, se houver
 */
export function qualificaLead(lead = {}, analise = null) {
  const c = canaisDoLead(lead);
  const nota = numero(lead.rating ?? lead.rn);
  const avaliacoes = numero(lead.reviews ?? lead.reviewCount ?? lead.totalReviews ?? lead.rc);
  const categoria = String(lead.category || lead.cat || '');
  const temFoto = Boolean(lead.photos?.thumbnail || lead.photos?.main || lead.thumbnail);
  // Foto conta ponto, mas não decide o serviço: a extração nem sempre traz a foto.
  const googleFraco = nota < 4.5 || avaliacoes < 50;

  const servicos = [];
  if (!c.site) servicos.push(SERVICOS.site);
  if (googleFraco) servicos.push(SERVICOS.google);
  if (!c.instagram) servicos.push(SERVICOS.redes);
  else servicos.push(SERVICOS.conteudo);
  if (AGENDA_OU_PEDIDO.test(categoria)) servicos.push(SERVICOS.sistema);

  // Contato: dá para falar com ele? (até 30)
  let pontos = (c.whatsapp ? 15 : 0) + (c.email ? 8 : 0) + (c.instagram ? 7 : 0);
  // Oportunidade: o que falta e a Grow+ entrega (até 38)
  pontos += (!c.site ? 18 : 0) + (googleFraco ? 12 : 0) + (!c.instagram ? 8 : 0);
  // Negócio de verdade, com clientela e ticket (até 32)
  pontos += (nota >= 4 ? 8 : 0) + (avaliacoes >= 30 ? 8 : 0) + (TICKET_ALTO.test(categoria) ? 8 : 0) + (temFoto ? 4 : 0);
  // Sem nenhum canal não há abordagem possível, por melhor que seja o resto.
  if (!c.whatsapp && !c.email && !c.instagram) pontos = Math.min(pontos, 30);

  const daAnalise = Number.isFinite(Number(analise?.score)) ? Number(analise.score) : null;
  const final = Math.max(0, Math.min(100, Math.round(daAnalise ?? pontos)));

  return {
    nota: final,
    estrelas: Math.round(final / 10) / 2,
    origem: daAnalise != null ? 'Lead Scoring' : 'dados da extração',
    temperatura: temperaturaDa(final),
    servicos,
    canais: c,
    google: { nota, avaliacoes },
  };
}

/** Contagem por temperatura, para o cabeçalho da lista. */
export function resumoTemperaturas(qualificacoes = []) {
  const r = { quente: 0, morno: 0, frio: 0 };
  qualificacoes.forEach((q) => { r[q.temperatura.id] += 1; });
  return r;
}

export function lerAnalisesSalvas() {
  try {
    return JSON.parse(localStorage.getItem('sigma_analysis') || '{}') || {};
  } catch {
    return {};
  }
}
