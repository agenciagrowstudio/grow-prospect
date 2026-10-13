/**
 * Extração automática: todo dia, no horário escolhido, o app percorre as
 * cidades e os serviços de brasileiros nos EUA, até juntar a meta de leads
 * novos do dia (200 por padrão). Cada cidade extraída fica azul no mapa e
 * entra na Fila do dia como em qualquer extração.
 *
 * O roteiro é inteligente: começa pelas cidades com mais brasileiros e pelos
 * serviços que eles mais prestam, sorteando entre elas para não ficar
 * previsível, e aprende com o que já foi extraído (quantos leads vieram
 * brasileiros, quantos responderam). Tudo da lista é extraído, uma hora ou outra.
 *
 * Aqui fica só a regra, sem tela e sem Electron: o que combinar, o que já foi
 * feito, quando rodar e o laço do dia. O gancho `useExtracaoAutomatica` liga
 * isso ao app.
 */
import { ATALHOS_EUA, CIDADES_ATALHO, localDaCidade } from './atalhosExtracao.js';
import { jaExtraida, chaveNicho, chaveLugar } from './cobertura.js';
import { publicoDoLead } from './resultados.js';

export const CHAVE_AUTO = 'prospector_auto';
export const HORA_PADRAO = '07:00';
export const LIMITE_PADRAO = 200;
export const LIMITE_MIN = 20;
export const LIMITE_MAX = 1000;
// Rede de segurança: mesmo sem bater a meta, um dia não passa disso.
export const MAX_BUSCAS_POR_DIA = 40;
export const FALHAS_SEGUIDAS = 3;
// Pausa entre uma busca e outra: o Google estranha ritmo de robô.
export const PAUSA_MIN_MS = 20000;
export const PAUSA_MAX_MS = 45000;
const HISTORICO_MAX = 30;

const chaveCidade = ([nome, uf]) => `${nome}|${uf}`;
export const cidadesPadrao = () => CIDADES_ATALHO.US.map(chaveCidade);

export function configPadrao() {
  return {
    ativo: false,
    hora: HORA_PADRAO,
    limite: LIMITE_PADRAO,
    nichos: [...ATALHOS_EUA],
    cidades: cidadesPadrao(),
    // Buscas que o Google respondeu "nenhum negócio": não vale tentar de novo.
    puladas: [],
    ultimoDia: '',
    historico: [],
  };
}

export const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ''));

/** Aceita o que estiver guardado e devolve uma configuração sempre válida. */
export function normalizaConfig(raw) {
  const base = configPadrao();
  const c = raw && typeof raw === 'object' ? raw : {};
  const limite = Math.round(Number(c.limite));
  const conhecidas = new Set(cidadesPadrao());
  const nichos = Array.isArray(c.nichos) ? c.nichos.filter((n) => ATALHOS_EUA.includes(n)) : base.nichos;
  const cidades = Array.isArray(c.cidades) ? c.cidades.filter((x) => conhecidas.has(x)) : base.cidades;
  return {
    ativo: Boolean(c.ativo),
    hora: horaValida(c.hora) ? c.hora : base.hora,
    limite: Number.isFinite(limite) ? Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, limite)) : base.limite,
    // Ordem fixa da lista de atalhos, não a ordem em que foi clicado.
    nichos: ATALHOS_EUA.filter((n) => nichos.includes(n)),
    cidades: cidadesPadrao().filter((x) => cidades.includes(x)),
    puladas: Array.isArray(c.puladas) ? c.puladas.filter((x) => typeof x === 'string') : [],
    ultimoDia: typeof c.ultimoDia === 'string' ? c.ultimoDia : '',
    historico: Array.isArray(c.historico) ? c.historico.slice(-HISTORICO_MAX) : [],
  };
}

export function leConfig(storage = globalThis.localStorage) {
  try { return normalizaConfig(JSON.parse(storage.getItem(CHAVE_AUTO) || 'null')); } catch { return configPadrao(); }
}

export function guardaConfig(cfg, storage = globalThis.localStorage) {
  try { storage.setItem(CHAVE_AUTO, JSON.stringify(cfg)); } catch { /* sem armazenamento: vale só nesta sessão */ }
}

