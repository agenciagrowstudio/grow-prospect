import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail, Send, LayoutTemplate, History, Settings2, Megaphone, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Monitor, Smartphone, Cloud, Laptop, KeyRound, ExternalLink, Loader, Check, Search, X,
  Type, AlignLeft, Quote, ListChecks, MousePointerClick, Image, Minus, PenLine, Tag, ListOrdered, MessageSquareQuote, RefreshCw,
} from 'lucide-react';
import EmailPanel from './EmailPanel';
import AvatarLead from './AvatarLead';
import { readLocalArray, localDoLead, localDoEndereco } from '../leadData';
import {
  leTemplates, guardaTemplates, leEnviados, renderizaEmail, dadosDoLead, emailDoLead, templateSugerido,
  blocoNovo, novoId, TIPOS_BLOCO, CAMPOS, CONTA_PADRAO, templateDaMensagem, textoWhatsParaEmail, REMETENTE_PADRAO,
} from '../emailTemplates';
import { gerarAbordagem, idiomaDoLead } from '../abordagem';
import { qualificaLead } from '../qualificacaoLead';
import { enviaEmail, viaDeEnvio, contaDoComputador, temComputador } from '../emailEnvio';
import { contaEmailNuvem, salvarContaEmailNuvem, removerContaEmailNuvem, lerEmpresa } from '../nuvem';
import { pegarPedidoEmail } from '../pedidoEmail';
import { useNotifications } from './NotificationCenter';

/**
 * Aba E-mail: escrever a partir de um template em HTML no design da Grow+,
 * editar os templates, ver o que foi enviado e configurar a conta. Envia pelo
 * Gmail do computador ou, na web, pela nuvem da Grow+.
 */

const URL_SENHA_APP = 'https://myaccount.google.com/apppasswords';
const CORES = ['#12121a', '#0064E0', '#00A34D', '#5534F5', '#D81B60', '#FF8500', '#C32824'];
const ICONE_BLOCO = {
  etiqueta: Tag, passos: ListOrdered, depoimento: MessageSquareQuote,
  titulo: Type, texto: AlignLeft, destaque: Quote, lista: ListChecks, botao: MousePointerClick, imagem: Image, divisor: Minus, assinatura: PenLine,
};
const EXEMPLO = { name: 'Yasmin House Cleaning', pais: 'US', category: 'House cleaning service', address: '1 Main St, Framingham, MA 01702', rating: 4.9, sinalBr: { nivel: 'alto' } };

function abreFora(url) {
  if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
  else window.open(url, '_blank', 'noopener');
}

function Previa({ html }) {
  const [celular, setCelular] = useState(false);
  return (
    <div className="em2-previa">
      <div className="em2-previa-topo">
        <span>Prévia</span>
        <div className="em2-segmento" role="group" aria-label="Tamanho da prévia">
          <button type="button" className={!celular ? 'on' : ''} onClick={() => setCelular(false)} title="Computador"><Monitor size={14} strokeWidth={2} /></button>
          <button type="button" className={celular ? 'on' : ''} onClick={() => setCelular(true)} title="Celular"><Smartphone size={14} strokeWidth={2} /></button>
        </div>
      </div>
      <div className="em2-moldura">
        <iframe title="Prévia do e-mail" sandbox="" srcDoc={html} style={{ width: celular ? 380 : '100%' }} />
      </div>
    </div>
  );
}

const MENSAGEM_FILA = 'msg-fila';
const leCfgFila = () => {
  try { return JSON.parse(localStorage.getItem('sigma_abordagem_cfg') || '{}') || {}; } catch { return {}; }
};

/** A mesma mensagem que a Fila do dia monta para o WhatsApp deste lead, já no formato de e-mail. */
function mensagemDaFila(lead, versao) {
  const end = localDoEndereco(lead.address);
  const paraTexto = { ...lead, city: lead.city || end.cidade, uf: lead.uf || lead.state || end.uf };
  const r = gerarAbordagem(paraTexto, qualificaLead(lead), { ...leCfgFila(), idioma: idiomaDoLead(lead) }, versao);
  return textoWhatsParaEmail(r.texto || '');
}

