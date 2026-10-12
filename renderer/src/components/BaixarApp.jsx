import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { linksDeDownload } from '../nuvem';

/**
 * Botão "Baixar o app para Windows". O link vem do banco e só aparece para quem
 * já entrou numa empresa; sem link ou sem rede, o botão simplesmente não existe.
 */
export default function BaixarApp({ className = 'btn btn-primary', rotulo = 'Baixar o app para Windows' }) {
  const [link, setLink] = useState(null);

  useEffect(() => {
    let vivo = true;
    linksDeDownload()
      .then((lista) => { if (vivo) setLink(lista.find((l) => l.id === 'instalador') || lista[0] || null); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!link) return null;
  const abre = () => {
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(link.url);
    else window.open(link.url, '_blank', 'noopener');
  };
  return (
    <button type="button" className={`${className} bx-app`} onClick={abre} title={link.versao ? `Versão ${link.versao}` : undefined}>
      <Download size={15} strokeWidth={2} aria-hidden="true" /> {rotulo}
    </button>
  );
}
