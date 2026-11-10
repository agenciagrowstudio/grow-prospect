import { useCallback, useEffect, useRef, useState } from 'react';
import {
  leConfig, guardaConfig, normalizaConfig, devidoHoje, montaLote, destinatarios, registraLote,
  aplicaCampanhas, pendentesNoMotor, resumoDeHoje, intervaloDoLote, candidatosNovos,
} from './disparoAutomatico';
import { chaveDoDia } from './abordagem';
import { qualificaLead, lerAnalisesSalvas } from './qualificacaoLead';
import { readLocalArray, localDoEndereco } from './leadData';

/**
 * Liga o disparo automático ao app do computador: confere o relógio, monta o
 * lote do dia, entrega ao motor de campanhas do WhatsApp e traz de volta para
 * a Fila o que foi enviado e quem respondeu.
 */
const CONFERE_A_CADA_MS = 60000;
const ESPERA_AO_ABRIR_MS = 30000;
const CHAVE_LOG = 'sigma_abordagem_log';
const CHAVE_FILA = 'sigma_abordagem_cfg';

const leJson = (chave, padrao) => {
  try { return JSON.parse(localStorage.getItem(chave) || 'null') || padrao; } catch { return padrao; }
};

function qualificador() {
  const analises = lerAnalisesSalvas();
  const cache = new Map();
  return (lead) => {
    if (!cache.has(lead)) cache.set(lead, qualificaLead(lead, analises[lead.id]));
    return cache.get(lead);
  };
}

async function carregaCampanhas(ids) {
  const api = window.campaignAPI;
  if (!api?.get) return [];
  const lista = await Promise.all(ids.map((id) => api.get(id).then((r) => r?.campaign || null).catch(() => undefined)));
  // undefined = erro de leitura (fica para a próxima); null = campanha apagada.
  return lista.map((c, i) => ({ id: ids[i], campanha: c }));
}

/** Leads que já receberam abordagem em outra campanha ou e-mail (por chave do lead). */
async function jaAbordadosDe(candidatos) {
  if (!window.emailAPI?.jaAbordados || !candidatos.length) return {};
  const base = candidatos.slice(0, 150);
  try {
    const r = await window.emailAPI.jaAbordados(base.map((c) => c.q.canais.whatsapp), base.map((c) => c.q.canais.email).filter(Boolean));
    if (!r?.success) return {};
    const mapa = {};
    base.forEach(({ chave, q }) => {
      const hit = r.porTelefone?.[q.canais.whatsapp] || (q.canais.email && r.porEmail?.[String(q.canais.email).toLowerCase()]);
      if (hit) mapa[chave] = hit;
    });
    return mapa;
  } catch {
    return {};
  }
}

