import React, { useEffect, useRef, useState } from 'react';
import { Database, Cloud, Trash2, HardDrive, X, Users, MapPin } from 'lucide-react';
import { usoLocal, usoPorExtracao, formataTamanho, LIMITE_LOCAL, COMPACTACAO_NUVEM } from '../armazenamento';
import { readLocalArray } from '../leadData';
import { lerEmpresa } from '../nuvem';

/**
 * Indicador no topo: quanto os dados ocupam neste computador (o limite que
 * importa, uns 5 MB) e na nuvem, quanto cada extração gera e quantos leads
 * ainda cabem.
 */
export default function IndicadorArmazenamento() {
  const [aberto, setAberto] = useState(false);
  const [uso, setUso] = useState(() => usoLocal(window.localStorage));
  const ref = useRef(null);

  const mede = () => setUso(usoLocal(window.localStorage));
  useEffect(() => {
    const t = setInterval(mede, 20000);
    window.addEventListener('focus', mede);
    window.addEventListener('sigma:leads-updated', mede);
    return () => { clearInterval(t); window.removeEventListener('focus', mede); window.removeEventListener('sigma:leads-updated', mede); };
  }, []);
  useEffect(() => {
    if (!aberto) return undefined;
    mede();
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const tom = uso.pct >= 85 ? 'critico' : uso.pct >= 65 ? 'atencao' : 'ok';
  const detalhe = aberto
    ? usoPorExtracao(readLocalArray('sigma_leads'), readLocalArray('sigma_searches'), uso.total, lerEmpresa() ? 2 : 1)
    : null;
  const leadsTam = uso.porGrupo.find((g) => g.id === 'leads')?.tamanho || 0;
  const filaTam = uso.porGrupo.find((g) => g.id === 'fila')?.tamanho || 0;
  const cache = uso.porGrupo.find((g) => g.id === 'mapas')?.tamanho || 0;

  const limpaCache = () => {
    try { localStorage.removeItem('prospector_poligonos'); } catch {}
    mede();
  };

  return (
    <div className="arm" ref={ref}>
      <button
        type="button"
        className={`arm-gatilho arm-${tom}`}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        title="Armazenamento dos dados"
      >
        <Database size={15} strokeWidth={2} aria-hidden="true" />
        <span className="arm-gatilho-txt">
          <b>{formataTamanho(uso.total)}</b>
          <span>{Math.round(uso.pct)}% usado</span>
        </span>
      </button>

      {aberto && detalhe && (
        <div className="arm-painel" role="dialog" aria-label="Armazenamento">
          <header className="arm-cab">
            <span className={`arm-cab-icone arm-${tom}`} aria-hidden="true"><HardDrive size={18} strokeWidth={1.9} /></span>
            <div className="arm-cab-txt">
              <b>Armazenamento</b>
              <span>Dados guardados neste computador</span>
            </div>
            <button type="button" className="arm-fechar" onClick={() => setAberto(false)} aria-label="Fechar"><X size={15} strokeWidth={2} /></button>
          </header>

          <section className="arm-hero">
            <div className="arm-hero-num">
              <b>{formataTamanho(uso.total)}</b>
              <span>de {formataTamanho(LIMITE_LOCAL)} · {uso.pct < 1 ? 'menos de 1' : Math.round(uso.pct)}% usado</span>
            </div>
            <div className="arm-segmentos" role="img" aria-label={`${Math.round(uso.pct)}% do limite usado`}>
              {uso.porGrupo.map((g) => (
                <i key={g.id} className={`arm-seg-${g.id}`} style={{ width: `${Math.max(0.8, (g.tamanho / LIMITE_LOCAL) * 100)}%` }} title={`${g.nome}: ${formataTamanho(g.tamanho)}`} />
              ))}
            </div>
            <ul className="arm-legenda">
              {uso.porGrupo.map((g) => (
                <li key={g.id}>
                  <span className={`arm-ponto arm-seg-${g.id}`} aria-hidden="true" />
                  <span className="arm-legenda-nome">{g.nome}</span>
                  <b>{formataTamanho(g.tamanho)}</b>
                  {g.id === 'mapas' && (
                    <button type="button" className="arm-limpar" onClick={limpaCache} title="Apaga só o desenho das cidades; ele é baixado de novo quando precisar">
                      <Trash2 size={11} strokeWidth={2} aria-hidden="true" /> Limpar
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {tom === 'critico' && <p className="arm-alerta">Quase cheio. Apague extrações antigas ou leads que não vai usar, na Base de Leads.</p>}
          </section>

          <section className="arm-cards">
            <div className="arm-card">
              <Users size={15} strokeWidth={2} aria-hidden="true" />
              <b>{detalhe.cabemMais.toLocaleString('pt-BR')}</b>
              <span>leads ainda cabem</span>
            </div>
            <div className="arm-card">
              <MapPin size={15} strokeWidth={2} aria-hidden="true" />
              <b>~{Math.max(0, Math.floor(detalhe.cabemMais / 120))}</b>
              <span>cidades de 120</span>
            </div>
            <div className="arm-card">
              <Cloud size={15} strokeWidth={2} aria-hidden="true" />
              <b>{lerEmpresa() ? formataTamanho((leadsTam + filaTam) * COMPACTACAO_NUVEM) : 'off'}</b>
              <span>{lerEmpresa() ? 'na nuvem, folgada' : 'nuvem desconectada'}</span>
            </div>
          </section>

          <section className="arm-extr">
            <div className="arm-sec-topo">
              <b>Por extração</b>
              <span>{formataTamanho(detalhe.mediaPorLead)} por lead, em média</span>
            </div>
            {detalhe.porExtracao.length ? (
              <ul className="arm-extr-lista">
                {detalhe.porExtracao.map((x) => {
                  const maior = detalhe.porExtracao[0].tamanho || 1;
                  return (
                    <li key={x.id || 'manual'}>
                      <div className="arm-extr-linha">
                        <span className="arm-extr-nome" title={x.rotulo}>{x.rotulo}</span>
                        <small>{x.leads} leads</small>
                        <b>{formataTamanho(x.tamanho)}</b>
                      </div>
                      <div className="arm-extr-barra" aria-hidden="true"><i style={{ width: `${Math.max(3, (x.tamanho / maior) * 100)}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="arm-dica">Nenhuma extração ainda.</p>}
          </section>
          {cache > 0 && <p className="arm-rodape">Limpar o cache de contornos é seguro: ele é refeito sozinho.</p>}
        </div>
      )}
    </div>
  );
}
