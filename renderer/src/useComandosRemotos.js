import { useCallback, useEffect, useRef, useState } from 'react';
import {
  limpaPedido, rotuloDoPedido, pegarComando, concluirComando, nomeDoPc,
  enviarComando, estadoComandos, cancelarComando, resumoDoPedido, textoDoResultado,
  novoIdDeBusca,
} from './comandosRemotos';
import { lerEmpresa, lerSessao } from './nuvem';

/**
 * Lado do computador: enquanto o Prospector está aberto e ligado à empresa,
 * bate na nuvem a cada poucos segundos. Se chegou pedido de extração (feito na
 * web ou em outro aparelho) e o robô está livre, roda pelo mesmo caminho da
 * extração feita aqui, e devolve o resultado.
 */
const BATIDA_MS = 8000;

export function useExecutorRemoto({ iniciarExtracao, cancelarExtracao, extracaoEmAndamento, notificar, disponivel }) {
  const iniciarRef = useRef(iniciarExtracao);
  const cancelarRef = useRef(cancelarExtracao);
  const ocupadoRef = useRef(extracaoEmAndamento);
  const notificarRef = useRef(notificar);
  const atualRef = useRef(null); // { id, cancelado }
  const nomeRef = useRef('Computador');
  const progressoRef = useRef(null);

  useEffect(() => {
    iniciarRef.current = iniciarExtracao;
    cancelarRef.current = cancelarExtracao;
    ocupadoRef.current = extracaoEmAndamento;
    notificarRef.current = notificar;
  });

  // Progresso do robô, para quem pediu acompanhar.
  useEffect(() => {
    if (!disponivel || !window.electronAPI?.onProgress) return undefined;
    return window.electronAPI.onProgress((entry) => {
      if (!atualRef.current || !entry || typeof entry !== 'object') return;
      const atual = Number(entry.current);
      const total = Number(entry.total);
      if (Number.isFinite(atual) && total > 0) progressoRef.current = Math.round(Math.min(100, (atual / total) * 100));
    });
  }, [disponivel]);

  const executa = useCallback(async (comando) => {
    const checado = limpaPedido(comando.pedido);
    if (!checado.ok) {
      await concluirComando(comando.id, 'erro', { erro: checado.erro }).catch(() => {});
      return;
    }
    const pedido = checado.pedido;
    const rotulo = rotuloDoPedido(pedido);
    atualRef.current = { id: comando.id, cancelado: false };
    progressoRef.current = 0;
    notificarRef.current?.({
      type: 'info',
      category: 'scraper',
      title: 'Extração pedida pela web',
      message: `${rotulo}. O robô deste computador começou a busca.`,
    });
    let r;
    try {
      r = await iniciarRef.current({ ...pedido, remota: true });
    } catch (erro) {
      r = { ok: false, erro: erro?.message || 'Falha na extração.' };
    }
    const cancelado = atualRef.current?.cancelado;
    atualRef.current = null;
    progressoRef.current = null;
    let status;
    let resultado;
    if (r?.ok) {
      status = 'concluido';
      resultado = { novos: r.novos || 0, encontrados: r.encontrados || 0, repetidos: r.repetidos || 0, searchId: r.searchId || null };
    } else if (r?.ocupado) {
      // Uma extração manual começou no mesmo instante: o pedido volta para a fila.
      status = 'pendente';
      resultado = null;
    } else if (r?.cancelada || cancelado) {
      status = 'cancelado';
      resultado = { erro: 'Cancelado durante a extração. Nenhum lead parcial entrou na base.' };
    } else {
      status = 'erro';
      resultado = { erro: r?.erro || 'O computador não conseguiu concluir a busca.' };
    }
    // A nuvem precisa saber do fim; sem rede agora, tenta de novo algumas vezes.
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      try { await concluirComando(comando.id, status, resultado); break; } catch { await new Promise((ok) => setTimeout(ok, 5000)); }
    }
  }, []);

  useEffect(() => {
    if (!disponivel) return undefined;
    let vivo = true;
    let ocupadoNaBatida = false;
    nomeDoPc().then((n) => { nomeRef.current = n; });

    const bate = async () => {
      if (ocupadoNaBatida || !lerEmpresa() || !lerSessao()) return;
      ocupadoNaBatida = true;
      try {
        const livre = !atualRef.current && !ocupadoRef.current;
        const r = await pegarComando({
          livre,
          progresso: atualRef.current ? progressoRef.current : null,
          nome: nomeRef.current,
        });
        if (!vivo) return;
        const atual = atualRef.current;
        if (atual && !atual.cancelado && Array.isArray(r?.cancelar) && r.cancelar.includes(atual.id)) {
          atual.cancelado = true;
          cancelarRef.current?.();
        }
        if (r?.comando?.id && livre) executa(r.comando);
      } catch {
        // Sem internet ou sessão vencida: tenta na próxima batida.
      } finally {
        ocupadoNaBatida = false;
      }
    };
    const t = setInterval(bate, BATIDA_MS);
    const primeira = setTimeout(bate, 4000);
    return () => { vivo = false; clearInterval(t); clearTimeout(primeira); };
  }, [disponivel, executa]);
}

