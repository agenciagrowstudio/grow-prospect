import React, { useMemo, useState } from 'react';
import { Search, Activity, Users, Phone, Globe, Instagram, Clock, TrendingUp, TrendingDown, ArrowUpRight, Layers, Zap, Target } from 'lucide-react';
import GraficoArea, { construirSerie, lerExtracoes, totalSerie, variacaoSerie } from './GraficoArea';
import { dedupeLeads, getLeadStats, getSearchLeadCount, readLocalArray } from '../leadData';

function MiniSpark({ values }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 60;
    const y = 18 - (v / max) * 14;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" style={{ display:'block' }}>
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} style={{ opacity:.9 }} />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="2.2" fill="var(--accent)" />
    </svg>
  );
}

function Dashboard() {
  const leads = useMemo(() => readLocalArray('sigma_leads'), []);
  const searches = useMemo(() => readLocalArray('sigma_searches'), []);
  const dedupedLeads = useMemo(() => dedupeLeads(leads), [leads]);
  const { total, phoneCount, webCount, igCount } = getLeadStats(dedupedLeads);
  const getPct = (val) => (total > 0 ? Math.round((val / total) * 100) : 0);

  const categoryCounts = {};
  dedupedLeads.forEach((l) => { if (l.category) categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCategoryCount = topCategories[0]?.[1] || 1;
  const recentSearches = [...searches].reverse().slice(0, 6);
  const hasData = total > 0;
  const [focoDash, setFocoDash] = useState(null);

  // Mesma serie das outras telas: a origem do dado fica num lugar so.
  const serieDash = useMemo(() => construirSerie(lerExtracoes(), 30), [leads]);
  const variacaoDash = useMemo(() => variacaoSerie(serieDash), [serieDash]);
  const totalSerieDash = useMemo(() => totalSerie(serieDash), [serieDash]);
  const coverage = total ? Math.round(((phoneCount + webCount + igCount) / (total*3))*100) : 0;

  // sparkline mock baseado em buscas
  const sparkVals = recentSearches.length ? recentSearches.map(s=> getSearchLeadCount(leads, s.id)).slice(0,5).reverse() : [2,5,3,8,6];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:1120, width:'100%' }}>
      <header className="ov-head">
        <div className="ov-head-txt">
          <h1 className="ov-title">Painel de Análises</h1>
          <p className="ov-sub tagline">Cobertura por canal e nichos que mais retornam.</p>
        </div>
        <div className="ov-actions">
          <span className="ov-selo">{hasData ? 'Base pronta' : 'Base vazia'}</span>
        </div>
      </header>

      <section className="ov-kpis" aria-label="Cobertura da base">
        <article className="ov-kpi principal">
          <div className="ov-kpi-top">
            <span className="ov-kpi-label">Total de leads</span>
            <span className="ov-kpi-badge" aria-hidden="true"><Users size={18} /></span>
          </div>
          <div className="ov-kpi-row"><span className="ov-kpi-val">{total}</span></div>
          <div className="ov-kpi-foot">leads únicos na base</div>
        </article>

        <article className="ov-kpi">
          <div className="ov-kpi-top">
            <span className="ov-kpi-label">Com telefone</span>
            <span className="ov-kpi-badge" aria-hidden="true"><Phone size={18} /></span>
          </div>
          <div className="ov-kpi-row">
            <span className="ov-kpi-val">{phoneCount}</span>
            <span className="ov-kpi-pill">{getPct(phoneCount)}%</span>
          </div>
          <div className="ov-kpi-foot">podem ser abordados</div>
        </article>

        <article className="ov-kpi">
          <div className="ov-kpi-top">
            <span className="ov-kpi-label">Com site</span>
            <span className="ov-kpi-badge" aria-hidden="true"><Globe size={18} /></span>
          </div>
          <div className="ov-kpi-row">
            <span className="ov-kpi-val">{webCount}</span>
            <span className="ov-kpi-pill">{getPct(webCount)}%</span>
          </div>
          <div className="ov-kpi-foot">entram no lead scoring</div>
        </article>

        <article className="ov-kpi">
          <div className="ov-kpi-top">
            <span className="ov-kpi-label">Com Instagram</span>
            <span className="ov-kpi-badge" aria-hidden="true"><Instagram size={18} /></span>
          </div>
          <div className="ov-kpi-row">
            <span className="ov-kpi-val">{igCount}</span>
            <span className="ov-kpi-pill">{getPct(igCount)}%</span>
          </div>
          <div className="ov-kpi-foot">presença social</div>
        </article>
      </section>

      <section className="ov-chart" aria-label="Leads captados nos últimos 30 dias">
        <div className="ov-chart-head">
          <div>
            <h3 className="ov-chart-title">Leads captados</h3>
            <div className="ov-chart-val">
              <span className="ov-chart-big">{totalSerieDash.toLocaleString('pt-BR')}</span>
              {variacaoDash !== null ? (
                <span className={`ov-delta${variacaoDash < 0 ? ' baixa' : ''}`}>
                  {variacaoDash < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                  {Math.abs(variacaoDash)}%
                </span>
              ) : null}
              <span className="ov-chart-ctx">nos últimos 30 dias</span>
            </div>
          </div>
        </div>
        <GraficoArea id="grDash" pontos={serieDash} foco={focoDash} onFoco={setFocoDash} />
      </section>

      {/* Bento grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1.35fr .85fr', gap:12 }}>
        {/* Categorias — horizontal bars modernas */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}><Activity size={14} style={{ color:'var(--accent)' }}/> Categorias que mais retornam</h3>
            <span style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}><TrendingUp size={12}/> Top 6</span>
          </div>
          {topCategories.length === 0 ? (
            <div style={{ textAlign:'center', padding:'22px 16px', color:'var(--muted)' }}>
              <div style={{ width:40, height:40, borderRadius:999, background:'var(--surface-2)', border:'1px solid var(--border)', display:'grid', placeItems:'center', margin:'0 auto' }}><Search size={16}/></div>
              <div style={{ fontSize:12, fontWeight:600, marginTop:8, color:'var(--fg)' }}>Sem categorias ainda</div>
              <div style={{ fontSize:11, marginTop:2 }}>Faça uma extração e volte aqui — o gráfico aparece sozinho.</div>
            </div>
          ) : (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
              {topCategories.map(([name, count], idx)=>(
                <div key={name} style={{ display:'grid', gridTemplateColumns:'24px 1fr 36px', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:11, fontWeight:700, color: idx===0?'var(--accent)':'var(--muted)' }}>#{idx+1}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={name}>{name}</div>
                    <div style={{ height:6, background:'var(--track-bg)', borderRadius:999, marginTop:4, overflow:'hidden' }}>
                      <div style={{ width:`${Math.round((count/maxCategoryCount)*100)}%`, height:'100%', borderRadius:999, background: 'var(--accent)', opacity: idx === 0 ? 1 : 0.55, transition:'width 500ms ease' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, textAlign:'right' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, padding:'4px 8px', borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', border:'1px solid rgba(99,102,241,.18)' }}>{coverage}% cobertura média</span>
            <span style={{ fontSize:11, padding:'4px 8px', borderRadius:999, background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--muted)' }}>{Object.keys(categoryCounts).length} nichos únicos</span>
          </div>
        </div>

        {/* Coluna direita — histórico + atalhos */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14, flex:1 }}>
            <h3 style={{ fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}><Clock size={14} style={{ color:'var(--accent)' }}/> Histórico de buscas</h3>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{recentSearches.length ? 'Últimas extrações — clique para filtrar' : 'Suas buscas aparecerão aqui'}</div>
            {recentSearches.length === 0 ? (
              <div style={{ textAlign:'center', padding:'18px 12px', marginTop:8, border:'1px dashed var(--border)', borderRadius:8, background:'var(--surface-2)' }}>
                <div style={{ fontSize:12, fontWeight:600 }}>Nenhuma busca ainda</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Ex: “Clínicas em Pinheiros · 30 leads”</div>
              </div>
            ) : (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                {recentSearches.map(s=>{
                  const c = getSearchLeadCount(leads, s.id);
                  return (
                    <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface)', transition:'border-color 120ms' }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:'var(--accent-soft)', color:'var(--accent)', display:'grid', placeItems:'center', flexShrink:0 }}><Search size={11}/></div>
                      <span style={{ fontSize:12, fontWeight:500, minWidth:0, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={s.label||s.query}>{s.label||s.query}</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:999, background:'var(--surface-2)', border:'1px solid var(--border)' }}>{c} <span style={{ fontWeight:500, color:'var(--muted)' }}>leads</span></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions — amigável */}
          <div style={{ background:'var(--accent-soft)', border:'1px solid rgba(0,100,224,.18)', borderRadius:10, padding:12, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}><Target size={12} style={{ color:'var(--accent)' }}/> Próximo passo sugerido</div>
            {!hasData ? (
              <div style={{ fontSize:11.5, color:'var(--muted)', lineHeight:1.5 }}>Comece com 1 extração de 30 leads. Depois veja “Quem ligar primeiro”.</div>
            ) : coverage < 50 ? (
              <div style={{ fontSize:11.5, color:'var(--muted)', lineHeight:1.5 }}>Cobertura baixa ({coverage}%). Tente enriquecer mais telefones + sites na próxima extração.</div>
            ) : (
              <div style={{ fontSize:11.5, color:'var(--muted)', lineHeight:1.5 }}>Base saudável! Vá em <b style={{ color:'var(--fg)' }}>Lead Scoring</b> para priorizar quem ligar.</div>
            )}
            <div style={{ display:'flex', gap:6, marginTop:2 }}>
              <span style={{ fontSize:11, padding:'5px 10px', borderRadius:999, background:'var(--surface)', border:'1px solid var(--border)', display:'inline-flex', alignItems:'center', gap:4 }}><Target size={11}/> Lead Scoring <ArrowUpRight size={11}/></span>
              <span style={{ fontSize:11, padding:'5px 10px', borderRadius:999, background:'var(--accent)', color:'#fff', display:'inline-flex', alignItems:'center', gap:4 }}><Zap size={11}/> Nova extração</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
