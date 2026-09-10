const { resolvePais } = require('../utils/paises');

const DEFAULT_COUNTRY_CODE = '55';

/**
 * Normaliza telefone para o formato que o WhatsApp espera (só dígitos, com
 * código do país na frente).
 *
 * O segundo parâmetro aceita sigla ('US'), código telefônico ('1') ou o objeto
 * de país. Continua caindo no Brasil quando ninguém informa, para não mudar o
 * comportamento de quem já chamava com um argumento só.
 *
 * O ponto delicado é decidir se o número já traz o código do país. Antes a
 * regra era "tem 10 dígitos ou mais, então prefixa 55", e ela transformava um
 * telefone americano como (617) 555-0123 em 556175550123, que é um número real
 * em Brasília. A campanha mandaria mensagem para um estranho sem nenhum aviso.
 * Agora a decisão usa a quantidade de dígitos que o plano de numeração do país
 * realmente tem, então o mesmo número com país US sai como 16175550123.
 */
function normalizePhone(phone, pais = DEFAULT_COUNTRY_CODE) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, number: null, reason: 'Telefone vazio' };
  }

  const info = resolvePais(pais);
  const countryCode = info.codigoTelefone;
  const nacional = info.digitosNacionais;

  const raw = phone.trim();
  let digits = raw.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');

  const explicitInternational = raw.startsWith('+');

  if (explicitInternational) {
    // Número internacional escrito por extenso: respeita o código que veio.
  } else if (digits.startsWith(countryCode) && nacional.includes(digits.length - countryCode.length)) {
    // Já vem com o código do país e o resto bate com o plano nacional.
  } else if (nacional.includes(digits.length)) {
    digits = countryCode + digits;
  } else {
    const esperado = nacional.join(' ou ');
    return {
      valid: false,
      number: null,
      reason: `Número não bate com o plano de ${info.nome}: esperado ${esperado} dígitos, recebido ${digits.length}`,
    };
  }

  const minLength = explicitInternational ? 10 : countryCode.length + Math.min(...nacional);
  if (digits.length < minLength) {
    return { valid: false, number: null, reason: `Número deve ter pelo menos ${minLength} dígitos` };
  }

  if (digits.length > 15) {
    return { valid: false, number: null, reason: 'Número excede 15 dígitos' };
  }

  return { valid: true, number: digits };
}

module.exports = { normalizePhone, DEFAULT_COUNTRY_CODE };
