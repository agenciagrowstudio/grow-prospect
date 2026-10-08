/**
 * Limpeza única dos dados de demonstração que versões antigas gravavam.
 *
 * Com a base vazia, a Base de Leads gravava 4 empresas inventadas (Odonto
 * Lume, Café Aurora...), grupos e um histórico de mensagens falso; a Lead
 * Scoring gravava dois grupos e análises com notas atribuídas a uma IA que
 * nunca rodou. Isso se misturava aos dados reais e aparecia nos cards.
 *
 * Só sai o que bate exatamente com os exemplos (mesmo id E mesmo nome, ou a
 * nota inventada com o modelo inventado). Lead real nunca é tocado. Roda uma
 * vez por computador.
 */

const MARCA = 'sigma_limpeza_demo_v1';
const LEADS_DEMO = { 'lead-1': 'Odonto Lume', 'lead-2': 'Café Aurora', 'lead-3': 'Almeida Advocacia', 'lead-4': 'Studio Prisma' };
const GRUPOS_DEMO = {
  g1: ['Odontologia · Zona Sul', 'Com WhatsApp'],
  g2: ['Academias e Fitness'],
  'g-demo': ['Teste Scoring — RJ'],
};
const NOTAS_DEMO = [82, 45, 92];

function ler(chave, padrao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave) || 'null');
    return v ?? padrao;
  } catch {
    return padrao;
  }
}

function grava(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem espaço: tenta de novo na próxima */ }
}

export function limpaDadosDemo() {
  try {
    if (localStorage.getItem(MARCA)) return null;
  } catch {
    return null;
  }
  const removidos = { leads: 0, grupos: 0, historico: 0, analises: 0 };
  const idsRemovidos = new Set();

  const leads = ler('sigma_leads', []);
  if (Array.isArray(leads)) {
    const limpos = leads.filter((l) => {
      const demo = LEADS_DEMO[l?.id] === l?.name;
      if (demo) idsRemovidos.add(l.id);
      return !demo;
    });
    removidos.leads = leads.length - limpos.length;
    if (removidos.leads) grava('sigma_leads', limpos);
  }

  const grupos = ler('sigma_groups', []);
  if (Array.isArray(grupos)) {
    const limpos = grupos.filter((g) => !(GRUPOS_DEMO[g?.id] || []).includes(g?.name));
    removidos.grupos = grupos.length - limpos.length;
    if (removidos.grupos) grava('sigma_groups', limpos);
  }

  const hist = ler('sigma_history', {});
  if (hist && typeof hist === 'object') {
    for (const id of Object.keys(hist)) {
      const texto = JSON.stringify(hist[id] || '');
      if (/Odonto Lume|Café Aurora|90000-0001/.test(texto)) {
        delete hist[id];
        removidos.historico++;
      }
    }
    if (removidos.historico) grava('sigma_history', hist);
  }

  const analises = ler('sigma_analysis', {});
  if (analises && typeof analises === 'object') {
    for (const [id, a] of Object.entries(analises)) {
      const inventada = a?.provider === 'openrouter'
        && a?.model === 'anthropic/claude-3.5-sonnet'
        && NOTAS_DEMO.includes(Number(a?.score));
      if (inventada || idsRemovidos.has(id)) {
        delete analises[id];
        removidos.analises++;
      }
    }
    if (removidos.analises) grava('sigma_analysis', analises);
  }

  try { localStorage.setItem(MARCA, new Date().toISOString()); } catch { /* ignora */ }
  return removidos;
}
