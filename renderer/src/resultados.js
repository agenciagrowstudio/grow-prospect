/**
 * Resultados da prospecção: junta o que foi enviado e respondido em cada canal.
 *
 * - Fila do dia (WhatsApp à mão): sigma_abordagem_log, um registro por lead.
 * - Campanhas de WhatsApp: cada lead da campanha tem sentAt e repliedAt.
 * - Campanhas de e-mail: só os totais da campanha (enviados, respondidos).
 *
 * Público e oferta só existem na Fila do dia, então esses recortes contam só ela.
 */

const DIA_MS = 86400000;

// `bandeira` é a do chip de filtro: no recorte dos EUA, a do Brasil marca o
// brasileiro e a dos EUA o americano. "A verificar" não tem bandeira.
export const PUBLICOS_RESULTADO = [
  { id: 'br', nome: 'Brasileiros no Brasil', curto: 'No Brasil', pais: 'BR', bandeira: 'BR' },
  { id: 'brus', nome: 'Brasileiros nos EUA', curto: 'Brasileiros', pais: 'US', bandeira: 'BR' },
  { id: 'us', nome: 'Americanos', curto: 'Americanos', pais: 'US', bandeira: 'US' },
  { id: 'verificar', nome: 'A verificar', curto: 'A verificar', pais: 'US', bandeira: null },
];

export const OFERTAS_RESULTADO = [
  { id: 'site', nome: 'Site' },
  { id: 'google', nome: 'Google Negócio' },
  { id: 'redes', nome: 'Gestão de redes' },
  { id: 'conteudo', nome: 'Conteúdo' },
  { id: 'sistema', nome: 'Sistema' },
  { id: 'geral', nome: 'Abordagem geral' },
];

/**
 * Americano pelas avaliações: o robô leu pelo menos 3 avaliações da ficha e
 * nenhuma tem cliente de sobrenome brasileiro, texto original em português ou
 * resposta do dono em português, e nada mais no lead aponta brasileiro.
 */
export function americanoPelasAvaliacoes(lead) {
  const a = lead?.avaliacoesLidas;
  if (!a || Number(a.lidas) < 3) return false;
  const nivel = lead.sinalBr?.nivel;
  return !a.sobrenomesBr && !a.emPortugues && !a.respostaDonoPt && !a.citamBrasil && nivel !== 'alto' && nivel !== 'medio';
}

/**
 * Quem é quem nos EUA. A marcação feita à mão (na Fila do dia) vale mais que
 * tudo. Sem ela, sinal brasileiro alto ou médio conta como brasileiro, e quem
 * teve as avaliações lidas sem nenhum sinal brasileiro conta como americano.
 * O resto fica "a verificar": a ficha não tinha o que ler, e isso não faz de
 * ninguém americano. A IA não decide público: ela só escreve os textos.
 */
export function publicoDoLead(lead) {
  if (!lead) return null;
  const pais = String(lead.pais || 'BR').toUpperCase();
  if (pais === 'BR') return 'br';
  if (lead.publicoConfirmado === 'brus' || lead.publicoConfirmado === 'us') return lead.publicoConfirmado;
  const nivel = lead.sinalBr?.nivel;
  if (nivel === 'alto' || nivel === 'medio') return 'brus';
  return americanoPelasAvaliacoes(lead) ? 'us' : 'verificar';
}

