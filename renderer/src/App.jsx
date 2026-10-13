import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Menu,
  Minus,
  Square,
  X,
  LayoutDashboard,
  MapPin,
  Database,
  Target,
  Columns3,
  MessageCircle,
  BarChart3,
  Mail,
  Plus,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
  LineChart,
  ClipboardList
} from 'lucide-react';
import { pedirMapa } from './pedidoMapa';
import { chaveDoDia } from './abordagem';
import Overview from './components/Overview';
import MapScraperView from './components/MapScraperView';
import LeadsManager from './components/LeadsManager';
import LeadScoring from './components/LeadScoring';
import Dashboard from './components/Dashboard';
import LogoGrow from './components/LogoGrow';

// Versao exibida no rodape do menu. Acompanha o package.json.
const APP_VERSION = '2.0.0';
import KanbanBoard from './components/KanbanBoard';
import WhatsAppPanel from './components/WhatsAppPanel';
import EmailPanel from './components/EmailPanel';
import NewExtractionModal from './components/NewExtractionModal';
import Configuracoes from './components/Configuracoes';
import OnboardingTour from './components/OnboardingTour';
import { NotificationProvider, useNotifications } from './components/NotificationCenter';
import { dedupeLeads, normalizeLeadCollection, readLocalArray } from './leadData';
import { mascaraTelefone } from './telefone';
import IconePng from './components/IconePng';
import { iniciarSincronizacao, lerSessao, lerEmpresa } from './nuvem';
import { separaNovos, atualizaExistentes, identidadeLead } from './cobertura';

// O Google Maps entrega no máximo uns 120 resultados por busca. Chegou perto
// disso numa cidade inteira, quase certamente ficou gente de fora.
const PERTO_DO_LIMITE_GOOGLE = 100;
import { ehWeb } from './ambiente';
import EntradaWeb from './components/EntradaWeb';
import SoNoComputador from './components/SoNoComputador';

function organizeStoredLeads() {
  const raw = readLocalArray('sigma_leads');
  const organized = normalizeLeadCollection(raw);
  try {
    if (organized.some((lead, index) => (
      lead?.category !== raw[index]?.category
      || lead?.address !== raw[index]?.address
    ))) {
      localStorage.setItem('sigma_leads', JSON.stringify(organized));
    }
  } catch {}
  return organized;
}