/** Todas as combinações serviço x cidade da configuração. */
export function combinacoes(cfg) {
  const cidades = CIDADES_ATALHO.US.filter((c) => cfg.cidades.includes(chaveCidade(c)));
  const lista = [];
  cfg.nichos.forEach((nicho) => {
    cidades.forEach(([cidade, uf, lat, lng]) => {
      const local = localDaCidade(cidade, uf, 'US', lat, lng);
      lista.push({ nicho, cidade, uf, local, chave: `${chaveNicho(nicho)}|${chaveLugar(local)}` });
    });
  });
  return lista;
}

/** O que ainda falta extrair: nem feito no mapa, nem marcado como sem resultado. */
export function pendentes(cfg, areas = []) {
  const puladas = new Set(cfg.puladas || []);
  return combinacoes(cfg).filter((c) => !puladas.has(c.chave) && !jaExtraida(areas, c.nicho, c.local));
}

export function progresso(cfg, areas = []) {
  const todas = combinacoes(cfg);
  const puladas = new Set(cfg.puladas || []);
  const feitas = todas.filter((c) => jaExtraida(areas, c.nicho, c.local)).length;
  const semResultado = todas.filter((c) => puladas.has(c.chave) && !jaExtraida(areas, c.nicho, c.local)).length;
  return { total: todas.length, feitas, semResultado, pendentes: todas.length - feitas - semResultado };
}

// Palpite inicial de 1 a 5: tamanho da comunidade brasileira que presta
// serviço na cidade, e o quanto brasileiros trabalham em cada serviço. O app
// corrige isso sozinho com o que as extrações mostram (veja `desempenhoPorGrupo`).
export const PESO_CIDADE = {
  'Framingham|MA': 5, 'Newark|NJ': 5, 'Deerfield Beach|FL': 5,
  'Marlborough|MA': 4, 'Everett|MA': 4, 'Somerville|MA': 4, 'Pompano Beach|FL': 4, 'Orlando|FL': 4, 'Danbury|CT': 4,
  'Milford|MA': 3, 'Hudson|MA': 3, 'Boca Raton|FL': 3, 'Kissimmee|FL': 3, 'Long Branch|NJ': 3, 'Marietta|GA': 3,
};
export const PESO_NICHO = {
  'House cleaning': 5, 'Painting contractor': 5,
  'Landscaping': 4, 'Handyman': 4, 'Remodeling': 4, 'Flooring': 4, 'Restaurante brasileiro': 4,
  'Carpet cleaning': 3, 'Pressure washing': 3, 'Moving company': 3, 'Roofing': 3, 'Nail salon': 3, 'Hair salon': 3, 'Padaria brasileira': 3,
  'Auto repair': 2,
};
const PESO_SEM_PALPITE = 2;
// Quantos leads de "prova" valem tanto quanto o palpite; abaixo disso manda o palpite.
const PROVA_MINIMA = 30;
const TAXA_BR_ESPERADA = 0.3;
const TAXA_RESPOSTA_ESPERADA = 0.05;

const conta = () => ({ leads: 0, br: 0, enviadas: 0, respostas: 0 });
const chaveDaCidade = (cidade, uf) => `${cidade}|${uf}`;

/**
 * O que as extrações já feitas ensinam: de cada cidade e de cada serviço, quantos
 * leads vieram, quantos são brasileiros e quantos responderam à abordagem.
 * @param {object[]} areas areasExtraidas(buscas, leads)
 * @param {object[]} leads base de leads (com searchId)
 * @param {object} log sigma_abordagem_log
 */
export function desempenhoPorGrupo(areas = [], leads = [], log = {}) {
  const porBusca = new Map();
  areas.forEach((a) => porBusca.set(String(a.id), a));
  const cidades = {};
  const nichos = {};
  leads.forEach((l) => {
    const a = porBusca.get(String(l?.searchId));
    if (!a) return;
    const nomeCidade = a.local?.cidade || a.local?.nome;
    const kc = nomeCidade ? chaveDaCidade(nomeCidade, a.local?.uf || '') : '';
    const kn = chaveNicho(a.nicho);
    const status = log?.[String(l.id)]?.status;
    const br = publicoDoLead(l) === 'brus';
    [[cidades, kc], [nichos, kn]].forEach(([grupo, k]) => {
      if (!k) return;
      const c = grupo[k] || (grupo[k] = conta());
      c.leads += 1;
      if (br) c.br += 1;
      if (status === 'enviada' || status === 'respondeu') c.enviadas += 1;
      if (status === 'respondeu') c.respostas += 1;
    });
  });
  return { cidades, nichos };
}

