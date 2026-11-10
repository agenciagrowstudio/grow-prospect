/**
 * Disparo automático da Fila do dia.
 *
 * Todo dia, no horário escolhido, o Prospector monta um lote com no máximo a
 * meta (20 ou 25 mensagens no total) e manda pelo WhatsApp conectado no app,
 * espalhado pelo horário de envio:
 *   1. primeiro os follow-ups vencidos de quem não respondeu (1, 3 e 7 dias
 *      depois da abordagem, nunca menos de 24h depois da mensagem anterior);
 *   2. o que sobra da meta vira abordagem nova.
 *
 * Só entra lead sem site e pelo menos morno: a oferta do automático é o site.
 * Quem responde sai na hora, e o resto da conversa é do usuário.
 *
 * Aqui ficam as regras puras (testadas). O `useDisparoAutomatico.js` liga isso
 * ao app e ao motor de campanhas do WhatsApp.
 */
import { gerarAbordagem, idiomaDoLead, chaveDoDia } from './abordagem.js';
import { proximoFollowup, textoFollowup, marcaFollowup } from './followup.js';
import { digitosWhatsApp } from './telefone.js';
import { publicoDoLead } from './resultados.js';

export const DIAS_FOLLOWUP_AUTO = [1, 3, 7];
export const METAS = [20, 25];
const CHAVE = 'prospector_disparo_auto';
const MAX_CAMPANHAS_LEMBRADAS = 20;
const MIN = 60000;

const PADRAO = { ativo: false, meta: 20, inicio: '09:00', fim: '18:00', campanhas: [], ultimoDia: '' };

const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ''));
const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

export function normalizaConfig(c = {}) {
  const meta = METAS.includes(Number(c.meta)) ? Number(c.meta) : PADRAO.meta;
  const inicio = horaValida(c.inicio) ? c.inicio : PADRAO.inicio;
  let fim = horaValida(c.fim) ? c.fim : PADRAO.fim;
  // Janela de pelo menos 2 horas, para as mensagens não saírem coladas.
  if (minutos(fim) - minutos(inicio) < 120) {
    const m = Math.min(23 * 60 + 59, minutos(inicio) + 120);
    fim = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  const campanhas = (Array.isArray(c.campanhas) ? c.campanhas : [])
    .filter((x) => x && typeof x.id === 'string' && x.id)
    .slice(-MAX_CAMPANHAS_LEMBRADAS);
  return { ativo: Boolean(c.ativo), meta, inicio, fim, campanhas, ultimoDia: String(c.ultimoDia || '') };
}

export function leConfig() {
  try { return normalizaConfig(JSON.parse(localStorage.getItem(CHAVE) || 'null') || {}); } catch { return normalizaConfig(); }
}
export function guardaConfig(cfg) {
  try { localStorage.setItem(CHAVE, JSON.stringify(normalizaConfig(cfg))); } catch { /* sem espaço: vale nesta abertura */ }
}

/** Hora "HH:MM" de um dia, em milissegundos. */
function emHora(agora, hhmm) {
  const d = new Date(agora);
  d.setHours(Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)), 0, 0);
  return d.getTime();
}

/** Já passou do início e ainda dá tempo de mandar hoje? */
export function dentroDaJanela(cfg, agora = Date.now()) {
  return agora >= emHora(agora, cfg.inicio) && agora < emHora(agora, cfg.fim) - 15 * MIN;
}

/**
 * Lote de hoje ainda não montado, horário certo, ligado.
 */
export function devidoHoje(cfg, agora = Date.now()) {
  return cfg.ativo && cfg.ultimoDia !== chaveDoDia(new Date(agora)) && dentroDaJanela(cfg, agora);
}

/**
 * Intervalo entre mensagens para espalhar o lote até o fim da janela.
 * Entre 4 e 40 minutos (o motor ainda soma até 40% de variação).
 */
export function intervaloDoLote(quantas, cfg, agora = Date.now()) {
  const sobra = Math.max(0, emHora(agora, cfg.fim) - agora - 15 * MIN);
  // O motor soma até 40% de variação em cada intervalo: divide pelo pior caso.
  const cada = quantas > 1 ? sobra / (quantas * 1.4) : 10 * MIN;
  return Math.round(Math.max(4 * MIN, Math.min(40 * MIN, cada)));
}

/** Lead que o automático aborda: tem WhatsApp, não tem site e é pelo menos morno. */
export function elegivelAuto(lead, q) {
  if (!lead || !q) return false;
  // Quem veio do Instagram é trabalhado no Direct, não no WhatsApp automático.
  if (lead.source === 'instagram') return false;
  if (q.canais?.site) return false;
  if (q.temperatura?.id === 'frio') return false;
  return Boolean(digitosWhatsApp(q.canais?.whatsapp, lead.pais));
}

