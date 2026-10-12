import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, KeyRound, Check } from 'lucide-react';
import EmpresaNuvem from './EmpresaNuvem';
import LogoGrow from './LogoGrow';
import { sincronizar, sessaoDoLinkDeConfirmacao, lerSessao } from '../nuvem';

/**
 * Porta de entrada da versão web: sem login e empresa não há dados para
 * mostrar, então a primeira tela é conectar. Depois de conectar, baixa os
 * dados da empresa e abre o app. Também recebe a volta do link do e-mail de
 * confirmação, que já chega com a sessão.
 */
export default function EntradaWeb() {
  const [confirmando, setConfirmando] = useState(() => /access_token=|error_description=/.test(window.location.hash));
  const [aviso, setAviso] = useState(null);
  const [chave, setChave] = useState(0);

  useEffect(() => {
    if (!confirmando) return;
    sessaoDoLinkDeConfirmacao()
      .then((r) => {
        if (r?.ok) setAviso({ ok: true, texto: `E-mail confirmado. Você entrou como ${r.email}. Agora crie a empresa ou digite o código.` });
        else if (r) setAviso({ ok: false, texto: r.erro });
      })
      .catch((e) => setAviso({ ok: false, texto: e.message || 'Não foi possível concluir a confirmação.' }))
      .finally(() => { setConfirmando(false); setChave((n) => n + 1); });
  }, [confirmando]);

  const pronto = async () => {
    try { await sincronizar(); } catch { /* abre mesmo assim; a sincronização tenta de novo */ }
    window.location.reload();
  };

  const etapa = lerSessao() ? 2 : 1;
  const ETAPAS = ['Conta', 'Empresa', 'Pronto'];

  return (
    <main className="ew-tela">
      <section className="ew-lado" aria-label="Sobre o Prospector web">
        <div className="ew-marca">
          <span className="brand-icon-box"><LogoGrow size={38} /></span>
          <div>
            <b>Prospector</b>
            <span>2.0 · versão web</span>
          </div>
        </div>
        <h1>Seus leads em qualquer lugar</h1>
        <p className="ew-sub">A mesma base do Prospector do computador, no navegador e no celular.</p>
        <ul className="ew-lista">
          <li><span className="ew-li-icone ew-verde"><ClipboardList size={16} strokeWidth={2} /></span><div><b>Fila do dia no celular</b><span>Abra a mensagem pronta direto no WhatsApp do telefone.</span></div></li>
          <li><span className="ew-li-icone ew-azul"><RefreshCw size={16} strokeWidth={2} /></span><div><b>Sincroniza com o PC</b><span>Leads, abordagens e respostas iguais em todo lugar.</span></div></li>
          <li><span className="ew-li-icone ew-roxo"><KeyRound size={16} strokeWidth={2} /></span><div><b>Código da empresa</b><span>Só entra quem tem o seu login e o código.</span></div></li>
        </ul>
      </section>

      <div className="ew-caixa">
        <ol className="ew-etapas" aria-label="Etapas">
          {ETAPAS.map((nome, i) => {
            const n = i + 1;
            const feito = n < etapa;
            return (
              <li key={nome} className={`${feito ? 'feito' : ''}${n === etapa ? ' atual' : ''}`} aria-current={n === etapa ? 'step' : undefined}>
                <span className="ew-etapa-n">{feito ? <Check size={13} strokeWidth={2.75} /> : n}</span>
                {nome}
              </li>
            );
          })}
        </ol>
        {aviso && (
          <div className={`cfg-resultado ${aviso.ok ? 'ok' : 'erro'}`} role="status"><span>{aviso.texto}</span></div>
        )}
        {confirmando
          ? <div className="cfg-card"><p className="en-logado">Confirmando seu e-mail…</p></div>
          : <EmpresaNuvem key={chave} onConectado={pronto} onSessao={() => setChave((n) => n + 1)} web />}
      </div>
    </main>
  );
}