class ErrorBoundaryLite extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(`[UI ERROR] ${this.props.label || 'view'}:`, error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 30, color: 'var(--fg)', overflow: 'auto' }}>
          <h3 style={{ color: 'var(--danger)', marginTop: 0 }}>
            Erro ao carregar componente ({this.props.label || 'Tela'})
          </h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'var(--surface-warm)', padding: 16, borderRadius: 8 }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Recarregar Tela
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CommandPalette({ open, onClose, onNavigate, onNewExtraction }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQ('');
    }
  }, [open]);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onClose?.( !open ); }
      if (e.key === 'Escape' && open) onClose?.(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const items = [
    { id: 'scraper', label: 'Ir para Scraper Maps', desc: 'Mapa, leads e Fila do dia', icon: MapPin, action: () => { onNavigate('scraper'); onClose(false); } },
    { id: 'overview', label: 'Ir para Visão Geral', desc: 'Resumo da base, público e temperatura', icon: LayoutDashboard, action: () => { onNavigate('overview'); onClose(false); } },
    { id: 'base', label: 'Ir para Base de Leads', desc: 'Filtrar, organizar e exportar', icon: Database, action: () => { onNavigate('base'); onClose(false); } },
    { id: 'scoring', label: 'Ir para Lead Scoring', desc: 'Presença digital e oportunidades de venda', icon: Target, action: () => { onNavigate('scoring'); onClose(false); } },
    { id: 'kanban', label: 'Ir para Kanban', desc: 'Funil comercial de todos os leads', icon: Columns3, action: () => { onNavigate('kanban'); onClose(false); } },
    { id: 'whatsapp', label: 'Ir para WhatsApp', desc: 'Chats e campanhas', icon: MessageCircle, action: () => { onNavigate('whatsapp'); onClose(false); } },
    { id: 'email', label: 'Ir para E-mail', desc: 'Campanhas pelo Gmail', icon: Mail, action: () => { onNavigate('email'); onClose(false); } },
    { id: 'dashboard', label: 'Ir para Resultados', desc: 'O que foi enviado e quem respondeu', icon: BarChart3, action: () => { onNavigate('dashboard'); onClose(false); } },
    { id: 'settings', label: 'Ir para Configurações', desc: 'Empresa e sincronização, chave de IA', icon: Settings, action: () => { onNavigate('settings'); onClose(false); } },
    { id: 'new', label: 'Nova Extração…', desc: 'Criar busca no Google Maps', icon: Plus, action: () => { onClose(false); onNewExtraction(); } },
  ];
  const filtered = q.trim() ? items.filter(i => (`${i.label} ${i.desc}`.toLowerCase().includes(q.toLowerCase()))) : items;
  return (
    <div className="overlay on" id="cmdkOv" data-od-id="cmdk" onClick={() => onClose(false)}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Busca global" onClick={e=>e.stopPropagation()}>
        <div className="cmdk-row">
          <Search size={16} aria-hidden="true" />
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar leads, campanhas, ações…" />
          <span className="tag-lote">ESC</span>
        </div>
        <div className="cmdk-list">
          {filtered.length===0 ? <div className="empty"><b>Nenhum resultado</b><span>Tente outro termo.</span></div> : filtered.map(it=> {
            const Icone = it.icon;
            return (
            <button key={it.id} className="cmdk-item" onClick={it.action}>
              <span className="cmdk-ic"><Icone size={16} /></span>
              <span style={{ minWidth:0 }}><b style={{ display:'block', fontSize:13 }}>{it.label}</b><span style={{ display:'block', fontSize:12, color:'var(--muted)' }}>{it.desc}</span></span>
            </button>
            );
          })}
        </div>
        <div className="cmdk-row" style={{ fontSize:11, color:'var(--muted)', gap:12 }}>
          <span><b>↵</b> selecionar</span><span><b>↑↓</b> navegar</span><span><b>⌘K</b> abrir/fechar</span>
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const [activeTab, setActiveTab] = useState(() => {
    try { const h = location.hash.slice(1); if(['overview','scraper','base','scoring','kanban','whatsapp','email','dashboard','settings'].includes(h)) return h; } catch{}
    return 'overview';
  });
  const [isNewExtractionOpen, setIsNewExtractionOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  // Menu lateral aberto ou recolhido; lembra a escolha entre aberturas do app.
  // Sincronização com a empresa na nuvem: quando chega dado novo de outro
  // computador, a tela atual é montada de novo para ler os dados atualizados.
  const [versaoDados, setVersaoDados] = useState(0);

  // Contador da Fila do dia no menu: quantas saíram hoje de quantas da meta.
  const leMetaFila = () => {
    try {
      const log = JSON.parse(localStorage.getItem('sigma_abordagem_log') || '{}') || {};
      const cfg = JSON.parse(localStorage.getItem('sigma_abordagem_cfg') || '{}') || {};
      const hoje = chaveDoDia();
      const feitas = Object.values(log).filter((e) => e?.status === 'enviada' && e.dia === hoje).length;
      return { feitas, meta: Number(cfg.limite) || 20 };
    } catch { return { feitas: 0, meta: 20 }; }
  };
  const [metaFila, setMetaFila] = useState(leMetaFila);
  useEffect(() => {
    const atualiza = () => setMetaFila(leMetaFila());
    const t = setInterval(atualiza, 5000);
    window.addEventListener('focus', atualiza);
    return () => { clearInterval(t); window.removeEventListener('focus', atualiza); };
  }, []);
  // Dado novo da nuvem recarrega a tela, mas nunca com uma janela aberta (Fila
  // do dia, detalhes) ou alguém digitando: espera fechar para não perder nada.
  useEffect(() => {
    let pendente = false;
    const ocupado = () => Boolean(
      document.querySelector('.overlay.on, [aria-modal="true"]')
      || document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]'),
    );
    const aplica = () => {
      if (!pendente || ocupado()) return;
      pendente = false;
      setVersaoDados((v) => v + 1);
    };
    const parar = iniciarSincronizacao(() => { pendente = true; aplica(); });
    const relogio = setInterval(aplica, 1500);
    return () => { parar(); clearInterval(relogio); };
  }, []);

  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    try { return localStorage.getItem('sigma_menu_aberto') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('sigma_menu_aberto', isSidebarLocked ? '1' : '0'); } catch {}
  }, [isSidebarLocked]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waPhone, setWaPhone] = useState('');

  // O perfil do header mostra a conta de WhatsApp em operacao, que e o unico
  // "quem sou eu" real deste app: nao existe conta de usuario.
  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      try {
        const res = await window.whatsappAPI?.listConnections?.();
        const lista = res?.connections || [];
        const ativa = lista.find((c) => c.active && c.connected) || lista.find((c) => c.connected);
        if (!vivo) return;
        setWaPhone(ativa?.phoneNumber || '');
        // O texto do topo acompanha a realidade mesmo com a aba WhatsApp fechada
        // (o app reconecta a sessão salva sozinho ao abrir).
        if (ativa) setWaStatus('connected');
        else setWaStatus((atual) => (atual === 'connected' ? 'disconnected' : atual));
      } catch { /* fora do Electron nao ha API */ }
    };
    carregar();
    const t = setInterval(carregar, 15000);
    // Avisos de conexão em tempo real: a reconexão automática ao abrir acontece
    // antes de qualquer tela ouvir, então a consulta acima cobre o que passou.
    const parar = window.whatsappAPI?.onStatus?.((payload) => {
      const { data, aggregateStatus, anyConnected, status } = payload || {};
      const proximo = aggregateStatus || data?.aggregateStatus
        || (anyConnected || data?.anyConnected ? 'connected' : null) || status || 'disconnected';
      if (vivo) setWaStatus(proximo);
      carregar();
    });
    return () => { vivo = false; clearInterval(t); if (typeof parar === 'function') parar(); };
  }, []);
  const [leadsCount, setLeadsCount] = useState(() => dedupeLeads(organizeStoredLeads()).length);
  const [scoringCount, setScoringCount] = useState(0);
  const [activeExtraction, setActiveExtraction] = useState(null);

  const { addNotification } = useNotifications();
  const mapScraperRef = useRef(null);

  // Persist hash + shortcuts ⌘1-5
  useEffect(()=>{ try{ history.replaceState(null,'','#'+activeTab); }catch{} }, [activeTab]);
  useEffect(()=>{
    const onKey=(e)=>{
      if((e.metaKey||e.ctrlKey) && /^[1-6]$/.test(e.key)){
        e.preventDefault();
        const map=['overview','scraper','base','scoring','kanban','whatsapp'];
        const i=Number(e.key)-1; if(map[i]) setActiveTab(map[i]);
      }
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setIsCmdOpen(v=>!v); }
    };
    window.addEventListener('keydown', onKey);
    return()=> window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('side-locked', isSidebarLocked);
    document.body.classList.toggle('nav-open', isMobileNavOpen);
    document.body.classList.toggle('route-whatsapp', activeTab === 'whatsapp');
    document.body.classList.toggle('route-kanban', activeTab === 'kanban');
    return () => {
      document.body.classList.remove('side-locked', 'nav-open', 'route-whatsapp', 'route-kanban');
    };
  }, [isSidebarLocked, isMobileNavOpen, activeTab]);

  const navigate = (tab) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
  };

  const handleMinimize = () => window.electronAPI?.winMinimize();
  const handleMaximize = () => window.electronAPI?.winMaximize();
  const handleClose = () => window.electronAPI?.winClose();

  const handleStartExtraction = async ({ niche, neigh, bairros = [], city, pais = 'BR', limit, area = null, localLabel = '', local: localEscolhido = null }) => {
    if (ehWeb) {
      addNotification({
        type: 'info',
        category: 'scraper',
        title: 'Extração roda no computador',
        message: 'O robô do Google Maps fica no Prospector instalado no PC. Os leads extraídos lá aparecem aqui sozinhos.',
      });
      return;
    }
    if (activeExtraction) {
      addNotification({
        type: 'info',
        category: 'scraper',
        title: 'Extração em andamento',
        message: 'Aguarde a busca atual terminar ou cancele-a antes de iniciar outra.',
      });
      return;
    }
    setActiveTab('scraper');
    // Com muitos bairros o texto ficaria enorme na notificação e no histórico.
    const local = bairros.length > 2 ? `${bairros.length} bairros` : neigh;
    // Por raio, o Maps abre centrado no ponto: a busca leva só o nicho.
    const qstr = area ? niche : [niche, bairros.length > 1 ? '' : neigh, city].filter(Boolean).join(' ').trim();
    const ondeTexto = area ? `${area.raioKm} km de ${localLabel}` : [local, city].filter(Boolean).join(', ');
    const searchId = `scrape_${Date.now()}`;
    addNotification({
      type: 'info',
      category: 'scraper',
      title: 'Iniciando Extração',
      message: `Buscando ${niche} em ${ondeTexto}${pais === 'US' ? ' (EUA)' : ''}...`
    });

    if (!window.electronAPI || typeof window.electronAPI.startScrape !== 'function') {
      addNotification({ type: 'error', category: 'scraper', title: 'Extração indisponível', message: 'A ponte do desktop não está disponível. Reinicie o aplicativo.' });
      return;
    }

    setActiveExtraction({ id: searchId, query: qstr, rotulo: `${niche} · ${ondeTexto}`, pais, startedAt: Date.now() });
    try {
      // Dois ou mais bairros: uma busca por bairro, somadas no processo principal.
      const divisao = bairros.length > 1 ? { nicho: niche, cidade: city, areas: bairros } : null;
      const res = await window.electronAPI.startScrape(qstr, limit, searchId, pais, divisao, area);
      if (!res?.success) {
        if (res?.cancelled) {
          addNotification({ type: 'info', category: 'scraper', title: 'Extração cancelada', message: 'Nenhum resultado parcial foi adicionado à base.' });
          return;
        }
        throw new Error(res?.error || 'O Google Maps não retornou resultados para esta busca.');
      }
      let resultLeads = Array.isArray(res.data) ? res.data : [];
      if (!resultLeads.length) throw new Error('A busca foi concluída, mas não retornou leads válidos.');

      // "Extrair a cidade inteira": se a busca bateu no limite do Google, divide
      // a cidade em bairros sozinho e continua até cobrir tudo.
      let bairrosAutomaticos = [];
      const cidadeInteira = !area && bairros.length <= 1 && localEscolhido?.tipo === 'cidade';
      if (cidadeInteira && resultLeads.length >= PERTO_DO_LIMITE_GOOGLE && window.electronAPI.sugerirBairros) {
        addNotification({
          type: 'info',
          category: 'scraper',
          title: 'Cidade grande: dividindo por bairros',
          message: `${resultLeads.length} resultados é o limite do Google por busca. Buscando bairro por bairro para pegar todos de ${city}.`,
        });
        try {
          const sb = await window.electronAPI.sugerirBairros(city, pais);
          bairrosAutomaticos = sb?.success && Array.isArray(sb.bairros) ? sb.bairros : [];
          if (bairrosAutomaticos.length > 1) {
            const res2 = await window.electronAPI.startScrape(qstr, limit, searchId, pais, { nicho: niche, cidade: city, areas: bairrosAutomaticos }, null);
            if (res2?.success && Array.isArray(res2.data)) {
              resultLeads = [...resultLeads, ...res2.data];
            } else {
              addNotification({
                type: 'info',
                category: 'scraper',
                title: res2?.cancelled ? 'Divisão por bairros cancelada' : 'Divisão por bairros não terminou',
                message: `Ficam os ${resultLeads.length} leads da primeira busca. Dá para extrair por bairros depois.`,
              });
              bairrosAutomaticos = [];
            }
          } else {
            bairrosAutomaticos = [];
          }
        } catch {
          bairrosAutomaticos = [];
        }
        // A busca da cidade e a dos bairros se repetem: fica um de cada.
        const vistos = new Set();
        resultLeads = resultLeads.filter((l) => {
          const k = identidadeLead(l);
          if (vistos.has(k)) return false;
          vistos.add(k);
          return true;
        });
      }

      // O que já está na base não entra de novo: fica na extração em que apareceu primeiro.
      // Quem reapareceu tem os dados do Google atualizados (nota, avaliações...).
      const { base: current } = atualizaExistentes(readLocalArray('sigma_leads'), resultLeads);
      const { novos, repetidos } = separaNovos(resultLeads, current);
      const combined = normalizeLeadCollection([
        ...novos.map((lead) => ({ ...lead, searchId, pais, id: lead.id || Math.random().toString(36).slice(2) })),
        ...current,
      ]);
      const currentSearches = readLocalArray('sigma_searches');
      const nextSearches = [
        ...currentSearches.filter((search) => String(search?.id) !== searchId),
        {
          id: searchId,
          query: qstr,
          label: `${niche} · ${ondeTexto}${pais === 'US' ? ' · EUA' : ''}`,
          source: 'maps',
          pais,
          timestamp: Date.now(),
          // Onde foi, para pintar a área de azul e não extrair o mesmo lugar de novo.
          nicho: niche,
          encontrados: resultLeads.length,
          repetidos,
          area: localEscolhido && Number.isFinite(Number(localEscolhido.lat)) ? {
            tipo: area ? 'raio' : localEscolhido.tipo,
            nome: localEscolhido.nome || '',
            cidade: localEscolhido.cidade || '',
            uf: localEscolhido.uf || '',
            pais,
            lat: area ? area.lat : Number(localEscolhido.lat),
            lng: area ? area.lng : Number(localEscolhido.lng),
            raioKm: area ? area.raioKm : null,
            chave: localEscolhido.chave || '',
            bairros: bairros.length ? bairros : (bairrosAutomaticos.length ? bairrosAutomaticos : undefined),
            rotulo: ondeTexto,
          } : null,
        },
      ];
      localStorage.setItem('sigma_leads', JSON.stringify(combined));
      localStorage.setItem('sigma_searches', JSON.stringify(nextSearches));
      setLeadsCount(dedupeLeads(combined).length);
      window.dispatchEvent(new CustomEvent('sigma:leads-updated', {
        detail: { leads: combined, searches: nextSearches },
      }));
      addNotification({
        type: res.partial ? 'info' : 'success',
        category: 'scraper',
        title: res.partial ? 'Extração concluída parcialmente' : 'Extração concluída',
        message: [
          `${novos.length} lead${novos.length === 1 ? '' : 's'} novo${novos.length === 1 ? '' : 's'}`,
          repetidos ? `${repetidos} já estava${repetidos === 1 ? '' : 'm'} na base` : '',
          res.partial && res.warnings?.length ? res.warnings[0] : '',
        ].filter(Boolean).join('. ') + '.',
      });
    } catch (err) {
      addNotification({
        type: 'error',
        category: 'scraper',
        title: 'Erro na extração',
        message: err?.message || 'Não foi possível concluir a busca. Tente novamente.',
      });
    } finally {
      setActiveExtraction(null);
    }
  };

  const renderContent = () => {
    if (ehWeb && ['whatsapp', 'campaigns', 'email', 'kanban'].includes(activeTab)) {
      return <SoNoComputador recurso={activeTab === 'campaigns' ? 'whatsapp' : activeTab} onNavigate={navigate} />;
    }
    switch (activeTab) {
      case 'overview':
        return <Overview onNavigate={navigate} onNewExtraction={() => setIsNewExtractionOpen(true)} waStatus={waStatus} leadsCount={leadsCount} scoringCount={scoringCount} />;
      case 'scraper':
        return (
          <ErrorBoundaryLite label="Scraper">
            <MapScraperView
              onUpdateLeadsCount={setLeadsCount}
              addLog={(msg) => console.log(msg)}
              onOpenNewExtraction={() => setIsNewExtractionOpen(true)}
              activeExtraction={activeExtraction}
              waStatus={waStatus}
              onNavigate={navigate}
            />
          </ErrorBoundaryLite>
        );
      case 'scoring':
        return (
          <ErrorBoundaryLite label="Lead Scoring">
            <LeadScoring onUpdateScoringCount={setScoringCount} addLog={(msg) => console.log(msg)} onAbrirConfiguracoes={() => navigate('settings')} />
          </ErrorBoundaryLite>
        );
      case 'kanban':
        return (
          <ErrorBoundaryLite label="Kanban">
            <KanbanBoard onNavigate={navigate} addLog={(msg) => console.log(msg)} />
          </ErrorBoundaryLite>
        );
      case 'base':
        return (
          <ErrorBoundaryLite label="Base de Leads">
            <LeadsManager onUpdateLeadsCount={setLeadsCount} addLog={(msg) => console.log(msg)} />
          </ErrorBoundaryLite>
        );
      case 'whatsapp':
        return (
          <ErrorBoundaryLite label="WhatsApp">
            <WhatsAppPanel waStatus={waStatus} setWaStatus={setWaStatus} addLog={(msg) => console.log(msg)} />
          </ErrorBoundaryLite>
        );
      case 'email':
        return (
          <ErrorBoundaryLite label="E-mail">
            <EmailPanel />
          </ErrorBoundaryLite>
        );
      case 'campaigns': // compat: alias → whatsapp/campanhas tab
        return (
          <ErrorBoundaryLite label="Campanhas">
            <WhatsAppPanel waStatus={waStatus} setWaStatus={setWaStatus} addLog={(msg) => console.log(msg)} initialTab="campaigns" />
          </ErrorBoundaryLite>
        );
      case 'dashboard':
        return (
          <ErrorBoundaryLite label="Dashboard">
            <Dashboard onNavigate={navigate} />
          </ErrorBoundaryLite>
        );
      case 'settings':
        return (
          <ErrorBoundaryLite label="Configurações">
            <Configuracoes versao={APP_VERSION} onNotificar={addNotification} />
          </ErrorBoundaryLite>
        );
      default:
        return (
          <MapScraperView
            onUpdateLeadsCount={setLeadsCount}
            addLog={(msg) => console.log(msg)}
            onOpenNewExtraction={() => setIsNewExtractionOpen(true)}
            activeExtraction={activeExtraction}
            waStatus={waStatus}
            onNavigate={navigate}
          />
        );
    }
  };

  // Versão web sem login e empresa: primeiro conectar.
  if (ehWeb && !(lerSessao() && lerEmpresa())) return <EntradaWeb />;

  return (
    <div className="app-layout-root">
      {/* Left Sidebar */}
      <aside className="app-sidebar">
        {/* Brand Header */}
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => setIsSidebarLocked((value) => !value)}
          aria-expanded={isSidebarLocked}
          title={isSidebarLocked ? 'Recolher o menu' : 'Abrir o menu'}
        >
          <div className="brand-icon-box">
            <LogoGrow size={30} />
          </div>
          <div className="brand-text-col">
            <span className="brand-name">Prospector</span>
            <span className="brand-tag">2.0</span>
          </div>
        </button>

        {/* Primary CTA Button */}
        <div className="sidebar-action-wrap">
          <button
            className="btn-new-extraction"
            onClick={() => setIsNewExtractionOpen(true)}
          >
            <Plus className="sidebar-plus" size={18} aria-hidden="true" />
            <span>Nova Extração</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Produto</div>
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => navigate('overview')}
          >
            <LayoutDashboard className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Visão Geral</span><span className="nav-kbd">1</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'scraper' ? 'active' : ''}`}
            onClick={() => navigate('scraper')}
          >
            <MapPin className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Scraper Maps</span><span className="nav-kbd">2</span>
          </button>

          <button
            className="nav-item nav-fila"
            onClick={() => { pedirMapa({ abrirFila: true }); navigate('scraper'); }}
            title={`Fila do dia: ${metaFila.feitas} de ${metaFila.meta} mensagens enviadas hoje`}
          >
            <ClipboardList className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Fila do dia</span>
            <span className={`nav-kbd nav-fila-meta${metaFila.feitas >= metaFila.meta ? ' feita' : ''}`}>{metaFila.feitas}/{metaFila.meta}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'base' ? 'active' : ''}`}
            onClick={() => navigate('base')}
          >
            <Database className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Base de Leads</span><span className="nav-kbd">3</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'scoring' ? 'active' : ''}`}
            onClick={() => navigate('scoring')}
          >
            <Target className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Lead Scoring</span><span className="nav-kbd">4</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`}
            onClick={() => navigate('kanban')}
          >
            <Columns3 className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Kanban</span><span className="nav-kbd">5</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => navigate('whatsapp')}
          >
            <MessageCircle className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">WhatsApp</span><span className="nav-kbd">6</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => navigate('email')}
          >
            <Mail className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">E-mail</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('dashboard')}
          >
            <LineChart className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Resultados</span><span className="nav-kbd">7</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-item menu-toggle"
            onClick={() => setIsSidebarLocked((value) => !value)}
            aria-expanded={isSidebarLocked}
            title={isSidebarLocked ? 'Recolher o menu' : 'Abrir o menu'}
          >
            {isSidebarLocked
              ? <PanelLeftClose className="ico" size={18} aria-hidden="true" />
              : <PanelLeftOpen className="ico" size={18} aria-hidden="true" />}
            <span className="nav-label-text">Recolher menu</span>
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}>
            <Settings className="ico" size={18} aria-hidden="true" />
            <span className="nav-label-text">Configurações</span>
          </button>
          <div className="sidebar-release">v{APP_VERSION}</div>
        </div>
      </aside>
      <button type="button" className="app-nav-scrim" aria-label="Fechar navegação" onClick={() => setIsMobileNavOpen(false)} />

      {/* Main Container (Header + Main Screen Area) */}
      <div className="app-main-viewport">
        {/* Top Header Bar — 48px, light, blur */}
        <header className="app-header-bar" onDoubleClick={handleMaximize}>
          <button type="button" className="mobile-menu-btn" onClick={() => setIsMobileNavOpen(true)} aria-label="Abrir navegação"><Menu size={18} /></button>
          <button type="button" className="header-search-wrap" onClick={() => setIsCmdOpen(true)} title="Abrir busca global (⌘K)">
            <Search size={14} className="header-search-icon" />
            <span>Buscar leads, campanhas, ações…</span>
          </button>

          {/* Right Header Actions */}
          <div className="header-right-actions">
            <button type="button" className="hdr-perfil" onClick={() => navigate('whatsapp')} title="Gerenciar conexões do WhatsApp">
              <span className={`hdr-avatar${waStatus === 'connected' ? ' on' : ''}`} aria-hidden="true">
                <MessageCircle size={17} />
              </span>
              <span className="hdr-perfil-txt">
                <b>{waPhone ? mascaraTelefone(waPhone) : 'WhatsApp'}</b>
                <span>{waStatus === 'connected' ? 'Conectado' : 'Desconectado'}</span>
              </span>
            </button>

            {/* Window Controls (Frameless Drag/Close) */}
            <div className="window-control-buttons">
              <button onClick={handleMinimize} title="Minimizar" className="win-btn"><Minus size={13} /></button>
              <button onClick={handleMaximize} title="Maximizar" className="win-btn"><Square size={11} /></button>
              <button onClick={handleClose} title="Fechar" className="win-btn win-close"><X size={13} /></button>
            </div>
          </div>
        </header>

        {/* Screen Content — view-transition */}
        <main className="app-screen-container">
          <div key={`${activeTab}-${versaoDados}`} className="view-transition" style={{ flex:1, display:'flex', flexDirection:'column' }}>
            {renderContent()}
          </div>
        </main>
        <CommandPalette open={isCmdOpen} onClose={setIsCmdOpen} onNavigate={setActiveTab} onNewExtraction={() => setIsNewExtractionOpen(true)} />
        <OnboardingTour onNavigate={navigate} onNewExtraction={() => setIsNewExtractionOpen(true)} />
      </div>

      {/* New Extraction Modal */}
      <NewExtractionModal
        isOpen={isNewExtractionOpen}
        onClose={() => setIsNewExtractionOpen(false)}
        onStartExtraction={handleStartExtraction}
        onAddToQueue={({ niche, neigh, city, pais }) => {
          addNotification({
            type: 'info',
            category: 'scraper',
            title: 'Adicionado à Fila',
            message: `${niche} em ${neigh || city}${pais === 'US' ? ' (EUA)' : ''}`
          });
        }}
        isProcessing={Boolean(activeExtraction)}
      />
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppInner />
    </NotificationProvider>
  );
}
