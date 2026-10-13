/**
 * Pedido para a aba E-mail vindo de outra tela: o botão de e-mail do lead
 * deixa o lead aqui e o app abre a aba, que já carrega o template para ele.
 */
let pendente = null;

export function pedirEmail(lead) {
  pendente = lead ? { ...lead } : null;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('prospector:pedido-email'));
}

export function pegarPedidoEmail() {
  const p = pendente;
  pendente = null;
  return p;
}
