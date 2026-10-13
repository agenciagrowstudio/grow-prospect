import React from 'react';

/**
 * Divisória arrastável entre a lista e o detalhe da Fila do dia. A largura
 * vive na variável --fa-lista da janela da Fila e fica guardada para a
 * próxima vez.
 */
export const CHAVE_LARGURA_LISTA = 'prospector_fila_lista';
const MIN = 220;
const MAX = 560;

export function larguraListaGuardada() {
  try {
    const n = Number(localStorage.getItem(CHAVE_LARGURA_LISTA));
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : 300;
  } catch { return 300; }
}

export default function DivisorFila() {
  const arrasta = (e) => {
    e.preventDefault();
    const corpo = e.currentTarget.parentElement;
    const janela = corpo.closest('.fa-modal');
    if (!corpo || !janela) return;
    const inicio = corpo.getBoundingClientRect().left;
    let largura = null;
    const move = (ev) => {
      largura = Math.round(Math.min(MAX, Math.max(MIN, ev.clientX - inicio)));
      janela.style.setProperty('--fa-lista', `${largura}px`);
    };
    const solta = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', solta);
      document.body.classList.remove('fa-arrastando');
      if (largura) { try { localStorage.setItem(CHAVE_LARGURA_LISTA, String(largura)); } catch {} }
    };
    document.body.classList.add('fa-arrastando');
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', solta);
  };

  // Duplo clique volta ao tamanho padrão.
  const padrao = (e) => {
    const janela = e.currentTarget.closest('.fa-modal');
    janela?.style.setProperty('--fa-lista', '300px');
    try { localStorage.removeItem(CHAVE_LARGURA_LISTA); } catch {}
  };

  return (
    <div
      className="fa-divisor"
      role="separator"
      aria-orientation="vertical"
      aria-label="Arraste para mudar a largura da lista"
      title="Arraste para mudar a largura da lista (duplo clique volta ao padrão)"
      onMouseDown={arrasta}
      onDoubleClick={padrao}
    />
  );
}
