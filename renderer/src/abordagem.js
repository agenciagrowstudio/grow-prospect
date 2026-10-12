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

/**
 * Brasileiros nos EUA: o tom do modelo que a Grow+ já usa no dia a dia.
 *
 *   Oi! Tudo bem? Matheus aqui, da Grow+.
 *   Estava pesquisando empresas brasileiras de house cleaning em Milford,
 *   Massachusetts e encontrei a RL Brazilian Cleaning. Dei uma olhada no
 *   Google para conhecer melhor a empresa, mas fiquei na dúvida porque não
 *   encontrei um site de vocês.
 *   Vocês ainda não trabalham com site ou usam algum outro endereço?
 *
 * Estrutura: abertura curta, quem pesquisou o quê e onde, o que chamou a
 * atenção, e uma pergunta pequena no fim. Parágrafos separados por linha em
 * branco, como se escreve no WhatsApp. As bandeiras só abrem algumas versões,
 * para não ficar com cara de mensagem em massa.
 * Marcadores extras: {nicho} {local} {parabens}
 */
const TEXTOS_EUA = {
  site: [
    '🇧🇷 🇺🇸 Oi! Tudo bem? {quem}.\n\nEstava pesquisando empresas brasileiras de {nicho} em {local} e encontrei a {empresa}. Dei uma olhada no Google para conhecer melhor a empresa, mas fiquei na dúvida porque não encontrei um site de vocês.\n\nVocês ainda não trabalham com site ou usam algum outro endereço?',
    'Oi! Tudo certo? {quem}.\n\nVi a {empresa} pesquisando {nicho} em {local}. {parabens}Procurei um site de vocês para conhecer melhor os serviços e não achei nenhum.\n\nVocês já têm site ou ainda não chegaram a fazer?',
    'Olá, tudo bem? {quem}. 🇧🇷\n\nEncontrei a {empresa} no Google quando procurava empresas de {nicho} em {local}. {parabens}Só que não vi um site de vocês, e hoje muito cliente pesquisa antes de ligar.\n\nVocês trabalham com algum site ou só pelo Google e pelas redes sociais?',
    'Oi, tudo bem? {quem}.\n\nEstou conhecendo as empresas brasileiras de {nicho} em {local} e cheguei na {empresa}. {parabens}Não achei o site de vocês no Google e fiquei curioso para entender.\n\nVocês já têm um site?',
  ],
  google: [
    '🇧🇷 🇺🇸 Oi! Tudo bem? {quem}.\n\nEstava pesquisando empresas brasileiras de {nicho} em {local} e encontrei a {empresa}{notaFrase}. Achei que a ficha de vocês no Google tem bastante espaço para aparecer melhor quando alguém busca esse serviço aí na região.\n\nVocês já têm alguém cuidando disso ou posso te mostrar o que eu mudaria?',
    'Oi! Tudo certo? {quem}.\n\nPesquisei {nicho} em {local} no Google e a {empresa} apareceu{notaFrase}. Notei duas coisas simples na ficha de vocês que ajudariam a aparecer antes dos concorrentes.\n\nPosso te contar quais são?',
    'Olá, tudo bem? {quem}. 🇧🇷\n\nVi a {empresa} no Google quando procurava empresas brasileiras de {nicho} em {local}. A ficha de vocês já está no ar, mas dá para trazer mais ligação e mais pedido de orçamento com alguns ajustes.\n\nFaz sentido eu te explicar como?',
    'Oi, tudo bem? {quem}.\n\nQuando alguém busca {nicho} em {local}, a {empresa} aparece{notaFrase}, mas acho que dá para subir no ranking e receber mais contatos. Eu ajudo empresas brasileiras aqui nos EUA com isso.\n\nQuer que eu te diga o que eu ajustaria?',
  ],
  redes: [
    '🇧🇷 🇺🇸 Oi! Tudo bem? {quem}.\n\nEstava pesquisando empresas brasileiras de {nicho} em {local} e encontrei a {empresa}. {parabens}Procurei o Instagram de vocês para ver alguns trabalhos e não achei.\n\nVocês têm um perfil ou ainda não usam as redes sociais?',
    'Oi! Tudo certo? {quem}.\n\nVi a {empresa} no Google, em {local}. Não achei o perfil de vocês no Instagram, e hoje muito cliente confere as fotos dos trabalhos antes de pedir orçamento.\n\nVocês já têm um perfil por aí?',
    'Olá, tudo bem? {quem}. 🇧🇷\n\nEncontrei a {empresa} pesquisando {nicho} em {local}. {parabens}Queria ver o trabalho de vocês no Instagram, mas não consegui achar.\n\nPosso te mostrar como um perfil bem feito costuma trazer cliente novo?',
    'Oi, tudo bem? {quem}.\n\nEu ajudo empresas brasileiras de {nicho} nos EUA a conseguirem clientes pelas redes. Vi a {empresa} em {local}, mas não encontrei o Instagram de vocês.\n\nVocês têm um perfil ou ainda não tiveram tempo de montar?',
  ],
  conteudo: [
    '🇧🇷 🇺🇸 Oi! Tudo bem? {quem}.\n\nEstava pesquisando empresas brasileiras de {nicho} em {local} e encontrei a {empresa}. Dei uma olhada no Instagram de vocês e tem trabalho bom ali.\n\nPosso te dar uma ideia rápida de conteúdo que costuma trazer mais mensagem no direct?',
    'Oi! Tudo certo? {quem}.\n\nPassei pelo Instagram da {empresa}, em {local}. {parabens}Acho que com poucos ajustes nos posts vocês receberiam mais pedidos de orçamento.\n\nQuer ouvir a ideia?',
    'Olá, tudo bem? {quem}. 🇧🇷\n\nVi o perfil da {empresa} procurando empresas de {nicho} em {local}. O serviço de vocês aparece bem, só que o conteúdo dá para aproveitar mais para atrair cliente novo.\n\nPosso te explicar em um minuto?',
    'Oi, tudo bem? {quem}.\n\nEstava conhecendo as empresas brasileiras de {nicho} em {local} e o Instagram da {empresa} chamou minha atenção. Tive uma ideia de como transformar os posts em mais contatos.\n\nPosso te contar?',
  ],
  sistema: [
    '🇧🇷 🇺🇸 Oi! Tudo bem? {quem}.\n\nEstava pesquisando empresas brasileiras de {nicho} em {local} e encontrei a {empresa}. Fiquei curioso: hoje vocês marcam serviço e orçamento tudo pelo WhatsApp, na mão?\n\nPergunto porque dá para organizar isso sem perder o contato pessoal. Posso te mostrar como?',
    'Oi! Tudo certo? {quem}.\n\nVi a {empresa} em {local}. Como vocês controlam agenda, orçamentos e clientes hoje: caderno, planilha ou WhatsApp?\n\nTenho um jeito simples de deixar isso organizado. Faz sentido eu te mostrar?',
    'Olá, tudo bem? {quem}. 🇧🇷\n\nTrabalho com empresas brasileiras de {nicho} aqui nos EUA e achei a {empresa} em {local}. Muita empresa perde cliente porque esquece de responder ou de dar retorno do orçamento.\n\nVocês têm algo para organizar isso?',
    'Oi, tudo bem? {quem}.\n\nPesquisando {nicho} em {local} encontrei a {empresa}. O atendimento de vocês é todo pelo WhatsApp? Se for, dá para automatizar a parte repetitiva sem parecer robô.\n\nQuer ver como?',
  ],
  geral: [
    '🇧🇷 🇺🇸 Oi! Tudo bem? {quem}.\n\nEstava pesquisando empresas brasileiras de {nicho} em {local} e encontrei a {empresa}. Queria te fazer uma pergunta rápida sobre como vocês conseguem clientes novos hoje.\n\nPosso?',
    'Oi! Tudo certo? {quem}.\n\nVi a {empresa} pesquisando {nicho} em {local}. {parabens}Tenho uma ideia para vocês atraírem mais clientes.\n\nPosso te contar?',
    'Olá, tudo bem? {quem}. 🇧🇷\n\nEstou ajudando empresas brasileiras de {nicho} nos EUA a receberem mais pedidos de orçamento. Achei a {empresa} em {local} e fiquei curioso sobre como vocês trazem cliente hoje.\n\nPosso te fazer uma pergunta rápida?',
  ],
};