export function useDisparoAutomatico({ notificar, disponivel, whatsappConectado }) {
  const [cfg, setCfgEstado] = useState(leConfig);
  const [resumo, setResumo] = useState({ enviadas: 0, pendentes: 0, followups: 0, respostas: 0, falhas: 0 });
  const [montando, setMontando] = useState(false);
  const [aviso, setAviso] = useState('');
  const cfgRef = useRef(cfg);
  const notificarRef = useRef(notificar);
  const conectadoRef = useRef(whatsappConectado);
  const ocupadoRef = useRef(false);
  const abertoEm = useRef(Date.now());
  useEffect(() => { notificarRef.current = notificar; conectadoRef.current = whatsappConectado; });

  const setCfg = useCallback((mudanca) => {
    const prox = normalizaConfig(typeof mudanca === 'function' ? mudanca(cfgRef.current) : mudanca);
    cfgRef.current = prox;
    guardaConfig(prox);
    setCfgEstado(prox);
  }, []);

  /** Traz o resultado das campanhas para a Fila e devolve as campanhas lidas. */
  const sincroniza = useCallback(async () => {
    const ids = cfgRef.current.campanhas.map((c) => c.id);
    if (!ids.length) { setResumo(resumoDeHoje([])); return []; }
    const lidas = await carregaCampanhas(ids);
    const apagadas = lidas.filter((x) => x.campanha === null).map((x) => x.id);
    if (apagadas.length) setCfg((c) => ({ ...c, campanhas: c.campanhas.filter((x) => !apagadas.includes(x.id)) }));
    const campanhas = lidas.map((x) => x.campanha).filter(Boolean);
    const log = leJson(CHAVE_LOG, {});
    const novo = aplicaCampanhas(log, campanhas);
    if (novo !== log) {
      localStorage.setItem(CHAVE_LOG, JSON.stringify(novo));
      window.dispatchEvent(new Event('sigma:abordagem-log'));
    }
    setResumo(resumoDeHoje(campanhas));
    return campanhas;
  }, [setCfg]);

  /** Monta e entrega o lote de hoje. forcar = botão "Montar agora" (fora do horário também). */
  const montaDia = useCallback(async ({ forcar = false } = {}) => {
    if (ocupadoRef.current || !disponivel) return;
    const c = cfgRef.current;
    const hoje = chaveDoDia();
    if (!forcar && !devidoHoje(c)) return;
    const cfgFila = leJson(CHAVE_FILA, {});
    if (!String(cfgFila.nome || '').trim()) {
      setAviso('Falta o nome de quem assina. Abra a Fila do dia e preencha em Ajustes.');
      return;
    }
    if (!conectadoRef.current) {
      setAviso('O WhatsApp do Prospector está desconectado. O lote sai quando ele conectar.');
      return;
    }
    if (!window.campaignAPI?.create) return;
    ocupadoRef.current = true;
    setMontando(true);
    setAviso('');
    try {
      const campanhas = await sincroniza();
      const log = leJson(CHAVE_LOG, {});
      const leads = readLocalArray('sigma_leads');
      const qualifica = qualificador();
      const jaAbordados = await jaAbordadosDe(candidatosNovos(leads, qualifica, log, {}));
      // Já contam hoje: a Fila manual de hoje e o que do lote anterior ainda não saiu.
      const manuaisHoje = Object.values(log).filter((e) => e?.status === 'enviada' && e.dia === hoje && !e.auto && e.canal !== 'instagram').length;
      const ocupadas = manuaisHoje + pendentesNoMotor(campanhas);
      const lote = montaLote({ leads, qualifica, log, cfg: c, cfgFila, jaAbordados, ocupadas, localDoEndereco });

      if (!lote.itens.length) {
        setCfg((x) => ({ ...x, ultimoDia: hoje }));
        notificarRef.current?.({
          type: 'info',
          category: 'whatsapp',
          title: 'Disparo automático: nada para hoje',
          message: lote.semCandidatos
            ? 'Acabaram os leads sem site, mornos ou quentes, com WhatsApp. Faça uma extração nova para o automático ter quem abordar.'
            : `A meta de ${c.meta} mensagens de hoje já está ocupada (Fila manual ou lote anterior ainda saindo).`,
        });
        return;
      }

      const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const r = await window.campaignAPI.create({
        name: `Disparo automático ${data}`,
        template: { text: '{{nome}}' },
        leadIds: destinatarios(lote.itens),
        schedule: {
          mode: 'interval',
          intervalMs: intervaloDoLote(lote.itens.length, c),
          workingHours: { enabled: true, start: c.inicio, end: c.fim },
        },
        limiteDiario: c.meta,
        origem: 'disparo-automatico',
      });
      if (!r?.success || !r.campaign?.id) throw new Error(r?.error || 'O motor de campanhas não criou o lote.');
      const id = r.campaign.id;
      // Primeiro guarda: se o app fechar agora, o lote não é montado de novo.
      setCfg((x) => ({ ...x, ultimoDia: hoje, campanhas: [...x.campanhas, { id, dia: hoje }] }));
      localStorage.setItem(CHAVE_LOG, JSON.stringify(registraLote(leJson(CHAVE_LOG, {}), lote.itens)));
      window.dispatchEvent(new Event('sigma:abordagem-log'));
      const inicio = await window.campaignAPI.start(id);
      if (inicio && inicio.success === false) throw new Error(inicio.error || 'O lote foi criado mas não começou.');
      notificarRef.current?.({
        type: 'success',
        category: 'whatsapp',
        title: 'Disparo automático começou',
        message: `${lote.novos} abordage${lote.novos === 1 ? 'm nova' : 'ns novas'}${lote.followups ? ` e ${lote.followups} follow-up${lote.followups === 1 ? '' : 's'}` : ''}, espalhados até as ${c.fim}.`,
      });
      await sincroniza();
    } catch (erro) {
      setAviso(erro.message);
      notificarRef.current?.({ type: 'error', category: 'whatsapp', title: 'Disparo automático', message: erro.message });
    } finally {
      ocupadoRef.current = false;
      setMontando(false);
    }
  }, [disponivel, sincroniza, setCfg]);

  /** Liga ou desliga: desligar pausa o que está saindo; ligar retoma. */
  const alterna = useCallback(async (ligar) => {
    setCfg((c) => ({ ...c, ativo: ligar }));
    const api = window.campaignAPI;
    if (!api) return;
    const lidas = await carregaCampanhas(cfgRef.current.campanhas.map((c) => c.id));
    await Promise.all(lidas.map(({ id, campanha }) => {
      if (!campanha) return null;
      if (!ligar && ['running', 'scheduled'].includes(campanha.status)) return api.pause(id).catch(() => {});
      if (ligar && campanha.status === 'paused' && campanha.pauseReason !== 'daily_limit') return api.resume(id).catch(() => {});
      return null;
    }));
  }, [setCfg]);

  useEffect(() => {
    if (!disponivel) return undefined;
    const confere = () => {
      sincroniza().catch(() => {});
      if (Date.now() - abertoEm.current >= ESPERA_AO_ABRIR_MS) montaDia().catch(() => {});
    };
    const primeira = setTimeout(confere, 5000);
    const t = setInterval(confere, CONFERE_A_CADA_MS);
    const progresso = window.campaignAPI?.onProgress?.(() => sincroniza().catch(() => {}));
    return () => {
      clearTimeout(primeira);
      clearInterval(t);
      if (typeof progresso === 'function') progresso();
    };
  }, [disponivel, sincroniza, montaDia]);

  return { cfg, setCfg, resumo, montando, aviso, alterna, montarAgora: () => montaDia({ forcar: true }) };
}
