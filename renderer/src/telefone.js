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

/**
 * Número no formato que o WhatsApp entende: só dígitos, com o código do país.
 * O Maps grava "+1 407-728-2431" ou "(21) 99999-0000"; sem o "+", o país
 * vem do lead (EUA ganha 1, Brasil ganha 55).
 */
export function digitosWhatsApp(numero, pais = 'BR') {
  const bruto = String(numero || '').trim();
  let digitos = bruto.replace(/\D/g, '');
  if (!digitos) return '';
  if (bruto.startsWith('+')) return digitos;
  digitos = digitos.replace(/^0+/, '');
  const eua = String(pais || 'BR').toUpperCase() === 'US';
  if (eua && digitos.length === 10) return `1${digitos}`;
  if (!eua && (digitos.length === 10 || digitos.length === 11)) return `55${digitos}`;
  return digitos;
}
