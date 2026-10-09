/**
 * Primeira mensagem de abordagem, escrita para ser respondida.
 *
 * O objetivo da primeira mensagem não é vender: é fazer o lead responder. Por
 * isso cada texto segue as mesmas regras:
 *   1. Curto (2 a 4 linhas), como pessoa escreve no WhatsApp.
 *   2. Específico: cita algo real do negócio (nota no Google, falta de site,
 *      cidade). Mensagem que serve para qualquer um parece robô.
 *   3. Uma só ideia, a que o lead mais precisa (a mesma do card).
 *   4. Termina numa pergunta pequena, que se responde com uma palavra
 *      ("pode", "faz sentido"). Pergunta grande trava a resposta.
 *   5. Sem link, sem preço, sem anexo: tudo isso aumenta a chance de ser
 *      tratada como spam. A venda vem depois da resposta.
 *
 * O texto é escolhido de forma estável pelo lead (o mesmo lead sempre abre com
 * a mesma versão, leads diferentes abrem com versões diferentes), então a
 * fila não manda 10 mensagens idênticas. O usuário pode pedir outra versão e
 * sempre pode editar antes de enviar.
 */

const MAX_NOME = 42;

// Cada ângulo tem versões em português e em inglês.
// Marcadores: {quem} {empresa} {nota} {avaliacoes} {cidade} {categoria}
const TEXTOS = {
  site: {
    pt: [
      'Oi, tudo bem? {quem}. Vi a {empresa} no Google{elogio} e não achei um site de vocês. Posso te perguntar uma coisa rápida sobre isso?',
      'Olá! {quem}. Procurei a {empresa} aqui e o Google mostra vocês, mas sem site. Hoje muita gente pesquisa antes de ligar, e acaba indo para quem aparece melhor. Faz sentido eu te mostrar como resolver?',
      'Oi! Falo com a {empresa}? {quem}. Queria saber se vocês já pensaram em ter um site próprio, porque vi que ainda não têm. Posso te mandar uma ideia de como ficaria? 🙂',
    ],
    en: [
      'Hi! {quem}. I came across {empresa} on Google{elogio} and could not find a website for you. Mind if I ask a quick question about that?',
      'Hello! {quem}. I looked up {empresa} and Google lists you, but without a website. Many people check online before calling. Would it help if I showed you a simple way to fix that?',
    ],
  },
  google: {
    pt: [
      'Oi, tudo bem? {quem}. Vi a {empresa} no Google{notaFrase}. Dá para melhorar bastante como vocês aparecem quando alguém busca {categoria} em {cidade}. Quer que eu te diga o que eu mudaria?',
      'Olá! {quem}. Pesquisei {categoria} em {cidade} e a {empresa} apareceu{notaFrase}. Notei duas coisas simples que ajudariam vocês a aparecer antes dos outros. Posso te contar?',
      'Oi! Falo com a {empresa}? {quem}. Vi a ficha de vocês no Google e acho que tem espaço para atrair mais cliente por lá. Faz sentido eu te mostrar? 🙂',
    ],
    en: [
      'Hi! {quem}. I found {empresa} on Google{notaFrase}. There is room to show up higher when people search for {categoria} in {cidade}. Want me to tell you what I would change?',
      'Hello! {quem}. I searched for {categoria} in {cidade} and saw {empresa}{notaFrase}. I noticed two simple things that could help you rank higher. Can I share them?',
    ],
  },
  redes: {
    pt: [
      'Oi, tudo bem? {quem}. Procurei a {empresa} no Instagram e não achei o perfil de vocês. Vocês têm um? Pergunto porque dá para trazer cliente por lá com pouco esforço.',
      'Olá! {quem}. Vi a {empresa} no Google e fiquei curioso: vocês usam Instagram para atrair clientes? Se não, tenho uma ideia simples. Posso te contar?',
      'Oi! Falo com a {empresa}? {quem}. Não consegui achar o Instagram de vocês. Posso te mostrar como um perfil bem feito costuma trazer cliente novo? 🙂',
    ],
    en: [
      'Hi! {quem}. I looked for {empresa} on Instagram and could not find a profile. Do you have one? A simple page can bring in new customers with little effort.',
      'Hello! {quem}. I saw {empresa} on Google and wondered if you use Instagram to find customers. I have a simple idea. Can I share it?',
    ],
  },
  conteudo: {
    pt: [
      'Oi, tudo bem? {quem}. Vi o Instagram da {empresa} e tem coisa boa ali. Posso te dar uma sugestão rápida de conteúdo que costuma trazer mais mensagem no direct?',
      'Olá! {quem}. Dei uma olhada no perfil da {empresa}. Acho que com poucos ajustes nos posts vocês receberiam mais contatos. Quer ouvir a ideia?',
      'Oi! Falo com a {empresa}? {quem}. Passei pelo Instagram de vocês e tive uma ideia para atrair mais clientes pelas redes. Posso te explicar em 1 minuto? 🙂',
    ],
    en: [
      'Hi! {quem}. I checked out the {empresa} Instagram and there is good stuff there. Can I share a quick content idea that tends to bring more messages?',
      'Hello! {quem}. I looked at the {empresa} profile. A few small tweaks to your posts could bring in more inquiries. Want to hear the idea?',
    ],
  },
  sistema: {
    pt: [
      'Oi, tudo bem? {quem}. Uma curiosidade: hoje a {empresa} marca horário ou recebe pedido pelo WhatsApp, na mão? Pergunto porque dá para organizar isso sem perder o contato pessoal.',
      'Olá! {quem}. Vi a {empresa} e pensei: como vocês controlam agenda e pedidos hoje? Tenho um jeito simples de deixar isso mais organizado. Posso te mostrar?',
      'Oi! Falo com a {empresa}? {quem}. O atendimento de vocês é todo pelo WhatsApp? Se for, tem como automatizar a parte repetitiva sem parecer robô. Quer ver como? 🙂',
    ],
    en: [
      'Hi! {quem}. Quick question: does {empresa} take bookings or orders by message? There is a simple way to organize that without losing the personal touch.',
      'Hello! {quem}. How does {empresa} manage appointments and orders today? I have a simple way to keep it organized. Can I show you?',
    ],
  },
  geral: {
    pt: [
      'Oi, tudo bem? {quem}. Vi a {empresa} e queria te fazer uma pergunta rápida sobre como vocês atraem clientes novos. Posso?',
      'Olá! {quem}. Encontrei a {empresa} pesquisando {categoria} em {cidade}. Tenho uma ideia para vocês atraírem mais clientes. Posso te contar?',
    ],
    en: [
      'Hi! {quem}. I found {empresa} and had a quick question about how you get new customers. Mind if I ask?',
      'Hello! {quem}. I came across {empresa} while looking for {categoria} in {cidade}. I have an idea to help you get more customers. Can I share it?',
    ],
  },
};

