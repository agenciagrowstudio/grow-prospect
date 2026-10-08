import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PROVIDERS, readAiConfig, saveAiConfig } from '../configIA';
import AvatarLead from './AvatarLead';
import {
  Target,
  Settings,
  Download,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
  Bot
} from 'lucide-react';
import { dedupeLeads, normalizeLeadCollection, readLocalArray } from '../leadData';

const AUDITS = {
  sites: { name: 'Venda de Sites', hint: 'Qualidade e ausência de site, mobile, performance, SEO, hero, CTA e conversão.' },
  seo: { name: 'SEO', hint: 'Estrutura, títulos, conteúdo e sinais técnicos para buscadores.' },
  mkt: { name: 'Marketing Digital', hint: 'Presença, conteúdo e canais como ativo de aquisição.' },
  pres: { name: 'Presença Digital', hint: 'Visão geral da pegada digital da empresa.' },
  custom: { name: 'Customizado', hint: 'Direcionado pelo objetivo definido abaixo.' }
};

function readStoredAnalysis() {
  try {
    const a = localStorage.getItem('sigma_analysis');
    if (a) return JSON.parse(a);
  } catch {}
  return {};
}

function saveStoredAnalysis(data) {
  try {
    localStorage.setItem('sigma_analysis', JSON.stringify(data));
  } catch {}
}

function scBand(score) {
  return score >= 80 ? 'alta' : score >= 50 ? 'media' : 'baixa';
}

