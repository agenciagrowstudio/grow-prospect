import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ExternalLink, Check, SkipForward, PhoneOff, RefreshCw, Undo2, MessagesSquare,
  SlidersHorizontal, Copy, RotateCcw, Inbox, PartyPopper, Send, Pencil, Smartphone, Languages, Repeat, BookOpen } from 'lucide-react';
import { gerarAbordagem, linkWhatsApp, chaveDoDia, ANGULOS, idiomaDoLead, partesWhatsApp } from '../abordagem';
import { digitosWhatsApp } from '../telefone';
import { localDoEndereco } from '../leadData';
import Bandeira from './Bandeira';
import { publicoDoLead } from '../resultados';
import { proximoFollowup, DIAS_FOLLOWUP, tempoAte } from '../followup';
import FollowupsFila from './FollowupsFila';
import CardLead from './CardLead';
import IconeIA from './IconeIA';
import SeloIA from './SeloIA';
import { analisaComIA, aplicaResultadosIA, textoProgressoIA, iaDisponivel, insereGancho } from '../iaLeads';
import DivisorFila, { larguraListaGuardada } from './DivisorFila';

// Tamanho da janela da Fila, arrastado pelo canto e guardado para a próxima vez.
const CHAVE_TAMANHO = 'prospector_fila_tamanho';
function tamanhoGuardado() {
  try {
    const t = JSON.parse(localStorage.getItem(CHAVE_TAMANHO) || 'null');
    if (t && t.w >= 720 && t.h >= 480) return { width: Math.min(t.w, window.innerWidth - 16), height: Math.min(t.h, window.innerHeight - 16) };
  } catch {}
  return null;
}
import RespostasProntas from './RespostasProntas';

/**
 * Fila do dia: leads qualificados com a primeira mensagem já escrita.
 *
 * Nada é enviado por aqui. O botão abre a conversa no WhatsApp (Web ou
 * aplicativo do computador) com o texto já na caixa; quem aperta enviar é o
 * usuário, no WhatsApp de verdade. Para o WhatsApp isso é uso normal, e é o
 * jeito de menor risco de banimento. O app só prepara, guarda o que já foi
 * abordado e conta a meta do dia.
 *
 * Layout em lista e detalhe: a fila à esquerda, um lead por vez à direita.
 * Depois de marcar um lead, o próximo da fila abre sozinho.
 */

const CHAVE_CFG = 'sigma_abordagem_cfg';
const CHAVE_LOG = 'sigma_abordagem_log';
// 20 por dia é o ponto de partida seguro. Mais que 30 só com o número já aquecido.
const LIMITES = [10, 15, 20, 25, 30, 40];

function lerJson(chave, padrao) {
  try {
    return { ...padrao, ...(JSON.parse(localStorage.getItem(chave) || 'null') || {}) };
  } catch {
    return padrao;
  }
}
function gravaJson(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem espaço: a fila segue na tela */ }
}

// Cidade e estado vêm do endereço quando o lead não os guarda soltos.
function leadParaTexto(lead) {
  const doEndereco = localDoEndereco(lead.address);
  return { ...lead, city: lead.city || doEndereco.cidade, uf: lead.uf || lead.state || doEndereco.uf };
}


// Mostra o texto como ele chega no WhatsApp: *negrito*, _itálico_, ~riscado~.
const TAG_ESTILO = { negrito: 'strong', italico: 'em', riscado: 's' };
function TextoWhatsApp({ texto }) {
  return partesWhatsApp(texto).map((p, i) => {
    const Tag = TAG_ESTILO[p.estilo];
    // eslint-disable-next-line react/no-array-index-key
    return Tag ? <Tag key={i}>{p.texto}</Tag> : <React.Fragment key={i}>{p.texto}</React.Fragment>;
  });
}

/** Grava no lead quem ele é. O mapa relê a base pelo evento e a Fila se atualiza. */
function marcaPublico(leadId, publico) {
  try {
    const lista = JSON.parse(localStorage.getItem('sigma_leads') || '[]');
    const nova = lista.map((l) => (String(l.id) === String(leadId) ? { ...l, publicoConfirmado: publico } : l));
    localStorage.setItem('sigma_leads', JSON.stringify(nova));
    window.dispatchEvent(new Event('sigma:leads-updated'));
  } catch { /* sem espaço: a marcação vale só nesta abertura */ }
}

// No celular, wa.me abre o aplicativo. No computador (app ou navegador), a
// página do wa.me tentava chamar o aplicativo e às vezes dizia que ele não
// estava instalado: lá o link vai direto, pelo que a pessoa escolheu.
const NO_CELULAR = typeof navigator !== 'undefined' && /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');

