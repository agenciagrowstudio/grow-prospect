import React, { useEffect, useState } from 'react';
import {
  Cloud, CloudOff, Building2, KeyRound, Copy, Check, X, Loader, RefreshCw, LogOut, Eye, EyeOff, Plus, LogIn,
  ImagePlus, Trash2,
} from 'lucide-react';
import {
  lerSessao, lerEmpresa, ultimaSincronizacao, criarConta, entrar, sair, criarEmpresa, entrarEmpresa,
  empresasDoLogin, usarEmpresa, CHAVES_SINCRONIZADAS, definirLogo, lerLogoLembrada, lembrarLogo,
} from '../nuvem';
import LogoGrow from './LogoGrow';
import BaixarApp from './BaixarApp';

/**
 * Empresa e sincronização: login, empresa com código (número de série) e
 * estado da sincronização entre computadores.
 */

/** Encaixa o que foi digitado no formato GROW-XXXX-XXXX-XXXX. */
export function formataCodigo(valor) {
  const limpo = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  return limpo.match(/.{1,4}/g)?.join('-') || '';
}

// Só o e-mail fica lembrado neste aparelho; a senha nunca é guardada.
const CHAVE_LEMBRAR = 'prospector_lembrar_email';
function emailLembrado() {
  try { return localStorage.getItem(CHAVE_LEMBRAR) || ''; } catch { return ''; }
}

const LADO_LOGO = 160;
function reduzLogo(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !/^image\//.test(arquivo.type)) { reject(new Error('Escolha uma imagem (PNG, JPG, WebP ou SVG).')); return; }
    if (arquivo.size > 5 * 1024 * 1024) { reject(new Error('Imagem grande demais. Use uma de até 5 MB.')); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, LADO_LOGO / Math.max(img.naturalWidth || LADO_LOGO, img.naturalHeight || LADO_LOGO));
      const w = Math.max(1, Math.round((img.naturalWidth || LADO_LOGO) * escala));
      const h = Math.max(1, Math.round((img.naturalHeight || LADO_LOGO) * escala));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let dados = canvas.toDataURL('image/png');
      if (dados.length > 280000) dados = canvas.toDataURL('image/webp', 0.9);
      if (dados.length > 290000) { reject(new Error('Não consegui reduzir esta imagem. Tente outra.')); return; }
      resolve(dados);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir esta imagem.')); };
    img.src = url;
  });
}

function quandoFoi(ts) {
  if (!ts) return 'ainda não sincronizou';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return 'agora mesmo';
  if (s < 60) return `há ${s} segundos`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  return new Date(ts).toLocaleString('pt-BR');
}

