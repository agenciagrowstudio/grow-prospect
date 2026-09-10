/**
 * Camada de IA do qualificador brasileiro.
 *
 * Fica separada das regras de proposito: o arquivo de regras precisa continuar
 * sem dependencia de rede e sem require de provedor, para poder ser lido em
 * qualquer contexto. Aqui mora o que fala com o modelo.
 */
const {
  avaliaSinaisBrasileiros,
  extraiJson,
  textoDasAvaliacoes,
  NIVEL_ALTO,
  NIVEL_MEDIO,
} = require('./sinais-brasileiros');

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

module.exports = { qualificaComIA };
