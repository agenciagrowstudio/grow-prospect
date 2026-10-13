import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

/**
 * Atualização do app, só em Configurações. Nada de faixa no topo nem de
 * verificação sozinha ao abrir: a pessoa procura quando quiser.
 */
export default function AtualizacaoApp() {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return undefined;
    return window.electronAPI.onUpdateStatus((data) => {
      if (!data) return;
      if (data.status === 'progress') { setProgress(data.percent || 0); setStatus({ type: 'progress' }); return; }
      if (data.status === 'checking') { setStatus({ type: 'checking' }); return; }
      if (data.status === 'available') { setStatus({ type: 'available', version: data.version }); return; }
      if (data.status === 'downloaded') { setStatus({ type: 'downloaded', version: data.version }); return; }
      if (data.status === 'not-available') { setStatus({ type: 'atual' }); return; }
      if (data.status === 'error') setStatus({ type: 'error', message: data.message });
    });
  }, []);

  if (!window.electronAPI?.checkUpdate) return null;

  const procura = async () => {
    setStatus({ type: 'checking' });
    try {
      const res = await window.electronAPI.checkUpdate();
      if (!res?.success) setStatus({ type: 'error', message: res?.error });
      else if (!res.updateInfo) setStatus((s) => (s?.type === 'checking' ? { type: 'atual' } : s));
    } catch (err) {
      setStatus({ type: 'error', message: err?.message });
    }
  };

  const baixa = async () => {
    setProgress(0);
    setStatus({ type: 'progress' });
    const res = await window.electronAPI?.downloadUpdate?.().catch((e) => ({ success: false, error: e?.message }));
    if (!res?.success) setStatus({ type: 'error', message: res?.error || 'Não foi possível baixar a atualização.' });
  };

  const instala = async () => {
    const res = await window.electronAPI?.installUpdate?.().catch((e) => ({ success: false, error: e?.message }));
    if (!res?.success) setStatus({ type: 'error', message: res?.error || 'Não foi possível instalar a atualização.' });
  };

  const t = status?.type;
  return (
    <div className="cfg-atualizacao">
      <div className="cfg-atualizacao-txt">
        <b>Atualização</b>
        <span className={t === 'error' ? 'erro' : t === 'atual' ? 'ok' : ''}>
          {t === 'checking' && <><Loader size={13} className="cfg-girando" /> Procurando…</>}
          {t === 'atual' && <><CheckCircle2 size={13} /> Você está na versão mais recente.</>}
          {t === 'available' && <>Versão {status.version} disponível.</>}
          {t === 'progress' && <>Baixando… {progress}%</>}
          {t === 'downloaded' && <><CheckCircle2 size={13} /> Pronta para instalar.</>}
          {t === 'error' && <><AlertCircle size={13} /> {status.message || 'Não foi possível procurar agora.'}</>}
          {!t && 'Versões novas também chegam pelo link de download da empresa.'}
        </span>
      </div>
      {t === 'available' && (
        <button type="button" className="btn btn-primary btn-sm" onClick={baixa}><Download size={14} /> Baixar</button>
      )}
      {t === 'downloaded' && (
        <button type="button" className="btn btn-primary btn-sm" onClick={instala}>Reiniciar e instalar</button>
      )}
      {!['available', 'downloaded', 'progress', 'checking'].includes(t) && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={procura}><RefreshCw size={14} /> Procurar atualização</button>
      )}
    </div>
  );
}