export default function EmpresaNuvem({ onConectado, onSessao, web = false }) {
  const [sessao, setSessao] = useState(() => lerSessao());
  const [empresa, setEmpresa] = useState(() => lerEmpresa());
  const [modo, setModo] = useState('entrar'); // entrar | criar
  const [email, setEmail] = useState(() => emailLembrado());
  const [lembrar, setLembrar] = useState(() => Boolean(emailLembrado()));
  // Com e-mail lembrado, o login mostra só a senha; "trocar" volta ao campo de e-mail.
  const [trocandoEmail, setTrocandoEmail] = useState(() => !emailLembrado());
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('Grow+');
  const [codigo, setCodigo] = useState('');
  const [existentes, setExistentes] = useState([]);
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState(null);
  const [verCodigo, setVerCodigo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [estado, setEstado] = useState({ ultima: ultimaSincronizacao(), erro: '' });
  const [, setTique] = useState(0);

  // Estado da sincronização automática (App liga o motor) e relógio do "há X min".
  useEffect(() => {
    const ouve = (e) => setEstado({ ultima: ultimaSincronizacao(), erro: e.detail?.ok ? '' : e.detail?.erro || '' });
    window.addEventListener('prospector:nuvem', ouve);
    const empresaMudou = () => setEmpresa(lerEmpresa());
    window.addEventListener('prospector:empresa', empresaMudou);
    const t = setInterval(() => setTique((n) => n + 1), 15000);
    return () => { window.removeEventListener('prospector:nuvem', ouve); window.removeEventListener('prospector:empresa', empresaMudou); clearInterval(t); };
  }, []);

  // Logado e sem empresa neste computador: procura as que já são deste login.
  useEffect(() => {
    if (!sessao || empresa) return;
    empresasDoLogin().then((lista) => setExistentes(Array.isArray(lista) ? lista : [])).catch(() => {});
  }, [sessao, empresa]);

  const acao = async (nome, fn) => {
    setOcupado(nome);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      setAviso({ ok: false, texto: e.message || 'Não deu certo.' });
    } finally {
      setOcupado('');
    }
  };

  const conectado = (emp) => {
    setEmpresa(emp);
    setAviso({ ok: true, texto: `Conectado à empresa ${emp.nome}. Sincronizando os dados…` });
    if (onConectado) onConectado(emp);
    else window.dispatchEvent(new Event('prospector:nuvem-agora'));
  };

  const fazLogin = () => acao('login', async () => {
    if (!email.trim() || !senha) throw new Error('Preencha e-mail e senha.');
    if (modo === 'criar') {
      const r = await criarConta(email, senha);
      if (r.precisaConfirmar) {
        setModo('entrar');
        setAviso({
          ok: true,
          texto: web
            ? 'Conta criada. Abra o e-mail "Confirme seu e-mail" e clique em Confirmar e entrar: você volta para cá já logado.'
            : 'Conta criada. Abra o e-mail "Confirme seu e-mail" e clique em Confirmar e entrar. Depois volte aqui e clique em Entrar.',
        });
        return;
      }
      setSessao(r.sessao);
    } else {
      setSessao(await entrar(email, senha));
    }
    setSenha('');
    try {
      if (lembrar) localStorage.setItem(CHAVE_LEMBRAR, email.trim());
      else { localStorage.removeItem(CHAVE_LEMBRAR); lembrarLogo(null); }
    } catch { /* sem armazenamento: só não lembra */ }
    onSessao?.();
  });

  const fazSair = () => acao('sair', async () => {
    if (!window.confirm('Desconectar este computador da empresa? Os dados continuam aqui e na nuvem, só param de sincronizar.')) return;
    await sair();
    setSessao(null);
    setEmpresa(null);
    setExistentes([]);
    setEstado({ ultima: null, erro: '' });
    if (web) window.location.reload();
  });

  const copiaCodigo = async () => {
    try {
      await navigator.clipboard.writeText(empresa.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { setVerCodigo(true); }
  };

  return (
    <div className="cfg-card en-card">
      <div className="cfg-card-head">
        <span className={`cfg-icone${empresa ? ' en-icone-ok' : ''}`}>{empresa ? <Cloud size={18} strokeWidth={1.75} /> : <CloudOff size={18} strokeWidth={1.75} />}</span>
        <div>
          <h2>{web ? (!sessao ? (modo === 'criar' ? 'Criar sua conta' : 'Entrar na sua conta') : 'Conectar a empresa') : 'Empresa e sincronização'}</h2>
          <p>
            {web
              ? (!sessao
                ? 'Use o mesmo e-mail e senha do Prospector no computador.'
                : 'Digite o código da empresa que aparece nas Configurações do computador, ou crie a empresa se este é o primeiro acesso.')
              : 'Conecte este computador à empresa para os leads, a Fila do dia e o histórico ficarem iguais em todos os computadores. Sessão do WhatsApp, senha do Gmail e chave de IA ficam só em cada computador.'}
          </p>
        </div>
      </div>

      {aviso && (
        <div className={`cfg-resultado ${aviso.ok ? 'ok' : 'erro'}`} role="status">
          {aviso.ok ? <Check size={15} strokeWidth={2} /> : <X size={15} strokeWidth={2} />}
          <span>{aviso.texto}</span>
        </div>
      )}

      {/* 1. Sem login */}
      {!sessao && (
        <div className="en-bloco">
          <div className="fa-idioma en-abas" role="tablist">
            <button type="button" className={modo === 'entrar' ? 'on' : ''} aria-pressed={modo === 'entrar'} onClick={() => setModo('entrar')}>Entrar</button>
            <button type="button" className={modo === 'criar' ? 'on' : ''} aria-pressed={modo === 'criar'} onClick={() => { setModo('criar'); setTrocandoEmail(true); }}>Criar conta</button>
          </div>
          {modo === 'entrar' && !trocandoEmail && email ? (
            <div className="en-lembrado">
              <span className="en-avatar" aria-hidden="true">
                {lerLogoLembrada() ? <img src={lerLogoLembrada()} alt="" /> : <LogoGrow size={34} />}
              </span>
              <span className="en-lembrado-txt">
                <small>Entrar como</small>
                <b>{email}</b>
              </span>
              <button type="button" className="en-trocar" onClick={() => { setTrocandoEmail(true); setSenha(''); }}>Trocar</button>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="enEmail">E-mail</label>
              <input id="enEmail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@growmaisoficial.com" autoFocus={trocandoEmail && Boolean(emailLembrado())} />
            </div>
          )}
          <div className="field">
            <label htmlFor="enSenha">Senha</label>
            <div className="cfg-chave">
              <input
                id="enSenha"
                type={verSenha ? 'text' : 'password'}
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fazLogin(); }}
                placeholder={modo === 'criar' ? 'mínimo 6 caracteres' : 'sua senha'}
                autoFocus={modo === 'entrar' && !trocandoEmail && Boolean(email)}
              />
              <button type="button" className="cfg-olho" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Esconder a senha' : 'Mostrar a senha'}>
                {verSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <label className="en-lembrar">
            <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            <span>Lembrar meu e-mail neste aparelho</span>
          </label>
          <div className="cfg-acoes">
            <button type="button" className="btn btn-primary en-btn en-btn-cheio" onClick={fazLogin} disabled={!!ocupado}>
              {ocupado === 'login' ? <Loader size={15} className="cfg-girando" /> : <LogIn size={15} strokeWidth={2} />}
              {modo === 'criar' ? 'Criar conta' : 'Entrar'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Logado, sem empresa neste computador */}
      {sessao && !empresa && (
        <div className="en-bloco">
          <p className="en-logado"><span className="en-ponto" aria-hidden="true" />Conectado como <b>{sessao.usuario?.email}</b></p>
          {existentes.length > 0 && (
            <div className="en-existentes">
              {existentes.map((e) => (
                <button key={e.id} type="button" className="wa-bv-opcao" onClick={() => { usarEmpresa(e); conectado(e); }}>
                  <span className="wa-bv-op-icone wa-bv-verde"><Building2 size={20} strokeWidth={2} /></span>
                  <span className="wa-bv-op-txt"><b>Usar {e.nome}</b><small>Empresa já ligada ao seu login</small></span>
                </button>
              ))}
            </div>
          )}
          <div className="en-opcoes">
            <div className="en-opcao">
              <span className="en-opcao-icone en-azul"><KeyRound size={18} strokeWidth={2} /></span>
              <h3>Já tenho o código</h3>
              <p>O código aparece em Configurações, no computador onde a empresa foi criada.</p>
              <input
                className="en-codigo-input"
                value={codigo}
                onChange={(e) => setCodigo(formataCodigo(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter' && codigo.replace(/\W/g, '').length >= 12) acao('entrar', async () => conectado(await entrarEmpresa(codigo))); }}
                placeholder="GROW-XXXX-XXXX-XXXX"
                aria-label="Código da empresa"
                inputMode="text"
                autoCapitalize="characters"
                spellCheck="false"
              />
              <button type="button" className="btn btn-primary en-btn en-btn-cheio" disabled={!!ocupado || codigo.replace(/\W/g, '').length < 12} onClick={() => acao('entrar', async () => conectado(await entrarEmpresa(codigo)))}>
                {ocupado === 'entrar' ? <Loader size={15} className="cfg-girando" /> : <LogIn size={15} strokeWidth={2} />} Conectar
              </button>
            </div>
            <div className="en-opcao">
              <span className="en-opcao-icone en-verde"><Building2 size={18} strokeWidth={2} /></span>
              <h3>Primeiro acesso</h3>
              <p>Cria a empresa e gera o código para conectar os outros computadores e o celular.</p>
              <input className="en-codigo-input en-nome" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Nome da empresa" aria-label="Nome da empresa" />
              <button type="button" className="btn en-btn en-btn-cheio en-btn-borda" disabled={!!ocupado || !nomeEmpresa.trim()} onClick={() => acao('criar', async () => conectado(await criarEmpresa(nomeEmpresa)))}>
                {ocupado === 'criar' ? <Loader size={15} className="cfg-girando" /> : <Plus size={15} strokeWidth={2} />} Criar empresa
              </button>
            </div>
          </div>
          <button type="button" className="en-link" onClick={fazSair}>Sair deste login</button>
        </div>
      )}

      {/* 3. Conectado */}
      {sessao && empresa && (
        <div className="en-bloco">
          <div className="en-conectado">
            <span className={`em-conta-icone${empresa.logo ? ' en-com-logo' : ''}`}>
              {empresa.logo ? <img src={empresa.logo} alt={`Logo da ${empresa.nome}`} /> : <Building2 size={20} strokeWidth={1.75} />}
            </span>
            <div className="em-conta-info">
              <span className="em-conta-rotulo">Empresa conectada</span>
              <b>{empresa.nome}</b>
              <span className="en-sub">{sessao.usuario?.email}</span>
            </div>
          </div>

          <div className="en-logo">
            <span className="en-logo-previa">
              {empresa.logo ? <img src={empresa.logo} alt="" /> : <Building2 size={22} strokeWidth={1.75} />}
            </span>
            <div className="en-logo-txt">
              <b>Logo da empresa</b>
              <span>Aparece no login e nas Configurações de todos os computadores. PNG, JPG, WebP ou SVG.</span>
            </div>
            <label className={`btn btn-ghost en-btn${ocupado ? ' disabled' : ''}`}>
              {ocupado === 'logo' ? <Loader size={15} className="cfg-girando" /> : <ImagePlus size={15} strokeWidth={2} />}
              {empresa.logo ? 'Trocar' : 'Enviar logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                disabled={!!ocupado}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  e.target.value = '';
                  if (!arquivo) return;
                  acao('logo', async () => {
                    setEmpresa(await definirLogo(await reduzLogo(arquivo)));
                    setAviso({ ok: true, texto: 'Logo da empresa atualizada.' });
                  });
                }}
              />
            </label>
            {empresa.logo && (
              <button
                type="button"
                className="sc-acao"
                title="Remover a logo"
                aria-label="Remover a logo"
                disabled={!!ocupado}
                onClick={() => acao('logo', async () => { setEmpresa(await definirLogo(null)); })}
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            )}
          </div>

          <div className="en-codigo">
            <span className="en-codigo-rotulo">Código da empresa (número de série)</span>
            <div className="en-codigo-linha">
              <code>{verCodigo ? empresa.codigo : `${empresa.codigo.slice(0, 5)}••••-••••-${empresa.codigo.slice(-4)}`}</code>
              <button type="button" className="sc-acao" onClick={() => setVerCodigo((v) => !v)} aria-label={verCodigo ? 'Esconder o código' : 'Mostrar o código'} title={verCodigo ? 'Esconder' : 'Mostrar'}>
                {verCodigo ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
              </button>
              <button type="button" className="sc-acao" onClick={copiaCodigo} aria-label="Copiar o código" title="Copiar">
                {copiado ? <Check size={15} strokeWidth={2.25} /> : <Copy size={15} strokeWidth={2} />}
              </button>
            </div>
            <span className="cfg-dica">Para ligar outro computador: abra o Prospector nele, entre com o mesmo login e digite este código. Guarde-o como uma senha.</span>
            <div className="en-baixar"><BaixarApp className="btn btn-ghost en-btn" rotulo="Baixar o app para outro computador" /></div>
          </div>

          <div className={`en-estado${estado.erro ? ' erro' : ''}`}>
            {estado.erro ? <CloudOff size={15} strokeWidth={2} /> : <Cloud size={15} strokeWidth={2} />}
            <span>{estado.erro ? `Não sincronizou: ${estado.erro}` : `Sincronizado ${quandoFoi(estado.ultima)}. ${CHAVES_SINCRONIZADAS.length} tipos de dado.`}</span>
          </div>

          <div className="cfg-acoes">
            <button type="button" className="btn btn-ghost en-btn" onClick={() => window.dispatchEvent(new Event('prospector:nuvem-agora'))}>
              <RefreshCw size={15} strokeWidth={2} /> Sincronizar agora
            </button>
            <button type="button" className="btn btn-ghost en-btn" onClick={fazSair} disabled={!!ocupado}>
              <LogOut size={15} strokeWidth={2} /> Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
