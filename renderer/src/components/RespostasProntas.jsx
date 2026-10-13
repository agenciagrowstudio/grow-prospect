import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { RESPOSTAS, GRUPOS_RESPOSTAS } from '../respostas';

/**
 * Aba Respostas da Fila do dia: o roteiro de atendimento da Grow+ (objeções,
 * depois da reunião, depois da proposta). Digita o nome do cliente uma vez e
 * copia o texto já preenchido.
 */
export default function RespostasProntas({ onAviso }) {
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState('objecoes');
  const lista = RESPOSTAS.filter((r) => r.grupo === grupo);

  const copia = async (r) => {
    try {
      await navigator.clipboard.writeText(r.texto(nome.trim()));
      onAviso?.(`"${r.titulo}" copiada.`);
    } catch {
      onAviso?.('Não consegui copiar. Selecione o texto e use Ctrl+C.');
    }
  };

  return (
    <div className="rp">
      <div className="rp-topo">
        <label className="fu-nome rp-nome">
          Nome do cliente
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nayara (opcional)" autoComplete="off" />
        </label>
        <div className="rp-grupos" role="tablist" aria-label="Tipo de resposta">
          {GRUPOS_RESPOSTAS.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={grupo === g.id} className={`chip${grupo === g.id ? ' on' : ''}`} onClick={() => setGrupo(g.id)}>
              {g.nome}
            </button>
          ))}
        </div>
      </div>
      <div className="rp-lista">
        {lista.map((r) => (
          <article key={r.titulo} className="rp-item">
            <header>
              <b>{r.titulo}</b>
              <button type="button" className="fa-mini fa-mini-forte" onClick={() => copia(r)}>
                <Copy size={13} strokeWidth={2} aria-hidden="true" /> Copiar
              </button>
            </header>
            <p>{r.texto(nome.trim())}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
