/**
 * Funil comercial (Kanban). Sai do mesmo registro da Fila do dia
 * (sigma_abordagem_log), então se atualiza sozinho: enviou a primeira
 * mensagem, o lead entra em "Abordados"; recebeu follow-up, vai para "Em
 * follow-up"; respondeu ou ficou sem interesse, muda de coluna. As etapas de
 * depois da resposta (reunião, proposta, fechado) são decisão da pessoa e
 * ficam em sigma_kanban_etapas. As duas chaves sincronizam pela nuvem, então
 * o Kanban é o mesmo no computador e na web.
 */

export const CHAVE_ETAPAS = 'sigma_kanban_etapas';

export const CANAIS = [
  { id: 'whatsapp', nome: 'WhatsApp' },
  { id: 'instagram', nome: 'Instagram' },
  { id: 'email', nome: 'E-mail' },
  { id: 'ligacao', nome: 'Ligação' },
  { id: 'pessoalmente', nome: 'Pessoalmente' },
];
const IDS_CANAL = new Set(CANAIS.map((c) => c.id));
export const nomeDoCanal = (id) => CANAIS.find((c) => c.id === id)?.nome || '';

export const ETAPAS = [
  { id: 'abordados', nome: 'Abordados', dica: 'Primeira mensagem enviada', auto: true },
  { id: 'followup', nome: 'Em follow-up', dica: 'Recebeu follow-up e ainda não respondeu', auto: true, soAutomatica: true },
  { id: 'responderam', nome: 'Responderam', dica: 'Conversa em andamento', auto: true },
  { id: 'reuniao', nome: 'Reunião', dica: 'Reunião marcada ou feita' },
  { id: 'proposta', nome: 'Proposta', dica: 'Proposta enviada' },
  { id: 'fechados', nome: 'Fechados', dica: 'Virou cliente' },
  { id: 'perdidos', nome: 'Perdidos', dica: 'Sem interesse', auto: true },
];
const MANUAIS = new Set(['reuniao', 'proposta', 'fechados']);

/**
 * Canal da abordagem. Marcação antiga da Fila não tinha canal, mas a Fila só
 * envia por WhatsApp; o que foi marcado na Base sem canal fica sem.
 */
export function canalDa(entrada) {
  if (!entrada) return '';
  if (IDS_CANAL.has(entrada.canal)) return entrada.canal;
  return entrada.origem === 'base' ? '' : 'whatsapp';
}

/** Coluna do lead, ou null se ele não está no funil (não abordado, sem WhatsApp, pulado). */
export function etapaDoLead(entrada, manual) {
  const status = entrada?.status;
  if (status === 'sem_interesse') return 'perdidos';
  if (status !== 'enviada' && status !== 'respondeu') return null;
  if (manual && MANUAIS.has(manual.etapa)) return manual.etapa;
  if (status === 'respondeu') return 'responderam';
  return (entrada.followups || []).length ? 'followup' : 'abordados';
}

const ultimaAtividade = (e, m) => Math.max(
  Number(e?.alteradoEm) || 0,
  Number(e?.ts) || 0,
  Number(m?.ts) || 0,
  ...((e?.followups || []).map((f) => Number(f?.ts) || 0)),
);

/**
 * @param {object[]} leads base de leads
 * @param {object} log sigma_abordagem_log
 * @param {object} etapas sigma_kanban_etapas
 * @returns {Record<string, {lead: object, entrada: object, etapa: string, canal: string, atividade: number}[]>}
 */
export function montaFunil(leads = [], log = {}, etapas = {}) {
  const porId = new Map(leads.map((l) => [String(l?.id), l]));
  const colunas = Object.fromEntries(ETAPAS.map((e) => [e.id, []]));
  Object.entries(log || {}).forEach(([id, entrada]) => {
    const manual = etapas?.[id];
    const etapa = etapaDoLead(entrada, manual);
    if (!etapa) return;
    // Lead apagado da base continua no funil com o nome guardado na marcação.
    const lead = porId.get(id) || { id, name: entrada.nome || 'Lead' };
    colunas[etapa].push({ lead, entrada, etapa, canal: canalDa(entrada), atividade: ultimaAtividade(entrada, manual) });
  });
  Object.values(colunas).forEach((lista) => lista.sort((a, b) => b.atividade - a.atividade));
  return colunas;
}

/**
 * Move o card. Colunas automáticas mudam o estado do lead (o mesmo da Fila);
 * as de depois da resposta guardam a etapa e marcam o lead como "respondeu".
 * "Em follow-up" não recebe card: ela depende de o follow-up ter sido enviado.
 * @returns {{log: object, etapas: object}}
 */
export function moveNoFunil({ log = {}, etapas = {}, id, para, agora = Date.now() }) {
  const chave = String(id);
  const entrada = log[chave];
  if (!entrada || para === 'followup' || !ETAPAS.some((e) => e.id === para)) return { log, etapas };
  const novoLog = { ...log };
  const novasEtapas = { ...etapas };
  const status = { abordados: 'enviada', responderam: 'respondeu', perdidos: 'sem_interesse' }[para] || 'respondeu';
  novoLog[chave] = { ...entrada, status, alteradoEm: agora };
  if (MANUAIS.has(para)) novasEtapas[chave] = { etapa: para, ts: agora };
  else delete novasEtapas[chave];
  return { log: novoLog, etapas: novasEtapas };
}
