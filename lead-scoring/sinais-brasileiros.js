/**
 * Identifica negócios que se apresentam como brasileiros ou que atendem a
 * comunidade brasileira.
 *
 * A pergunta NÃO é "o dono é brasileiro". Isso não dá para saber a partir de
 * uma ficha do Google Maps, e tentar adivinhar seria impreciso e problemático.
 * A pergunta é outra, e é a que interessa comercialmente: **este negócio se
 * anuncia para o público brasileiro?** A churrascaria que escreve "comida
 * brasileira" na fachada quer ser achada por brasileiros. Ela se declara, e é
 * essa declaração que a gente lê.
 *
 * Duas camadas, nessa ordem:
 *
 * 1. Regras determinísticas, de graça e sem rede. Resolvem os casos claros nos
 *    dois sentidos.
 * 2. Julgamento por IA, só para a faixa do meio. Chamar o modelo para uma
 *    "Churrascaria Brasil" é dinheiro jogado fora: a regra já sabe.
 */

const NIVEL_ALTO = 50;
const NIVEL_MEDIO = 20;

// Categorias e termos que são declaração explícita de origem.
const TERMOS_CATEGORIA = [
  'brazilian', 'brasileir', 'churrascaria', 'churrasqueria', 'acai', 'açaí',
  'padaria', 'salgado', 'pastel', 'feijoada', 'coxinha', 'brigadeiro',
];

// Palavras portuguesas comuns em nome de negócio. Evita termo que também é
// espanhol ou inglês, senão a taxa de engano sobe.
const TERMOS_NOME = [
  'brasil', 'brazil', 'brasileir', 'churrascaria', 'padaria', 'acai', 'açaí',
  'salgado', 'lanchonete', 'mercadinho', 'quitanda', 'sabor', 'tempero',
  'cabeleireir', 'esmalteria', 'barbearia', 'lava jato', 'limpeza',
  'empada', 'pao de queijo', 'pão de queijo', 'boteco', 'botequim',
  'carioca', 'mineir', 'baiano', 'gaucho', 'gaúcho', 'paulista', 'nordestin',
];

/**
 * Marcas de português que o espanhol não tem. "muy" contra "muito", "ñ" contra
 * "nh". Sem isso, restaurante mexicano com avaliação em espanhol entraria como
 * brasileiro.
 */
const MARCAS_PORTUGUES = [
  'ção', 'ções', 'ão ', 'ões', 'nh', 'lh', 'ss',
  'não', 'você', 'obrigad', 'muito bom', 'muito boa', 'atendimento',
  'ótimo', 'otimo', 'delicioso', 'saudade', 'gostoso', 'caprichad',
  'a gente', 'pra', 'tá ', 'né',
];

function texto(valor) {
  return String(valor || '').toLowerCase();
}

function semAcento(valor) {
  return texto(valor).normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function contem(alvo, termos) {
  const cru = texto(alvo);
  const limpo = semAcento(alvo);
  return termos.filter((t) => cru.includes(t) || limpo.includes(semAcento(t)));
}

/**
 * Junta o que o lead tem de texto livre em avaliações. O campo `reviews` vem
 * ora como número, ora como lista, dependendo de onde o lead entrou.
 */
function textoDasAvaliacoes(lead) {
  const bruto = lead.reviews ?? lead.avaliacoes;
  if (typeof bruto === 'number') return '';
  if (typeof bruto === 'string') return bruto;
  if (!Array.isArray(bruto)) return '';
  return bruto
    .map((r) => (typeof r === 'string' ? r : (r && (r.text || r.texto || r.comment)) || ''))
    .join(' ');
}

function pareceportugues(valor) {
  const t = texto(valor);
  if (t.length < 20) return { portugues: false, marcas: [] };
  const marcas = MARCAS_PORTUGUES.filter((m) => t.includes(m));
  // Uma marca isolada é ruído: "ss" aparece em inglês, "pra" em nome próprio.
  return { portugues: marcas.length >= 3, marcas: marcas.slice(0, 6) };
}

/**
 * Camada 1. Só olha o que já está no lead, sem rede e sem custo.
 */
function avaliaSinaisBrasileiros(lead = {}) {
  const empresa = lead.company || lead;
  const sinais = [];
  let pontos = 0;

  const naCategoria = contem(empresa.category, TERMOS_CATEGORIA);
  if (naCategoria.length) {
    pontos += 40;
    sinais.push(`categoria declara origem (${naCategoria[0]})`);
  }

  const noNome = contem(empresa.name, TERMOS_NOME);
  if (noNome.length) {
    pontos += 25;
    sinais.push(`nome em português (${noNome[0]})`);
  }

  const site = texto(empresa.website);
  if (site.includes('.com.br') || site.endsWith('.br')) {
    pontos += 20;
    sinais.push('site em domínio .br');
  }

  // Telefone brasileiro num negócio fora do Brasil é sinal forte: é o número
  // que o dono mantém para falar com a comunidade.
  const whats = texto(empresa.whatsapp);
  const foraDoBrasil = String(empresa.pais || 'BR').toUpperCase() !== 'BR';
  if (foraDoBrasil && whats.startsWith('+55')) {
    pontos += 25;
    sinais.push('WhatsApp com DDI +55');
  }

  const avaliacoes = pareceportugues(textoDasAvaliacoes(lead));
  if (avaliacoes.portugues) {
    pontos += 30;
    sinais.push('avaliações escritas em português');
  }

  const descricao = pareceportugues(empresa.openingHours || empresa.description);
  if (descricao.portugues) {
    pontos += 10;
    sinais.push('descrição em português');
  }

  pontos = Math.min(100, pontos);
  return {
    pontos,
    nivel: pontos >= NIVEL_ALTO ? 'alto' : pontos >= NIVEL_MEDIO ? 'medio' : 'baixo',
    sinais,
    fonte: 'regras',
    // A faixa do meio é onde a regra não decide e o julgamento vale a chamada.
    precisaDeIA: pontos >= NIVEL_MEDIO && pontos < NIVEL_ALTO,
  };
}

/**
 * Extrai JSON de uma resposta que pode vir embrulhada em prosa ou em cerca de
 * código. Nem todo provedor honra o pedido de resposta em JSON puro.
 */
function extraiJson(conteudo) {
  const bruto = String(conteudo || '').trim();
  try {
    return JSON.parse(bruto);
  } catch {}
  const cerca = bruto.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) {
    try {
      return JSON.parse(cerca[1]);
    } catch {}
  }
  const primeiro = bruto.indexOf('{');
  const ultimo = bruto.lastIndexOf('}');
  if (primeiro >= 0 && ultimo > primeiro) {
    try {
      return JSON.parse(bruto.slice(primeiro, ultimo + 1));
    } catch {}
  }
  return null;
}