/**
 * As mesmas versões de TEXTOS_EUA, traduzidas para o inglês, na mesma ordem:
 * "traduzir" troca o idioma e mantém a versão que está na tela. Sem
 * "empresas brasileiras": o texto serve para americano e para brasileiro
 * que prefira inglês.
 */
const TEXTOS_EUA_EN = {
  site: [
    "🇺🇸 Hi! How are you? {quem}.\n\nI was looking for {nicho} companies in {local} and came across {empresa}. I checked you out on Google to learn more about the business, but I couldn't find a website for you.\n\nDo you not have a website yet, or do you use a different address?",
    "Hi! All good? {quem}.\n\nI found {empresa} while searching for {nicho} in {local}. {parabens}I looked for your website to learn more about your services and couldn't find one.\n\nDo you already have a website, or haven't you gotten around to it yet?",
    "Hello, how are you? {quem}. 🇺🇸\n\nI came across {empresa} on Google while looking for {nicho} companies in {local}. {parabens}But I didn't see a website for you, and these days most customers search online before calling.\n\nDo you have a website, or do you rely only on Google and social media?",
    "Hi, how are you? {quem}.\n\nI've been getting to know the {nicho} companies in {local} and found {empresa}. {parabens}I couldn't find your website on Google and got curious.\n\nDo you have a website yet?",
  ],
  google: [
    "🇺🇸 Hi! How are you? {quem}.\n\nI was looking for {nicho} companies in {local} and came across {empresa}{notaFrase}. I think your Google profile has a lot of room to show up better when someone searches for this service in your area.\n\nDo you already have someone handling that, or can I show you what I would change?",
    "Hi! All good? {quem}.\n\nI searched Google for {nicho} in {local} and {empresa} came up{notaFrase}. I noticed two simple things on your profile that would help you show up ahead of competitors.\n\nCan I tell you what they are?",
    "Hello, how are you? {quem}. 🇺🇸\n\nI found {empresa} on Google while looking for {nicho} companies in {local}. Your profile is already live, but a few tweaks could bring in more calls and more quote requests.\n\nWould it make sense for me to explain how?",
    "Hi, how are you? {quem}.\n\nWhen someone searches for {nicho} in {local}, {empresa} shows up{notaFrase}, but I think you could rank higher and get more inquiries. I help local businesses here in the US with that.\n\nWant me to tell you what I would adjust?",
  ],
  redes: [
    "🇺🇸 Hi! How are you? {quem}.\n\nI was looking for {nicho} companies in {local} and came across {empresa}. {parabens}I looked for your Instagram to see some of your work and couldn't find it.\n\nDo you have a profile, or are you not on social media yet?",
    "Hi! All good? {quem}.\n\nI saw {empresa} on Google, in {local}. I couldn't find your Instagram profile, and these days many customers check photos of the work before asking for a quote.\n\nDo you already have a profile?",
    "Hello, how are you? {quem}. 🇺🇸\n\nI found {empresa} while searching for {nicho} in {local}. {parabens}I wanted to see your work on Instagram, but couldn't find it.\n\nCan I show you how a well made profile usually brings in new customers?",
    "Hi, how are you? {quem}.\n\nI help {nicho} companies in the US get customers through social media. I saw {empresa} in {local}, but couldn't find your Instagram.\n\nDo you have a profile, or haven't you had time to set one up?",
  ],
  conteudo: [
    "🇺🇸 Hi! How are you? {quem}.\n\nI was looking for {nicho} companies in {local} and came across {empresa}. I checked out your Instagram and there is great work there.\n\nCan I give you a quick content idea that usually brings in more DMs?",
    "Hi! All good? {quem}.\n\nI went through the {empresa} Instagram, in {local}. {parabens}I think with a few tweaks to your posts you would get more quote requests.\n\nWant to hear the idea?",
    "Hello, how are you? {quem}. 🇺🇸\n\nI saw the {empresa} profile while looking for {nicho} companies in {local}. Your service looks good, but your content could do more to attract new customers.\n\nCan I explain in a minute?",
    "Hi, how are you? {quem}.\n\nI was getting to know the {nicho} companies in {local} and the {empresa} Instagram caught my attention. I had an idea for turning your posts into more inquiries.\n\nCan I tell you about it?",
  ],
  sistema: [
    "🇺🇸 Hi! How are you? {quem}.\n\nI was looking for {nicho} companies in {local} and came across {empresa}. I'm curious: do you book jobs and quotes all by text or WhatsApp, by hand?\n\nI ask because there is a way to organize that without losing the personal touch. Can I show you how?",
    "Hi! All good? {quem}.\n\nI saw {empresa} in {local}. How do you keep track of your schedule, quotes and clients today: notebook, spreadsheet or text messages?\n\nI have a simple way to keep it all organized. Would it make sense to show you?",
    "Hello, how are you? {quem}. 🇺🇸\n\nI work with {nicho} companies here in the US and found {empresa} in {local}. Many businesses lose customers because they forget to reply or to follow up on a quote.\n\nDo you have something in place to handle that?",
    "Hi, how are you? {quem}.\n\nWhile searching for {nicho} in {local} I found {empresa}. Do you answer all your customer messages by hand? If so, the repetitive part can be automated without sounding like a robot.\n\nWant to see how?",
  ],
  geral: [
    "🇺🇸 Hi! How are you? {quem}.\n\nI was looking for {nicho} companies in {local} and came across {empresa}. I wanted to ask you a quick question about how you get new customers today.\n\nMay I?",
    "Hi! All good? {quem}.\n\nI found {empresa} while searching for {nicho} in {local}. {parabens}I have an idea to help you attract more customers.\n\nCan I tell you about it?",
    "Hello, how are you? {quem}. 🇺🇸\n\nI'm helping {nicho} companies in the US get more quote requests. I found {empresa} in {local} and got curious about how you bring in customers today.\n\nCan I ask you a quick question?",
  ],
};

