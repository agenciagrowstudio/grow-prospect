/**
 * Chama a análise com IA no app do computador e aplica o resultado nos leads:
 * sinal brasileiro (com o site lido), público, serviço sugerido e o detalhe
 * real para a mensagem.
 */

const CAMPOS = ['id', 'name', 'category', 'city', 'state', 'pais', 'rating', 'reviewCount', 'reviews', 'website', 'instagram', 'whatsapp', 'phone'];

/** Só o que a análise usa: manda menos dados para o processo principal. */
const enxuto = (l) => Object.fromEntries(CAMPOS.filter((c) => l?.[c] !== undefined).map((c) => [c, l[c]]));

export const iaDisponivel = () => typeof window !== 'undefined' && Boolean(window.electronAPI?.analisarLeadsIA);

/**
 * @param {object[]} leads
 * @param {(p: {etapa: 'sites'|'ia', atual: number, total: number}) => void} onProgresso
 * @returns {Promise<object[]>} resultados por lead
 */
export async function analisaComIA(leads, onProgresso) {
  if (!iaDisponivel()) throw new Error('A análise com IA roda no app do computador.');
  const off = window.electronAPI.onIAProgresso?.(onProgresso);
  try {
    const res = await window.electronAPI.analisarLeadsIA(leads.map(enxuto));
    if (!res?.success) throw new Error(res?.error || 'A análise não terminou.');
    return res.resultados || [];
  } finally {
    if (typeof off === 'function') off();
  }
}

/** Aplica os resultados na lista de leads (sem mexer em quem não foi analisado). */
export function aplicaResultadosIA(leads, resultados) {
  const porId = new Map((resultados || []).map((r) => [String(r.id), r]));
  return leads.map((l) => {
    const r = porId.get(String(l.id));
    if (!r) return l;
    return { ...l, sinalBr: r.sinalBr, ...(r.ia ? { ia: r.ia } : {}) };
  });
}

/** "Lendo sites 12/120" ou "IA 24/120". */
export function textoProgressoIA(p) {
  if (!p) return 'Analisando…';
  return p.etapa === 'sites' ? `Lendo sites ${p.atual}/${p.total}` : `IA analisando ${p.atual}/${p.total}`;
}

/** Coloca o detalhe da IA como um parágrafo antes da pergunta final da mensagem. */
export function insereGancho(texto, gancho) {
  const g = String(gancho || '').trim();
  if (!g) return texto;
  const partes = String(texto || '').split(/\n{2,}/);
  if (partes.some((p) => p.trim() === g)) return texto;
  if (partes.length < 2) return `${texto}\n\n${g}`;
  partes.splice(partes.length - 1, 0, g);
  return partes.join('\n\n');
}