function montaPergunta(itens) {
  return {
    tarefa:
      'Para cada negocio, diga se ele se apresenta como brasileiro ou como atendendo a comunidade brasileira. '
      + 'Baseie-se apenas nos dados fornecidos. Nao invente informacao. Se os dados nao permitirem decidir, responda brasileiro=false com confianca baixa.',
    formato: '{"resultados":[{"id":"...","brasileiro":true,"confianca":0.0,"motivo":"..."}]}',
    negocios: itens.map((item) => {
      const empresa = item.lead.company || item.lead;
      return {
        id: item.id,
        nome: empresa.name || '',
        categoria: empresa.category || '',
        cidade: empresa.city || '',
        estado: empresa.state || '',
        site: empresa.website || '',
        avaliacoes: textoDasAvaliacoes(item.lead).slice(0, 400),
      };
    }),
  };
}

/**
 * Camada 2. Opcional: sem chave configurada, o resultado das regras vale
 * sozinho e nada quebra.
 */
async function qualificaComIA(leads, ai = {}, deps = {}) {
  const { resolveProviderConfig, requestChatCompletion } = deps.analisador
    || require('./ai-sales-analyzer');

  const avaliados = leads.map((lead, i) => ({
    id: String(lead.id || i),
    lead,
    regras: avaliaSinaisBrasileiros(lead),
  }));

  const duvidosos = avaliados.filter((a) => a.regras.precisaDeIA);
  if (!duvidosos.length) return avaliados.map(semIA);

  let config;
  try {
    config = resolveProviderConfig(ai);
  } catch {
    return avaliados.map(semIA);
  }
  if (!config.apiKey) return avaliados.map(semIA);

  const porLote = 20;
  const decisoes = new Map();
  for (let i = 0; i < duvidosos.length; i += porLote) {
    const lote = duvidosos.slice(i, i + porLote);
    try {
      const resposta = await requestChatCompletion(config, montaPergunta(lote));
      const dados = extraiJson(resposta?.choices?.[0]?.message?.content);
      const lista = Array.isArray(dados?.resultados) ? dados.resultados : [];
      lista.forEach((r) => {
        if (r && r.id != null) decisoes.set(String(r.id), r);
      });
    } catch {
      // Uma falha de rede não pode derrubar a qualificação inteira: os leads
      // desse lote ficam com o resultado das regras.
    }
  }

  return avaliados.map((a) => {
    const decisao = decisoes.get(a.id);
    if (!decisao) return semIA(a);
    const confianca = Number(decisao.confianca) || 0;
    const brasileiro = decisao.brasileiro === true;
    const ajuste = brasileiro ? Math.round(confianca * 40) : -Math.round(confianca * 20);
    const pontos = Math.max(0, Math.min(100, a.regras.pontos + ajuste));
    return {
      id: a.id,
      pontos,
      nivel: pontos >= NIVEL_ALTO ? 'alto' : pontos >= NIVEL_MEDIO ? 'medio' : 'baixo',
      sinais: decisao.motivo ? [...a.regras.sinais, `IA: ${decisao.motivo}`] : a.regras.sinais,
      fonte: 'ia',
    };
  });
}

function semIA(a) {
  return { id: a.id, pontos: a.regras.pontos, nivel: a.regras.nivel, sinais: a.regras.sinais, fonte: 'regras' };
}

module.exports = {
  avaliaSinaisBrasileiros,
  qualificaComIA,
  extraiJson,
  NIVEL_ALTO,
  NIVEL_MEDIO,
};
