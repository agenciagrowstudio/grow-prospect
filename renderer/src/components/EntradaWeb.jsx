import React from 'react';
import EmpresaNuvem from './EmpresaNuvem';
import LogoGrow from './LogoGrow';
import { sincronizar } from '../nuvem';

/**
 * Porta de entrada da versão web: sem login e empresa não há dados para
 * mostrar, então a primeira tela é conectar. Depois de conectar, baixa os
 * dados da empresa e abre o app.
 */
export default function EntradaWeb() {
  const pronto = async () => {
    try { await sincronizar(); } catch { /* abre mesmo assim; a sincronização tenta de novo */ }
    window.location.reload();
  };
  return (
    <main className="ew-tela">
      <div className="ew-caixa">
        <div className="ew-marca">
          <span className="brand-icon-box"><LogoGrow size={30} /></span>
          <div>
            <b>Prospector</b>
            <span>2.0 · versão web</span>
          </div>
        </div>
        <EmpresaNuvem onConectado={pronto} web />
      </div>
    </main>
  );
}