function chaveDia(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const taxa = (respostas, enviadas) => (enviadas ? Math.round((respostas / enviadas) * 100) : 0);
const linha = (enviadas, respostas) => ({ enviadas, respostas, taxa: taxa(respostas, enviadas) });

/**
 * @param {object} p
 * @param {object} p.log sigma_abordagem_log
 * @param {object[]} p.leads Base de Leads
 * @param {object[]} p.campanhasWa campaignAPI.getAll().campaigns
 * @param {object[]} p.campanhasEmail emailAPI.list().campanhas
 * @param {number} [p.dias] tamanho da série diária
 * @param {number} [p.agora]
 */
export function resumoResultados({
  log = {}, leads = [], campanhasWa = [], campanhasEmail = [], dias = 30, agora = Date.now(),
} = {}) {
  const porId = new Map(leads.map((l) => [String(l.id), l]));

  // Fila do dia: só o que foi enviado conta como abordagem.
  const fila = Object.entries(log)
    .filter(([, e]) => e && (e.status === 'enviada' || e.status === 'respondeu'))
    .map(([id, e]) => ({
      id,
      nome: e.nome || porId.get(id)?.name || 'Lead',
      ts: Number(e.ts) || 0,
      respondeu: e.status === 'respondeu',
      publico: e.publico || publicoDoLead(porId.get(id)) || 'br',
      oferta: e.angulo || 'geral',
      canal: 'fila',
    }));

  // Campanhas de WhatsApp: lead a lead, para ter a data de cada envio.
  const wa = [];
  campanhasWa.forEach((c) => (c?.leads || []).forEach((l) => {
    if (!(l.sentAt || l.messageId || ['sent', 'delivered', 'read', 'replied'].includes(l.status))) return;
    wa.push({
      id: `${c.id}:${l.id || l.phone}`,
      nome: l.name || l.nome || l.phone || 'Lead',
      ts: Number(l.sentAt) || 0,
      respondeu: Boolean(l.repliedAt || l.status === 'replied' || l.replyCount > 0),
      respondeuEm: Number(l.repliedAt) || 0,
      canal: 'wa',
    });
  }));

  const emailEnv = campanhasEmail.reduce((n, c) => n + (Number(c?.enviados) || 0), 0);
  const emailResp = campanhasEmail.reduce((n, c) => n + (Number(c?.respondidos) || 0), 0);

  const filaResp = fila.filter((f) => f.respondeu).length;
  const waResp = wa.filter((w) => w.respondeu).length;
  const canais = [
    { id: 'fila', nome: 'WhatsApp, Fila do dia', ...linha(fila.length, filaResp) },
    { id: 'wa', nome: 'WhatsApp, campanhas', ...linha(wa.length, waResp) },
    { id: 'email', nome: 'E-mail', ...linha(emailEnv, emailResp) },
  ];
  const enviadas = fila.length + wa.length + emailEnv;
  const respostas = filaResp + waResp + emailResp;

  // Série diária (Fila e campanhas de WhatsApp; o e-mail não guarda a data aqui).
  const hojeInicio = new Date(agora);
  hojeInicio.setHours(0, 0, 0, 0);
  const serie = [];
  for (let i = dias - 1; i >= 0; i--) {
    const ts = hojeInicio.getTime() - i * DIA_MS;
    serie.push({ dia: chaveDia(ts), ts, enviadas: 0, respostas: 0 });
  }
  const indice = new Map(serie.map((s, i) => [s.dia, i]));
  [...fila, ...wa].forEach((a) => {
    if (!a.ts) return;
    const i = indice.get(chaveDia(a.ts));
    if (i === undefined) return;
    serie[i].enviadas += 1;
    if (a.respondeu) serie[i].respostas += 1;
  });

  const recorte = (lista, campo) => lista.map((item) => {
    const doGrupo = fila.filter((f) => f[campo] === item.id);
    return { ...item, ...linha(doGrupo.length, doGrupo.filter((f) => f.respondeu).length) };
  }).filter((g) => g.enviadas > 0);

  const comWhatsApp = leads.filter((l) => String(l.phone || l.telefone || '').replace(/\D/g, '').length >= 8).length;
  const hoje = chaveDia(agora);

  return {
    enviadas,
    respostas,
    taxa: taxa(respostas, enviadas),
    enviadasHoje: fila.filter((f) => chaveDia(f.ts) === hoje).length + wa.filter((w) => w.ts && chaveDia(w.ts) === hoje).length,
    canais,
    porPublico: recorte(PUBLICOS_RESULTADO, 'publico'),
    porOferta: recorte(OFERTAS_RESULTADO, 'oferta'),
    serie,
    funil: [
      { id: 'base', nome: 'Leads na base', valor: leads.length },
      { id: 'whats', nome: 'Com telefone', valor: comWhatsApp },
      { id: 'abordados', nome: 'Abordados', valor: enviadas },
      { id: 'responderam', nome: 'Responderam', valor: respostas },
    ],
    ultimasRespostas: [
      ...fila.filter((f) => f.respondeu),
      ...wa.filter((w) => w.respondeu).map((w) => ({ ...w, ts: w.respondeuEm || w.ts })),
    ].sort((a, b) => b.ts - a.ts).slice(0, 6),
  };
}
