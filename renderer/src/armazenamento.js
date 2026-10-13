/**
 * Quanto os dados ocupam. O app guarda tudo no armazenamento do navegador
 * interno, que comporta uns 5 milhões de caracteres por app: esse é o limite
 * que importa. Na nuvem o banco compacta o texto (cerca de um quarto).
 */

export const LIMITE_LOCAL = 5 * 1024 * 1024; // caracteres
export const COMPACTACAO_NUVEM = 0.25;

const GRUPOS = [
  { id: 'leads', nome: 'Leads', teste: (k) => k === 'sigma_leads' },
  { id: 'fila', nome: 'Fila do dia e histórico', teste: (k) => /^sigma_(abordagem|history|analysis)/.test(k) },
  { id: 'mapas', nome: 'Contornos das cidades (cache)', teste: (k) => k === 'prospector_poligonos' },
  { id: 'nuvem', nome: 'Sincronização com a nuvem', teste: (k) => k.startsWith('prospector_nuvem_base:') },
];

/** "0,6 MB", "280 KB", "900 B". */
export function formataTamanho(caracteres) {
  const b = Math.max(0, Number(caracteres) || 0);
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

/**
 * @param {Storage} armazem localStorage (ou algo com length/key/getItem)
 * @returns {{total:number, porGrupo:{id,nome,tamanho}[], pct:number}}
 */
export function usoLocal(armazem) {
  const porGrupo = new Map([...GRUPOS.map((g) => [g.id, 0]), ['outros', 0]]);
  let total = 0;
  try {
    for (let i = 0; i < armazem.length; i += 1) {
      const k = armazem.key(i);
      const tam = k.length + String(armazem.getItem(k) || '').length;
      total += tam;
      const g = GRUPOS.find((x) => x.teste(k));
      porGrupo.set(g ? g.id : 'outros', porGrupo.get(g ? g.id : 'outros') + tam);
    }
  } catch { /* sem acesso ao armazenamento */ }
  return {
    total,
    pct: Math.min(100, (total / LIMITE_LOCAL) * 100),
    porGrupo: [...GRUPOS, { id: 'outros', nome: 'Outros ajustes' }]
      .map((g) => ({ id: g.id, nome: g.nome, tamanho: porGrupo.get(g.id) }))
      .filter((g) => g.tamanho > 0),
  };
}

/**
 * Quanto cada extração ocupa e quantos leads ainda cabem neste computador.
 * @returns {{porExtracao:{id,rotulo,leads,tamanho}[], mediaPorLead:number, cabemMais:number}}
 */
export function usoPorExtracao(leads = [], buscas = [], totalLocal = 0, copias = 1) {
  const porBusca = new Map();
  let soma = 0;
  leads.forEach((l) => {
    const tam = JSON.stringify(l).length;
    soma += tam;
    const k = String(l?.searchId || '');
    const atual = porBusca.get(k) || { leads: 0, tamanho: 0 };
    atual.leads += 1;
    atual.tamanho += tam;
    porBusca.set(k, atual);
  });
  const mediaPorLead = leads.length ? Math.round(soma / leads.length) : 2400;
  const rotuloDe = (id) => {
    const b = buscas.find((x) => String(x.id) === id);
    if (!b) return id ? 'Extração removida' : 'Importados à mão';
    const p = String(b.label || '').split(' · ');
    return [b.nicho || p[0] || b.query, b.area?.rotulo || p[1]].filter(Boolean).join(' · ');
  };
  const porExtracao = [...porBusca.entries()]
    .map(([id, v]) => ({ id, rotulo: rotuloDe(id), ...v }))
    .sort((a, b) => b.tamanho - a.tamanho);
  // O cache de contornos pode ser apagado; leads e histórico, não. Conta-se
  // folga de 10% para o resto crescer junto.
  const livre = Math.max(0, LIMITE_LOCAL * 0.9 - totalLocal);
  // Com a nuvem conectada, a sincronização guarda uma cópia de referência de
  // cada lead neste computador: cada lead novo ocupa o dobro.
  return { porExtracao, mediaPorLead, cabemMais: Math.floor(livre / (mediaPorLead * Math.max(1, copias))) };
}
