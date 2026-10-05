/**
 * Os três públicos da prospecção e o idioma de cada um.
 *
 * - br:   brasileiros no Brasil (português)
 * - brus: brasileiros nos EUA (português)
 * - us:   americanos nos EUA (inglês)
 *
 * Um lead dos EUA só vira "brus" com sinal brasileiro alto. Na dúvida fica em
 * inglês: um brasileiro lendo inglês entende, um americano lendo português não.
 * A tela de E-mail repete esta regra em renderer/src/components/EmailPanel.jsx;
 * mudou aqui, muda lá.
 */
const PUBLICOS = {
  br: { id: 'br', nome: 'Brasileiros no Brasil', idioma: 'pt' },
  brus: { id: 'brus', nome: 'Brasileiros nos EUA', idioma: 'pt' },
  us: { id: 'us', nome: 'Americanos nos EUA', idioma: 'en' },
};

function publicoDoLead(lead) {
  if (lead?.publico && PUBLICOS[lead.publico]) return lead.publico;
  const pais = String(lead?.pais || 'BR').toUpperCase();
  if (pais === 'BR') return 'br';
  return lead?.sinalBr?.nivel === 'alto' ? 'brus' : 'us';
}

/**
 * Rodapé obrigatório. Nos EUA a CAN-SPAM exige endereço físico e um jeito de
 * sair da lista; no Brasil a LGPD pede o mesmo direito de oposição. Como o app
 * não tem servidor, o descadastro é por resposta, e o verificador de respostas
 * reconhece as palavras abaixo.
 */
function rodape(publico, { remetente, endereco }) {
  const idioma = PUBLICOS[publico]?.idioma || 'pt';
  const linhas = idioma === 'en'
    ? ['--', remetente, endereco, 'Not interested? Reply "unsubscribe" and you will not hear from me again.']
    : ['--', remetente, endereco, 'Não quer mais receber? Responda "SAIR" e eu não escrevo de novo.'];
  return linhas.filter(Boolean).join('\n');
}

const PALAVRAS_DESCADASTRO = /\b(sair|descadastr\w*|remover|remova|parar|pare|unsubscribe|stop|remove me|opt[ -]?out)\b/i;

module.exports = { PUBLICOS, publicoDoLead, rodape, PALAVRAS_DESCADASTRO };