/** Abre o link: whatsapp:// troca de app sem deixar aba em branco. */
async function abreLink(url) {
  if (window.electronAPI?.openExternal) return window.electronAPI.openExternal(url);
  if (url.startsWith('whatsapp:')) { window.location.href = url; return { success: true }; }
  window.open(url, '_blank', 'noopener');
  return { success: true };
}

export default function FilaAbordagem({
  leads, qualificacoes, tituloBusca, onFechar, extracoes = [], buscaAtiva = '', onTrocarBusca, onNovaExtracao,
  leadsTodos,
}) {
  const [cfg, setCfg] = useState(() => lerJson(CHAVE_CFG, { nome: '', empresa: 'Grow+', limite: 20, oferta: 'qualquer', abrirEm: 'web', numeroTeste: '' }));
  const [log, setLog] = useState(() => lerJson(CHAVE_LOG, {}));
  const [versoes, setVersoes] = useState({});
  const [editados, setEditados] = useState({});
  const [jaAbordados, setJaAbordados] = useState({});
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState('fila');
  const janelaRef = useRef(null);
  const cliqueNoFundo = useRef(false);
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [progressoIA, setProgressoIA] = useState(null);
  // Leads que já foram mandados para a IA nesta abertura (não repete se falhar).
  const jaTentouIA = useRef(new Set());
  const [iaParada, setIaParada] = useState('');
  const [tamanhoInicial] = useState(tamanhoGuardado);
  // Guarda o tamanho quando a pessoa arrasta o canto da janela.
  useEffect(() => {
    const el = janelaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let t = null;
    const obs = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        try { localStorage.setItem(CHAVE_TAMANHO, JSON.stringify({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight) })); } catch {}
      }, 300);
    });
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, []);
  const [selecionado, setSelecionado] = useState(null);
  const [abertos, setAbertos] = useState({});
  const [editando, setEditando] = useState(null);
  // Idioma escolhido no botão de traduzir; sem escolha, o do lead (português
  // para brasileiro, inglês para americano).
  const [idiomas, setIdiomas] = useState({});
  // Ajustes começam abertos só enquanto falta o nome de quem assina.
  const [ajustesAbertos, setAjustesAbertos] = useState(() => !lerJson(CHAVE_CFG, { nome: '' }).nome);
  const hoje = chaveDoDia();

  useEffect(() => gravaJson(CHAVE_CFG, cfg), [cfg]);
  // WhatsApp instalado no PC e a pessoa nunca escolheu: abre no aplicativo.
  // Se o Windows ainda não sabe com qual app abrir links do WhatsApp, avisa.
  const [windowsPergunta, setWindowsPergunta] = useState(false);
  useEffect(() => {
    if (!window.electronAPI?.whatsappInstalado) return;
    window.electronAPI.whatsappInstalado().then((r) => {
      setWindowsPergunta(Boolean(r?.precisaEscolher));
      if (r?.instalado) setCfg((c) => (c.abrirEmEscolhido || c.abrirEm === 'app' ? c : { ...c, abrirEm: 'app' }));
    }).catch(() => {});
  }, []);
  const modoLink = NO_CELULAR ? 'wame' : cfg.abrirEm;

  useEffect(() => gravaJson(CHAVE_LOG, log), [log]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  // Candidatos: têm WhatsApp, ainda não foram tratados, e têm o que oferecer.
  const candidatos = useMemo(() => leads
    .map((lead) => ({ lead, q: qualificacoes.get(lead), chave: String(lead.id) }))
    .filter(({ lead, q, chave }) => {
      if (!q?.canais?.whatsapp || !digitosWhatsApp(q.canais.whatsapp, lead.pais)) return false;
      if (log[chave]) return false;
      if (cfg.oferta !== 'qualquer' && !q.servicos.some((s) => s.id === cfg.oferta)) return false;
      return true;
    })
    .sort((a, b) => b.q.nota - a.q.nota), [leads, qualificacoes, log, cfg.oferta]);

  // Quem já recebeu abordagem em campanha de WhatsApp ou e-mail sai da fila.
  useEffect(() => {
    if (!window.emailAPI?.jaAbordados || !candidatos.length) return undefined;
    let vivo = true;
    const base = candidatos.slice(0, 80);
    window.emailAPI.jaAbordados(base.map((c) => c.q.canais.whatsapp), base.map((c) => c.q.canais.email).filter(Boolean)).then((r) => {
      if (!vivo || !r?.success) return;
      const mapa = {};
      base.forEach(({ chave, q }) => {
        const hit = r.porTelefone?.[q.canais.whatsapp] || (q.canais.email && r.porEmail?.[String(q.canais.email).toLowerCase()]);
        if (hit) mapa[chave] = hit;
      });
      setJaAbordados(mapa);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [candidatos]);

  const enviadasHoje = Object.values(log).filter((e) => e.status === 'enviada' && e.dia === hoje).length;
  const restante = Math.max(0, cfg.limite - enviadasHoje);
  const fila = candidatos.filter(({ chave }) => !jaAbordados[chave]).slice(0, restante);
  // Já abordados: todo mundo que saiu da Fila, inclusive pulado e sem WhatsApp
  // (antes esses sumiam sem ter como voltar).
  const enviadas = Object.entries(log)
    .filter(([, e]) => ['enviada', 'respondeu', 'pulada', 'sem_whatsapp', 'sem_interesse'].includes(e.status))
    .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
  const responderam = enviadas.filter(([, e]) => e.status === 'respondeu').length;
  const contatados = enviadas.filter(([, e]) => ['enviada', 'respondeu', 'sem_interesse'].includes(e.status)).length;
  const followupsLiberados = Object.values(log).filter((e) => proximoFollowup(e)?.liberado).length;

  // O selecionado some da fila quando é marcado: abre o próximo, na mesma posição.
  const atual = fila.find((f) => f.chave === selecionado) || fila[0] || null;
  const posicao = atual ? fila.indexOf(atual) : -1;

  const idiomaDe = (item) => idiomas[item.chave] || idiomaDoLead(item.lead);
  // A edição é guardada por idioma: traduzir e voltar não perde o que foi escrito.
  const chaveEdicao = (item) => `${item.chave}|${idiomaDe(item)}`;
  const gerado = (item) => gerarAbordagem(leadParaTexto(item.lead), item.q, { ...cfg, idioma: idiomaDe(item) }, versoes[item.chave] || 0);
  const textoDe = (item) => (editados[chaveEdicao(item)] !== undefined ? editados[chaveEdicao(item)] : gerado(item).texto);

  const marca = (item, status) => {
    const proximo = fila[posicao + 1] || fila[posicao - 1] || null;
    setLog((atualLog) => ({
      ...atualLog,
      [item.chave]: {
        status,
        dia: hoje,
        ts: Date.now(),
        nome: item.lead.name || '',
        texto: status === 'enviada' ? textoDe(item) : '',
        angulo: gerado(item).angulo,
        publico: publicoDoLead(item.lead),
        idioma: idiomaDe(item),
      },
    }));
    setSelecionado(proximo?.chave || null);
    if (status === 'enviada') setAviso(`${item.lead.name || 'Lead'} marcado como enviado.`);
  };

  // Analisa com IA só os leads da fila de hoje que ainda não foram analisados.
  const analisaFila = async (itens) => {
    if (analisandoIA || !itens.length) return;
    setAnalisandoIA(true);
    setProgressoIA(null);
    try {
      const resultados = await analisaComIA(itens.map((f) => f.lead), setProgressoIA);
      const todos = JSON.parse(localStorage.getItem('sigma_leads') || '[]');
      localStorage.setItem('sigma_leads', JSON.stringify(aplicaResultadosIA(todos, resultados)));
      window.dispatchEvent(new Event('sigma:leads-updated'));
      const comIA = resultados.filter((r) => r.ia).length;
      setAviso(comIA ? `Textos da IA prontos para ${comIA} lead${comIA === 1 ? '' : 's'}.` : 'A IA não respondeu agora. Tente de novo em alguns minutos.');
    } catch (e) {
      // Sem chave ou chave recusada: para de tentar sozinho até a pessoa pedir.
      if (/chave/i.test(e.message)) setIaParada(e.message);
      setAviso(e.message);
    } finally {
      setAnalisandoIA(false);
      setProgressoIA(null);
    }
  };

  // A fila do dia é analisada sozinha: quem entra sem IA (abriu a Fila, pulou
  // alguém e entrou o próximo, virou o dia) vai para a análise. Espera um
  // instante para juntar quem entrou junto numa chamada só.
  useEffect(() => {
    if (!iaDisponivel() || analisandoIA || iaParada) return undefined;
    const novos = fila.filter((f) => !f.lead.ia && !jaTentouIA.current.has(f.chave));
    if (!novos.length) return undefined;
    const t = setTimeout(() => {
      novos.forEach((f) => jaTentouIA.current.add(f.chave));
      analisaFila(novos);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fila.map((f) => `${f.chave}:${f.lead.ia ? 1 : 0}`).join(','), analisandoIA, iaParada]);

  const desfaz = (chave) => setLog((atualLog) => {
    const { [chave]: _tirado, ...resto } = atualLog;
    return resto;
  });

  const abre = async (item) => {
    const numero = digitosWhatsApp(item.q.canais.whatsapp, item.lead.pais);
    const url = linkWhatsApp(numero, textoDe(item), modoLink);
    setAviso('');
    setAbertos((a) => ({ ...a, [item.chave]: true }));
    const r = await abreLink(url);
    if (r && r.success === false) {
      setAviso(modoLink === 'app'
        ? 'Não consegui abrir o aplicativo do WhatsApp. Confira se ele está instalado ou troque para WhatsApp Web nos ajustes.'
        : 'Não consegui abrir o navegador.');
    }
  };

  const copia = async (item) => {
    try {
      await navigator.clipboard.writeText(textoDe(item));
      setAviso('Texto copiado.');
    } catch {
      setAviso('Não consegui copiar. Selecione o texto e use Ctrl+C.');
    }
  };

  // Outra versão vale para os dois idiomas, então descarta as edições dos dois.
  const outraVersao = (chave) => {
    setEditados((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(`${chave}|`))));
    setVersoes((v) => ({ ...v, [chave]: (v[chave] || 0) + 1 }));
  };

  const traduz = (item, novo) => {
    if (idiomaDe(item) === novo) return;
    const tinhaEdicao = editados[chaveEdicao(item)] !== undefined;
    setIdiomas((x) => ({ ...x, [item.chave]: novo }));
    if (tinhaEdicao) {
      setAviso(novo === 'en'
        ? 'Sua edição em português continua guardada. Aqui está a tradução da versão do modelo.'
        : 'Sua edição em inglês continua guardada. Aqui está a versão do modelo em português.');
    }
  };
  const testa = async (item) => {
    const numero = digitosWhatsApp(cfg.numeroTeste, String(cfg.numeroTeste).trim().startsWith('+1') ? 'US' : 'BR');
    if (!numero) {
      setAjustesAbertos(true);
      setAviso('Coloque seu número nos ajustes para receber o teste.');
      return;
    }
    const url = linkWhatsApp(numero, textoDe(item), modoLink);
    await abreLink(url);
    setAviso('Abrindo a conversa com o seu número. Envie para ver como a mensagem chega.');
  };

  // Marcou brasileiro ou americano: a mensagem troca de idioma junto.
  const defineQuemE = (item, publico) => {
    marcaPublico(item.lead.id, publico);
    setIdiomas((x) => ({ ...x, [item.chave]: publico === 'us' ? 'en' : 'pt' }));
    setAviso(publico === 'us' ? `${item.lead.name || 'Lead'} marcado como americano.` : `${item.lead.name || 'Lead'} marcado como brasileiro.`);
  };

  const restaura = (item) => setEditados((x) => { const { [chaveEdicao(item)]: _x, ...r } = x; return r; });

  const muda = (campo) => (e) => setCfg((c) => ({
    ...c,
    [campo]: campo === 'limite' ? Number(e.target.value) : e.target.value,
    ...(campo === 'abrirEm' ? { abrirEmEscolhido: true } : {}),
  }));
  const progresso = Math.min(100, (enviadasHoje / cfg.limite) * 100);

  const detalhe = atual && (() => {
    const { lead, q, chave } = atual;
    const g = gerado(atual);
    const texto = textoDe(atual);
    const editado = editados[chaveEdicao(atual)] !== undefined;
    const idioma = idiomaDe(atual);
    const servico = q.servicos.find((s) => s.id === g.angulo);
    const local = [lead.city || localDoEndereco(lead.address).cidade, lead.uf || lead.state || localDoEndereco(lead.address).uf].filter(Boolean).join(', ');
    const jaAbriu = abertos[chave];
    return (
      <section className="fa-detalhe" aria-label={`Mensagem para ${lead.name}`}>
        {/* O mesmo card do lead da tela do mapa: foto, nota, serviços, qualificação e canais. */}
        <CardLead
          lead={lead}
          qualificacao={q}
          local={local.replace(', ', ' · ')}
          estatico
          onWhatsApp={() => abre(atual)}
        />

        <div className="fa-chips">
          <span className="fa-chip fa-chip-oferta">Oferecer: <b>{ANGULOS.find((a) => a.id === g.angulo)?.nome || 'Abordagem geral'}</b></span>
          {servico?.motivo && (
            <span className={`fa-chip${servico.daIA ? ' fa-chip-ia' : ''}`} title={servico.daIA ? 'Sugerido pela IA depois de ler o site' : undefined}>
              {servico.daIA && <IconeIA size={14} />}
              {servico.motivo}
            </span>
          )}
          <span className="fa-espaco" />
          {String(lead.pais || 'BR').toUpperCase() === 'US' && (() => {
            const quem = publicoDoLead(lead);
            return (
              <div className="fa-idioma fa-quem" role="group" aria-label="Quem é o lead" title={quem === 'verificar' ? 'Ainda não sabemos: marque quem é' : 'Quem é o lead'}>
                <button type="button" className={quem === 'brus' ? 'on' : ''} aria-pressed={quem === 'brus'} onClick={() => defineQuemE(atual, 'brus')}>
                  <Bandeira pais="BR" /> Brasileiro
                </button>
                <button type="button" className={quem === 'us' ? 'on' : ''} aria-pressed={quem === 'us'} onClick={() => defineQuemE(atual, 'us')}>
                  <Bandeira pais="US" /> Americano
                </button>
              </div>
            );
          })()}
          <div className="fa-idioma" role="group" aria-label="Idioma da mensagem" title="Traduzir a mensagem">
            <Languages size={14} strokeWidth={2} aria-hidden="true" />
            <button type="button" className={idioma === 'pt' ? 'on' : ''} aria-pressed={idioma === 'pt'} onClick={() => traduz(atual, 'pt')}>Português</button>
            <button type="button" className={idioma === 'en' ? 'on' : ''} aria-pressed={idioma === 'en'} onClick={() => traduz(atual, 'en')}>English</button>
          </div>
        </div>

        <div className="fa-msg">
          <div className="fa-msg-topo">
            <span className="fa-rotulo">Mensagem</span>
            <span className="fa-versao">{editado ? 'Editada por você' : `Versão ${g.versao + 1} de ${g.total}`}</span>
            <span className="fa-espaco" />
            {editado && (
              <button type="button" className="fa-mini" onClick={() => restaura(atual)}>
                <RotateCcw size={13} strokeWidth={2} aria-hidden="true" /> Desfazer edição
              </button>
            )}
            <button
              type="button"
              className={`fa-mini${editando === chave ? ' fa-mini-forte' : ''}`}
              // Sem isto, a caixa perde o foco antes do clique e o botão reabre a edição.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setEditando(editando === chave ? null : chave)}
            >
              <Pencil size={13} strokeWidth={2} aria-hidden="true" /> {editando === chave ? 'Ver como fica' : 'Editar'}
            </button>
            <button type="button" className="fa-mini" onClick={() => outraVersao(chave)}>
              <RefreshCw size={13} strokeWidth={2} aria-hidden="true" /> Outra versão
            </button>
            <button type="button" className="fa-mini" onClick={() => copia(atual)}>
              <Copy size={13} strokeWidth={2} aria-hidden="true" /> Copiar
            </button>
          </div>
          <div className="fa-balao-fundo">
            {editando === chave ? (
              <textarea
                className="fa-balao"
                value={texto}
                onChange={(e) => setEditados((x) => ({ ...x, [chaveEdicao(atual)]: e.target.value }))}
                onBlur={() => setEditando(null)}
                aria-label={`Mensagem para ${lead.name}`}
                spellCheck
                autoFocus
              />
            ) : (
              <div
                className="fa-balao fa-previa"
                role="button"
                tabIndex={0}
                title="Clique para editar"
                onClick={() => setEditando(chave)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditando(chave); } }}
              >
                <TextoWhatsApp texto={texto} />
              </div>
            )}
            <span className="fa-contagem">
              {editando === chave ? 'Negrito: *texto* · itálico: _texto_ · ' : ''}{texto.length} caracteres
            </span>
          </div>
        </div>

        {(() => {
          const gancho = idioma === 'en' ? lead.ia?.ganchoEn : lead.ia?.gancho;
          if (!gancho) return null;
          const inserido = texto.includes(gancho);
          return (
            <div className="fa-gancho">
              <IconeIA size={18} />
              <div className="fa-gancho-txt">
                <b>Detalhe que a IA achou no site</b>
                <span>{gancho}</span>
              </div>
              <button
                type="button"
                className={`fa-mini${inserido ? '' : ' fa-mini-forte'}`}
                disabled={inserido}
                onClick={() => setEditados((x) => ({ ...x, [chaveEdicao(atual)]: insereGancho(textoDe(atual), gancho) }))}
              >
                {inserido ? <><Check size={13} strokeWidth={2.2} aria-hidden="true" /> Inserido</> : 'Inserir na mensagem'}
              </button>
            </div>
          );
        })()}

        <div className="fa-passos">
          <button type="button" className={`btn fa-abrir${jaAbriu ? ' feito' : ''}`} onClick={() => abre(atual)}>
            <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
            {jaAbriu ? 'Abrir de novo' : 'Abrir no WhatsApp'}
          </button>
          <button type="button" className={`btn fa-enviei${jaAbriu ? ' pronto' : ''}`} onClick={() => marca(atual, 'enviada')}>
            <Check size={16} strokeWidth={2.25} aria-hidden="true" /> Enviei
          </button>
          <span className="fa-espaco" />
          <button type="button" className="fa-mini" onClick={() => testa(atual)} title={cfg.numeroTeste ? `Mandar esta mensagem para ${cfg.numeroTeste}` : 'Coloque seu número nos ajustes'}>
            <Smartphone size={13} strokeWidth={2} aria-hidden="true" /> Testar no meu número
          </button>
          <button type="button" className="fa-mini" onClick={() => marca(atual, 'sem_whatsapp')} title="O número não tem WhatsApp">
            <PhoneOff size={13} strokeWidth={2} aria-hidden="true" /> Sem WhatsApp
          </button>
          <button type="button" className="fa-mini" onClick={() => marca(atual, 'pulada')} title="Tira da fila sem abordar">
            <SkipForward size={13} strokeWidth={2} aria-hidden="true" /> Pular
          </button>
        </div>
        <p className="fa-dica">
          {jaAbriu
            ? 'Enviou no WhatsApp? Clique em Enviei para contar na meta e ir para o próximo.'
            : 'O WhatsApp abre com o texto já digitado na caixa, como rascunho. Você confere e aperta enviar lá.'}
        </p>
      </section>
    );
  })();

  // Vai direto no body: dentro da tela do mapa, os controles do mapa ficavam por cima.
  return createPortal(
    // Fecha só com clique que começou e terminou no fundo: soltar o mouse fora
    // depois de arrastar o canto ou a divisória não fecha a Fila.
    <div
      className="overlay on"
      onMouseDown={(e) => { cliqueNoFundo.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (cliqueNoFundo.current && e.target === e.currentTarget) onFechar(); cliqueNoFundo.current = false; }}
      style={{ display: 'grid' }}
    >
      <div
        ref={janelaRef}
        className="modal fa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faTitulo"
        onClick={(e) => e.stopPropagation()}
        style={{ ...(tamanhoInicial || {}), '--fa-lista': `${larguraListaGuardada()}px` }}
      >
        <header className="fa-head">
          <div className="fa-titulo">
            <div className="eyebrow">Abordagem manual</div>
            <h2 id="faTitulo">Fila do dia</h2>
            <p className="fa-sub">{tituloBusca ? `${tituloBusca} · ` : ''}Você abre, confere e envia no WhatsApp. O app só prepara.</p>
            {extracoes.length > 0 && onTrocarBusca && (
              <label className="fa-cidade">
                <span>Cidade</span>
                <select value={buscaAtiva} onChange={(e) => onTrocarBusca(e.target.value)}>
                  <option value="">Todas as extrações</option>
                  {extracoes.map((a) => {
                    const p = a.progresso || { total: 0, abordados: 0 };
                    const falta = Math.max(0, p.total - p.abordados);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.nicho} · {a.rotulo || 'sem local'} · {a.concluida ? 'concluída' : `${falta} para abordar`}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
          </div>
          <div className="fa-meta" role="status" aria-label={`${enviadasHoje} de ${cfg.limite} mensagens enviadas hoje`}>
            <div className="fa-meta-num"><b>{enviadasHoje}</b><span>/ {cfg.limite}</span></div>
            <div className="fa-meta-lado">
              <span>enviadas hoje</span>
              <div className="fa-barra" aria-hidden="true"><span style={{ width: `${progresso}%` }} /></div>
            </div>
          </div>
          <button
            type="button"
            className={`fa-icone${ajustesAbertos ? ' on' : ''}`}
            onClick={() => setAjustesAbertos((v) => !v)}
            aria-expanded={ajustesAbertos}
            title="Ajustes da fila"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
          </button>
          <button type="button" className="fa-icone" onClick={onFechar} aria-label="Fechar"><X size={16} strokeWidth={2} /></button>
        </header>

        {ajustesAbertos && (
          <div className="fa-ajustes">
            <label>Seu nome
              <input value={cfg.nome} onChange={muda('nome')} placeholder="Ex.: Matheus" autoComplete="off" />
            </label>
            <label>Sua empresa
              <input value={cfg.empresa} onChange={muda('empresa')} placeholder="Grow+" autoComplete="off" />
            </label>
            <label>Meta por dia
              <select value={cfg.limite} onChange={muda('limite')}>{LIMITES.map((n) => <option key={n} value={n}>{n} mensagens{n === 20 ? ' (recomendado)' : n > 30 ? ' (número aquecido)' : ''}</option>)}</select>
            </label>
            <label>Oferecer
              <select value={cfg.oferta} onChange={muda('oferta')}>
                <option value="qualquer">O melhor de cada lead</option>
                {ANGULOS.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </label>
            <label>Seu WhatsApp (teste)
              <input value={cfg.numeroTeste} onChange={muda('numeroTeste')} placeholder="Ex.: 27 99999-9999" autoComplete="off" inputMode="tel" />
            </label>
            {!NO_CELULAR && (
              <label>Abrir em
                <select value={cfg.abrirEm} onChange={muda('abrirEm')}>
                  <option value="app">Aplicativo do WhatsApp (instalado no PC)</option>
                  <option value="web">WhatsApp Web (navegador)</option>
                </select>
              </label>
            )}
            {windowsPergunta && cfg.abrirEm === 'app' && (
              <p className="fa-dica-windows">
                O Windows ainda não sabe com qual programa abrir links do WhatsApp. Em Configurações do Windows,
                Aplicativos padrão, procure por WHATSAPP e escolha o WhatsApp. Ou, no primeiro envio, escolha o
                WhatsApp na janela que aparecer e marque "Sempre usar este aplicativo".
              </p>
            )}
          </div>
        )}

        <div className="fa-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'fila'} className={aba === 'fila' ? 'on' : ''} onClick={() => setAba('fila')}>
            <Send size={14} strokeWidth={2} aria-hidden="true" /> Para enviar <span className="fa-conta">{fila.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={aba === 'followups'} className={aba === 'followups' ? 'on' : ''} onClick={() => setAba('followups')}>
            <Repeat size={14} strokeWidth={2} aria-hidden="true" /> Follow-ups {followupsLiberados > 0 && <span className="fa-conta fa-conta-forte">{followupsLiberados}</span>}
          </button>
          <button type="button" role="tab" aria-selected={aba === 'enviadas'} className={aba === 'enviadas' ? 'on' : ''} onClick={() => setAba('enviadas')}>
            <MessagesSquare size={14} strokeWidth={2} aria-hidden="true" /> Já abordados <span className="fa-conta">{enviadas.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={aba === 'respostas'} className={aba === 'respostas' ? 'on' : ''} onClick={() => setAba('respostas')}>
            <BookOpen size={14} strokeWidth={2} aria-hidden="true" /> Respostas
          </button>
          <span className="fa-espaco" />
          {!cfg.nome && <span className="fa-alerta">Preencha seu nome nos ajustes para assinar a mensagem.</span>}
        </div>

        {aba === 'fila' && (fila.length === 0 ? (
          <div className="fa-vazio">
            {restante === 0 ? <PartyPopper size={28} strokeWidth={1.5} aria-hidden="true" /> : <Inbox size={28} strokeWidth={1.5} aria-hidden="true" />}
            {(() => {
              const cidade = extracoes.find((a) => a.id === buscaAtiva);
              if (restante === 0) {
                return (
                  <>
                    <b>Meta de {cfg.limite} cumprida hoje</b>
                    <span>Volte amanhã para os próximos. Manter o ritmo diário protege o seu número.</span>
                  </>
                );
              }
              if (cidade?.concluida) {
                return (
                  <>
                    <b>{cidade.rotulo || 'Cidade'} concluída</b>
                    <span>Todos os leads com WhatsApp desta extração já passaram pela Fila. Hora de extrair a próxima cidade.</span>
                    {onNovaExtracao && <button type="button" className="btn btn-primary btn-sm" onClick={onNovaExtracao}>Extrair a próxima cidade</button>}
                  </>
                );
              }
              return (
                <>
                  <b>Ninguém na fila</b>
                  <span>Nenhum lead desta extração tem WhatsApp e algo para oferecer. Escolha outra cidade acima ou troque o que oferecer.</span>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="fa-corpo">
            <ol className="fa-lista" aria-label="Leads da fila">
              {iaDisponivel() && (() => {
                const semIA = fila.filter((f) => !f.lead.ia);
                return (
                  <li className="fa-ia-barra">
                    <IconeIA size={16} />
                    <span>
                      {analisandoIA
                        ? textoProgressoIA(progressoIA)
                        : iaParada
                          ? 'Textos automáticos parados: confira a chave de IA nas Configurações'
                          : semIA.length ? `${fila.length - semIA.length} de ${fila.length} com texto da IA` : 'Textos da IA prontos para a fila'}
                    </span>
                    {!analisandoIA && semIA.length > 0 && (iaParada || semIA.every((f) => jaTentouIA.current.has(f.chave))) && (
                      <button type="button" className="fa-mini fa-mini-forte" onClick={() => { setIaParada(''); analisaFila(semIA); }}>
                        Tentar de novo
                      </button>
                    )}
                  </li>
                );
              })()}
              {fila.map((item, i) => {
                const { lead, q, chave } = item;
                const ativo = atual?.chave === chave;
                return (
                  <li key={chave}>
                    <button type="button" className={`fa-linha${ativo ? ' on' : ''}`} onClick={() => setSelecionado(chave)} aria-current={ativo}>
                      <span className="fa-ordem">{abertos[chave] ? <Check size={12} strokeWidth={2.5} /> : i + 1}</span>
                      <span className="fa-linha-txt">
                        <b>
                          {lead.name || 'Empresa'}
                          {lead.ia && <SeloIA ia={lead.ia} />}
                        </b>
                        <span>{[lead.city || localDoEndereco(lead.address).cidade, ANGULOS.find((a) => a.id === gerado(item).angulo)?.nome, idiomaDe(item) === 'en' ? 'em inglês' : ''].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className={`fa-ponto fa-ponto-${q.temperatura.id}`} title={`${q.temperatura.rotulo} ${q.nota}`} />
                    </button>
                  </li>
                );
              })}
            </ol>
            <DivisorFila />
            {detalhe}
          </div>
        ))}

        {aba === 'followups' && (
          <FollowupsFila log={log} setLog={setLog} leads={leadsTodos || leads} modoLink={modoLink} onAviso={setAviso} />
        )}

        {aba === 'respostas' && <RespostasProntas onAviso={setAviso} />}

        {aba === 'enviadas' && (enviadas.length === 0 ? (
          <div className="fa-vazio">
            <MessagesSquare size={28} strokeWidth={1.5} aria-hidden="true" />
            <b>Ninguém abordado ainda</b>
            <span>Quem você marcar como enviado, pulado ou sem WhatsApp aparece aqui. Dá para zerar e devolver para a Fila.</span>
          </div>
        ) : (
          <div className="fa-historico">
            <p className="fa-hist-resumo"><b>{contatados}</b> abordados · <b>{responderam}</b> responderam{enviadas.length > contatados ? <> · <b>{enviadas.length - contatados}</b> pulados ou sem WhatsApp</> : null}</p>
            {enviadas.map(([chave, e]) => (
              <article key={chave} className="fa-hist-item">
                <div className="fa-hist-topo">
                  <div className="fa-linha-txt">
                    <b>{e.nome || chave}</b>
                    <span>{new Date(e.ts).toLocaleDateString('pt-BR')} · {ANGULOS.find((a) => a.id === e.angulo)?.nome || 'Abordagem geral'}</span>
                  </div>
                  <span className={`mm-situacao ${e.status === 'respondeu' ? 'mm-aprovado' : e.status === 'enviada' ? 'mm-analise' : 'fa-sit-fora'}`}>
                    {{ respondeu: 'Respondeu', enviada: 'Aguardando', pulada: 'Pulado', sem_whatsapp: 'Sem WhatsApp', sem_interesse: 'Sem interesse' }[e.status]}
                  </span>
                </div>
                {e.texto && <p className="fa-hist-texto"><TextoWhatsApp texto={e.texto} /></p>}
                {e.status === 'enviada' && (() => {
                  const p = proximoFollowup(e);
                  const feitos = (e.followups || []).length;
                  return (
                    <p className="fa-hist-fu">
                      Follow-up {feitos}/{DIAS_FOLLOWUP.length}
                      {p ? ` · próximo ${p.liberado ? 'liberado' : tempoAte(p.liberaEm).replace('libera em', 'em')}` : ' · sequência encerrada'}
                    </p>
                  );
                })()}
                <div className="fa-hist-acoes">
                  {e.status === 'enviada' && (
                    <button type="button" className="fa-mini fa-mini-forte" onClick={() => setLog((a) => ({ ...a, [chave]: { ...e, status: 'respondeu' } }))}>
                      <MessagesSquare size={13} strokeWidth={2} aria-hidden="true" /> Respondeu
                    </button>
                  )}
                  {e.status === 'respondeu' && (
                    <button type="button" className="fa-mini" onClick={() => setLog((a) => ({ ...a, [chave]: { ...e, status: 'enviada' } }))}>Ainda não respondeu</button>
                  )}
                  <button
                    type="button"
                    className="fa-mini"
                    onClick={() => { desfaz(chave); setAviso(`${e.nome || 'Lead'} zerado: voltou para a Fila.`); }}
                    title="Apaga a marcação e devolve o lead para a Fila"
                  >
                    <Undo2 size={13} strokeWidth={2} aria-hidden="true" /> Zerar lead
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}

        {aviso && <div className="fa-toast" role="status">{aviso}</div>}
      </div>
    </div>,
    document.body,
  );
}