function fmtShort(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Heurística de Auditoria do Protótipo OpenDesign
/**
 * Monta a auditoria mostrada na tela.
 *
 * `site` é o que o motor do processo principal viu ao visitar o site do lead
 * (HTTPS, celular, velocidade, botão de WhatsApp, pixel). Antes esta função
 * presumia que tudo estava certo quando não sabia; agora o que não foi
 * verificado aparece como "não verificado" e não ganha ponto. `motor` é o
 * resultado inteiro do motor: a nota dele vale mais que a conta local.
 */
function auditLead(lead, preset = 'sites', site = null, motor = null) {
  const pos = [];
  const neg = [];
  const opp = [];
  const sec = [];
  const F = [];

  let sc = 0;
  const add = (ok, txt, pts) => {
    F.push({ txt, pts: ok ? pts : 0, hit: ok });
    if (ok) sc += pts;
  };

  const hasPhone = Boolean(lead.phone || lead.tel);
  const hasSite = Boolean(lead.website || lead.site);
  const hasIg = Boolean(lead.instagram || lead.ig);
  const hasMail = Boolean(lead.email || lead.mail);
  const rating = Number(lead.rating || lead.rn || 0);
  const reviews = Number(lead.reviews || lead.reviewCount || lead.totalReviews || lead.rc || 0);
  const siteNoAr = site?.digitalPresence ? site.digitalPresence.reachable === true : Boolean(site);

  add(hasPhone, 'Tem WhatsApp / Telefone', 12);

  if (hasSite) {
    add(siteNoAr, siteNoAr ? 'Site no ar' : (site ? 'Site fora do ar ou inacessível' : 'Site (não verificado)'), 15);
  } else if (preset === 'sites') {
    add(true, 'Sem site — janela para venda de desenvolvimento', 14);
  } else {
    add(false, 'Sem site', 0);
  }

  add(hasIg, 'Tem Instagram', 8);
  add(hasMail, 'Tem e-mail', 5);
  add(rating >= 4.5, `Avaliação ${rating}${rating >= 4.5 ? '' : ' (abaixo de 4,5)'}`, 15);
  add(reviews >= 100, `${reviews} avaliações${reviews >= 100 ? '' : ' (abaixo de 100)'}`, 12);

  // null = não verificado: não ganha ponto e não vira defeito inventado. Só
  // vale o que o motor mediu num site que de fato abriu.
  const sim = (v) => (siteNoAr && typeof v === 'boolean' ? v : null);
  const isMobileFriendly = sim(site?.mobile?.isResponsive);
  const hasHttps = hasSite
    ? (sim(site?.hasHttps) ?? (/^http:\/\//i.test(String(lead.website || '')) ? false : null))
    : null;
  const tempo = Number(site?.performance?.loadTimeMs);
  const rapido = Number.isFinite(tempo) && tempo > 0 ? tempo <= 3500 : null;
  const botaoWhats = sim(site?.conversion?.hasWhatsappButton);
  const temPixel = site?.tracking
    ? Boolean(site.tracking.metaPixel || site.tracking.googleAdsConversion || site.tracking.tiktokPixel)
    : null;
  const rot = (v, ok, ruim, nv) => (v === null ? nv : v ? ok : ruim);

  if (hasSite) {
    add(isMobileFriendly === true, rot(isMobileFriendly, 'Layout adaptável (celular)', 'Layout não adaptável ao celular', 'Celular (não verificado)'), 5);
    add(hasHttps === true, rot(hasHttps, 'HTTPS ativo', 'Site sem HTTPS', 'HTTPS (não verificado)'), 5);
  }

  if (sc > 100) sc = 100;

  F.forEach((f) => {
    (f.hit ? pos : neg).push(f.txt + (f.hit ? ` (+${f.pts})` : ''));
  });

  const S = (t, items) => {
    if (items.length) sec.push({ t, items });
  };

  if (hasSite) {
    S('SEO', [rot(hasHttps, 'HTTPS ativo', 'Site sem HTTPS: sinal negativo para buscadores', 'HTTPS não verificado')]);
    S('Performance', [rot(rapido, `Carregou em ${Math.round(tempo / 100) / 10}s`, `Carregamento lento (${Math.round(tempo / 100) / 10}s)`, 'Velocidade não verificada')]);
    S('Responsivo', [rot(isMobileFriendly, 'Layout adaptável para celular', 'Layout não adaptável', 'Celular não verificado')]);
    S('Conversão', [
      rot(botaoWhats, 'Botão de WhatsApp no site', 'Sem botão de WhatsApp no site', 'Botão de WhatsApp não verificado'),
      rot(temPixel, 'Pixel de anúncios instalado', 'Sem pixel de anúncios', 'Pixel não verificado'),
    ]);
  } else {
    S('Presença', ['Sem site oficial — presença baseada exclusivamente em mapas e redes']);
  }

  const conf = [];
  if (rating >= 4.5) conf.push(`Boa reputação (${rating})`);
  else conf.push(`Reputação ${rating} — abaixo de 4,5`);
  if (reviews >= 100) conf.push(`${reviews} avaliações consolidadas`);
  else conf.push(`Poucas avaliações (${reviews})`);
  S('Confiança', conf);

  S('AEO', [
    reviews >= 50
      ? 'Volume de avaliações alimenta respostas de IA locais'
      : 'Pouco conteúdo indexável para motores de busca e IA'
  ]);

  // Oportunidades da IA do motor, quando ela rodou, vêm primeiro.
  (motor?.aiAnalysis?.principais_oportunidades || []).slice(0, 3).forEach((o) => opp.push(o));
  if (!hasPhone) opp.push('Adicionar CTA de WhatsApp');
  if (hasSite) {
    if (hasHttps === false) opp.push('Ativar HTTPS');
    if (rapido === false) opp.push('Otimizar velocidade do site');
    if (isMobileFriendly === false) opp.push('Adaptar para dispositivos móveis');
    if (botaoWhats === false) opp.push('Colocar botão de WhatsApp no site');
    if (temPixel === false) opp.push('Instalar pixel para anúncios');
  } else if (preset === 'sites') {
    opp.push('Propor criação de site moderno e responsivo');
  }

  if (rating < 4.5) opp.push('Trabalhar gestão de reputação e avaliações');
  if (reviews < 50) opp.push('Estratégia de captação de avaliações');

  const notaMotor = Number(motor?.score?.value);
  const nota = Number.isFinite(notaMotor) ? Math.round(notaMotor) : sc;
  return {
    score: nota,
    band: scBand(nota),
    verificado: Boolean(site),
    argumento: motor?.aiAnalysis?.argumento_principal_venda || '',
    pos,
    neg,
    opp: opp.slice(0, 5),
    sections: sec,
    factors: F,
    noSite: !hasSite,
    ts: Date.now(),
  };
}

export default function LeadScoring({ onUpdateScoringCount, addLog, onAbrirConfiguracoes }) {
  const [leads, setLeads] = useState(() => normalizeLeadCollection(readLocalArray('sigma_leads')));
  const [groups, setGroups] = useState(() => {
    const g = readLocalArray('sigma_groups');
    // Sem grupos, a lista começa vazia. Antes nasciam dois grupos inventados.
    return g;
  });

  // Grupo ativo
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    try {
      const saved = localStorage.getItem('sigma_scgroup');
      if (saved !== null) return saved;
    } catch {}
    return '';
  });

  // Configuração de IA
  const [aiConfig, setAiConfig] = useState(() => readAiConfig());
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState(() => readAiConfig());
  const [showKey, setShowKey] = useState(false);

  // Análises salvas. Antes, com o banco vazio, nasciam duas análises inventadas
  // (notas 82 e 45, atribuídas a uma IA que nunca rodou).
  const [analysisMap, setAnalysisMap] = useState(() => readStoredAnalysis());

  // Estado de execução do scoring
  const [isRunning, setIsRunning] = useState(false);
  const [runStates, setRunStates] = useState({}); // { [leadId]: 'wait' | 'run' | 'done' | 'fail' | 'nosite' }
  const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });
  const [progressText, setProgressText] = useState('');

  // Seleção na tabela
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  // Modal de Detalhes do Lead
  const [detailLead, setDetailLead] = useState(null);
  const [openAccSections, setOpenAccSections] = useState({});

  const runTimerRef = useRef(null);

  // Sincronizar dados do localStorage
  useEffect(() => {
    const refreshData = () => {
      setLeads(normalizeLeadCollection(readLocalArray('sigma_leads')));
      setGroups(readLocalArray('sigma_groups'));
      setAnalysisMap(readStoredAnalysis());
    };
    window.addEventListener('storage', refreshData);
    window.addEventListener('sigma:leads-updated', refreshData);
    window.addEventListener('sigma:groups-updated', refreshData);
    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('sigma:leads-updated', refreshData);
      window.removeEventListener('sigma:groups-updated', refreshData);
    };
  }, []);

  // Notificar contagem de leads analisados
  useEffect(() => {
    const scoredCount = Object.keys(analysisMap).length;
    onUpdateScoringCount?.(scoredCount);
  }, [analysisMap, onUpdateScoringCount]);

  // Objeto do grupo ativo
  const currentGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Lista de leads do grupo ativo
  const groupLeads = useMemo(() => {
    if (!currentGroup) return [];
    const members = currentGroup.members || [];
    if (!members.length) {
      return leads.slice(0, 4);
    }
    const filtered = leads.filter((l, idx) =>
      members.includes(l.id) ||
      members.includes(idx) ||
      members.includes(String(idx)) ||
      members.includes(String(l.id))
    );
    return filtered.length > 0 ? filtered : leads.slice(0, 4);
  }, [currentGroup, leads]);

  // Salvar grupo selecionado
  const handleSelectGroup = (id) => {
    setSelectedGroupId(id);
    try {
      if (id) localStorage.setItem('sigma_scgroup', id);
      else localStorage.setItem('sigma_scgroup', '');
    } catch {}
  };

  // Abrir modal de IA
  const handleOpenAiModal = () => {
    setAiDraft({ ...aiConfig });
    setShowKey(false);
    setIsAiModalOpen(true);
  };

  // Salvar modal de IA
  const handleSaveAiModal = () => {
    setAiConfig(aiDraft);
    saveAiConfig(aiDraft);
    setIsAiModalOpen(false);
  };

  // Testar conexão de IA
  // Executar análise em lote
  /**
   * Analisa um lead com o motor do processo principal: ele visita o site,
   * mede HTTPS, celular, velocidade, botão de WhatsApp e pixel, e usa a IA
   * configurada quando houver chave. Sem o motor (prévia no navegador), não
   * inventa resultado: devolve null.
   */
  const analisarComMotor = async (lead) => {
    if (!window.leadScoringAPI?.analyzeLead) return null;
    const r = await window.leadScoringAPI.analyzeLead(lead, { pais: lead.pais });
    if (!r?.success) throw new Error(r?.error || 'O motor de análise não respondeu.');
    const resultado = auditLead(lead, aiConfig.preset, r.lead?.siteAnalysis || null, r.lead);
    resultado.provider = r.lead?.aiAnalysis ? aiConfig.provider : 'regras';
    resultado.model = r.lead?.aiAnalysis ? (aiConfig.model || 'padrão') : 'sem IA';
    resultado.preset = aiConfig.preset;
    return resultado;
  };

  const gravaAnalise = (leadId, resultado) => {
    setAnalysisMap((prev) => {
      const updated = { ...prev, [leadId]: resultado };
      saveStoredAnalysis(updated);
      return updated;
    });
  };

  // Executar análise em lote, um lead por vez, com o motor real.
  const handleRunScoring = async () => {
    if (isRunning) {
      runTimerRef.current = 'parar';
      setProgressText('Parando depois do lead atual…');
      return;
    }
    if (!groupLeads.length) return;
    if (!window.leadScoringAPI?.analyzeLead) {
      setProgressText('A análise de site só funciona no aplicativo de desktop.');
      return;
    }

    setIsRunning(true);
    runTimerRef.current = null;
    const total = groupLeads.length;
    const initialStates = {};
    groupLeads.forEach((l) => { initialStates[l.id] = 'wait'; });
    setRunStates(initialStates);

    for (let idx = 0; idx < total; idx++) {
      if (runTimerRef.current === 'parar') {
        setProgressText(`Análise pausada em ${idx} de ${total}.`);
        break;
      }
      const lead = groupLeads[idx];
      setRunStates((prev) => ({ ...prev, [lead.id]: 'run' }));
      setProgressCount({ current: idx + 1, total });
      setProgressText(`Analisando ${idx + 1} de ${total}: ${lead.name || 'Empresa'}`);
      try {
        const resultado = await analisarComMotor(lead);
        gravaAnalise(lead.id, resultado);
        setRunStates((prev) => ({ ...prev, [lead.id]: resultado.noSite ? 'nosite' : 'done' }));
      } catch (e) {
        setRunStates((prev) => ({ ...prev, [lead.id]: 'fail' }));
        addLog?.(`[SCORING] ${lead.name || 'lead'}: ${e.message}`);
      }
      if (idx === total - 1) setProgressText('Análise concluída!');
    }
    setIsRunning(false);
  };

  // Reanalisar lead único
  const handleRetrySingle = async (lead) => {
    const leadId = lead.id;
    setRunStates((prev) => ({ ...prev, [leadId]: 'run' }));
    try {
      const resultado = await analisarComMotor(lead);
      if (!resultado) {
        setRunStates((prev) => ({ ...prev, [leadId]: 'fail' }));
        setProgressText('A análise de site só funciona no aplicativo de desktop.');
        return;
      }
      gravaAnalise(leadId, resultado);
      setRunStates((prev) => ({ ...prev, [leadId]: resultado.noSite ? 'nosite' : 'done' }));
    } catch (e) {
      setRunStates((prev) => ({ ...prev, [leadId]: 'fail' }));
      addLog?.(`[SCORING] ${lead.name || 'lead'}: ${e.message}`);
    }
  };

  // Alternar seleção de linha
  const toggleRowSelect = (id) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Selecionar todos
  const toggleSelectAll = () => {
    if (selectedRowIds.size === groupLeads.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(groupLeads.map((l) => l.id)));
    }
  };

  // Exportar selecionados
  const handleExportSelected = () => {
    const itemsToExport = groupLeads.filter((l) => selectedRowIds.has(l.id));
    window.electronAPI?.exportLeads?.(itemsToExport, 'csv');
  };

  // Toggle accordion section in detail modal
  const toggleAcc = (secTitle) => {
    setOpenAccSections((prev) => ({ ...prev, [secTitle]: !prev[secTitle] }));
  };

  const progressPct = progressCount.total > 0
    ? Math.round((progressCount.current / progressCount.total) * 100)
    : 0;

  const currentPresetName = AUDITS[aiConfig.preset]?.name || aiConfig.preset;
  const currentProviderName = PROVIDERS[aiConfig.provider]?.name || aiConfig.provider;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Se nenhum grupo selecionado: Estado Vazio (#scEmpty) */}
      {!currentGroup ? (
        <div id="scEmpty">
          <div className="empty" style={{ padding: '56px 20px' }}>
            <div className="e-icon">◎</div>
            <b style={{ color: 'var(--fg)', fontSize: 15 }}>Selecione um grupo para analisar</b>
            <span style={{ maxWidth: '46ch', textAlign: 'center', lineHeight: 1.5 }}>
              O scoring investiga a presença digital das empresas de um grupo, uma por uma.
            </span>

            <div className="field" style={{ minWidth: 'min(320px, 80vw)', marginTop: 8 }}>
              <select
                id="scGroupPick"
                aria-label="Selecionar grupo"
                value={selectedGroupId}
                onChange={(e) => handleSelectGroup(e.target.value)}
              >
                <option value="">Escolher grupo…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members ? g.members.length : 0})
                  </option>
                ))}
              </select>
            </div>

            {groups.length === 0 && (
              <div id="scNoGroups" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Você ainda não possui grupos de leads.</span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    window.location.hash = '#base';
                  }}
                >
                  Criar grupo na Base de Leads
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quando grupo está selecionado: Área de Trabalho (#scWork) */
        <div id="scWork" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Top 3 Steps */}
          <div className="sc-cabecalho" data-od-id="scoring-header">
            <div className="sc-cab-topo">
              <span className="sc-cab-icone"><Target size={18} strokeWidth={1.5} /></span>
              <div className="sc-cab-texto">
                <h2>{currentGroup.name}</h2>
                <span>
                  {groupLeads.length} {groupLeads.length === 1 ? 'lead' : 'leads'} · foco em {currentPresetName}
                </span>
              </div>
              <div className="sc-cab-acoes">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSelectGroup('')}>
                  Trocar grupo
                </button>
                <button type="button" className="btn btn-primary" id="scRunBtn" onClick={handleRunScoring}>
                  {isRunning
                    ? `Pausar (${progressCount.current}/${progressCount.total})`
                    : `Analisar ${groupLeads.length} ${groupLeads.length === 1 ? 'lead' : 'leads'}`}
                </button>
              </div>
            </div>

            <div className="sc-cab-rodape">
              <span className="sc-cab-ia">
                <Bot size={13} strokeWidth={1.5} aria-hidden="true" />
                {currentProviderName} · {aiConfig.model || 'modelo padrão'}
                {onAbrirConfiguracoes && (
                  <button type="button" className="sc-link" onClick={onAbrirConfiguracoes}>
                    ajustar em Configurações
                  </button>
                )}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" id="scCfgBtn" onClick={handleOpenAiModal}>
                Mudar foco
              </button>
            </div>
          </div>

          {/* Painel de Progresso (#scProgPanel) */}
          {(isRunning || progressCount.current > 0) && (
            <div className="panel" id="scProgPanel" data-od-id="scoring-progress" style={{ padding: 14, background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ fontSize: 13.5 }} id="scProgTxt">{progressText}</b>
                <span style={{ flex: 1 }} />
                <span className="result-count" id="scProgN">
                  {progressCount.current} / {progressCount.total}
                </span>
              </div>

              <div className="progress-track" style={{ marginTop: 8 }}>
                <div
                  className="progress-fill"
                  id="scProgFill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Fila ao vivo */}
              <div
                id="scRunList"
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 200,
                  overflowY: 'auto'
                }}
              >
                {groupLeads.map((l) => {
                  const st = runStates[l.id] || (analysisMap[l.id] ? (analysisMap[l.id].noSite ? 'nosite' : 'done') : 'wait');
                  const pillConfig = {
                    wait: { label: 'Aguardando', cls: 'st-wait' },
                    run: { label: 'Analisando', cls: 'st-run' },
                    done: { label: 'Concluído', cls: 'st-ok' },
                    fail: { label: 'Falhou', cls: 'st-fail' },
                    nosite: { label: 'Sem site', cls: 'st-nosite' }
                  }[st] || { label: 'Aguardando', cls: 'st-wait' };

                  return (
                    <div key={l.id} className="run-row" id={`run-${l.id}`}>
                      <span className="nm">{l.name || 'Empresa'}</span>
                      <span className={`st-pill ${pillConfig.cls}`}>
                        {pillConfig.label}
                      </span>
                      {st === 'fail' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleRetrySingle(l)}
                        >
                          Tentar de novo
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela de Resultados (#scResults) */}
          <div id="scResults" data-od-id="scoring-results">
            {/* Barra de Seleção */}
            {selectedRowIds.size > 0 && (
              <div className="selbar" id="scSelBar" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-warm)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
                <b id="scSelCount">{selectedRowIds.size}</b>
                <span>selecionados</span>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  id="scSelExp"
                  onClick={handleExportSelected}
                >
                  Exportar CSV
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        className="rowcheck"
                        id="scChkAll"
                        aria-label="Selecionar todos"
                        checked={selectedRowIds.size > 0 && selectedRowIds.size === groupLeads.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Empresa</th>
                    <th>Score</th>
                    <th>Site</th>
                    <th>Situação</th>
                    <th>Oportunidades</th>
                    <th>Atualizado</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody id="scResBody">
                  {groupLeads.map((lead) => {
                    const an = analysisMap[lead.id];
                    const isRowChecked = selectedRowIds.has(lead.id);

                    const score = an ? an.score : null;
                    const band = score != null ? (score >= 80 ? ['high', 'Alta'] : score >= 50 ? ['mid', 'Média'] : ['low', 'Baixa']) : null;

                    const sit = an ? (an.noSite ? ['Sem site', 'st-nosite'] : ['Concluído', 'st-ok']) : ['Não analisado', 'st-wait'];

                    return (
                      <tr key={lead.id} className={isRowChecked ? 'selrow' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className="rowcheck"
                            checked={isRowChecked}
                            aria-label={`Selecionar ${lead.name}`}
                            onChange={() => toggleRowSelect(lead.id)}
                          />
                        </td>
                        <td>
                          <span className="td-empresa">
                            <AvatarLead lead={lead} size={30} />
                            <b
                              style={{ cursor: 'pointer', color: 'var(--accent)' }}
                              onClick={() => setDetailLead(lead)}
                            >
                              {lead.name || 'Empresa'}
                            </b>
                          </span>
                        </td>
                        <td>
                          {an ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{score}</b>
                              <span className={`ftag ${band[0]}`} style={{ marginLeft: 6 }}>
                                {band[1]}
                              </span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--meta)' }}>Não analisado</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--accent)', textDecoration: 'none' }}
                            >
                              {lead.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                            </a>
                          ) : (
                            'Sem site'
                          )}
                        </td>
                        <td>
                          <span className={`st-pill ${sit[1]}`}>{sit[0]}</span>
                        </td>
                        <td style={{ fontSize: 12.5, maxWidth: 220 }} title={an ? an.opp.join('; ') : ''}>
                          {an && an.opp.length > 0 ? an.opp.slice(0, 2).join(' · ') : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {an ? fmtShort(an.ts) : '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleRetrySingle(lead)}
                          >
                            Reanalisar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de IA (#aiCfgOv) */}
      {isAiModalOpen && (
        <div className="overlay on" id="aiCfgOv" data-od-id="modal-config-ia">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aiCfgTitle"
            style={{ width: 'min(520px, 94vw)' }}
          >
            <div className="modal-head">
              <h2 id="aiCfgTitle">Foco da auditoria</h2>
            </div>

            <div className="modal-body" style={{ gridTemplateColumns: '1fr', gap: 14 }}>
              <div className="exp-sec">Foco da auditoria — o que procurar</div>
              <div id="auditPresets" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.keys(AUDITS).map((k) => {
                  const audit = AUDITS[k];
                  const isSel = aiDraft.preset === k;
                  return (
                    <div
                      key={k}
                      className={`exp-row ${isSel ? 'sel' : ''}`}
                      role="radio"
                      aria-checked={isSel}
                      tabIndex={0}
                      onClick={() => setAiDraft({ ...aiDraft, preset: k })}
                    >
                      <b>{audit.name}</b>
                      <span>{audit.hint}</span>
                    </div>
                  );
                })}
              </div>

              {aiDraft.preset === 'custom' && (
                <div className="field" id="auditObjWrap">
                  <label htmlFor="auditObj">Objetivo da análise</label>
                  <input
                    id="auditObj"
                    placeholder="Ex.: empresas com presença fraca e boa reputação local"
                    autoComplete="off"
                    value={aiDraft.objective || ''}
                    onChange={(e) => setAiDraft({ ...aiDraft, objective: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                id="aiCancel"
                onClick={() => setIsAiModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                id="aiSave"
                onClick={handleSaveAiModal}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhe do Lead (com Score e Auditoria) */}
      {detailLead && (
        <div className="overlay on" onClick={() => setDetailLead(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{ width: 'min(640px, 94vw)', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>{detailLead.name || 'Empresa'}</h2>
            </div>

            <div className="modal-body" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              {analysisMap[detailLead.id] ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, lineHeight: 1 }}>
                      {analysisMap[detailLead.id].score}
                    </span>
                    <span className={`ftag ${analysisMap[detailLead.id].score >= 80 ? 'high' : analysisMap[detailLead.id].score >= 50 ? 'mid' : 'low'}`}>
                      {analysisMap[detailLead.id].score >= 80 ? 'Alta' : analysisMap[detailLead.id].score >= 50 ? 'Média' : 'Baixa'}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                    {AUDITS[analysisMap[detailLead.id].preset]?.name || analysisMap[detailLead.id].preset} · {fmtShort(analysisMap[detailLead.id].ts)} · {analysisMap[detailLead.id].provider}
                  </div>

                  {/* Accordions */}
                  {[
                    { t: `Pontos positivos (${analysisMap[detailLead.id].pos.length})`, items: analysisMap[detailLead.id].pos },
                    { t: `Problemas encontrados (${analysisMap[detailLead.id].neg.length})`, items: analysisMap[detailLead.id].neg },
                    { t: `Oportunidades (${analysisMap[detailLead.id].opp.length})`, items: analysisMap[detailLead.id].opp },
                    ...(analysisMap[detailLead.id].sections || [])
                  ].map((sec, idx) => {
                    const isOpen = Boolean(openAccSections[sec.t]);
                    return (
                      <div key={idx} className={`acc ${isOpen ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="acc-head"
                          onClick={() => toggleAcc(sec.t)}
                        >
                          <span>{sec.t}</span>
                          <span className="chev">›</span>
                        </button>
                        <div className="acc-body">
                          <ul>
                            {sec.items.map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">
                  <div className="e-icon">○</div>
                  <b style={{ color: 'var(--fg)' }}>Não analisado</b>
                  <span>Execute a análise do grupo para visualizar o raio-x deste lead.</span>
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDetailLead(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