// Estados dos EUA por extenso, como no modelo ("Milford, Massachusetts").
const ESTADOS_EUA = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'Washington, DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// O Google devolve a categoria em português ou inglês; na mensagem vai o nome do
// serviço como o brasileiro nos EUA fala ("house cleaning", "construction").
const SERVICOS_EUA = [
  [/limpeza|faxina|clean|maid|janitor/i, 'house cleaning'],
  [/paisag|landscap|lawn|jardin|gramado|tree service/i, 'landscaping'],
  [/pintor|pintura|paint/i, 'painting'],
  [/mudan[cç]a|moving|mover/i, 'moving'],
  [/constru|contractor|reforma|remodel|obra|handyman|piso|floor|roof|telhado|drywall|carpint/i, 'construction'],
];

export function nichoDoLead(lead = {}, idioma = 'pt', eua = false) {
  const cat = String(lead.category || lead.cat || '').trim();
  if (eua) {
    const achado = SERVICOS_EUA.find(([re]) => re.test(cat));
    if (achado) return achado[1];
  }
  return cat.toLowerCase() || (idioma === 'en' ? 'local services' : 'serviços locais');
}

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
 * @param {{ nome?: string, empresa?: string, oferta?: string, idioma?: 'pt'|'en', formatar?: boolean }} cfg
 *   quem escreve; idioma força português ou inglês (o botão de traduzir)
 * @param {number} [versao] 0 = a versão escolhida pelo lead; 1, 2... = as seguintes
 */
