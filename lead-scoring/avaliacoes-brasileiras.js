/**
 * Quem avalia um negócio diz muito sobre quem ele atende. Cliente de
 * diarista brasileira em Framingham costuma ser brasileiro: tem sobrenome
 * Borges, Oliveira, Carvalho, escreve em português, e o dono responde em
 * português.
 *
 * Aqui entra a lista das avaliações lidas na ficha do Google e sai só um
 * resumo com contagens. O nome de quem avaliou não é guardado: serve para
 * contar, não para identificar ninguém.
 *
 * Limite conhecido: sobrenome português também é de portugueses e
 * cabo-verdianos (fortes em New Bedford e Fall River, MA). Por isso o
 * sobrenome sozinho dá sinal médio, e junto com português escrito dá alto.
 */

// Sobrenomes comuns no Brasil e raros no espanhol e no inglês. Ficam de fora os
// que se confundem: Santos, Castro, Campos, Andrade, Miranda, Prado, Junior etc.
const SOBRENOMES_BR = new Set([
  'silva', 'souza', 'sousa', 'oliveira', 'pereira', 'ferreira', 'almeida', 'costa',
  'carvalho', 'gomes', 'lima', 'ribeiro', 'barbosa', 'araujo', 'cardoso', 'rocha',
  'dias', 'nascimento', 'moreira', 'mendes', 'freitas', 'borges', 'teixeira', 'correia',
  'correa', 'pinto', 'azevedo', 'machado', 'cavalcanti', 'cavalcante', 'monteiro', 'vieira',
  'batista', 'nunes', 'moura', 'cunha', 'fonseca', 'siqueira', 'magalhaes', 'goncalves',
  'fernandes', 'lopes', 'alves', 'martins', 'marques', 'peixoto', 'queiroz', 'brandao',
  'damasceno', 'coelho', 'melo', 'mello', 'assis', 'farias', 'leite', 'guimaraes',
  'sampaio', 'bezerra', 'medeiros', 'tavares', 'fagundes', 'rezende', 'resende', 'barros',
  'aguiar', 'amaral', 'antunes', 'bastos', 'cordeiro', 'pacheco', 'prates', 'neves',
  'santana', 'lacerda', 'figueiredo', 'brito', 'pimentel', 'cabral', 'rangel', 'toledo',
  'paiva', 'macedo', 'matos', 'mattos', 'conceicao', 'abreu', 'salles',
  'bittencourt', 'albuquerque', 'carneiro', 'drummond', 'fontes', 'galvao', 'loureiro',
  'meireles', 'mesquita', 'nogueira', 'sobral', 'valadares', 'veloso', 'zanetti', 'filho', 'neto',
  'ferraz', 'pires', 'menezes', 'pinheiro', 'vasconcelos', 'holanda', 'quaresma', 'bento', 'serafim',
]);

const MARCAS_PORTUGUES = [
  'ção', 'ções', 'ão ', 'ões', 'nh', 'lh', 'não', 'você', 'obrigad', 'muito',
  'ótim', 'otim', 'atendimento', 'excelente profissional', 'recomendo', 'serviço',
  'super indico', 'indico', 'maravilhos', 'caprichad', 'a gente', 'pra ', 'tá ', 'né',
];

const MENCOES_BRASIL = /brasileir|brazilian|brasil\b|brazil\b/i;

const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** "Mayra Borges" sim; "Patrick G" não. Olha as palavras depois da primeira. */
function temSobrenomeBrasileiro(nome) {
  const partes = semAcento(nome).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (partes.length < 2) return false;
  return partes.slice(1).some((p) => SOBRENOMES_BR.has(p));
}

/**
 * Em que língua a pessoa escreveu. O Maps traduz para a língua da tela e
 * avisa o original ("Mostrar original (inglês)"): com aviso, vale o aviso.
 * Sem aviso, o texto está na língua da tela; com a tela em português, é
 * português de verdade, e sem saber a tela, decide pelas marcas do texto.
 */
