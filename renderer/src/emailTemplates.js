/**
 * Templates de e-mail da Grow+, montados em blocos e convertidos em HTML
 * próprio para e-mail: tabela de 560px e estilos inline, que é o que o Gmail
 * e o Outlook respeitam (nada de CSS externo, flex ou cor com transparência).
 *
 * Direção visual: carta bem diagramada, não peça de marketing. Fundo branco,
 * tipografia sóbria, pontos em estilo editorial (01, 02, 03 com fio fino),
 * destaque com fio à esquerda e botão retangular discreto. Prospecção fria que
 * parece anúncio vai para Promoções; a que parece uma pessoa escrevendo é lida.
 *
 * Os templates ficam em sigma_email_templates e sincronizam pela nuvem.
 * Campos automáticos: {empresa} {cidade} {nicho} {nota} {remetente}.
 */
import { nichoDoLead, idiomaDoLead } from './abordagem.js';
import { localDoLead } from './leadData.js';

export const CHAVE_TEMPLATES = 'sigma_email_templates';
export const CHAVE_ENVIADOS = 'sigma_email_enviados';
export const CONTA_PADRAO = 'contato.growmais.oficial@gmail.com';
// Logo e foto publicadas com a versão web: o Gmail não mostra imagem embutida no corpo.
export const LOGO_URL = 'https://prospector.growmaisoficial.com/email/logo-grow.png';
export const FOTO_MATHEUS = 'https://prospector.growmaisoficial.com/email/matheus.jpg';
export const REMETENTE_PADRAO = 'Matheus';
const SITE_GROW = 'https://growmaisoficial.com';
const RESPONDER = `mailto:${CONTA_PADRAO}`;
const MAX_ENVIADOS = 1000;
// Sobe quando os templates padrão mudam: quem nunca editou recebe a versão nova.
export const VERSAO_PADRAO = 5;

export const TIPOS_BLOCO = [
  { id: 'etiqueta', nome: 'Etiqueta' },
  { id: 'titulo', nome: 'Título' },
  { id: 'texto', nome: 'Texto' },
  { id: 'destaque', nome: 'Destaque' },
  { id: 'lista', nome: 'Lista' },
  { id: 'passos', nome: 'Pontos numerados' },
  { id: 'depoimento', nome: 'Depoimento' },
  { id: 'botao', nome: 'Botão' },
  { id: 'imagem', nome: 'Imagem' },
  { id: 'divisor', nome: 'Divisor' },
  { id: 'assinatura', nome: 'Assinatura' },
];

export const CAMPOS = ['{empresa}', '{cidade}', '{nicho}', '{nota}', '{remetente}'];

let contador = 0;
export const novoId = (prefixo = 'b') => `${prefixo}${Date.now().toString(36)}${(contador += 1).toString(36)}`;

export function blocoNovo(tipo) {
  const base = { id: novoId(), tipo };
  switch (tipo) {
    case 'etiqueta': return { ...base, texto: 'Para a {empresa}' };
    case 'titulo': return { ...base, texto: 'Título do e-mail' };
    case 'texto': return { ...base, texto: 'Escreva aqui. Use **negrito** para destacar.' };
    case 'destaque': return { ...base, texto: 'Uma frase que merece atenção.' };
    case 'lista': return { ...base, texto: 'Primeiro item\nSegundo item\nTerceiro item' };
    case 'passos': return { ...base, texto: 'Primeiro ponto: explicação curta\nSegundo ponto: explicação curta\nTerceiro ponto: explicação curta' };
    case 'depoimento': return { ...base, texto: 'Escreva aqui o depoimento de um cliente real.', autor: 'Nome do cliente, cidade' };
    case 'botao': return { ...base, texto: 'Quero saber mais', link: RESPONDER, nota: '' };
    case 'imagem': return { ...base, url: '', alt: '' };
    case 'assinatura': return { ...base, texto: '{remetente}\nGrow+ Comercial', site: SITE_GROW, whatsapp: '', instagram: '', foto: FOTO_MATHEUS };
    default: return base;
  }
}