/** Momento da extração (o id da busca é scrape_<timestamp>). */
const quandoExtraido = (lead) => Number(String(lead.searchId || '').replace(/\D/g, '')) || 0;

/**
 * Candidatos a abordagem nova, na ordem do fluxo cidade por cidade: a extração
 * mais nova primeiro (termina a cidade), e dentro dela a nota maior.
 * @param {(lead: object) => object} qualifica
 */
export function candidatosNovos(leads, qualifica, log = {}, jaAbordados = {}) {
  return (leads || [])
    .map((lead) => ({ lead, q: qualifica(lead), chave: String(lead.id) }))
    .filter(({ lead, q, chave }) => lead.id != null && !log[chave] && !jaAbordados[chave] && elegivelAuto(lead, q))
    .sort((a, b) => (quandoExtraido(b.lead) - quandoExtraido(a.lead)) || (b.q.nota - a.q.nota));
}

/** Follow-ups do robô que vencem até o fim da janela de hoje. */
export function followupsDevidos(log = {}, cfg, agora = Date.now()) {
  const limite = emHora(agora, cfg.fim) - 15 * MIN;
  return Object.entries(log)
    .map(([chave, registro]) => ({ chave, registro, p: proximoFollowup(registro, limite, { dias: DIAS_FOLLOWUP_AUTO, robo: true }) }))
    .filter(({ p }) => p?.liberado)
    .sort((a, b) => a.p.liberaEm - b.p.liberaEm);
}

/** Lead da base com cidade e estado tirados do endereço quando faltam. */
export function leadParaTexto(lead, localDoEndereco) {
  const doEndereco = localDoEndereco ? localDoEndereco(lead.address) : {};
  return { ...lead, city: lead.city || doEndereco.cidade, uf: lead.uf || lead.state || doEndereco.uf };
}

/**
 * Monta o lote do dia.
 * @param {object} p
 * @param {object[]} p.leads base de leads
 * @param {(lead: object) => object} p.qualifica
 * @param {object} p.log sigma_abordagem_log
 * @param {object} p.cfg configuração do automático
 * @param {object} p.cfgFila sigma_abordagem_cfg (quem assina)
 * @param {object} [p.jaAbordados] chave do lead -> já abordado em outra campanha
 * @param {number} [p.ocupadas] mensagens que já contam hoje (Fila manual, lote de ontem ainda saindo)
 * @param {(endereco: string) => object} [p.localDoEndereco]
 * @returns {{ itens: object[], followups: number, novos: number, semCandidatos: boolean }}
 */
export function montaLote({ leads, qualifica, log = {}, cfg, cfgFila = {}, jaAbordados = {}, ocupadas = 0, localDoEndereco, agora = Date.now() }) {
  let vagas = Math.max(0, cfg.meta - ocupadas);
  const porId = new Map((leads || []).map((l) => [String(l.id), l]));
  const itens = [];

  for (const { chave, registro, p } of followupsDevidos(log, cfg, agora)) {
    if (!vagas) break;
    const lead = porId.get(chave);
    const telefone = lead ? digitosWhatsApp(qualifica(lead)?.canais?.whatsapp, lead.pais) : registro.telefone;
    if (!telefone) continue;
    itens.push({
      chave,
      etapa: p.n,
      telefone,
      nome: registro.nome || lead?.name || '',
      texto: textoFollowup({}, p.n, registro.idioma === 'en' ? 'en' : 'pt'),
      lead: lead || null,
    });
    vagas -= 1;
  }
  const followups = itens.length;

  const candidatos = candidatosNovos(leads, qualifica, log, jaAbordados);
  for (const { lead, q, chave } of candidatos) {
    if (!vagas) break;
    const oferta = q.servicos.some((s) => s.id === 'completo') ? 'completo' : 'site';
    const idioma = idiomaDoLead(lead);
    const gerado = gerarAbordagem(leadParaTexto(lead, localDoEndereco), q, { ...cfgFila, oferta, idioma });
    itens.push({
      chave,
      etapa: 0,
      telefone: digitosWhatsApp(q.canais.whatsapp, lead.pais),
      nome: lead.name || '',
      texto: gerado.texto,
      angulo: gerado.angulo,
      idioma,
      publico: publicoDoLead(lead),
      lead,
    });
    vagas -= 1;
  }
  return { itens, followups, novos: itens.length - followups, semCandidatos: candidatos.length === 0 };
}

