/**
 * Extração pedida de longe: a versão web (ou outro aparelho) grava um pedido na
 * nuvem e o Prospector aberto no computador, onde o robô do Maps mora, pega o
 * pedido, extrai e sobe os leads. A tela de quem pediu é a mesma de sempre.
 *
 * Aqui ficam as regras puras (testadas) e as chamadas à nuvem. Quem liga isso
 * ao app é o `useComandosRemotos.js`.
 */
import { chamarNuvem, lerEmpresa, lerSessao } from './nuvem.js';

export const ESTADOS_FINAIS = ['concluido', 'erro', 'cancelado'];

const RE_BUSCA = /^scrape_\d{10,16}$/;
const TIPOS_LOCAL = ['cidade', 'estado', 'bairro', 'lugar', 'ponto'];

const texto = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
const numero = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const coordenada = (lat, lng) => lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Novo id de busca. A web cria o id e o computador usa o mesmo, para a tela de quem pediu já estar na extração certa quando os leads chegarem. */
export const novoIdDeBusca = () => `scrape_${Date.now()}`;

/**
 * Confere e enxuga um pedido de extração antes de mandar (web) e antes de
 * rodar (computador): o que vem da nuvem não entra no robô sem passar aqui.
 * @returns {{ok: true, pedido: object} | {ok: false, erro: string}}
 */
export function limpaPedido(bruto) {
  const b = bruto && typeof bruto === 'object' ? bruto : {};
  const niche = texto(b.niche, 80);
  if (niche.length < 2) return { ok: false, erro: 'O pedido veio sem o serviço a buscar.' };

  const pais = b.pais === 'US' ? 'US' : 'BR';
  const bairros = (Array.isArray(b.bairros) ? b.bairros : [])
    .map((x) => texto(x, 80)).filter(Boolean).slice(0, 60);

  let area = null;
  if (b.area && typeof b.area === 'object') {
    const lat = numero(b.area.lat);
    const lng = numero(b.area.lng);
    const raioKm = numero(b.area.raioKm);
    if (coordenada(lat, lng) && raioKm !== null && raioKm >= 1 && raioKm <= 100) area = { lat, lng, raioKm };
  }

  let local = null;
  if (b.local && typeof b.local === 'object') {
    const lat = numero(b.local.lat);
    const lng = numero(b.local.lng);
    local = {
      nome: texto(b.local.nome, 120),
      detalhe: texto(b.local.detalhe, 120),
      cidade: texto(b.local.cidade, 120),
      uf: texto(b.local.uf, 12),
      pais: b.local.pais === 'US' ? 'US' : 'BR',
      tipo: TIPOS_LOCAL.includes(b.local.tipo) ? b.local.tipo : 'lugar',
      chave: texto(b.local.chave, 120),
      ...(coordenada(lat, lng) ? { lat, lng } : {}),
    };
  }

  const city = area ? '' : texto(b.city, 160);
  if (!area && city.length < 2) return { ok: false, erro: 'O pedido veio sem o lugar da busca.' };

  const limite = numero(b.limit);
  const pedido = {
    niche,
    neigh: bairros.length ? bairros.join(', ') : texto(b.neigh, 160),
    bairros,
    city,
    pais,
    limit: limite === null ? 1000 : Math.max(1, Math.min(1000, Math.round(limite))),
    area,
    localLabel: texto(b.localLabel, 160) || city,
    local,
  };
  if (RE_BUSCA.test(String(b.searchId || ''))) pedido.searchId = String(b.searchId);
  return { ok: true, pedido };
}

/** "Dentista em Vila Velha, ES": o nome do pedido nas mensagens e no histórico. */
export function rotuloDoPedido(pedido = {}) {
  const onde = pedido.area ? `${pedido.area.raioKm} km de ${pedido.localLabel}` : (pedido.localLabel || pedido.city || '');
  return [pedido.niche, onde].filter(Boolean).join(' em ');
}

/**
 * Lê a resposta da nuvem para um pedido: em que pé está e se há computador para atender.
 * @param {{computadores?: object[], comandos?: object[]}} estado
 */
export function resumoDoPedido(estado, comandoId) {
  const comandos = Array.isArray(estado?.comandos) ? estado.comandos : [];
  const pcs = Array.isArray(estado?.computadores) ? estado.computadores : [];
  const comando = comandos.find((c) => c.id === comandoId) || null;
  const ligados = pcs.filter((p) => p.ligado);
  const pc = ligados.find((p) => !p.ocupado) || ligados[0] || null;
  return {
    comando,
    // Saiu da lista dos mais recentes sem a gente ver o fim: trata como perdido.
    status: comando ? comando.status : 'sumiu',
    final: !comando || ESTADOS_FINAIS.includes(comando.status),
    progresso: Math.max(0, Math.min(100, Number(comando?.progresso) || 0)),
    pcLigado: ligados.length > 0,
    pcOcupado: ligados.length > 0 && ligados.every((p) => p.ocupado),
    pcNome: comando?.pc_nome || pc?.nome || '',
    cancelando: Boolean(comando?.cancelar),
  };
}