export function gerarAbordagem(lead = {}, q = {}, cfg = {}, versao = 0) {
  const idioma = cfg.idioma === 'pt' || cfg.idioma === 'en' ? cfg.idioma : idiomaDoLead(lead);
  const angulo = anguloDoLead(q, cfg.oferta);
  // Brasileiro nos EUA recebe no tom do modelo da Grow+; brasileiro no Brasil e
  // americano usam os bancos próprios.
  const eua = String(lead?.pais || 'BR').toUpperCase() === 'US';
  // Nos EUA, português e inglês têm as mesmas versões na mesma ordem: traduzir
  // mantém a versão da tela.
  const lista = eua ? (idioma === 'pt' ? TEXTOS_EUA : TEXTOS_EUA_EN)[angulo] : TEXTOS[angulo][idioma];
  const indice = (hashTexto(lead.id || lead.name) + Math.max(0, versao)) % lista.length;
  const modelo = lista[indice];

  // Formatação do WhatsApp: a marca, o nome da empresa e a nota vão sempre em
  // negrito (*assim*), e a nota ganha uma estrela. cfg.formatar = false desliga.
  const negrito = (t) => (cfg.formatar === false || !t ? t : `*${t}*`);
  const estrela = cfg.formatar === false ? '' : ' ⭐';

  const nomeEmpresa = nomeCurto(lead.name || lead.n);
  const empresa = nomeEmpresa ? negrito(nomeEmpresa) : (idioma === 'en' ? 'your business' : 'a empresa de vocês');
  const nome = String(cfg.nome || '').trim();
  const marca = negrito(String(cfg.empresa || 'Grow+').trim());
  const quem = idioma === 'en'
    ? (nome ? `${nome} here, from ${marca}` : `This is ${marca}`)
    : (nome ? `${nome} aqui, da ${marca}` : `Aqui é da ${marca}`);

  const { nota, avaliacoes } = q.google || {};
  const temNota = Number(nota) >= 4 && Number(avaliacoes) >= 5;
  // Só o número em negrito: "nota *4,7* ⭐".
  const notaPt = `nota ${negrito(nota1(nota))}${estrela}`;
  const notaEn = `${negrito(nota1(nota).replace(',', '.'))} stars${estrela}`;
  const elogio = temNota ? (idioma === 'en' ? `, with ${notaEn}` : `, com ${notaPt}`) : '';
  // Sem "Vi" e sem "Google": as frases em volta já usam as duas palavras.
  const parabens = !temNota ? '' : idioma === 'en'
    ? `Congrats on the ${notaEn.replace(' stars', '')} rating, it shows the work is well done. `
    : `Parabéns pela ${notaPt}, dá para ver que o trabalho é bem feito. `;
  const notaFrase = Number(nota) > 0 && Number(avaliacoes) > 0
    ? (idioma === 'en'
      ? `, with ${notaEn} and ${avaliacoes} reviews`
      : `, com ${notaPt} e ${avaliacoes} avaliações`)
    : '';

  const cidade = lead.city || lead.cidade || q.cidade || (idioma === 'en' ? 'your area' : 'a região');
  const categoria = nichoDoLead(lead, idioma, eua);
  // "Milford, Massachusetts": cidade e estado por extenso quando se sabe.
  const uf = String(lead.uf || lead.state || '').trim().toUpperCase();
  const local = eua && ESTADOS_EUA[uf] && cidade !== (idioma === 'en' ? 'your area' : 'a região')
    ? `${cidade}, ${ESTADOS_EUA[uf]}`
    : cidade;

  const texto = modelo
    .replace(/\{quem\}/g, quem)
    .replace(/\{empresa\}/g, empresa)
    .replace(/\{elogio\}/g, elogio)
    .replace(/\{parabens\}/g, parabens)
    .replace(/\{notaFrase\}/g, notaFrase)
    .replace(/\{local\}/g, local)
    .replace(/\{cidade\}/g, cidade)
    .replace(/\{nicho\}/g, categoria)
    .replace(/\{categoria\}/g, categoria)
    .replace(/[ \t]+([,.?!])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .trim();

  return { texto, angulo, idioma, versao: indice, total: lista.length };
}

/**
 * Quebra o texto nas marcas de formatação do WhatsApp, para a prévia mostrar a
 * mensagem como ela vai chegar: *negrito*, _itálico_, ~riscado~.
 * A marca só vale colada no texto ("*Grow+*"), como no próprio WhatsApp.
 * @returns {{ texto: string, estilo: ''|'negrito'|'italico'|'riscado' }[]}
 */
const MARCAS = { '*': 'negrito', _: 'italico', '~': 'riscado' };
export function partesWhatsApp(texto = '') {
  const partes = [];
  const re = /([*_~])(\S(?:[^\n]*?\S)?)\1/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push({ texto: texto.slice(ultimo, m.index), estilo: '' });
    partes.push({ texto: m[2], estilo: MARCAS[m[1]] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo), estilo: '' });
  return partes;
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