/** Destinatários no formato do motor de campanhas. */
export function destinatarios(itens) {
  return itens.map((i) => ({
    leadId: `${i.chave}#${i.etapa}`,
    name: i.nome,
    phone: i.telefone,
    source: 'disparo-automatico',
    category: i.lead?.category || '',
    address: i.lead?.address || '',
    mensagemPronta: i.texto,
    etapa: i.etapa,
  }));
}

/**
 * Registros da Fila para o lote recém-criado: abordagem nova fica "agendada"
 * (sai da Fila manual e não é escolhida de novo).
 */
export function registraLote(log = {}, itens, agora = Date.now()) {
  const novo = { ...log };
  const dia = chaveDoDia(new Date(agora));
  itens.filter((i) => i.etapa === 0).forEach((i) => {
    novo[i.chave] = {
      status: 'agendada',
      auto: true,
      dia,
      ts: agora,
      nome: i.nome,
      texto: i.texto,
      angulo: i.angulo,
      publico: i.publico,
      idioma: i.idioma,
      telefone: i.telefone,
      canal: 'whatsapp',
    };
  });
  return novo;
}

const ERRO_SEM_WHATSAPP = /n[aã]o (tem|existe|est[aá]).*whatsapp|not (on|registered)|n[uú]mero inv[aá]lido|invalid/i;

/**
 * Traz o que o motor de campanhas fez de volta para a Fila: enviada, follow-up
 * enviado, respondeu, sem WhatsApp. Abordagem que falhou por outro motivo volta
 * para a Fila (sai do registro).
 * @param {object} log sigma_abordagem_log
 * @param {object[]} campanhas campanhas do disparo automático (com leads)
 * @returns {object} log atualizado (o mesmo objeto se nada mudou)
 */
export function aplicaCampanhas(log = {}, campanhas = []) {
  const novo = { ...log };
  let mudou = false;
  const troca = (chave, registro) => { novo[chave] = registro; mudou = true; };

  const linhas = [];
  campanhas.forEach((c) => (c?.leads || []).forEach((l) => {
    const m = String(l.leadId || '').match(/^(.+)#(\d)$/);
    if (m) linhas.push({ chave: m[1], etapa: Number(m[2]), l });
  }));
  // Abordagem antes dos follow-ups, para o follow-up achar o registro "enviada".
  linhas.sort((a, b) => a.etapa - b.etapa);

  linhas.forEach(({ chave, etapa, l }) => {
    const r = novo[chave];
    if (!r || !r.auto) return;
    if (etapa === 0) {
      if (l.sentAt && r.status === 'agendada') {
        troca(chave, { ...r, status: 'enviada', ts: Number(l.sentAt), dia: chaveDoDia(new Date(Number(l.sentAt))) });
      } else if (l.status === 'failed' && r.status === 'agendada') {
        if (ERRO_SEM_WHATSAPP.test(String(l.errorMessage || ''))) troca(chave, { ...r, status: 'sem_whatsapp', texto: '' });
        else { delete novo[chave]; mudou = true; }
      }
    } else if (l.sentAt) {
      const feitos = Array.isArray(r.followups) ? r.followups : [];
      if (!feitos.some((f) => f.n === etapa)) troca(chave, marcaFollowup(r, '', Number(l.sentAt)));
    }
    if (l.repliedAt && ['agendada', 'enviada'].includes(novo[chave]?.status)) {
      troca(chave, { ...novo[chave], status: 'respondeu', respondeuEm: Number(l.repliedAt) });
    }
  });
  return mudou ? novo : log;
}

/** Quantas mensagens do automático ainda estão na fila do motor (lote que não terminou). */
export function pendentesNoMotor(campanhas = []) {
  return campanhas.reduce((n, c) => n + (c?.leads || []).filter((l) => l.status === 'pending').length, 0);
}

/** Resumo de hoje para o painel. */
export function resumoDeHoje(campanhas = [], agora = Date.now()) {
  const hoje = chaveDoDia(new Date(agora));
  const r = { enviadas: 0, pendentes: 0, followups: 0, respostas: 0, falhas: 0 };
  campanhas.forEach((c) => (c?.leads || []).forEach((l) => {
    if (l.status === 'pending') r.pendentes += 1;
    if (l.sentAt && chaveDoDia(new Date(Number(l.sentAt))) === hoje) {
      r.enviadas += 1;
      if (Number(l.etapa) > 0) r.followups += 1;
    }
    if (l.repliedAt && chaveDoDia(new Date(Number(l.repliedAt))) === hoje) r.respostas += 1;
    if (l.status === 'failed' && chaveDoDia(new Date(Number(c.createdAt) || agora)) === hoje) r.falhas += 1;
  }));
  return r;
}
