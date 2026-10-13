import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, RefreshCw, CircleCheck, CircleAlert } from 'lucide-react';
import IconePng from './IconePng';
import { ICONES } from '../assets/icones';

/**
 * Conta do Instagram usada para abrir os perfis dos leads. A janela é do app,
 * com sessão própria: a pessoa entra uma vez, digitando a senha no próprio
 * Instagram, e os cliques nos perfis abrem já logados nessa conta.
 */
const CHAVE_CONTA = 'prospector_instagram_conta';
const CONTA_PADRAO = '@matheus.dpaulaa';

const leConta = () => {
  try { return localStorage.getItem(CHAVE_CONTA) || CONTA_PADRAO; } catch { return CONTA_PADRAO; }
};

export default function InstagramProspeccao() {
  const api = window.electronAPI;
  const disponivel = typeof api?.instagramStatus === 'function';
  const [conta, setConta] = useState(leConta);
  const [logado, setLogado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const confere = async () => {
    if (!disponivel) return;
    try { setLogado(Boolean((await api.instagramStatus())?.logado)); } catch { setLogado(false); }
  };

  useEffect(() => {
    confere();
    // Depois de entrar na janela do Instagram, a volta para o app atualiza o estado.
    window.addEventListener('focus', confere);
    return () => window.removeEventListener('focus', confere);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardaConta = (valor) => {
    const limpo = valor.trim() ? `@${valor.trim().replace(/^@+/, '')}` : '';
    setConta(limpo || valor);
    try { localStorage.setItem(CHAVE_CONTA, limpo || CONTA_PADRAO); } catch {}
  };

  const sair = async () => {
    setOcupado(true);
    try { await api.instagramSair(); setLogado(false); } finally { setOcupado(false); }
  };

  return (
    <div className="cfg-card">
      <div className="cfg-card-head">
        <span className="cfg-icone"><IconePng src={ICONES.instagram} size={18} /></span>
        <div>
          <h2>Instagram da prospecção</h2>
          <p>
            Os perfis dos leads abrem numa janela do app, já logada nesta conta. Entre uma vez: a senha é
            digitada direto na página do Instagram, e o app não vê nem guarda a senha.
          </p>
        </div>
      </div>

      {!disponivel ? (
        <span className="cfg-dica">Disponível no Prospector instalado no computador.</span>
      ) : (
        <>
          <div className="ig-linha">
            <div className="field ig-conta">
              <label htmlFor="igConta">Conta</label>
              <input
                id="igConta"
                autoComplete="off"
                spellCheck="false"
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                onBlur={(e) => guardaConta(e.target.value)}
              />
            </div>
            <span className={`ig-estado${logado ? ' on' : ''}`}>
              {logado ? <CircleCheck size={15} strokeWidth={2} /> : <CircleAlert size={15} strokeWidth={2} />}
              {logado == null ? 'Conferindo...' : logado ? 'Logado' : 'Não logado'}
            </span>
          </div>
          <div className="cfg-acoes">
            <button type="button" className="btn btn-primary" onClick={() => api.instagramEntrar()}>
              <LogIn size={15} strokeWidth={1.8} /> {logado ? 'Abrir o Instagram' : `Entrar com ${conta}`}
            </button>
            <button type="button" className="btn btn-ghost" onClick={confere} title="Conferir de novo">
              <RefreshCw size={15} strokeWidth={1.8} /> Conferir
            </button>
            {logado && (
              <button type="button" className="btn btn-ghost" onClick={sair} disabled={ocupado}>
                <LogOut size={15} strokeWidth={1.8} /> Sair desta conta
              </button>
            )}
          </div>
          {logado && (
            <span className="cfg-dica">
              Se estiver logado em outra conta, clique em Sair desta conta e entre de novo com {conta}.
            </span>
          )}
        </>
      )}
    </div>
  );
}