/** Texto da tela de quem pediu, enquanto o computador não termina. */
export function textoDeEspera(resumo, rotulo) {
  const pc = resumo.pcNome ? `no computador ${resumo.pcNome}` : 'no computador';
  if (resumo.status === 'rodando') {
    if (resumo.cancelando) return { titulo: `Cancelando ${rotulo}`, detalhe: `O robô ${pc} está encerrando a busca.` };
    return {
      titulo: `Extraindo ${rotulo}`,
      detalhe: `O robô está rodando ${pc}. Os leads novos aparecem aqui sozinhos quando a extração terminar. Pode fechar esta página: o pedido continua.`,
    };
  }
  if (!resumo.pcLigado) {
    return {
      titulo: `${rotulo}: aguardando o computador`,
      detalhe: 'Nenhum computador com o Prospector aberto agora. O pedido fica na fila e a extração começa assim que o app abrir lá.',
    };
  }
  if (resumo.pcOcupado) {
    return {
      titulo: `${rotulo}: na fila`,
      detalhe: 'O computador está terminando outra extração. O seu pedido é o próximo.',
    };
  }
  return { titulo: `${rotulo}: pedido enviado`, detalhe: `A extração começa em instantes ${pc}.` };
}

/** Frase do resultado para a notificação de quem pediu. */
export function textoDoResultado(comando) {
  const r = comando?.resultado || {};
  if (comando?.status === 'concluido') {
    const novos = Number(r.novos) || 0;
    const repetidos = Number(r.repetidos) || 0;
    return [
      `${novos} lead${novos === 1 ? '' : 's'} novo${novos === 1 ? '' : 's'}`,
      repetidos ? `${repetidos} já estava${repetidos === 1 ? '' : 'm'} na base` : '',
    ].filter(Boolean).join('. ') + '.';
  }
  if (comando?.status === 'cancelado') return r.erro || 'O pedido foi cancelado e nenhum lead entrou na base.';
  return r.erro || 'O computador não conseguiu concluir a busca.';
}

/* ------------------------------------------------------------------ */
/* Nuvem                                                                */
/* ------------------------------------------------------------------ */

function contexto() {
  const empresa = lerEmpresa();
  const sessao = lerSessao();
  if (!empresa?.id || !sessao?.usuario?.id) throw new Error('Entre na empresa para pedir a extração ao computador.');
  return { empresa, sessao };
}

/** Grava o pedido (já limpo) na fila da empresa. Devolve a linha criada. */
export async function enviarComando(pedido) {
  const { empresa, sessao } = contexto();
  const linhas = await chamarNuvem('/rest/v1/prospector_comandos', {
    metodo: 'POST',
    corpo: { empresa_id: empresa.id, tipo: 'extrair', texto: rotuloDoPedido(pedido).slice(0, 300), pedido, criado_por: sessao.usuario.id },
    cabecalhos: { Prefer: 'return=representation' },
  });
  const linha = Array.isArray(linhas) ? linhas[0] : linhas;
  if (!linha?.id) throw new Error('A nuvem não confirmou o pedido.');
  return linha;
}

/** Pedidos recentes e computadores ligados (relógio do servidor). */
export async function estadoComandos() {
  const { empresa } = contexto();
  return chamarNuvem('/rest/v1/rpc/prospector_comandos_estado', { metodo: 'POST', corpo: { p_empresa: empresa.id } });
}

/**
 * Cancela: na fila, sai na hora; já rodando, avisa o computador para parar.
 * @returns {Promise<'cancelado' | 'avisado' | 'nada'>}
 */
export async function cancelarComando(id) {
  contexto();
  const alvo = `/rest/v1/prospector_comandos?id=eq.${encodeURIComponent(id)}`;
  const cabecalhos = { Prefer: 'return=representation' };
  const naFila = await chamarNuvem(`${alvo}&status=eq.pendente`, {
    metodo: 'PATCH', cabecalhos,
    corpo: { status: 'cancelado', concluido_em: new Date().toISOString(), resultado: { erro: 'Cancelado antes de começar.' } },
  });
  if (Array.isArray(naFila) && naFila.length) return 'cancelado';
  const rodando = await chamarNuvem(`${alvo}&status=eq.rodando`, { metodo: 'PATCH', cabecalhos, corpo: { cancelar: true } });
  return Array.isArray(rodando) && rodando.length ? 'avisado' : 'nada';
}

/* ---- Lado do computador ---- */

const CHAVE_PC = 'prospector_pc_id';

/** Identidade deste computador na fila (fica só nele, não sincroniza). */
export function idDoPc() {
  try {
    let id = window.localStorage.getItem(CHAVE_PC);
    if (!id || id.length < 6) {
      id = `pc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(CHAVE_PC, id);
    }
    return id;
  } catch {
    return 'pc_sem_armazenamento';
  }
}

export async function nomeDoPc() {
  try {
    const nome = await window.electronAPI?.nomeComputador?.();
    return texto(nome, 80) || 'Computador';
  } catch {
    return 'Computador';
  }
}

/** Batida do computador: marca presença e, se estiver livre, pega o próximo pedido. */
export async function pegarComando({ livre, progresso = null, nome = 'Computador' }) {
  const { empresa } = contexto();
  return chamarNuvem('/rest/v1/rpc/prospector_comando_pegar', {
    metodo: 'POST',
    corpo: { p_empresa: empresa.id, p_pc: idDoPc(), p_nome: nome, p_livre: Boolean(livre), p_progresso: progresso },
  });
}

/** Encerra o pedido ('concluido', 'erro', 'cancelado') ou devolve para a fila ('pendente'). */
export async function concluirComando(id, status, resultado = null) {
  contexto();
  return chamarNuvem('/rest/v1/rpc/prospector_comando_concluir', {
    metodo: 'POST', corpo: { p_id: id, p_status: status, p_resultado: resultado },
  });
}