/** Multiplicador do palpite: 1 sem dados, sobe para quem rende mais brasileiros e respostas, desce para quem rende menos. */
export function fatorAprendido(c) {
  if (!c || !c.leads) return 1;
  const taxaBr = (c.br + PROVA_MINIMA * TAXA_BR_ESPERADA) / (c.leads + PROVA_MINIMA);
  let f = (0.5 + 1.5 * taxaBr) / (0.5 + 1.5 * TAXA_BR_ESPERADA);
  if (c.enviadas >= 10) {
    const taxaResp = (c.respostas + 10 * TAXA_RESPOSTA_ESPERADA) / (c.enviadas + 10);
    f *= 0.8 + 4 * taxaResp;
  }
  return Math.min(2.5, Math.max(0.4, f));
}

/** Prioridade de uma busca: palpite da cidade x palpite do serviço x o que já se aprendeu. */
export function pesoDaBusca(c, desempenho = null) {
  const pc = PESO_CIDADE[chaveDaCidade(c.cidade, c.uf)] || PESO_SEM_PALPITE;
  const pn = PESO_NICHO[c.nicho] || PESO_SEM_PALPITE;
  const fc = fatorAprendido(desempenho?.cidades?.[chaveDaCidade(c.cidade, c.uf)]);
  const fn = fatorAprendido(desempenho?.nichos?.[chaveNicho(c.nicho)]);
  return pc * pn * fc * fn;
}