export const ANGULOS = [
  { id: 'site', nome: 'Site' },
  { id: 'google', nome: 'Google Negócio' },
  { id: 'redes', nome: 'Gestão de redes' },
  { id: 'conteudo', nome: 'Conteúdo' },
  { id: 'sistema', nome: 'Sistema' },
];

function hashTexto(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function nomeCurto(nome) {
  const limpo = String(nome || '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= MAX_NOME) return limpo;
  const corte = limpo.slice(0, MAX_NOME);
  return corte.slice(0, corte.lastIndexOf(' ') > 15 ? corte.lastIndexOf(' ') : MAX_NOME).trim();
}

function nota1(valor) {
  return Number(valor).toFixed(1).replace('.', ',');
}

/** Ângulo da mensagem: o escolhido pelo usuário, se o lead tem, senão o principal do card. */
export function anguloDoLead(q, preferido) {
  const ids = (q?.servicos || []).map((s) => s.id);
  if (preferido && preferido !== 'qualquer' && ids.includes(preferido)) return preferido;
  return ids[0] || 'geral';
}

export function idiomaDoLead(lead) {
  const eua = String(lead?.pais || 'BR').toUpperCase() === 'US';
  return eua && lead?.sinalBr?.nivel !== 'alto' ? 'en' : 'pt';
}

/**
 * @param {object} lead registro da Base de Leads
 * @param {object} q qualificação (ver qualificacaoLead.js)
 * @param {{ nome?: string, empresa?: string, oferta?: string }} cfg quem escreve
 * @param {number} [versao] 0 = a versão escolhida pelo lead; 1, 2... = as seguintes
 */
export function gerarAbordagem(lead = {}, q = {}, cfg = {}, versao = 0) {
  const idioma = idiomaDoLead(lead);
  const angulo = anguloDoLead(q, cfg.oferta);
  const lista = TEXTOS[angulo][idioma];
  const indice = (hashTexto(lead.id || lead.name) + Math.max(0, versao)) % lista.length;
  const modelo = lista[indice];

  const empresa = nomeCurto(lead.name || lead.n) || (idioma === 'en' ? 'your business' : 'a empresa de vocês');
  const nome = String(cfg.nome || '').trim();
  const marca = String(cfg.empresa || 'Grow+').trim();
  const quem = idioma === 'en'
    ? (nome ? `This is ${nome} from ${marca}` : `This is ${marca}`)
    : (nome ? `Aqui é ${nome}, da ${marca}` : `Aqui é da ${marca}`);

  const { nota, avaliacoes } = q.google || {};
  const temNota = Number(nota) >= 4 && Number(avaliacoes) >= 5;
  const elogio = temNota
    ? (idioma === 'en' ? `, with ${nota1(nota)} stars` : `, com nota ${nota1(nota)}`)
    : '';
  const notaFrase = Number(nota) > 0 && Number(avaliacoes) > 0
    ? (idioma === 'en'
      ? `, with ${nota1(nota)} stars and ${avaliacoes} reviews`
      : `, com nota ${nota1(nota)} e ${avaliacoes} avaliações`)
    : '';

  const cidade = lead.city || lead.cidade || q.cidade || (idioma === 'en' ? 'your area' : 'a região');
  const categoria = String(lead.category || lead.cat || '').toLowerCase()
    || (idioma === 'en' ? 'local services' : 'serviços locais');

  const texto = modelo
    .replace(/\{quem\}/g, quem)
    .replace(/\{empresa\}/g, empresa)
    .replace(/\{elogio\}/g, elogio)
    .replace(/\{notaFrase\}/g, notaFrase)
    .replace(/\{cidade\}/g, cidade)
    .replace(/\{categoria\}/g, categoria)
    .replace(/\s+([,.?!])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();

  return { texto, angulo, idioma, versao: indice, total: lista.length };
}

/** Link que abre a conversa com o texto já escrito na caixa, sem enviar. */
export function linkWhatsApp(digitos, texto, modo = 'web') {
  const d = String(digitos || '').replace(/\D/g, '');
  const t = encodeURIComponent(String(texto || ''));
  return modo === 'app'
    ? `whatsapp://send?phone=${d}&text=${t}`
    : `https://web.whatsapp.com/send?phone=${d}&text=${t}`;
}

export function chaveDoDia(data = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}
