/**
 * Registro dos países onde a prospecção acontece.
 *
 * Existe porque o app nasceu assumindo Brasil em todo lugar: código telefônico
 * 55 fixo, geocodificação limitada a `countrycodes=br`, lista de cidades só
 * brasileira. Com a prospecção de brasileiros nos Estados Unidos isso deixou de
 * valer, e a suposição precisava virar dado explícito.
 *
 * O país vem da escolha do usuário no assistente de extração, não de palpite
 * sobre o endereço. Endereço do Google Maps varia de formato e nem sempre traz
 * o país, então inferir dali erraria justamente nos casos de fronteira.
 */

const PAISES = {
  BR: {
    sigla: 'BR',
    nome: 'Brasil',
    codigoTelefone: '55',
    // Fixo com 10 dígitos (DDD + 8), celular com 11 (DDD + 9 + 8).
    digitosNacionais: [10, 11],
    // Filtro de país do Nominatim.
    codigoNominatim: 'br',
    idiomaMaps: 'pt-BR',
  },
  US: {
    sigla: 'US',
    nome: 'Estados Unidos',
    codigoTelefone: '1',
    // Plano norte-americano: 3 de área + 7 do assinante.
    digitosNacionais: [10],
    codigoNominatim: 'us',
    idiomaMaps: 'en-US',
  },
};

const PAIS_PADRAO = 'BR';

/**
 * Aceita sigla ('BR', 'us'), código telefônico ('55', '1') ou o próprio objeto
 * de país. Devolve sempre um país válido, caindo no padrão quando não
 * reconhece, porque nenhum caminho de chamada pode quebrar por causa disso.
 */
function resolvePais(entrada) {
  if (!entrada) return PAISES[PAIS_PADRAO];
  if (typeof entrada === 'object' && entrada.sigla && PAISES[entrada.sigla]) {
    return PAISES[entrada.sigla];
  }

  const texto = String(entrada).trim().toUpperCase();
  if (PAISES[texto]) return PAISES[texto];

  const porTelefone = Object.values(PAISES).find((p) => p.codigoTelefone === texto);
  if (porTelefone) return porTelefone;

  return PAISES[PAIS_PADRAO];
}

function listaPaises() {
  return Object.values(PAISES);
}

module.exports = { PAISES, PAIS_PADRAO, resolvePais, listaPaises };
