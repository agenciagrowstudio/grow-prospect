import React, { useEffect, useRef, useState } from 'react';

const REDUZ = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que conta até o valor quando entra ou muda (ease-out, ~0,9 s). */
export default function Contagem({ valor }) {
  const [mostrado, setMostrado] = useState(REDUZ ? valor : 0);
  const anterior = useRef(REDUZ ? valor : 0);
  useEffect(() => {
    if (REDUZ) { setMostrado(valor); return undefined; }
    const de = anterior.current;
    anterior.current = valor;
    if (de === valor) return undefined;
    const inicio = performance.now();
    let quadro;
    const passo = (t) => {
      const p = Math.min(1, (t - inicio) / 900);
      const suave = 1 - (1 - p) ** 3;
      setMostrado(Math.round(de + (valor - de) * suave));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);
  return <span className="da-num">{mostrado}</span>;
}
