import React, { useEffect, useState } from 'react';
import { KeyRound, Check, Loader, Trash2, ExternalLink } from 'lucide-react';

/**
 * Conta do Apify: de lá saem os extratores do Instagram (busca de posts e
 * anúncios, comentários e perfis). O token fica cifrado no cofre do Windows e
 * não volta para a tela; o custo de cada extração sai da conta Apify.
 */
export default function ApifyConta() {
  const api = window.electronAPI;
  const disponivel = typeof api?.apifyStatus === 'function';
  const [estado, setEstado] = useState({ carregando: disponivel, temToken: false, usuario: '' });
  const [token, setToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!disponivel) return;
    api.apifyStatus().then((r) => setEstado({ carregando: false, temToken: Boolean(r?.temToken), usuario: r?.usuario || '' }))
      .catch(() => setEstado({ carregando: false, temToken: false, usuario: '' }));
  }, [api, disponivel]);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    const r = await api.apifySalvar(token);
    setSalvando(false);
    if (!r?.success) { setErro(r?.error || 'Não consegui conferir o token.'); return; }
    setToken('');
    setEstado({ carregando: false, temToken: true, usuario: r.usuario || '' });
  };

  const remover = async () => {
    await api.apifyRemover();
    setEstado({ carregando: false, temToken: false, usuario: '' });
  };

  const abrir = (url) => (api?.openExternal ? api.openExternal(url) : window.open(url, '_blank', 'noopener'));

  return (
    <div className="cfg-card">
      <div className="cfg-card-head">
        <span className="cfg-icone"><KeyRound size={18} strokeWidth={1.9} /></span>
        <div>
          <h2>Apify (Leads do Instagram)</h2>
          <p>
            A busca de posts e anúncios e a extração de quem comentou rodam na sua conta do Apify. O token fica
            cifrado neste computador. Cada extração custa centavos de dólar, cobrados lá.
          </p>
        </div>
      </div>

      {!disponivel ? (
        <span className="cfg-dica">Disponível no Prospector instalado no computador.</span>
      ) : estado.carregando ? (
        <span className="cfg-dica"><Loader size={14} className="cfg-girando" /> Conferindo...</span>
      ) : estado.temToken ? (
        <div className="cfg-acoes">
          <span className="ig-estado on"><Check size={15} strokeWidth={2} /> Conectado{estado.usuario ? ` como ${estado.usuario}` : ''}</span>
          <button type="button" className="btn btn-ghost" onClick={remover}><Trash2 size={15} strokeWidth={1.8} /> Remover token</button>
        </div>
      ) : (
        <form className="ap-form" onSubmit={salvar}>
          <div className={`field${erro ? ' invalid' : ''}`}>
            <label htmlFor="apToken">Token da API</label>
            <input id="apToken" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="apify_api_..." autoComplete="off" spellCheck="false" />
            <span className="field-err">{erro}</span>
          </div>
          <div className="cfg-acoes">
            <button type="submit" className="btn btn-primary" disabled={salvando || token.trim().length < 20}>
              {salvando ? <Loader size={15} className="cfg-girando" /> : <Check size={15} strokeWidth={1.8} />} Salvar token
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => abrir('https://console.apify.com/settings/integrations')}>
              <ExternalLink size={15} strokeWidth={1.8} /> Onde pego o token
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
