/**
 * Número de WhatsApp mascarado para a interface: só os 4 últimos dígitos.
 * O número inteiro aparece em tela compartilhada, print e gravação de vídeo;
 * os 4 finais bastam para saber qual conexão está ativa.
 */
export function mascaraTelefone(numero) {
  const digitos = String(numero || '').replace(/\D/g, '');
  if (!digitos) return '';
  return `•••• ${digitos.slice(-4)}`;
}