function originalEmPortugues(texto, idiomaOriginal, telaEmPortugues) {
  if (idiomaOriginal) return /portugu/i.test(idiomaOriginal);
  if (telaEmPortugues === true) return String(texto || '').trim().length > 0 && !/ñ|\bmuy\b|\bgracias\b/i.test(texto);
  return escritoEmPortugues(texto);
}

function escritoEmPortugues(texto) {
  const t = String(texto || '').toLowerCase();
  if (t.length < 25) return false;
  // Espanhol tem "ñ" e "muy"; com isso, nem conta.
  if (/ñ|\bmuy\b|\bgracias\b/.test(t)) return false;
  return MARCAS_PORTUGUES.filter((m) => t.includes(m)).length >= 2;
}

/**
 * @param {{autor?: string, texto?: string, resposta?: string}[]} lista
 * @returns {{lidas: number, sobrenomesBr: number, emPortugues: number, respostaDonoPt: boolean, citamBrasil: number, trechos: string[]}}
 */
function resumeAvaliacoes(lista = []) {
  const validas = (Array.isArray(lista) ? lista : []).filter((a) => a && (a.autor || a.texto));
  let sobrenomesBr = 0;
  let emPortugues = 0;
  let citamBrasil = 0;
  let respostaDonoPt = false;
  validas.forEach((a) => {
    if (temSobrenomeBrasileiro(a.autor)) sobrenomesBr += 1;
    if (a.texto && originalEmPortugues(a.texto, a.idiomaTexto, a.telaEmPortugues)) emPortugues += 1;
    if (MENCOES_BRASIL.test(`${a.texto || ''} ${a.resposta || ''}`)) citamBrasil += 1;
    if (a.resposta && originalEmPortugues(a.resposta, a.idiomaResposta, a.telaEmPortugues)) respostaDonoPt = true;
  });
  return {
    lidas: validas.length,
    sobrenomesBr,
    emPortugues,
    respostaDonoPt,
    citamBrasil,
    // Só os textos (sem nome), curtos, para a IA e para quem quiser conferir.
    trechos: validas.map((a) => String(a.texto || '').replace(/\s+/g, ' ').trim().slice(0, 220)).filter(Boolean).slice(0, 5),
  };
}

/**
 * Pontos e motivos para o sinal brasileiro, a partir do resumo.
 * @returns {{pontos: number, sinais: string[]}}
 */
function pontuaAvaliacoes(resumo) {
  const r = resumo || {};
  const sinais = [];
  let pontos = 0;
  if (!r.lidas) return { pontos, sinais };
  const parte = r.sobrenomesBr / r.lidas;
  if (r.sobrenomesBr >= 3 && parte >= 0.3) {
    pontos += 35;
    sinais.push(`${r.sobrenomesBr} de ${r.lidas} clientes nas avaliações com sobrenome brasileiro`);
  } else if (r.sobrenomesBr >= 2) {
    pontos += 20;
    sinais.push(`${r.sobrenomesBr} clientes nas avaliações com sobrenome brasileiro`);
  }
  if (r.emPortugues >= 2) {
    pontos += 30;
    sinais.push(`${r.emPortugues} avaliações escritas em português`);
  } else if (r.emPortugues === 1) {
    pontos += 15;
    sinais.push('uma avaliação escrita em português');
  }
  if (r.respostaDonoPt) {
    pontos += 25;
    sinais.push('o dono responde as avaliações em português');
  }
  if (r.citamBrasil > 0) {
    pontos += 20;
    sinais.push('avaliações citam brasileiro ou Brasil');
  }
  return { pontos, sinais };
}

module.exports = {
  SOBRENOMES_BR, temSobrenomeBrasileiro, escritoEmPortugues, originalEmPortugues, resumeAvaliacoes, pontuaAvaliacoes,
};