/** As próximas do roteiro, da mais prioritária para a menos (só para mostrar na tela). */
export function roteiro(cfg, areas = [], desempenho = null, quantas = 8) {
  return pendentes(cfg, areas)
    .map((c) => ({ ...c, peso: pesoDaBusca(c, desempenho) }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, quantas);
}

/**
 * Sorteio ponderado pela prioridade (Efraimidis-Spirakis): as de maior peso
 * saem primeiro na maioria das vezes, mas não sempre, e nenhuma fica de fora.
 */
export function escolheProxima(cfg, areas, ignoradas = new Set(), rng = Math.random, desempenho = null) {
  const lista = pendentes(cfg, areas).filter((c) => !ignoradas.has(c.chave));
  if (!lista.length) return null;
  let melhor = null;
  let melhorChave = -1;
  lista.forEach((c) => {
    const chave = Math.pow(Math.max(rng(), 1e-9), 1 / pesoDaBusca(c, desempenho));
    if (chave > melhorChave) { melhorChave = chave; melhor = c; }
  });
  return melhor;
}

const dois = (n) => String(n).padStart(2, '0');
export const diaLocal = (d = new Date()) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const minutosDaHora = (h) => { const [hh, mm] = String(h).split(':').map(Number); return hh * 60 + mm; };

/** Já passou do horário de hoje e ainda não rodou hoje? Vale também para quem abre o app depois das 7h. */
export function devidoAgora(cfg, agora = new Date()) {
  if (!cfg.ativo || cfg.ultimoDia === diaLocal(agora)) return false;
  return agora.getHours() * 60 + agora.getMinutes() >= minutosDaHora(cfg.hora);
}

/** Quando roda a próxima vez. `pendente` quer dizer que hoje já passou da hora e ainda não rodou. */
export function proximaExecucao(cfg, agora = new Date()) {
  const [hh, mm] = cfg.hora.split(':').map(Number);
  const hoje = new Date(agora);
  hoje.setHours(hh, mm, 0, 0);
  const jaRodouHoje = cfg.ultimoDia === diaLocal(agora);
  if (!jaRodouHoje && hoje <= agora) return { quando: agora, pendente: true };
  if (!jaRodouHoje) return { quando: hoje, pendente: false };
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  return { quando: amanha, pendente: false };
}

export const pausaAleatoria = (rng = Math.random) => Math.round(PAUSA_MIN_MS + rng() * (PAUSA_MAX_MS - PAUSA_MIN_MS));

/** O Google respondeu que não há nenhum negócio (não é falha de rede nem bloqueio). */
export const ehSemResultado = (msg) => /nenhum neg[óo]cio|n[ãa]o retornou leads/i.test(String(msg || ''));

/**
 * O laço de um dia: sorteia, extrai, soma, e para quando bate a meta, quando
 * acaba o que extrair, ou quando o Google começa a falhar.
 *
 * @param {object} p
 * @param {object} p.cfg configuração (limite, nichos, cidades, puladas)
 * @param {() => object[]} p.lerAreas áreas já extraídas, atualizadas a cada volta
 * @param {() => object|null} [p.lerDesempenho] o que as extrações já feitas ensinaram (veja `desempenhoPorGrupo`)
 * @param {(item: object) => Promise<{ok:boolean,novos?:number,erro?:string,ocupado?:boolean,cancelada?:boolean,semResultado?:boolean}>} p.iniciar
 * @param {(ms: number) => Promise<void>} p.esperar
 */
export async function executaDia({
  cfg, lerAreas, lerDesempenho = () => null, iniciar, esperar, rng = Math.random, deveParar = () => false, aoMudar = () => {},
}) {
  const r = {
    novos: 0, buscas: 0, falhas: 0, vazias: 0, motivo: '', feitas: [], novasPuladas: [], ultimoErro: '',
  };
  const ignoradas = new Set();
  let seguidas = 0;
  for (;;) {
    if (deveParar()) { r.motivo = 'parada'; break; }
    if (r.novos >= cfg.limite) { r.motivo = 'meta'; break; }
    if (r.buscas + r.falhas + r.vazias >= MAX_BUSCAS_POR_DIA) { r.motivo = 'limite-buscas'; break; }
    const areas = lerAreas();
    const sorteio = { ...cfg, puladas: [...(cfg.puladas || []), ...r.novasPuladas] };
    const prox = escolheProxima(sorteio, areas, ignoradas, rng, lerDesempenho());
    if (!prox) { r.motivo = pendentes(sorteio, areas).length ? 'falhas' : 'tudo'; break; }
    aoMudar({ atual: prox, novos: r.novos, buscas: r.buscas });
    const res = (await iniciar(prox)) || { ok: false };
    if (res.ocupado) { r.motivo = 'ocupado'; break; }
    if (res.cancelada) { r.motivo = 'parada'; break; }
    if (res.ok) {
      r.novos += res.novos || 0;
      r.buscas += 1;
      seguidas = 0;
      r.feitas.push({ nicho: prox.nicho, cidade: prox.cidade, uf: prox.uf, novos: res.novos || 0 });
    } else {
      ignoradas.add(prox.chave);
      seguidas += 1;
      if (res.semResultado) { r.vazias += 1; r.novasPuladas.push(prox.chave); } else { r.falhas += 1; }
      r.ultimoErro = res.erro || r.ultimoErro;
      if (seguidas >= FALHAS_SEGUIDAS) { r.motivo = 'falhas'; break; }
    }
    if (r.novos < cfg.limite) await esperar(pausaAleatoria(rng));
  }
  return r;
}

/** Frase do resultado do dia, para o aviso e para o histórico. */
export function textoResultado(r, limite) {
  const base = `${r.novos} lead${r.novos === 1 ? '' : 's'} novo${r.novos === 1 ? '' : 's'} em ${r.buscas} busca${r.buscas === 1 ? '' : 's'}`;
  switch (r.motivo) {
    case 'meta': return `Meta de ${limite} atingida: ${base}.`;
    case 'tudo': return `${base}. Tudo da lista já foi extraído.`;
    case 'falhas': return `${base}. Parou depois de falhas seguidas (internet ou bloqueio do Google). Tenta de novo amanhã.`;
    case 'ocupado': return `${base}. Parou porque outra extração foi iniciada.`;
    case 'parada': return `${base}. Interrompida por você.`;
    case 'limite-buscas': return `${base}. Chegou ao limite de buscas do dia.`;
    default: return `${base}.`;
  }
}

/** Entrada do histórico do dia (guarda só os últimos 30 dias). */
export function registraDia(cfg, r, agora = new Date()) {
  const entrada = {
    dia: diaLocal(agora),
    ts: agora.getTime(),
    novos: r.novos,
    buscas: r.buscas,
    motivo: r.motivo,
    cidades: r.feitas.map((f) => `${f.nicho} · ${f.cidade}`),
  };
  const sem = (cfg.historico || []).filter((h) => h.dia !== entrada.dia);
  return { ...cfg, historico: [...sem, entrada].slice(-HISTORICO_MAX) };
}
