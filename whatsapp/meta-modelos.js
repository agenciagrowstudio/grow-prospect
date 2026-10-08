/**
 * Modelos de mensagem da API oficial da Meta: validar, montar e ler.
 *
 * A Meta só deixa a empresa iniciar conversa com modelo aprovado. Criar o
 * modelo por aqui evita ir ao Gerenciador do WhatsApp; as regras abaixo são
 * as que a Meta aplica e que, se quebradas, viram rejeição na hora ou depois
 * de dias de análise. Funções puras, sem rede.
 */

const CATEGORIAS = ['MARKETING', 'UTILITY'];
const IDIOMAS = ['pt_BR', 'en_US', 'es'];

const SITUACAO = {
  APPROVED: { id: 'aprovado', rotulo: 'Aprovado' },
  PENDING: { id: 'analise', rotulo: 'Em análise' },
  IN_APPEAL: { id: 'analise', rotulo: 'Em recurso' },
  REJECTED: { id: 'rejeitado', rotulo: 'Rejeitado' },
  PAUSED: { id: 'pausado', rotulo: 'Pausado' },
  DISABLED: { id: 'pausado', rotulo: 'Desativado' },
};

const MOTIVO_REJEICAO = {
  INVALID_FORMAT: 'Formato inválido: confira variáveis, exemplos e caracteres especiais.',
  PROMOTIONAL: 'A Meta considerou promocional numa categoria que não é Marketing.',
  TAG_CONTENT_MISMATCH: 'O conteúdo não combina com a categoria escolhida.',
  ABUSIVE_CONTENT: 'Conteúdo considerado abusivo ou que fere as políticas da Meta.',
  SCAM: 'Conteúdo considerado golpe ou enganoso.',
  INCORRECT_CATEGORY: 'Categoria errada para esse conteúdo.',
};

/** "Promoção de Outubro!" vira "promocao_de_outubro". */
function nomeDoModelo(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 512);
}

/** Números das variáveis do texto, na ordem em que aparecem: "{{1}} e {{2}}" -> [1, 2]. */
function variaveisDo(texto) {
  return [...String(texto || '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
}

/**
 * @returns {string[]} erros em português; lista vazia quando o modelo pode ir.
 */
function validaModelo(m = {}) {
  const erros = [];
  const nome = String(m.nome || '');
  if (!/^[a-z0-9_]{1,512}$/.test(nome)) erros.push('Nome: só letras minúsculas sem acento, números e "_".');
  if (!CATEGORIAS.includes(m.categoria)) erros.push('Escolha a categoria: Marketing ou Utilidade.');
  if (!IDIOMAS.includes(m.idioma)) erros.push('Escolha o idioma.');

  const corpo = String(m.corpo || '');
  if (!corpo.trim()) erros.push('Escreva o texto da mensagem.');
  if (corpo.length > 1024) erros.push(`Texto com ${corpo.length} caracteres: o limite da Meta é 1024.`);
  const vars = variaveisDo(corpo);
  const unicas = [...new Set(vars)].sort((a, b) => a - b);
  if (unicas.some((n, i) => n !== i + 1)) erros.push('Variáveis precisam ser {{1}}, {{2}}, {{3}}... em sequência, sem pular número.');
  if (/^\s*\{\{\d+\}\}/.test(corpo) || /\{\{\d+\}\}[\s.!?]*$/.test(corpo)) {
    erros.push('O texto não pode começar nem terminar com uma variável.');
  }
  const exemplos = Array.isArray(m.exemplos) ? m.exemplos : [];
  unicas.forEach((n) => {
    if (!String(exemplos[n - 1] || '').trim()) erros.push(`Dê um exemplo para a variável {{${n}}}: a Meta exige.`);
  });

  const cab = String(m.cabecalho || '');
  if (cab.length > 60) erros.push('Cabeçalho: até 60 caracteres.');
  if (/\n/.test(cab) || /\{\{/.test(cab)) erros.push('Cabeçalho: uma linha só e sem variáveis.');
  if (String(m.rodape || '').length > 60) erros.push('Rodapé: até 60 caracteres.');

  const botoes = Array.isArray(m.botoes) ? m.botoes.filter((b) => String(b?.texto || '').trim()) : [];
  if (botoes.length > 3) erros.push('No máximo 3 botões.');
  botoes.forEach((b, i) => {
    if (String(b.texto).length > 25) erros.push(`Botão ${i + 1}: até 25 caracteres.`);
    if (b.tipo === 'link' && !/^https:\/\/\S+\.\S+/.test(String(b.url || ''))) erros.push(`Botão ${i + 1}: o link precisa começar com https://.`);
  });
  if (botoes.filter((b) => b.tipo === 'link').length > 1) erros.push('Só um botão de link por modelo.');
  return erros;
}

/** Corpo do pedido que a Graph API espera em POST /{waba}/message_templates. */
function montaPedido(m) {
  const componentes = [];
  if (String(m.cabecalho || '').trim()) {
    componentes.push({ type: 'HEADER', format: 'TEXT', text: m.cabecalho.trim() });
  }
  const corpo = { type: 'BODY', text: m.corpo };
  const n = [...new Set(variaveisDo(m.corpo))].length;
  if (n) corpo.example = { body_text: [m.exemplos.slice(0, n).map((e) => String(e).trim())] };
  componentes.push(corpo);
  if (String(m.rodape || '').trim()) componentes.push({ type: 'FOOTER', text: m.rodape.trim() });
  const botoes = (m.botoes || []).filter((b) => String(b?.texto || '').trim());
  if (botoes.length) {
    componentes.push({
      type: 'BUTTONS',
      buttons: botoes.map((b) => (b.tipo === 'link'
        ? { type: 'URL', text: b.texto.trim(), url: b.url.trim() }
        : { type: 'QUICK_REPLY', text: b.texto.trim() })),
    });
  }
  return { name: m.nome, language: m.idioma, category: m.categoria, components: componentes };
}

/** O que a tela precisa de cada modelo vindo da Meta. */
function leModelo(t = {}) {
  const comp = (tipo) => (t.components || []).find((c) => c.type === tipo);
  const corpo = comp('BODY')?.text || '';
  const sit = SITUACAO[t.status] || { id: 'analise', rotulo: t.status || 'Desconhecida' };
  return {
    nome: t.name,
    idioma: t.language,
    categoria: t.category,
    situacao: sit.id,
    rotuloSituacao: sit.rotulo,
    motivo: t.status === 'REJECTED'
      ? (MOTIVO_REJEICAO[t.rejected_reason] || (t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : 'A Meta não informou o motivo.'))
      : '',
    cabecalho: comp('HEADER')?.text || '',
    corpo,
    rodape: comp('FOOTER')?.text || '',
    botoes: (comp('BUTTONS')?.buttons || []).map((b) => b.text),
    variaveis: [...new Set(variaveisDo(corpo))].length,
  };
}

module.exports = { nomeDoModelo, variaveisDo, validaModelo, montaPedido, leModelo, CATEGORIAS, IDIOMAS };
