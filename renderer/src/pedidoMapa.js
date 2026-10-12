/**
 * Pedido para a tela do mapa vindo de outra tela: abrir a Fila do dia ou já
 * chegar filtrada (frios, americanos...). A Fila mora na tela do mapa, então
 * quem está em outra tela deixa o pedido aqui e navega; o mapa atende ao abrir.
 */
let pendente = null;

/** @param {{abrirFila?: boolean, temperatura?: string, publico?: string, todasBuscas?: boolean}} pedido */
export function pedirMapa(pedido) {
  pendente = { ...pedido };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('prospector:pedido-mapa'));
}

/** Entrega o pedido uma vez só. */
export function pegarPedidoMapa() {
  const p = pendente;
  pendente = null;
  return p;
}
