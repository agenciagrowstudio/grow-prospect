import React, { useMemo } from 'react';
import {
  CalendarClock, Play, Square, Route, MapPin, Briefcase, TrendingUp, TrendingDown, History, Monitor, Loader, CircleCheck,
} from 'lucide-react';
import Bandeira from './Bandeira';
import { ATALHOS_EUA, CIDADES_ATALHO, TRADUCAO_EUA } from '../atalhosExtracao';
import {
  progresso, roteiro, desempenhoPorGrupo, fatorAprendido, proximaExecucao, textoResultado, LIMITE_MIN, LIMITE_MAX,
} from '../extracaoAutomatica';
import { areasExtraidas } from '../cobertura';
import { readLocalArray } from '../leadData';

/**
 * Tela da extração automática: liga e desliga, horário e meta, o roteiro do
 * que vem a seguir, as cidades e serviços que entram, e o histórico dos dias.
 */

const METAS = [100, 200, 300];
const ESTADOS = { MA: 'Massachusetts', FL: 'Flórida', CT: 'Connecticut', NJ: 'Nova Jersey', GA: 'Geórgia' };

const leLog = () => {
  try { return JSON.parse(localStorage.getItem('sigma_abordagem_log') || '{}') || {}; } catch { return {}; }
};

function quandoTexto(prox, ativo) {
  if (!ativo) return 'Desligada';
  if (prox.pendente) return 'Hoje, em instantes';
  const d = prox.quando;
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return `Hoje às ${hora}`;
  if (d.toDateString() === amanha.toDateString()) return `Amanhã às ${hora}`;
  return `${d.toLocaleDateString('pt-BR')} às ${hora}`;
}

function prioridade(peso) {
  if (peso >= 16) return { id: 'alta', rotulo: 'Alta' };
  if (peso >= 9) return { id: 'media', rotulo: 'Média' };
  return { id: 'baixa', rotulo: 'Baixa' };
}