const assinatura = (id) => ({ id, tipo: 'assinatura', texto: '{remetente}\nGrow+ Comercial', site: SITE_GROW, whatsapp: '', instagram: '', foto: FOTO_MATHEUS });
const RODAPE_PT = 'Você recebeu este e-mail porque a {empresa} aparece no Google como {nicho} em {cidade}. Para não receber mais, responda SAIR.';
const RODAPE_EN = 'You received this because {empresa} is listed on Google as {nicho} in {cidade}. Reply STOP and we will not write again.';
const PRETO = '#12121a';

/**
 * Templates prontos. Texto curto e específico, como alguém da equipe escreveria,
 * sem clichê de anúncio. Pedido final pequeno: uma resposta, não uma reunião.
 */
export function templatesPadrao() {
  const v = VERSAO_PADRAO;
  return [
    {
      id: 'tpl-brus-google', versao: v, nome: 'Brasileiros nos EUA: aparecer no Google', idioma: 'pt', cor: PRETO,
      assunto: 'A ficha da {empresa} no Google',
      preheader: 'Olhei como a {empresa} aparece para quem busca {nicho} em {cidade}.',
      blocos: [
        { id: 'a1', tipo: 'titulo', texto: 'Oi, pessoal da {empresa}.' },
        { id: 'a2', tipo: 'texto', texto: 'Sou da Grow+, uma equipe que trabalha só com negócios brasileiros aqui nos EUA.\n\nFiz a busca que o cliente de vocês faz, **{nicho} em {cidade}**, e olhei com calma como a {empresa} aparece. Três pontos fazem diferença na hora em que alguém compara as opções:' },
        { id: 'a3', tipo: 'passos', texto: 'Ficha do Google: fotos recentes, horários e a lista de serviços completa\nAvaliações: um pedido simples depois de cada atendimento muda o ritmo\nSite: uma página rápida no celular, com o WhatsApp a um toque' },
        { id: 'a4', tipo: 'destaque', texto: 'Se fizer sentido, eu preparo um diagnóstico da ficha de vocês e mando por aqui, sem custo.' },
        { id: 'a5', tipo: 'botao', texto: 'Quero o diagnóstico', link: RESPONDER, nota: 'Ou responda este e-mail com um sim.' },
        assinatura('a6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-brus-site', versao: v, nome: 'Brasileiros nos EUA: site profissional', idioma: 'pt', cor: PRETO,
      assunto: 'Um site para a {empresa}',
      preheader: 'Quem procura {nicho} em {cidade} decide pelo celular, em poucos segundos.',
      blocos: [
        { id: 'b1', tipo: 'titulo', texto: 'Oi, tudo bem?' },
        { id: 'b2', tipo: 'texto', texto: 'Sou da Grow+. A gente faz sites para negócios brasileiros aqui nos EUA.\n\nProcurei a {empresa} e não encontrei um site próprio. Para **{nicho}**, é ali que o cliente confirma se pode confiar antes de pedir orçamento, quase sempre pelo celular.' },
        { id: 'b3', tipo: 'passos', texto: 'Rápido no celular: abre em segundos, mesmo com sinal fraco\nOrçamento em um toque: WhatsApp e formulário em todas as páginas\nPortuguês e inglês: para os dois públicos que vocês atendem' },
        { id: 'b4', tipo: 'destaque', texto: 'Posso montar um esboço da página inicial da {empresa} para vocês verem como ficaria?' },
        { id: 'b5', tipo: 'botao', texto: 'Quero ver o esboço', link: RESPONDER, nota: 'Ou responda este e-mail com um sim.' },
        assinatura('b6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-brus-insta', versao: v, nome: 'Brasileiros nos EUA: Instagram', idioma: 'pt', cor: PRETO,
      assunto: 'O Instagram da {empresa}',
      preheader: 'Três formatos de post que viram pedido de orçamento para {nicho}.',
      blocos: [
        { id: 'c1', tipo: 'titulo', texto: 'Oi, pessoal da {empresa}.' },
        { id: 'c2', tipo: 'texto', texto: 'Sou da Grow+. A gente cuida do Instagram de negócios brasileiros aqui nos EUA.\n\nEm **{nicho}**, o cliente decide vendo o trabalho de verdade. Estes três formatos costumam trazer mais mensagens no direct:' },
        { id: 'c3', tipo: 'passos', texto: 'Antes e depois: o resultado explica sozinho\nBastidores: quem é a equipe e como vocês trabalham\nPerguntas de clientes: respostas curtas que passam confiança' },
        { id: 'c4', tipo: 'destaque', texto: 'Quer que eu monte um mês de posts de exemplo para a {empresa}?' },
        { id: 'c5', tipo: 'botao', texto: 'Quero o exemplo', link: RESPONDER, nota: 'Ou responda este e-mail com um sim.' },
        assinatura('c6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-brus-followup', versao: v, nome: 'Brasileiros nos EUA: follow-up curto', idioma: 'pt', cor: PRETO,
      assunto: 'Sobre a {empresa} no Google',
      preheader: 'Só para saber se minha mensagem chegou.',
      blocos: [
        { id: 'd2', tipo: 'texto', texto: 'Oi, pessoal da {empresa}.\n\nEscrevi uns dias atrás sobre como vocês aparecem no Google para quem busca {nicho} em {cidade}, e queria saber se a mensagem chegou.\n\nSe fizer sentido, responda com **sim** que eu mando o que preparei. Se não for o momento, sem problema.' },
        assinatura('d4'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-br-presenca', versao: v, nome: 'Brasil: presença digital', idioma: 'pt', cor: PRETO,
      assunto: 'A {empresa} na internet',
      preheader: 'Olhei como a {empresa} aparece para quem busca {nicho} em {cidade}.',
      blocos: [
        { id: 'e1', tipo: 'titulo', texto: 'Olá, equipe da {empresa}.' },
        { id: 'e2', tipo: 'texto', texto: 'Sou da Grow+. Encontrei vocês buscando **{nicho} em {cidade}** e vi espaço para trazer mais clientes pela internet:' },
        { id: 'e3', tipo: 'passos', texto: 'Google: aparecer antes dos concorrentes da região\nSite: rápido, com WhatsApp a um toque\nInstagram: mostrar o trabalho com constância' },
        { id: 'e4', tipo: 'destaque', texto: 'Posso mandar um diagnóstico curto do que eu faria primeiro?' },
        { id: 'e5', tipo: 'botao', texto: 'Quero o diagnóstico', link: RESPONDER, nota: 'Ou responda este e-mail com um sim.' },
        assinatura('e6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-us-google', versao: v, nome: 'Americanos: Google and website', idioma: 'en', cor: PRETO,
      assunto: '{empresa} on Google',
      preheader: 'I looked at how {empresa} shows up for {nicho} in {cidade}.',
      blocos: [
        { id: 'f1', tipo: 'titulo', texto: 'Hi {empresa} team,' },
        { id: 'f2', tipo: 'texto', texto: 'I searched for **{nicho} in {cidade}** the way your customers do and took a close look at how {empresa} shows up. Three things make the difference when people compare options:' },
        { id: 'f3', tipo: 'passos', texto: 'Google profile: recent photos, hours and a complete service list\nReviews: a simple ask after every job changes the pace\nWebsite: a fast mobile page with a call button one tap away' },
        { id: 'f4', tipo: 'destaque', texto: 'If it helps, I can put together a short review of your profile and send it over, free.' },
        { id: 'f5', tipo: 'botao', texto: 'Send me the review', link: RESPONDER, nota: 'Or just reply with a yes.' },
        assinatura('f6'),
      ],
      rodape: RODAPE_EN,
    },
  ];
}

/**
 * Templates guardados. Padrão que a pessoa nunca editou recebe a versão nova
 * quando os padrões melhoram; o que ela editou fica como está.
 */
export function leTemplates(storage = globalThis.localStorage) {
  const padroes = templatesPadrao();
  try {
    const lista = JSON.parse(storage.getItem(CHAVE_TEMPLATES) || 'null');
    if (Array.isArray(lista) && lista.length) {
      const porId = new Map(padroes.map((t) => [t.id, t]));
      return lista
        .map((t) => (!t.editado && porId.has(t.id) && (t.versao || 1) < VERSAO_PADRAO ? porId.get(t.id) : t))
        // A área passou a se chamar Grow+ Comercial: vale também nos templates já editados.
        .map((t) => ({
          ...t,
          blocos: (t.blocos || []).map((b) => (b.tipo === 'assinatura' && typeof b.texto === 'string'
            ? { ...b, texto: b.texto.replace(/Grow\+ Marketing/g, 'Grow+ Comercial') }
            : b)),
        }));
    }
  } catch { /* volta aos padrões */ }
  return padroes;
}

export function guardaTemplates(lista, storage = globalThis.localStorage) {
  try { storage.setItem(CHAVE_TEMPLATES, JSON.stringify(lista)); } catch { /* sem espaço */ }
}

export function leEnviados(storage = globalThis.localStorage) {
  try { const l = JSON.parse(storage.getItem(CHAVE_ENVIADOS) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
}

export function registraEnviado(registro, storage = globalThis.localStorage) {
  const lista = [{ id: novoId('e'), ts: Date.now(), ...registro }, ...leEnviados(storage)].slice(0, MAX_ENVIADOS);
  try { storage.setItem(CHAVE_ENVIADOS, JSON.stringify(lista)); } catch { /* sem espaço */ }
  return lista;
}

/** Valores dos campos automáticos para um lead. */
export function dadosDoLead(lead = {}, { remetente = '', buscas = null } = {}) {
  const eua = String(lead.pais || '').toUpperCase() === 'US';
  const idioma = idiomaDoLead(lead) === 'en' ? 'en' : 'pt';
  const nota = Number(lead.rating);
  return {
    empresa: lead.name || (idioma === 'en' ? 'your business' : 'sua empresa'),
    cidade: localDoLead(lead, buscas).cidade || (idioma === 'en' ? 'your area' : 'sua região'),
    nicho: nichoDoLead(lead, idioma, eua),
    nota: Number.isFinite(nota) && nota > 0 ? nota.toFixed(1).replace('.', idioma === 'en' ? '.' : ',') : '',
    remetente,
  };
}

const escapa = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Troca {campo} pelo valor. `seguro` escapa o valor para HTML. */
function preenche(texto, dados, seguro) {
  return String(texto ?? '').replace(/\{(empresa|cidade|nicho|nota|remetente)\}/g, (_, k) => (seguro ? escapa(dados[k] ?? '') : String(dados[k] ?? '')));
}

/** Texto do bloco em HTML: escapa, preenche campos, **negrito** e quebras de linha. */
function htmlDoTexto(texto, dados) {
  const comCampos = preenche(escapa(texto), dados, true);
  return comCampos.replace(/\*\*(.+?)\*\*/g, `<strong style="font-weight:600;color:${PRETO}">$1</strong>`).replace(/\n/g, '<br>');
}
const textoPuro = (texto, dados) => preenche(texto, dados).replace(/\*\*/g, '');

const linkSeguro = (url) => (/^(https?:|mailto:|tel:)/i.test(String(url || '').trim()) ? String(url).trim() : '');

function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'G+';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

const FONTE = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
// Paleta sóbria: o texto em grafite, o apoio em cinza e os fios quase invisíveis.
const TEXTO = '#30343d';
const APOIO = '#6b7080';
const SUAVE = '#9aa0ab';
const FIO = '#ececef';
const estilo = (tam, alt, cor, peso = 400, extra = '') => `font-family:${FONTE};font-size:${tam}px;line-height:${alt}px;color:${cor};font-weight:${peso};${extra}`;

/**
 * @returns {{assunto: string, html: string, texto: string}}
 */
export function renderizaEmail(template, dados = {}) {
  const cor = /^#[0-9a-f]{6}$/i.test(template?.cor || '') ? template.cor : PRETO;
  const blocos = Array.isArray(template?.blocos) ? template.blocos : [];
  const h = [];
  const t = [];

  blocos.forEach((b) => {
    switch (b.tipo) {
      case 'etiqueta':
        h.push(`<tr><td style="padding:0 0 12px;${estilo(11, 16, SUAVE, 600, 'letter-spacing:1.4px;text-transform:uppercase')}">${htmlDoTexto(b.texto, dados)}</td></tr>`);
        break;
      case 'titulo':
        h.push(`<tr><td style="padding:0 0 18px;${estilo(21, 28, PRETO, 600, 'letter-spacing:-0.3px')}">${htmlDoTexto(b.texto, dados)}</td></tr>`);
        t.push(textoPuro(b.texto, dados));
        break;
      case 'texto':
        String(b.texto || '').split(/\n\s*\n/).forEach((par) => {
          h.push(`<tr><td style="padding:0 0 18px;${estilo(15, 26, TEXTO)}">${htmlDoTexto(par, dados)}</td></tr>`);
          t.push(textoPuro(par, dados));
        });
        break;
      case 'destaque':
        h.push(`<tr><td style="padding:6px 0 26px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="2" style="width:2px;background:${cor};font-size:0;line-height:0">&nbsp;</td><td style="padding:2px 0 2px 18px;${estilo(15, 25, PRETO, 500)}">${htmlDoTexto(b.texto, dados)}</td></tr></table></td></tr>`);
        t.push(textoPuro(b.texto, dados));
        break;
      case 'lista': {
        const itens = String(b.texto || '').split('\n').map((i) => i.trim()).filter(Boolean);
        const linhas = itens.map((i) => `<tr><td width="20" valign="top" style="padding:10px 0 0"><div style="width:5px;height:5px;border-radius:3px;background:${cor};font-size:0;line-height:0">&nbsp;</div></td><td valign="top" style="padding:0 0 8px;${estilo(15, 25, TEXTO)}">${htmlDoTexto(i, dados)}</td></tr>`).join('');
        h.push(`<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table></td></tr>`);
        t.push(itens.map((i) => `- ${textoPuro(i, dados)}`).join('\n'));
        break;
      }
      case 'passos': {
        const itens = String(b.texto || '').split('\n').map((i) => i.trim()).filter(Boolean);
        const linhas = itens.map((i, n) => {
          const corte = i.indexOf(': ');
          const titulo = corte > 0 ? i.slice(0, corte) : i;
          // Descrição começa com maiúscula, mesmo se foi escrita depois dos dois-pontos em minúscula.
          const resto = corte > 0 ? i.slice(corte + 2) : '';
          const desc = resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
          return `<tr><td width="44" valign="top" style="padding:14px 0;border-top:1px solid ${FIO};${estilo(12, 22, SUAVE, 600, 'letter-spacing:0.5px;font-variant-numeric:tabular-nums')}">${String(n + 1).padStart(2, '0')}</td><td valign="top" style="padding:14px 0;border-top:1px solid ${FIO}"><div style="${estilo(15, 22, PRETO, 600)}">${htmlDoTexto(titulo, dados)}</div>${desc ? `<div style="padding-top:2px;${estilo(14, 22, APOIO)}">${htmlDoTexto(desc, dados)}</div>` : ''}</td></tr>`;
        }).join('');
        h.push(`<tr><td style="padding:2px 0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${FIO}">${linhas}</table></td></tr>`);
        t.push(itens.map((i, n) => `${String(n + 1).padStart(2, '0')}  ${textoPuro(i, dados)}`).join('\n'));
        break;
      }
      case 'depoimento':
        h.push(`<tr><td style="padding:4px 0 26px"><div style="${estilo(16, 27, PRETO, 400, 'font-style:italic')}">&ldquo;${htmlDoTexto(b.texto, dados)}&rdquo;</div>${b.autor ? `<div style="padding-top:10px;${estilo(13, 18, APOIO, 600)}">${htmlDoTexto(b.autor, dados)}</div>` : ''}</td></tr>`);
        t.push(`"${textoPuro(b.texto, dados)}"${b.autor ? ` (${textoPuro(b.autor, dados)})` : ''}`);
        break;
      case 'botao': {
        const link = linkSeguro(b.link);
        if (!link) break;
        h.push(`<tr><td style="padding:4px 0 ${b.nota ? '10px' : '28px'}"><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr><td style="border-radius:8px;background:${cor}"><a href="${escapa(link)}" style="display:inline-block;padding:12px 22px;${estilo(14, 20, '#ffffff', 600, 'text-decoration:none;border-radius:8px;letter-spacing:0.1px')}">${htmlDoTexto(b.texto, dados)}</a></td></tr></table></td></tr>`);
        if (b.nota) h.push(`<tr><td style="padding:0 0 28px;${estilo(13, 18, SUAVE)}">${htmlDoTexto(b.nota, dados)}</td></tr>`);
        t.push(`${textoPuro(b.texto, dados)}: ${link.replace(/^mailto:/, '')}`);
        break;
      }
      case 'imagem': {
        const url = /^https:\/\//i.test(String(b.url || '')) ? b.url : '';
        if (!url) break;
        h.push(`<tr><td style="padding:0 0 22px"><img src="${escapa(url)}" alt="${escapa(preenche(b.alt, dados))}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:6px"></td></tr>`);
        break;
      }
      case 'divisor':
        h.push(`<tr><td style="padding:4px 0 24px"><div style="height:1px;background:${FIO};line-height:1px;font-size:1px">&nbsp;</div></td></tr>`);
        t.push('---');
        break;
      case 'assinatura': {
        // Linha que ficou vazia (ex.: {remetente} sem nome configurado) some.
        const linhas = String(b.texto || '').split('\n').filter((l) => preenche(l, dados).trim());
        const [primeira = 'Grow+ Comercial', ...resto] = linhas;
        const contatos = [
          b.whatsapp ? [`https://wa.me/${String(b.whatsapp).replace(/\D/g, '')}`, 'WhatsApp'] : null,
          linkSeguro(b.site) ? [linkSeguro(b.site), String(b.site).replace(/^https?:\/\//, '').replace(/\/$/, '')] : null,
          b.instagram ? [`https://instagram.com/${String(b.instagram).replace(/^@/, '')}`, `@${String(b.instagram).replace(/^@/, '')}`] : null,
        ].filter(Boolean);
        const linksHtml = contatos.map(([u, r]) => `<a href="${escapa(u)}" style="color:${APOIO};text-decoration:none">${escapa(r)}</a>`).join(`<span style="color:${FIO}">&nbsp;&nbsp;/&nbsp;&nbsp;</span>`);
        // Foto (https) quando houver; sem foto, as iniciais num círculo da cor do template.
        const foto = /^https:\/\//i.test(String(b.foto || '')) ? b.foto : '';
        const avatar = foto
          ? `<img src="${escapa(foto)}" alt="${escapa(preenche(primeira, dados))}" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:22px;border:0;object-fit:cover">`
          : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:22px;background:${cor};${estilo(15, 44, '#ffffff', 700)}">${escapa(iniciais(preenche(primeira, dados)))}</td></tr></table>`;
        h.push(`<tr><td style="padding:12px 0 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>`
          + `<td width="44" valign="middle" style="padding-right:14px">${avatar}</td>`
          + '<td valign="middle">'
          + `<div style="${estilo(14, 20, PRETO, 600)}">${htmlDoTexto(primeira, dados)}</div>`
          + (resto.length ? `<div style="${estilo(13, 18, APOIO)}">${htmlDoTexto(resto.join('\n'), dados)}</div>` : '')
          + (linksHtml ? `<div style="${estilo(12.5, 18, APOIO, 400, 'padding-top:1px')}">${linksHtml}</div>` : '')
          + '</td></tr></table></td></tr>');
        t.push([preenche(linhas.join('\n'), dados), ...contatos.map(([u]) => u)].join('\n'));
        break;
      }
      default:
    }
  });

  const rodape = template?.rodape ? preenche(template.rodape, dados) : '';
  const preheader = template?.preheader ? textoPuro(template.preheader, dados) : '';
  const assunto = textoPuro(template?.assunto, dados).slice(0, 200);
  const html = `<!doctype html>
<html lang="${template?.idioma === 'en' ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"><style>body,table,td,div,a{font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif}</style><title>${escapa(assunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%">
${preheader ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff">${escapa(preheader)}${'&#8204;&nbsp;'.repeat(60)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:40px 20px 32px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
<tr><td style="padding:0 0 28px"><img src="${LOGO_URL}" alt="Grow+" width="39" height="32" style="display:block;width:39px;height:32px;border:0;${estilo(16, 20, PRETO, 700)}"></td></tr>
<tr><td style="padding:0 0 34px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${h.join('\n')}</table></td></tr>
<tr><td style="border-top:1px solid ${FIO};padding:20px 0 0">
${rodape ? `<div style="${estilo(12, 18, SUAVE)}">${escapa(rodape)}</div>` : ''}
<div style="padding-top:10px;${estilo(12, 16, SUAVE)}"><span style="font-weight:700;color:${APOIO}">Grow+</span> <span style="font-weight:400">Comercial</span></div>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { assunto, html, texto: [...t, rodape].filter(Boolean).join('\n\n') };
}

/** O primeiro e-mail válido do lead (o scraper grava até três). */
export function emailDoLead(lead) {
  return String(lead?.email || '').split(/[\s,;]+/).find((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) || '';
}

/** Template sugerido para o lead: inglês para americano, Brasil ou EUA pelo país. */
export function templateSugerido(lead, templates) {
  const idioma = idiomaDoLead(lead) === 'en' ? 'en' : 'pt';
  const pais = String(lead?.pais || 'BR').toUpperCase();
  const daLingua = templates.filter((x) => (x.idioma || 'pt') === idioma);
  if (idioma === 'pt' && pais === 'BR') return daLingua.find((x) => /brasil/i.test(x.nome) && !/eua/i.test(x.nome)) || daLingua[0] || templates[0];
  return daLingua.find((x) => /eua|us/i.test(x.nome)) || daLingua[0] || templates[0];
}

/**
 * Texto da Fila do dia (feito para WhatsApp) pronto para e-mail: *negrito*
 * vira **negrito**, itálico e riscado ficam como texto, e saem os emojis e as
 * bandeiras (no e-mail não se usa emoji; só no WhatsApp).
 */
export function textoWhatsParaEmail(texto = '') {
  return String(texto)
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1**$2**')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/(^|[\s(])~([^~\n]+)~(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[️‍]/g, '')
    .replace(/[ \t]+([,.?!])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}

/** A mensagem da Fila dentro do layout de e-mail da Grow+, com assinatura e rodapé. */
export function templateDaMensagem(texto, { idioma = 'pt', cor = PRETO } = {}) {
  const en = idioma === 'en';
  const corpo = textoWhatsParaEmail(texto);
  return {
    id: 'msg-fila',
    nome: en ? 'Mensagem da Fila do dia (inglês)' : 'Mensagem da Fila do dia',
    idioma: en ? 'en' : 'pt',
    cor,
    assunto: en ? 'Quick question for {empresa}' : 'Uma pergunta para a {empresa}',
    preheader: corpo.replace(/\*\*/g, '').replace(/\s+/g, ' ').slice(0, 110),
    blocos: [
      { id: 'm1', tipo: 'texto', texto: corpo },
      assinatura('m2'),
    ],
    rodape: en ? RODAPE_EN : RODAPE_PT,
  };
}