/**
 * Lado de quem pede (versão web): manda o pedido para o computador e
 * acompanha até terminar. Os leads chegam pela sincronização de sempre.
 */
const ACOMPANHA_MS = 4000;
const CHAVE_PEDIDOS = 'prospector_pedidos_remotos';

const lePedidos = () => {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
const gravaPedidos = (lista) => {
  try { localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(lista)); } catch { /* sem espaço: só não lembra depois de recarregar */ }
};

export function usePedidosRemotos({ notificar, ativo, aoTerminar }) {
  // Pedidos deste aparelho ainda abertos: { id, searchId, rotulo, pedido }.
  const [pedidos, setPedidos] = useState(lePedidos);
  const [resumos, setResumos] = useState({});
  const notificarRef = useRef(notificar);
  const terminarRef = useRef(aoTerminar);
  useEffect(() => { notificarRef.current = notificar; terminarRef.current = aoTerminar; });
  useEffect(() => { gravaPedidos(pedidos); }, [pedidos]);

  const pedir = useCallback(async (dados) => {
    const checado = limpaPedido({ ...dados, searchId: novoIdDeBusca() });
    if (!checado.ok) {
      notificarRef.current?.({ type: 'error', category: 'scraper', title: 'Pedido incompleto', message: checado.erro });
      return { ok: false, erro: checado.erro };
    }
    try {
      const linha = await enviarComando(checado.pedido);
      const novo = { id: linha.id, searchId: checado.pedido.searchId, rotulo: rotuloDoPedido(checado.pedido), pedido: checado.pedido };
      setPedidos((lista) => [novo, ...lista.filter((p) => p.id !== novo.id)]);
      notificarRef.current?.({
        type: 'info',
        category: 'scraper',
        title: 'Pedido enviado ao computador',
        message: `${novo.rotulo}. O robô do Prospector no PC faz a busca e os leads aparecem aqui.`,
      });
      return { ok: true, remoto: true, id: linha.id, searchId: novo.searchId };
    } catch (erro) {
      notificarRef.current?.({ type: 'error', category: 'scraper', title: 'Não deu para enviar o pedido', message: erro.message });
      return { ok: false, erro: erro.message };
    }
  }, []);

  const cancelar = useCallback(async (id) => {
    try {
      const r = await cancelarComando(id);
      notificarRef.current?.({
        type: 'info',
        category: 'scraper',
        title: r === 'avisado' ? 'Cancelamento enviado' : 'Pedido cancelado',
        message: r === 'avisado' ? 'O computador vai encerrar a busca sem adicionar resultados parciais.' : 'O pedido saiu da fila do computador.',
      });
    } catch (erro) {
      notificarRef.current?.({ type: 'error', category: 'scraper', title: 'Não deu para cancelar', message: erro.message });
    }
  }, []);

  const temPedidos = pedidos.length > 0;
  useEffect(() => {
    if (!ativo || !temPedidos) return undefined;
    let vivo = true;
    const acompanha = async () => {
      let estado;
      try { estado = await estadoComandos(); } catch { return; }
      if (!vivo) return;
      const atuais = lePedidos();
      const novosResumos = {};
      const terminados = [];
      atuais.forEach((p) => {
        const resumo = resumoDoPedido(estado, p.id);
        novosResumos[p.id] = resumo;
        if (resumo.final) terminados.push({ ...p, resumo });
      });
      setResumos(novosResumos);
      if (!terminados.length) return;
      setPedidos((lista) => lista.filter((p) => !terminados.some((t) => t.id === p.id)));
      terminados.forEach(({ rotulo, resumo, searchId }) => {
        const c = resumo.comando;
        const ok = c?.status === 'concluido';
        notificarRef.current?.({
          type: ok ? 'success' : (c?.status === 'cancelado' ? 'info' : 'error'),
          category: 'scraper',
          title: ok ? `Extração concluída no computador: ${rotulo}` : (c?.status === 'cancelado' ? `Pedido cancelado: ${rotulo}` : `Extração não terminou: ${rotulo}`),
          message: c ? textoDoResultado(c) : 'O pedido não aparece mais na nuvem.',
        });
        // Busca os leads novos agora, sem esperar o minuto da sincronização.
        if (ok) terminarRef.current?.(searchId);
      });
    };
    acompanha();
    const t = setInterval(acompanha, ACOMPANHA_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [ativo, temPedidos]);

  return { pedidos, resumos, pedir, cancelar };
}