function Escrever({ templates, contaWeb, remetente, pedido, onEnviado }) {
  const { addNotification } = useNotifications();
  const leads = useMemo(() => readLocalArray('sigma_leads').filter((l) => emailDoLead(l)), []);
  const buscas = useMemo(() => new Map(readLocalArray('sigma_searches').map((b) => [String(b?.id), b])), []);
  const [lead, setLead] = useState(null);
  const [para, setPara] = useState('');
  const [busca, setBusca] = useState('');
  const [tplId, setTplId] = useState(templates[0]?.id || '');
  const [assunto, setAssunto] = useState('');
  const [versao, setVersao] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [via, setVia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [contaPc, setContaPc] = useState(null);
  // Simples (só texto) chega melhor na caixa de entrada no primeiro contato.
  const [formato, setFormatoEstado] = useState(() => {
    try { return localStorage.getItem('prospector_email_formato') === 'visual' ? 'visual' : 'simples'; } catch { return 'simples'; }
  });
  const setFormato = (f) => { setFormatoEstado(f); try { localStorage.setItem('prospector_email_formato', f); } catch { /* segue */ } };

  useEffect(() => { viaDeEnvio(contaWeb).then(setVia); contaDoComputador().then(setContaPc); }, [contaWeb]);
  // Remetente como num app de e-mail: nome e endereço que o lead vai ver.
  const deEndereco = via === 'computador' ? contaPc?.user : contaWeb?.gmail;

  // Com lead escolhido, o corpo começa pela mesma mensagem da Fila do dia (editável).
  const escolheLead = (l) => {
    setLead(l);
    setPara(emailDoLead(l));
    setBusca('');
    setTplId(MENSAGEM_FILA);
    setVersao(0);
    setMensagem(mensagemDaFila(l, 0));
    setAssunto('');
  };
  const outraVersao = () => {
    const v = versao + 1;
    setVersao(v);
    setMensagem(mensagemDaFila(lead, v));
  };

  useEffect(() => {
    if (!pedido) return;
    const daBase = leads.find((l) => String(l.id) === String(pedido.id)) || pedido;
    escolheLead(daBase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  const usaMensagem = tplId === MENSAGEM_FILA && lead;
  const tpl = usaMensagem
    ? templateDaMensagem(mensagem, { idioma: idiomaDoLead(lead) === 'en' ? 'en' : 'pt' })
    : (templates.find((t) => t.id === tplId) || templates[0]);
  const dados = dadosDoLead(lead || {}, { remetente, buscas });
  const email = tpl ? renderizaEmail(tpl, dados, { simples: formato === 'simples' }) : { assunto: '', html: '', texto: '' };
  const assuntoFinal = assunto || email.assunto;
  const sugestoes = busca.trim()
    ? leads.filter((l) => `${l.name || ''} ${emailDoLead(l)}`.toLowerCase().includes(busca.trim().toLowerCase())).slice(0, 8)
    : [];

  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await enviaEmail({ lead, para: para.trim(), assunto: assuntoFinal, html: email.html, texto: email.texto, templateId: tpl?.id, via });
      addNotification({ type: 'success', category: 'system', title: 'E-mail enviado', message: `${lead?.name || para} · ${via === 'computador' ? 'pelo computador' : 'pela nuvem'}` });
      onEnviado?.();
      setLead(null);
      setPara('');
      setAssunto('');
    } catch (e) {
      addNotification({ type: 'error', category: 'system', title: 'E-mail não enviado', message: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para.trim()) && tpl && assuntoFinal.trim();
  return (
    <div className="em2-grade">
      <div className="em2-form cfg-card">
        <div className="em2-de">
          <span>De</span>
          {deEndereco
            ? <b>{remetente}<small>{deEndereco}</small></b>
            : <em>Configure a conta de envio na aba Conta</em>}
        </div>
        <div className="field">
          <label htmlFor="em2Busca">Para</label>
          {lead ? (
            <div className="em2-lead">
              <AvatarLead lead={lead} size={34} />
              <div>
                <b>{lead.name}</b>
                <span>{[localDoLead(lead, buscas).cidade, para].filter(Boolean).join(' · ')}</span>
              </div>
              <button type="button" className="cot-icone-btn" onClick={() => { setLead(null); setPara(''); }} aria-label="Trocar destinatário"><X size={15} strokeWidth={2} /></button>
            </div>
          ) : (
            <div className="em2-busca">
              <Search size={15} strokeWidth={2} aria-hidden="true" />
              <input
                id="em2Busca"
                value={busca || para}
                onChange={(e) => { setBusca(e.target.value); setPara(e.target.value); }}
                placeholder={leads.length ? `Buscar entre ${leads.length} leads com e-mail, ou digite um endereço` : 'Digite o e-mail do destinatário'}
                autoComplete="off"
              />
              {sugestoes.length > 0 && (
                <div className="em2-sugestoes" role="listbox">
                  {sugestoes.map((l) => (
                    <button key={l.id} type="button" onClick={() => escolheLead(l)}>
                      <b>{l.name}</b><span>{emailDoLead(l)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="em2Tpl">Template</label>
          <select id="em2Tpl" value={usaMensagem ? MENSAGEM_FILA : (tpl?.id || '')} onChange={(e) => { setTplId(e.target.value); setAssunto(''); }}>
            {lead && <option value={MENSAGEM_FILA}>Mensagem da Fila do dia (a mesma do WhatsApp)</option>}
            {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.idioma === 'en' ? ' (inglês)' : ''}</option>)}
          </select>
        </div>

        {usaMensagem && (
          <div className="field">
            <div className="em2-msg-topo">
              <label htmlFor="em2Msg">Mensagem</label>
              <button type="button" className="kb-mover" onClick={outraVersao} title="Troca pela próxima versão da Fila (apaga o que foi editado)">
                <RefreshCw size={12} strokeWidth={2} /> Outra versão
              </button>
            </div>
            <textarea id="em2Msg" className="em2-msg" rows={10} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
            <span className="cfg-dica">É o texto da Fila do dia, sem emojis. Edite à vontade; **assim** vira negrito.</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="em2Assunto">Assunto</label>
          <input id="em2Assunto" value={assuntoFinal} onChange={(e) => setAssunto(e.target.value)} />
        </div>

        <div className="field">
          <label>Formato</label>
          <div className="em2-formato" role="group" aria-label="Formato do e-mail">
            <button type="button" className={formato === 'simples' ? 'on' : ''} onClick={() => setFormato('simples')}>
              <b>Simples</b><span>Só texto, como escrito à mão. Chega melhor na caixa de entrada.</span>
            </button>
            <button type="button" className={formato === 'visual' ? 'on' : ''} onClick={() => setFormato('visual')}>
              <b>Visual</b><span>Layout da Grow+ com logo e botão. Melhor para quem já conversou com vocês.</span>
            </button>
          </div>
        </div>

        <div className="em2-envio">
          <button type="button" className="btn btn-primary" disabled={!valido || !via || enviando} onClick={enviar}>
            {enviando ? <Loader size={15} strokeWidth={2} className="cfg-girando" /> : <Send size={15} strokeWidth={2} />}
            {enviando ? 'Enviando...' : 'Enviar e-mail'}
          </button>
        </div>
      </div>
      <Previa html={email.html} />
    </div>
  );
}

function EditorBloco({ bloco, onMuda }) {
  const campo = (nome, rotulo, multilinha = false) => (
    <label className="em2-campo">
      <span>{rotulo}</span>
      {multilinha
        ? <textarea rows={bloco.tipo === 'texto' ? 5 : 3} value={bloco[nome] || ''} onChange={(e) => onMuda({ ...bloco, [nome]: e.target.value })} />
        : <input value={bloco[nome] || ''} onChange={(e) => onMuda({ ...bloco, [nome]: e.target.value })} />}
    </label>
  );
  switch (bloco.tipo) {
    case 'etiqueta': return campo('texto', 'Texto curto acima do título');
    case 'titulo': return campo('texto', 'Texto');
    case 'passos': return campo('texto', 'Um passo por linha, no formato "Título: descrição"', true);
    case 'depoimento': return <>{campo('texto', 'Depoimento (use só depoimento real de cliente)', true)}{campo('autor', 'Quem disse')}</>;
    case 'texto': return campo('texto', 'Texto (linha em branco separa parágrafos; **negrito**)', true);
    case 'destaque': return campo('texto', 'Texto em destaque', true);
    case 'lista': return campo('texto', 'Um item por linha', true);
    case 'assinatura': return <>{campo('texto', 'Nome e cargo (a primeira linha vira o nome)', true)}{campo('whatsapp', 'WhatsApp (só números, com DDI)')}{campo('site', 'Site (https://)')}{campo('instagram', 'Instagram (@perfil)')}{campo('foto', 'Foto (endereço https://; vazio mostra as iniciais)')}</>;
    case 'botao': return <>{campo('texto', 'Texto do botão')}{campo('link', 'Link (https://, mailto: ou tel:)')}{campo('nota', 'Texto pequeno embaixo do botão (opcional)')}</>;
    case 'imagem': return <>{campo('url', 'Endereço da imagem (https://)')}{campo('alt', 'Descrição da imagem')}</>;
    default: return <p className="em2-dica">Linha fina para separar partes do e-mail.</p>;
  }
}

function Templates({ templates, setTemplates, remetente }) {
  const [id, setId] = useState(templates[0]?.id || '');
  const tpl = templates.find((t) => t.id === id) || templates[0];
  const html = tpl ? renderizaEmail(tpl, dadosDoLead(EXEMPLO, { remetente })).html : '';

  // Editado não recebe mais a versão nova dos padrões.
  const muda = (novo) => setTemplates(templates.map((t) => (t.id === novo.id ? { ...novo, editado: true } : t)));
  const mudaBloco = (b) => muda({ ...tpl, blocos: tpl.blocos.map((x) => (x.id === b.id ? b : x)) });
  const moveBloco = (i, d) => {
    const blocos = [...tpl.blocos];
    const j = i + d;
    if (j < 0 || j >= blocos.length) return;
    [blocos[i], blocos[j]] = [blocos[j], blocos[i]];
    muda({ ...tpl, blocos });
  };
  const novo = (base) => {
    const t = base
      ? { ...base, id: novoId('tpl'), nome: `${base.nome} (cópia)`, blocos: base.blocos.map((b) => ({ ...b, id: novoId() })) }
      : { id: novoId('tpl'), nome: 'Novo template', idioma: 'pt', cor: '#0064E0', assunto: 'Uma ideia para a {empresa}', blocos: [blocoNovo('titulo'), blocoNovo('texto'), blocoNovo('assinatura')], rodape: 'Se não quiser receber mais e-mails, é só responder com SAIR.' };
    setTemplates([...templates, t]);
    setId(t.id);
  };
  const apaga = () => {
    if (templates.length <= 1) return;
    const resto = templates.filter((t) => t.id !== tpl.id);
    setTemplates(resto);
    setId(resto[0].id);
  };

  if (!tpl) return null;
  return (
    <div className="em2-grade em2-grade-tpl">
      <div className="em2-form cfg-card">
        <div className="em2-tpl-lista">
          {templates.map((t) => (
            <button key={t.id} type="button" className={`ea-chip${t.id === tpl.id ? ' on' : ''}`} onClick={() => setId(t.id)}>
              <span className="em2-cor" style={{ background: t.cor }} />{t.nome}
            </button>
          ))}
          <button type="button" className="ea-chip" onClick={() => novo(null)}><Plus size={13} strokeWidth={2} /> Novo</button>
        </div>

        <div className="cfg-linha">
          <div className="field"><label htmlFor="tplNome">Nome</label><input id="tplNome" value={tpl.nome} onChange={(e) => muda({ ...tpl, nome: e.target.value })} /></div>
          <div className="field">
            <label htmlFor="tplIdioma">Língua</label>
            <select id="tplIdioma" value={tpl.idioma || 'pt'} onChange={(e) => muda({ ...tpl, idioma: e.target.value })}>
              <option value="pt">Português</option>
              <option value="en">Inglês</option>
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="tplAssunto">Assunto</label><input id="tplAssunto" value={tpl.assunto} onChange={(e) => muda({ ...tpl, assunto: e.target.value })} /></div>
        <div className="field">
          <label htmlFor="tplPre">Texto de prévia na caixa de entrada</label>
          <input id="tplPre" value={tpl.preheader || ''} onChange={(e) => muda({ ...tpl, preheader: e.target.value })} placeholder="Aparece ao lado do assunto no Gmail" />
        </div>
        <div className="field">
          <label>Cor principal</label>
          <div className="em2-cores">
            {CORES.map((c) => (
              <button key={c} type="button" className={`em2-cor-btn${tpl.cor === c ? ' on' : ''}`} style={{ background: c }} onClick={() => muda({ ...tpl, cor: c })} aria-label={`Cor ${c}`} />
            ))}
          </div>
        </div>
        <p className="em2-dica">Campos automáticos: {CAMPOS.join(' ')}. Viram os dados do lead na hora de enviar.</p>

        <div className="em2-blocos">
          {tpl.blocos.map((b, i) => {
            const I = ICONE_BLOCO[b.tipo] || AlignLeft;
            return (
              <div key={b.id} className="em2-bloco">
                <div className="em2-bloco-topo">
                  <I size={14} strokeWidth={2} aria-hidden="true" />
                  <b>{TIPOS_BLOCO.find((t) => t.id === b.tipo)?.nome}</b>
                  <button type="button" className="cot-icone-btn" onClick={() => moveBloco(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp size={14} strokeWidth={2} /></button>
                  <button type="button" className="cot-icone-btn" onClick={() => moveBloco(i, 1)} disabled={i === tpl.blocos.length - 1} aria-label="Descer"><ArrowDown size={14} strokeWidth={2} /></button>
                  <button type="button" className="cot-icone-btn" onClick={() => muda({ ...tpl, blocos: tpl.blocos.filter((x) => x.id !== b.id) })} aria-label="Remover bloco"><Trash2 size={14} strokeWidth={2} /></button>
                </div>
                <EditorBloco bloco={b} onMuda={mudaBloco} />
              </div>
            );
          })}
        </div>
        <div className="em2-adicionar">
          <span>Adicionar:</span>
          {TIPOS_BLOCO.map((t) => {
            const I = ICONE_BLOCO[t.id];
            return <button key={t.id} type="button" className="ea-chip" onClick={() => muda({ ...tpl, blocos: [...tpl.blocos, blocoNovo(t.id)] })}><I size={13} strokeWidth={2} /> {t.nome}</button>;
          })}
        </div>
        <div className="field"><label htmlFor="tplRodape">Rodapé</label><input id="tplRodape" value={tpl.rodape || ''} onChange={(e) => muda({ ...tpl, rodape: e.target.value })} /></div>
        <div className="cfg-acoes">
          <button type="button" className="btn btn-ghost" onClick={() => novo(tpl)}><Copy size={15} strokeWidth={2} /> Duplicar</button>
          <button type="button" className="btn btn-ghost" onClick={apaga} disabled={templates.length <= 1}><Trash2 size={15} strokeWidth={2} /> Apagar template</button>
        </div>
        <p className="em2-dica">As mudanças ficam salvas sozinhas e valem no computador e na web.</p>
      </div>
      <Previa html={html} />
    </div>
  );
}

function Enviados({ versao }) {
  const lista = useMemo(() => leEnviados(), [versao]);
  if (!lista.length) {
    return <div className="kb-vazio"><History size={28} strokeWidth={1.5} /><b>Nenhum e-mail enviado ainda</b><span>Os e-mails enviados por aqui aparecem nesta lista, do computador e da web.</span></div>;
  }
  return (
    <div className="cfg-card">
      <ul className="em2-enviados">
        {lista.slice(0, 200).map((e) => (
          <li key={e.id}>
            <span className="em2-env-data">{new Date(e.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            <div className="em2-env-txt"><b>{e.empresa || e.para}</b><span>{e.assunto}</span></div>
            <span className="em2-env-para">{e.para}</span>
            <span className="em2-env-via" title={e.via === 'computador' ? 'Pelo Gmail do computador' : 'Pela nuvem'}>
              {e.via === 'computador' ? <Laptop size={14} strokeWidth={2} /> : <Cloud size={14} strokeWidth={2} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Conta({ contaWeb, recarrega }) {
  const { addNotification } = useNotifications();
  const empresa = lerEmpresa();
  const [gmail, setGmail] = useState(contaWeb?.gmail || CONTA_PADRAO);
  const [nome, setNome] = useState(contaWeb?.nome_remetente || '');
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [doComputador, setDoComputador] = useState(null);
  useEffect(() => { contaDoComputador().then(setDoComputador); }, []);

  const salvar = async () => {
    // Diz o que falta em vez de deixar o botão apagado sem explicação.
    const limpa = senha.replace(/\s/g, '');
    setErro('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gmail.trim())) { setErro('Confira o endereço do Gmail.'); return; }
    if (!contaWeb && !limpa) { setErro('Cole a senha de app do Gmail (16 letras) para salvar a conta pela primeira vez.'); return; }
    if (limpa && limpa.length < 16) { setErro('A senha de app do Gmail tem 16 letras. Confira se copiou inteira.'); return; }
    setSalvando(true);
    try {
      await salvarContaEmailNuvem({ gmail: gmail.trim(), nome: nome.trim(), senha });
      setSenha('');
      addNotification({ type: 'success', category: 'system', title: 'Conta salva na nuvem', message: `${gmail.trim()} já envia pela web.` });
      recarrega();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const remover = async () => {
    try { await removerContaEmailNuvem(); recarrega(); } catch (e) { addNotification({ type: 'error', category: 'system', title: 'Conta de e-mail', message: e.message }); }
  };

  return (
    <div className="em2-contas">
      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><Cloud size={18} strokeWidth={1.6} /></span>
          <div>
            <h2>Envio pela web</h2>
            <p>
              Gmail da empresa para enviar pela versão web. A senha de app fica cifrada no cofre da nuvem da Grow+
              e só o servidor que envia consegue lê-la; ela nunca volta para a tela.
            </p>
          </div>
        </div>
        {!empresa?.id ? (
          <span className="cfg-dica">Conecte a empresa em Configurações para usar o envio pela web.</span>
        ) : (
          <>
            {contaWeb && (
              <div className="cfg-resultado ok"><Check size={15} strokeWidth={2} /><span>Configurado: {contaWeb.gmail}{contaWeb.atualizado_em ? `, desde ${new Date(contaWeb.atualizado_em).toLocaleDateString('pt-BR')}` : ''}</span></div>
            )}
            <div className="cfg-linha">
              <div className="field"><label htmlFor="emwGmail">Gmail</label><input id="emwGmail" value={gmail} onChange={(e) => setGmail(e.target.value)} autoComplete="off" /></div>
              <div className="field"><label htmlFor="emwNome">Nome do remetente</label><input id="emwNome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome (vai na assinatura)" /></div>
            </div>
            <div className="field">
              <label htmlFor="emwSenha">Senha de app do Gmail {contaWeb ? '(deixe vazio para manter a atual)' : ''}</label>
              <input id="emwSenha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="16 letras, gerada na conta do Google" />
              <span className="cfg-dica">
                Não é a senha normal do Gmail. Gere em{' '}
                <button type="button" className="hz-link" onClick={() => abreFora(URL_SENHA_APP)}>myaccount.google.com/apppasswords <ExternalLink size={12} strokeWidth={2} /></button>
                {' '}(precisa da verificação em duas etapas ligada).
              </span>
            </div>
            <div className="cfg-acoes">
              <button type="button" className="btn btn-primary" disabled={salvando} onClick={salvar}>
                {salvando ? <Loader size={15} strokeWidth={2} className="cfg-girando" /> : <KeyRound size={15} strokeWidth={2} />} Salvar na nuvem
              </button>
              {contaWeb && <button type="button" className="btn btn-ghost" onClick={remover}><Trash2 size={15} strokeWidth={2} /> Remover da nuvem</button>}
            </div>
            {erro && <div className="cfg-resultado erro"><X size={15} strokeWidth={2} /><span>{erro}</span></div>}
          </>
        )}
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><Laptop size={18} strokeWidth={1.6} /></span>
          <div>
            <h2>Envio pelo computador</h2>
            <p>
              No Prospector instalado, o envio usa o Gmail configurado neste computador (senha guardada só nesta máquina).
              Ele é configurado na aba Campanhas.
            </p>
          </div>
        </div>
        {!temComputador()
          ? <span className="cfg-dica">Disponível no Prospector instalado no computador.</span>
          : doComputador
            ? <div className="cfg-resultado ok"><Check size={15} strokeWidth={2} /><span>Configurado: {doComputador.user}</span></div>
            : <span className="cfg-dica">Ainda não configurado neste computador. Sem ele, o app usa o envio pela web.</span>}
      </div>
    </div>
  );
}

export default function EmailCentral() {
  const [aba, setAba] = useState('escrever');
  const [templates, setTemplatesEstado] = useState(leTemplates);
  const [contaWeb, setContaWeb] = useState(null);
  const [pedido, setPedido] = useState(() => pegarPedidoEmail());
  const [versao, setVersao] = useState(0);
  const [remetenteComp, setRemetenteComp] = useState('');

  const carregaConta = () => {
    if (!lerEmpresa()?.id) { setContaWeb(null); return; }
    contaEmailNuvem().then(setContaWeb).catch(() => setContaWeb(null));
  };
  useEffect(() => {
    carregaConta();
    contaDoComputador().then((c) => setRemetenteComp(c?.fromName || ''));
    const pede = () => { const p = pegarPedidoEmail(); if (p) { setPedido(p); setAba('escrever'); } };
    window.addEventListener('prospector:pedido-email', pede);
    return () => window.removeEventListener('prospector:pedido-email', pede);
  }, []);

  const setTemplates = (lista) => { setTemplatesEstado(lista); guardaTemplates(lista); };
  // Nome na assinatura: o da conta de envio ou, sem ela, o mesmo da Fila do dia.
  const remetente = remetenteComp || contaWeb?.nome_remetente || String(leCfgFila().nome || '').trim() || REMETENTE_PADRAO;

  const ABAS = [
    { id: 'escrever', nome: 'Escrever', Icone: Send },
    { id: 'templates', nome: 'Templates', Icone: LayoutTemplate },
    { id: 'enviados', nome: 'Enviados', Icone: History },
    ...(temComputador() ? [{ id: 'campanhas', nome: 'Campanhas', Icone: Megaphone }] : []),
    { id: 'conta', nome: 'Conta', Icone: Settings2 },
  ];

  return (
    <section className="em2-view">
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}><Mail size={18} strokeWidth={2} style={{ verticalAlign: '-2px', marginRight: 6 }} />E-mail</h1>
          <p className="cfg-tagline">Templates no design da Grow+, prontos para cada lead. Envia pelo computador ou pela web.</p>
        </div>
      </div>
      <div className="em2-abas" role="tablist">
        {ABAS.map(({ id, nome, Icone }) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={`em2-aba${aba === id ? ' on' : ''}`} onClick={() => { setAba(id); if (id !== 'escrever') setPedido(null); }}>
            <Icone size={15} strokeWidth={2} /> {nome}
          </button>
        ))}
      </div>

      {aba === 'escrever' && <Escrever templates={templates} contaWeb={contaWeb} remetente={remetente} pedido={pedido} onEnviado={() => { setVersao((v) => v + 1); setPedido(null); }} />}
      {aba === 'templates' && <Templates templates={templates} setTemplates={setTemplates} remetente={remetente} />}
      {aba === 'enviados' && <Enviados versao={versao} />}
      {aba === 'campanhas' && <EmailPanel />}
      {aba === 'conta' && <Conta contaWeb={contaWeb} recarrega={carregaConta} />}
    </section>
  );
}