export default function ExtracaoAutomatica({
  cfg, setCfg, estado, rodar, parar, windows, salvaWindows, mudaHora, onNotificar,
}) {
  const temDesktop = typeof window.electronAPI?.startScrape === 'function';

  // Lê a base de novo a cada mudança de estado (uma busca terminou, o dia acabou).
  const { areas, desempenho } = useMemo(() => {
    const leads = readLocalArray('sigma_leads');
    const a = areasExtraidas(readLocalArray('sigma_searches'), leads);
    return { areas: a, desempenho: desempenhoPorGrupo(a, leads, leLog()) };
  }, [estado.rodando, estado.buscas, cfg.puladas.length]);

  const prog = progresso(cfg, areas);
  const proximas = roteiro(cfg, areas, desempenho, 6);
  const prox = proximaExecucao(cfg);
  const pct = prog.total ? Math.round((prog.feitas / prog.total) * 100) : 0;
  const historico = [...cfg.historico].reverse().slice(0, 7);

  const alternaWindows = async () => {
    const ativar = !windows.existe;
    if (await salvaWindows(ativar)) {
      onNotificar?.({
        type: 'success',
        title: ativar ? 'Abertura automática agendada' : 'Abertura automática removida',
        message: ativar ? `O Windows abre o Prospector todo dia às ${cfg.hora}, minimizado.` : 'O app só extrai se estiver aberto no horário.',
      });
    }
  };

  const alterna = (campo, valor) => setCfg((c) => ({
    ...c,
    [campo]: c[campo].includes(valor) ? c[campo].filter((x) => x !== valor) : [...c[campo], valor],
  }));

  const cidadesPorEstado = CIDADES_ATALHO.US.reduce((m, [n, uf]) => {
    (m[uf] = m[uf] || []).push(n);
    return m;
  }, {});

  const rodando = estado.rodando;
  const pctDia = Math.min(100, Math.round((estado.novos / cfg.limite) * 100));

  return (
    <section className="cfg-view ea-view">
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}>Extração automática</h1>
          <p className="cfg-tagline">
            Todo dia no horário, o app extrai até {cfg.limite} leads novos de brasileiros que prestam serviço nos EUA,
            começando pelas cidades com mais brasileiros.
          </p>
        </div>
      </div>

      {!temDesktop && (
        <div className="ea-aviso">A extração roda no Prospector instalado no computador. Aqui na web dá para acompanhar o que já foi extraído.</div>
      )}

      <div className="cfg-card ea-status">
        <div className="ea-status-topo">
          <span className={`ea-status-icone${rodando ? ' rodando' : cfg.ativo ? ' ligada' : ''}`}>
            {rodando ? <Loader size={20} strokeWidth={2} className="cfg-girando" /> : <CalendarClock size={20} strokeWidth={1.8} />}
          </span>
          <div className="ea-status-txt">
            <span className="ea-rotulo">{rodando ? 'Rodando agora' : 'Próxima extração'}</span>
            <b>
              {rodando
                ? (estado.atual ? `${estado.atual.nicho} em ${estado.atual.cidade}, ${estado.atual.uf}` : 'Preparando...')
                : quandoTexto(prox, cfg.ativo)}
            </b>
          </div>
          <div className="ea-status-acoes">
            {rodando ? (
              <button type="button" className="btn btn-ghost" onClick={parar}>
                <Square size={14} strokeWidth={2} /> Parar
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={rodar} disabled={!temDesktop || prog.pendentes === 0}
                title="Roda a extração de hoje agora, sem esperar o horário">
                <Play size={14} strokeWidth={2} /> Extrair agora
              </button>
            )}
            <label className={`ea-chave${cfg.ativo ? ' on' : ''}`}>
              <input type="checkbox" checked={cfg.ativo} onChange={(e) => setCfg((c) => ({ ...c, ativo: e.target.checked }))} />
              <span className="ea-chave-trilho" aria-hidden="true"><span /></span>
              {cfg.ativo ? 'Ligada' : 'Desligada'}
            </label>
          </div>
        </div>

        {rodando && (
          <div className="ea-dia">
            <div className="ea-dia-barra" role="progressbar" aria-valuemin={0} aria-valuemax={cfg.limite} aria-valuenow={estado.novos}>
              <span style={{ width: `${pctDia}%` }} />
            </div>
            <span>{estado.novos} de {cfg.limite} leads novos hoje · {estado.buscas} busca{estado.buscas === 1 ? '' : 's'} feita{estado.buscas === 1 ? '' : 's'}</span>
          </div>
        )}

        <div className="ea-campos">
          <label className="ea-campo">
            <span>Horário</span>
            <input type="time" value={cfg.hora} onChange={(e) => mudaHora(e.target.value)} />
          </label>
          <div className="ea-campo">
            <span>Meta de leads novos por dia</span>
            <div className="ea-metas">
              {METAS.map((m) => (
                <button key={m} type="button" className={`ea-chip${cfg.limite === m ? ' on' : ''}`} onClick={() => setCfg((c) => ({ ...c, limite: m }))}>{m}</button>
              ))}
              <input
                type="number"
                min={LIMITE_MIN}
                max={LIMITE_MAX}
                step={10}
                value={cfg.limite}
                onChange={(e) => setCfg((c) => ({ ...c, limite: Number(e.target.value) || c.limite }))}
                aria-label="Meta de leads por dia"
              />
            </div>
          </div>
        </div>

        <div className="ea-windows">
          <Monitor size={16} strokeWidth={1.8} aria-hidden="true" />
          <div>
            <b>Abrir o app sozinho às {cfg.hora}</b>
            <span>
              {!windows.suportado && !windows.carregando
                ? 'Disponível no Prospector instalado no Windows.'
                : windows.existe
                  ? `Agendado no Windows. Abre minimizado; se o PC estiver desligado ou dormindo, abre assim que ligar.${windows.hora && windows.hora !== cfg.hora ? ` Atenção: está agendado às ${windows.hora}.` : ''}`
                  : 'Sem isso, a extração só roda se o app estiver aberto. Quem abrir depois do horário, roda na hora.'}
            </span>
          </div>
          {windows.suportado && (
            <button type="button" className="btn btn-ghost" disabled={windows.salvando || windows.carregando} onClick={alternaWindows}>
              {windows.salvando ? <Loader size={14} strokeWidth={2} className="cfg-girando" /> : null}
              {windows.existe ? 'Remover' : 'Agendar no Windows'}
            </button>
          )}
        </div>
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><Route size={18} strokeWidth={1.6} /></span>
          <div>
            <h2>Roteiro inteligente</h2>
            <p>
              A ordem segue o tamanho da comunidade brasileira em cada cidade e os serviços que brasileiros mais prestam,
              com sorteio entre as primeiras para variar. O roteiro aprende com o que já foi extraído: cidade e serviço
              que trazem mais brasileiros e mais respostas sobem na fila. Tudo da lista é extraído uma hora ou outra.
            </p>
          </div>
        </div>

        <div className="ea-progresso">
          <div className="ea-progresso-num"><b>{prog.feitas}</b> de {prog.total} combinações extraídas</div>
          <div className="ea-progresso-barra"><span style={{ width: `${pct}%` }} /></div>
          <div className="ea-progresso-legenda">
            <span>{prog.pendentes} na fila</span>
            {prog.semResultado > 0 && <span>{prog.semResultado} sem resultado no Google</span>}
            <span>{pct}% do mapa</span>
          </div>
        </div>

        {proximas.length > 0 ? (
          <ol className="ea-roteiro">
            {proximas.map((c) => {
              const p = prioridade(c.peso);
              const fc = fatorAprendido(desempenho.cidades[`${c.cidade}|${c.uf}`]);
              return (
                <li key={c.chave}>
                  <span className="ea-roteiro-nicho" title={TRADUCAO_EUA[c.nicho] || c.nicho}>{c.nicho}</span>
                  <span className="ea-roteiro-cidade"><MapPin size={12} strokeWidth={2} aria-hidden="true" />{c.cidade}, {c.uf}</span>
                  {fc > 1.1 && <span className="ea-aprendeu sobe" title="Esta cidade tem trazido mais brasileiros que o esperado"><TrendingUp size={13} strokeWidth={2} /></span>}
                  {fc < 0.9 && <span className="ea-aprendeu desce" title="Esta cidade tem trazido menos brasileiros que o esperado"><TrendingDown size={13} strokeWidth={2} /></span>}
                  <span className={`ea-prioridade ${p.id}`}>{p.rotulo}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="ea-tudo"><CircleCheck size={16} strokeWidth={2} /> Todas as cidades e serviços escolhidos já foram extraídos.</div>
        )}
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><MapPin size={18} strokeWidth={1.6} /></span>
          <div>
            <h2>Cidades</h2>
            <p>As com mais brasileiros prestando serviço. Desmarque as que não quer no roteiro.</p>
          </div>
        </div>
        {Object.entries(cidadesPorEstado).map(([uf, nomes]) => (
          <div key={uf} className="ea-grupo">
            <span className="ea-grupo-titulo"><Bandeira pais="US" /> {ESTADOS[uf] || uf}</span>
            <div className="ea-chips">
              {nomes.map((n) => {
                const k = `${n}|${uf}`;
                const on = cfg.cidades.includes(k);
                return (
                  <button key={k} type="button" className={`ea-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => alterna('cidades', k)}>
                    {n} <small>{uf}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><Briefcase size={18} strokeWidth={1.6} /></span>
          <div>
            <h2>Serviços</h2>
            <p>Os mais prestados por brasileiros nos EUA, buscados em inglês. Passe o mouse para ver a tradução.</p>
          </div>
        </div>
        <div className="ea-chips">
          {ATALHOS_EUA.map((n) => {
            const on = cfg.nichos.includes(n);
            return (
              <button key={n} type="button" className={`ea-chip${on ? ' on' : ''}`} aria-pressed={on} title={TRADUCAO_EUA[n] || n} onClick={() => alterna('nichos', n)}>
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><History size={18} strokeWidth={1.6} /></span>
          <div>
            <h2>Últimos dias</h2>
            <p>O que cada extração automática trouxe.</p>
          </div>
        </div>
        {historico.length ? (
          <ul className="ea-historico">
            {historico.map((h) => (
              <li key={h.dia}>
                <span className="ea-historico-dia">{new Date(`${h.dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                <b>{h.novos} novos</b>
                <span className="ea-historico-txt" title={(h.cidades || []).join('\n')}>{textoResultado({ ...h, feitas: [] }, cfg.limite)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ea-vazio">Ainda não rodou nenhuma vez.</p>
        )}
      </div>
    </section>
  );
}
