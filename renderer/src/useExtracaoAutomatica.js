import { useCallback, useEffect, useRef, useState } from 'react';
import {
  leConfig, guardaConfig, normalizaConfig, devidoAgora, executaDia, diaLocal, registraDia,
  textoResultado, ehSemResultado, desempenhoPorGrupo,
} from './extracaoAutomatica';
import { areasExtraidas } from './cobertura';
import { readLocalArray } from './leadData';

/**
 * Liga a regra da extração automática ao app: confere o relógio, roda o dia
 * pelo mesmo caminho da extração manual (`iniciarExtracao`) e guarda o
 * histórico. Vive no topo do app, então continua rodando com qualquer tela aberta.
 */

// Dá tempo de a nuvem trazer os dados antes da primeira conferência.
const ESPERA_AO_ABRIR_MS = 45000;
const CONFERE_A_CADA_MS = 30000;

const leLog = () => {
  try { return JSON.parse(localStorage.getItem('sigma_abordagem_log') || '{}') || {}; } catch { return {}; }
};

export function useExtracaoAutomatica({ iniciarExtracao, cancelarExtracao, extracaoEmAndamento, notificar, disponivel }) {
  const [cfg, setCfgEstado] = useState(leConfig);
  const [estado, setEstado] = useState({ rodando: false, atual: null, novos: 0, buscas: 0 });
  const cfgRef = useRef(cfg);
  const iniciarRef = useRef(iniciarExtracao);
  const cancelarRef = useRef(cancelarExtracao);
  const ocupadoRef = useRef(extracaoEmAndamento);
  const notificarRef = useRef(notificar);
  const rodandoRef = useRef(false);
  const pararRef = useRef(false);
  const abertoEm = useRef(Date.now());

  useEffect(() => {
    iniciarRef.current = iniciarExtracao;
    cancelarRef.current = cancelarExtracao;
    ocupadoRef.current = extracaoEmAndamento;
    notificarRef.current = notificar;
  });

  const setCfg = useCallback((mudanca) => {
    const prox = normalizaConfig(typeof mudanca === 'function' ? mudanca(cfgRef.current) : mudanca);
    cfgRef.current = prox;
    guardaConfig(prox);
    setCfgEstado(prox);
  }, []);

  const rodar = useCallback(async () => {
    if (rodandoRef.current || !disponivel) return;
    rodandoRef.current = true;
    pararRef.current = false;
    setCfg((c) => ({ ...c, ultimoDia: diaLocal() }));
    setEstado({ rodando: true, atual: null, novos: 0, buscas: 0 });
    window.electronAPI?.manterAcordado?.(true);
    notificarRef.current?.({
      type: 'info',
      category: 'scraper',
      title: 'Extração automática começou',
      message: 'Hoje: uma cidade inteira, com todos os serviços escolhidos. O roteiro começa pelas cidades com mais brasileiros.',
    });

    // Espera que acorda a cada segundo para atender o "Parar" na hora.
    const esperar = (ms) => new Promise((resolve) => {
      const fim = Date.now() + ms;
      const t = setInterval(() => {
        if (pararRef.current || Date.now() >= fim) { clearInterval(t); resolve(); }
      }, 1000);
    });

    let r;
    try {
      r = await executaDia({
        cfg: cfgRef.current,
        lerAreas: () => areasExtraidas(readLocalArray('sigma_searches'), readLocalArray('sigma_leads')),
        lerDesempenho: () => {
          const leads = readLocalArray('sigma_leads');
          return desempenhoPorGrupo(areasExtraidas(readLocalArray('sigma_searches'), leads), leads, leLog());
        },
        iniciar: async (item) => {
          const onde = `${item.cidade}, ${item.uf}`;
          const res = await iniciarRef.current({
            niche: item.nicho,
            neigh: '',
            bairros: [],
            city: onde,
            pais: 'US',
            limit: 1000,
            area: null,
            localLabel: onde,
            local: item.local,
            automatica: true,
          });
          return { ...res, semResultado: !res?.ok && ehSemResultado(res?.erro) };
        },
        esperar,
        deveParar: () => pararRef.current,
        aoMudar: (p) => setEstado({ rodando: true, ...p }),
      });
    } catch (erro) {
      r = { novos: 0, buscas: 0, falhas: 1, vazias: 0, motivo: 'falhas', feitas: [], novasPuladas: [], ultimoErro: erro?.message || '' };
    }

    window.electronAPI?.manterAcordado?.(false);
    rodandoRef.current = false;
    setEstado({ rodando: false, atual: null, novos: r.novos, buscas: r.buscas });

    // Nada rodou porque havia uma extração manual: o dia não conta, tenta de novo daqui a pouco.
    if (r.motivo === 'ocupado' && r.buscas === 0) {
      setCfg((c) => ({ ...c, ultimoDia: '' }));
      return;
    }
    setCfg((c) => {
      // "Sem resultado" só vale se o Google respondeu alguma busca no mesmo dia;
      // senão pode ser bloqueio, e a busca merece outra chance.
      const puladas = r.buscas > 0 ? [...new Set([...c.puladas, ...r.novasPuladas])] : c.puladas;
      return registraDia({ ...c, puladas }, r);
    });
    notificarRef.current?.({
      type: r.motivo === 'falhas' ? 'error' : 'success',
      category: 'scraper',
      title: 'Extração automática terminou',
      message: textoResultado(r) + (r.motivo === 'falhas' && r.ultimoErro ? ` Último erro: ${r.ultimoErro}` : ''),
    });
  }, [disponivel, setCfg]);

  // Agendamento no Windows (abrir o app sozinho no horário). Compartilhado entre
  // o topo e a tela, para os dois mostrarem a mesma coisa.
  const [windows, setWindows] = useState({ carregando: true, existe: false, suportado: false });
  const windowsRef = useRef(windows);
  useEffect(() => { windowsRef.current = windows; }, [windows]);
  useEffect(() => {
    let vivo = true;
    if (!window.electronAPI?.agendamentoStatus) {
      setWindows({ carregando: false, existe: false, suportado: false });
      return undefined;
    }
    window.electronAPI.agendamentoStatus()
      .then((r) => { if (vivo) setWindows({ carregando: false, ...r }); })
      .catch(() => { if (vivo) setWindows({ carregando: false, existe: false, suportado: false }); });
    return () => { vivo = false; };
  }, []);

  const salvaWindows = useCallback(async (ativar, hora = cfgRef.current.hora) => {
    if (!window.electronAPI?.agendamentoSalvar) return false;
    setWindows((w) => ({ ...w, salvando: true }));
    try {
      const r = await window.electronAPI.agendamentoSalvar({ ativar, hora });
      if (!r?.success) throw new Error(r?.error || 'O Windows não respondeu.');
      setWindows((w) => ({ ...w, salvando: false, existe: Boolean(r.existe), hora: r.hora, proxima: r.proxima }));
      return true;
    } catch (erro) {
      setWindows((w) => ({ ...w, salvando: false }));
      notificarRef.current?.({ type: 'error', title: 'Agendamento do Windows', message: erro.message });
      return false;
    }
  }, []);

  /** Troca o horário; o agendamento do Windows, se existir, acompanha. */
  const mudaHora = useCallback((hora) => {
    if (!hora || hora === cfgRef.current.hora) return;
    setCfg((c) => ({ ...c, hora }));
    if (windowsRef.current.existe) salvaWindows(true, hora);
  }, [setCfg, salvaWindows]);

  const parar = useCallback(() => {
    if (!rodandoRef.current) return;
    pararRef.current = true;
    cancelarRef.current?.();
  }, []);

  // Relógio: no horário (ou ao abrir o app depois dele), roda o dia uma vez.
  useEffect(() => {
    if (!disponivel) return undefined;
    const confere = () => {
      if (rodandoRef.current || ocupadoRef.current) return;
      if (Date.now() - abertoEm.current < ESPERA_AO_ABRIR_MS) return;
      if (devidoAgora(cfgRef.current, new Date())) rodar();
    };
    const t = setInterval(confere, CONFERE_A_CADA_MS);
    return () => clearInterval(t);
  }, [disponivel, rodar]);

  return { cfg, setCfg, estado, rodar, parar, windows, salvaWindows, mudaHora };
}
