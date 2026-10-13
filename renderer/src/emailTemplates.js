/**
 * Templates de e-mail da Grow+, montados em blocos e convertidos em HTML
 * próprio para e-mail: tabela de 600px e estilos inline, que é o que o Gmail
 * e o Outlook respeitam (nada de CSS externo, flex ou cor com transparência).
 * Os templates ficam em sigma_email_templates e sincronizam pela nuvem, então
 * são os mesmos no computador e na web.
 *
 * Campos automáticos: {empresa} {cidade} {nicho} {nota} {remetente}.
 */
import { nichoDoLead, idiomaDoLead } from './abordagem.js';
import { localDoLead } from './leadData.js';

export const CHAVE_TEMPLATES = 'sigma_email_templates';
export const CHAVE_ENVIADOS = 'sigma_email_enviados';
export const CONTA_PADRAO = 'contato.growmais.oficial@gmail.com';
// Logo publicada com a versão web: o Gmail não mostra imagem embutida no corpo.
export const LOGO_URL = 'https://prospector.growmaisoficial.com/email/logo-grow.png';
const SITE_GROW = 'https://growmaisoficial.com';
const RESPONDER = `mailto:${CONTA_PADRAO}`;
const MAX_ENVIADOS = 1000;
// Sobe quando os templates padrão mudam: quem nunca editou recebe a versão nova.
export const VERSAO_PADRAO = 2;

export const TIPOS_BLOCO = [
  { id: 'etiqueta', nome: 'Etiqueta' },
  { id: 'titulo', nome: 'Título' },
  { id: 'texto', nome: 'Texto' },
  { id: 'destaque', nome: 'Destaque' },
  { id: 'lista', nome: 'Lista' },
  { id: 'passos', nome: 'Passos' },
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
    case 'passos': return { ...base, texto: 'Primeiro passo: o que acontece\nSegundo passo: o que acontece\nTerceiro passo: o que acontece' };
    case 'depoimento': return { ...base, texto: 'Escreva aqui o depoimento de um cliente real.', autor: 'Nome do cliente, cidade' };
    case 'botao': return { ...base, texto: 'Quero saber mais', link: RESPONDER, nota: 'Leva 1 minuto para responder.' };
    case 'imagem': return { ...base, url: '', alt: '' };
    case 'assinatura': return { ...base, texto: '{remetente}\nGrow+ Marketing', site: SITE_GROW, whatsapp: '', instagram: '' };
    default: return base;
  }
}

const assinatura = (id) => ({ id, tipo: 'assinatura', texto: '{remetente}\nGrow+ Marketing', site: SITE_GROW, whatsapp: '', instagram: '' });
const RODAPE_PT = 'Você recebeu este e-mail porque a {empresa} aparece no Google como {nicho} em {cidade}. Se não quiser receber mais, é só responder SAIR.';
const RODAPE_EN = 'You are receiving this because {empresa} is listed on Google as {nicho} in {cidade}. Reply STOP and we will not email you again.';

/** Templates prontos: brasileiros nos EUA (Google, site, Instagram, follow-up), Brasil e americanos. */
export function templatesPadrao() {
  const v = VERSAO_PADRAO;
  return [
    {
      id: 'tpl-brus-google', versao: v, nome: 'Brasileiros nos EUA: aparecer no Google', idioma: 'pt', cor: '#0064E0',
      assunto: '{empresa} pode aparecer antes dos concorrentes no Google',
      preheader: 'Três ajustes simples para quem busca {nicho} em {cidade} achar a {empresa} primeiro.',
      blocos: [
        { id: 'a0', tipo: 'etiqueta', texto: 'Para a {empresa}' },
        { id: 'a1', tipo: 'titulo', texto: 'Oi, pessoal da {empresa}!' },
        { id: 'a2', tipo: 'texto', texto: 'Aqui é da Grow+. A gente ajuda negócios brasileiros nos EUA a receber mais clientes pela internet.\n\nPesquisei **{nicho} em {cidade}** e encontrei vocês. Vi três ajustes simples que colocam a {empresa} na frente quando alguém procura esse serviço:' },
        { id: 'a3', tipo: 'passos', texto: 'Ficha do Google completa: fotos, horários e serviços que convencem quem está comparando\nMais avaliações: um jeito fácil de pedir avaliação para cada cliente atendido\nSite com botão de WhatsApp: quem acha vocês no Google já chama na hora' },
        { id: 'a4', tipo: 'destaque', texto: 'Posso te mostrar em 10 minutos o que eu mudaria primeiro? É sem compromisso.' },
        { id: 'a5', tipo: 'botao', texto: 'Quero ver as ideias', link: RESPONDER, nota: 'Ou é só responder este e-mail.' },
        assinatura('a6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-brus-site', versao: v, nome: 'Brasileiros nos EUA: site profissional', idioma: 'pt', cor: '#5534F5',
      assunto: 'Um site para a {empresa} receber mais pedidos de orçamento',
      preheader: 'Quem procura {nicho} em {cidade} decide em segundos, e quase sempre pelo celular.',
      blocos: [
        { id: 'b0', tipo: 'etiqueta', texto: 'Ideia para a {empresa}' },
        { id: 'b1', tipo: 'titulo', texto: 'Quem busca {nicho} em {cidade} decide em segundos' },
        { id: 'b2', tipo: 'texto', texto: 'Oi, tudo bem? Aqui é da Grow+, agência que trabalha com negócios brasileiros nos EUA.\n\nProcurei a {empresa} e não achei um site próprio. Hoje a maioria dos clientes pesquisa pelo celular antes de ligar, e **quem tem site passa mais confiança** na hora de escolher.' },
        { id: 'b3', tipo: 'lista', texto: 'Site rápido e bonito no celular\nBotão de WhatsApp e pedido de orçamento em todas as páginas\nVersão em português e em inglês, para os dois públicos' },
        { id: 'b4', tipo: 'destaque', texto: 'Posso te mandar um exemplo de como ficaria o site da {empresa}?' },
        { id: 'b5', tipo: 'botao', texto: 'Quero ver o exemplo', link: RESPONDER, nota: 'Ou é só responder este e-mail.' },
        assinatura('b6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-brus-insta', versao: v, nome: 'Brasileiros nos EUA: Instagram', idioma: 'pt', cor: '#D81B60',
      assunto: 'Ideias de conteúdo para o Instagram da {empresa}',
      preheader: 'Posts simples que mostram o trabalho e viram pedido de orçamento no direct.',
      blocos: [
        { id: 'c0', tipo: 'etiqueta', texto: 'Instagram da {empresa}' },
        { id: 'c1', tipo: 'titulo', texto: 'O seu trabalho merece aparecer mais' },
        { id: 'c2', tipo: 'texto', texto: 'Oi! Aqui é da Grow+. A gente cuida do Instagram de negócios brasileiros nos EUA.\n\nPara **{nicho}**, o que mais traz cliente é mostrar o trabalho de verdade, com constância. Três formatos que funcionam muito bem:' },
        { id: 'c3', tipo: 'passos', texto: 'Antes e depois: o resultado fala sozinho\nBastidores: quem é a equipe e como vocês trabalham\nDúvidas de clientes: respostas curtas que passam confiança' },
        { id: 'c4', tipo: 'destaque', texto: 'Quer que eu monte um calendário de posts de exemplo para a {empresa}?' },
        { id: 'c5', tipo: 'botao', texto: 'Quero o calendário', link: RESPONDER, nota: 'Ou é só responder este e-mail.' },
        assinatura('c6'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-brus-followup', versao: v, nome: 'Brasileiros nos EUA: follow-up curto', idioma: 'pt', cor: '#0064E0',
      assunto: 'Conseguiu ver minha mensagem, {empresa}?',
      preheader: 'Só confirmando se chegou. Uma resposta curta já ajuda.',
      blocos: [
        { id: 'd1', tipo: 'titulo', texto: 'Oi de novo!' },
        { id: 'd2', tipo: 'texto', texto: 'Mandei uma ideia para a {empresa} uns dias atrás e queria saber se chegou.\n\nSe fizer sentido, me responde com **um sim** que eu te mando o que preparei. Se não for o momento, tudo bem também.' },
        { id: 'd3', tipo: 'botao', texto: 'Sim, quero ver', link: RESPONDER, nota: '' },
        assinatura('d4'),
      ],
      rodape: RODAPE_PT,
    },
    {
      id: 'tpl-br-presenca', versao: v, nome: 'Brasil: presença digital', idioma: 'pt', cor: '#00A34D',
      assunto: '{empresa}: mais clientes vindo da internet',
      preheader: 'Uma oportunidade clara para quem busca {nicho} em {cidade} encontrar vocês.',
      blocos: [
        { id: 'e0', tipo: 'etiqueta', texto: 'Para a {empresa}' },
        { id: 'e1', tipo: 'titulo', texto: 'Olá, equipe da {empresa}!' },
        { id: 'e2', tipo: 'texto', texto: 'Aqui é da Grow+. Encontrei vocês pesquisando **{nicho} em {cidade}** e vi uma oportunidade clara de trazer mais clientes pela internet.' },
        { id: 'e3', tipo: 'lista', texto: 'Aparecer melhor no Google da região\nSite rápido, com botão de WhatsApp\nInstagram que mostra o trabalho e gera orçamento' },
        { id: 'e4', tipo: 'destaque', texto: 'Posso te mandar uma ideia rápida do que faria diferença para vocês?' },
        { id: 'e5', tipo: 'botao', texto: 'Quero ver a ideia', link: RESPONDER, nota: 'Ou é só responder este e-mail.' },
        assinatura('e6'),
      ],
      rodape: 'Você recebeu este e-mail porque a {empresa} aparece no Google como {nicho} em {cidade}. Se não quiser receber mais, é só responder SAIR.',
    },
    {
      id: 'tpl-us-google', versao: v, nome: 'Americanos: Google and website', idioma: 'en', cor: '#0064E0',
      assunto: 'A few quick wins for {empresa}',
      preheader: 'Three simple changes to help people searching for {nicho} in {cidade} find you first.',
      blocos: [
        { id: 'f0', tipo: 'etiqueta', texto: 'For {empresa}' },
        { id: 'f1', tipo: 'titulo', texto: 'Hi {empresa} team,' },
        { id: 'f2', tipo: 'texto', texto: 'I came across your business while searching for **{nicho} in {cidade}** and noticed a few quick wins that could bring you more customers online:' },
        { id: 'f3', tipo: 'passos', texto: 'A complete Google profile: photos, hours and services that win the comparison\nMore reviews: an easy way to ask every happy customer\nA fast website: with a call and quote button on every page' },
        { id: 'f4', tipo: 'destaque', texto: 'Would you be open to a 10-minute call? No strings attached.' },
        { id: 'f5', tipo: 'botao', texto: 'Show me the ideas', link: RESPONDER, nota: 'Or just reply to this email.' },
        { ...assinatura('f6'), texto: '{remetente}\nGrow+ Marketing' },
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
      return lista.map((t) => (!t.editado && porId.has(t.id) && (t.versao || 1) < VERSAO_PADRAO ? porId.get(t.id) : t));
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
  return comCampos.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#12121a">$1</strong>').replace(/\n/g, '<br>');
}
const textoPuro = (texto, dados) => preenche(texto, dados).replace(/\*\*/g, '');

const linkSeguro = (url) => (/^(https?:|mailto:|tel:)/i.test(String(url || '').trim()) ? String(url).trim() : '');

/** Cor misturada com branco (e-mail não aceita cor com transparência). */
function tinta(hex, quanto) {
  const n = parseInt(hex.slice(1), 16);
  const mistura = (c) => Math.round(c * quanto + 255 * (1 - quanto)).toString(16).padStart(2, '0');
  return `#${mistura((n >> 16) & 255)}${mistura((n >> 8) & 255)}${mistura(n & 255)}`;
}

function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'G+';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

const FONTE = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
const TINTA_TEXTO = '#454a57';

/**
 * @returns {{assunto: string, html: string, texto: string}}
 */
export function renderizaEmail(template, dados = {}) {
  const cor = /^#[0-9a-f]{6}$/i.test(template?.cor || '') ? template.cor : '#0064E0';
  const claro = tinta(cor, 0.08);
  const medio = tinta(cor, 0.16);
  const blocos = Array.isArray(template?.blocos) ? template.blocos : [];
  const h = [];
  const t = [];

  blocos.forEach((b) => {
    switch (b.tipo) {
      case 'etiqueta':
        h.push(`<tr><td style="padding:0 0 10px;font-family:${FONTE};font-size:12px;line-height:1.4;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${cor}">${htmlDoTexto(b.texto, dados)}</td></tr>`);
        break;
      case 'titulo':
        h.push(`<tr><td style="padding:0 0 16px;font-family:${FONTE};font-size:26px;line-height:1.25;font-weight:800;color:#12121a;letter-spacing:-0.6px">${htmlDoTexto(b.texto, dados)}</td></tr>`);
        t.push(textoPuro(b.texto, dados));
        break;
      case 'texto':
        String(b.texto || '').split(/\n\s*\n/).forEach((par) => {
          h.push(`<tr><td style="padding:0 0 16px;font-family:${FONTE};font-size:16px;line-height:1.65;color:${TINTA_TEXTO}">${htmlDoTexto(par, dados)}</td></tr>`);
          t.push(textoPuro(par, dados));
        });
        break;
      case 'destaque':
        h.push(`<tr><td style="padding:6px 0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr><td style="background:${claro};border-left:4px solid ${cor};border-radius:14px;padding:18px 20px;font-family:${FONTE};font-size:16px;line-height:1.55;font-weight:600;color:#12121a">${htmlDoTexto(b.texto, dados)}</td></tr></table></td></tr>`);
        t.push(textoPuro(b.texto, dados));
        break;
      case 'lista': {
        const itens = String(b.texto || '').split('\n').map((i) => i.trim()).filter(Boolean);
        const linhas = itens.map((i) => `<tr><td width="34" valign="top" style="padding:0 0 12px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="22" height="22" align="center" valign="middle" style="width:22px;height:22px;border-radius:11px;background:${cor};color:#ffffff;font-family:${FONTE};font-size:12px;font-weight:800;line-height:22px">&#10003;</td></tr></table></td><td valign="top" style="padding:1px 0 12px;font-family:${FONTE};font-size:15.5px;line-height:1.5;color:${TINTA_TEXTO}">${htmlDoTexto(i, dados)}</td></tr>`).join('');
        h.push(`<tr><td style="padding:2px 0 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table></td></tr>`);
        t.push(itens.map((i) => `- ${textoPuro(i, dados)}`).join('\n'));
        break;
      }
      case 'passos': {
        const itens = String(b.texto || '').split('\n').map((i) => i.trim()).filter(Boolean);
        const linhas = itens.map((i, n) => {
          const corte = i.indexOf(': ');
          const titulo = corte > 0 ? i.slice(0, corte) : i;
          const desc = corte > 0 ? i.slice(corte + 2) : '';
          return `<tr><td width="46" valign="top" style="padding:0 0 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;border-radius:16px;background:${medio};color:${cor};font-family:${FONTE};font-size:15px;font-weight:800;line-height:32px">${n + 1}</td></tr></table></td><td valign="top" style="padding:4px 0 16px;font-family:${FONTE}"><div style="font-size:15.5px;line-height:1.4;font-weight:700;color:#12121a">${htmlDoTexto(titulo, dados)}</div>${desc ? `<div style="padding-top:3px;font-size:14.5px;line-height:1.5;color:${TINTA_TEXTO}">${htmlDoTexto(desc, dados)}</div>` : ''}</td></tr>`;
        }).join('');
        h.push(`<tr><td style="padding:4px 0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table></td></tr>`);
        t.push(itens.map((i, n) => `${n + 1}. ${textoPuro(i, dados)}`).join('\n'));
        break;
      }
      case 'depoimento':
        h.push(`<tr><td style="padding:4px 0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr><td style="background:#fafafa;border:1px solid #ececef;border-radius:14px;padding:18px 20px;font-family:${FONTE}"><div style="font-size:15px;letter-spacing:2px;color:#FFB600">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style="padding-top:8px;font-size:15.5px;line-height:1.6;color:#12121a">${htmlDoTexto(b.texto, dados)}</div>${b.autor ? `<div style="padding-top:10px;font-size:13px;font-weight:700;color:#6b7280">${htmlDoTexto(b.autor, dados)}</div>` : ''}</td></tr></table></td></tr>`);
        t.push(`"${textoPuro(b.texto, dados)}"${b.autor ? ` (${textoPuro(b.autor, dados)})` : ''}`);
        break;
      case 'botao': {
        const link = linkSeguro(b.link);
        if (!link) break;
        h.push(`<tr><td style="padding:8px 0 ${b.nota ? '8px' : '26px'}"><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr><td style="border-radius:999px;background:${cor}"><a href="${escapa(link)}" style="display:inline-block;padding:15px 30px;font-family:${FONTE};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${htmlDoTexto(b.texto, dados)}&nbsp;&rarr;</a></td></tr></table></td></tr>`);
        if (b.nota) h.push(`<tr><td style="padding:0 0 26px 4px;font-family:${FONTE};font-size:13px;color:#8a8f9b">${htmlDoTexto(b.nota, dados)}</td></tr>`);
        t.push(`${textoPuro(b.texto, dados)}: ${link.replace(/^mailto:/, '')}`);
        break;
      }
      case 'imagem': {
        const url = /^https:\/\//i.test(String(b.url || '')) ? b.url : '';
        if (!url) break;
        h.push(`<tr><td style="padding:0 0 20px"><img src="${escapa(url)}" alt="${escapa(preenche(b.alt, dados))}" width="528" style="display:block;width:100%;max-width:528px;height:auto;border:0;border-radius:14px"></td></tr>`);
        break;
      }
      case 'divisor':
        h.push('<tr><td style="padding:6px 0 22px"><div style="height:1px;background:#ececef;line-height:1px;font-size:1px">&nbsp;</div></td></tr>');
        t.push('---');
        break;
      case 'assinatura': {
        // Linha que ficou vazia (ex.: {remetente} sem nome configurado) some.
        const linhas = String(b.texto || '').split('\n').filter((l) => preenche(l, dados).trim());
        const [primeira = 'Grow+ Marketing', ...resto] = linhas;
        const contatos = [
          b.whatsapp ? [`https://wa.me/${String(b.whatsapp).replace(/\D/g, '')}`, 'WhatsApp'] : null,
          linkSeguro(b.site) ? [linkSeguro(b.site), String(b.site).replace(/^https?:\/\//, '').replace(/\/$/, '')] : null,
          b.instagram ? [`https://instagram.com/${String(b.instagram).replace(/^@/, '')}`, `@${String(b.instagram).replace(/^@/, '')}`] : null,
        ].filter(Boolean);
        const linksHtml = contatos.map(([u, r]) => `<a href="${escapa(u)}" style="color:${cor};text-decoration:none;font-weight:600">${escapa(r)}</a>`).join('<span style="color:#c8cbd2">&nbsp;&nbsp;|&nbsp;&nbsp;</span>');
        h.push(`<tr><td style="padding:10px 0 0"><div style="height:1px;background:#ececef;line-height:1px;font-size:1px">&nbsp;</div></td></tr>`);
        h.push(`<tr><td style="padding:20px 0 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="56" valign="top"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:22px;background:${cor};color:#ffffff;font-family:${FONTE};font-size:15px;font-weight:800;line-height:44px">${escapa(iniciais(preenche(primeira, dados)))}</td></tr></table></td><td valign="middle" style="font-family:${FONTE}"><div style="font-size:15px;font-weight:700;color:#12121a">${htmlDoTexto(primeira, dados)}</div>${resto.length ? `<div style="padding-top:2px;font-size:13.5px;line-height:1.5;color:#6b7280">${htmlDoTexto(resto.join('\n'), dados)}</div>` : ''}${linksHtml ? `<div style="padding-top:6px;font-size:13px">${linksHtml}</div>` : ''}</td></tr></table></td></tr>`);
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
<html lang="${template?.idioma === 'en' ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" rel="stylesheet"><style>body,table,td,div,a{font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif}</style><title>${escapa(assunto)}</title></head>
<body style="margin:0;padding:0;background:#f5f6f8;-webkit-text-size-adjust:100%">
${preheader ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f5f6f8">${escapa(preheader)}${'&#8204;&nbsp;'.repeat(60)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="background:#ffffff;border:1px solid #e9eaee;border-radius:20px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;background:${cor};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 36px 8px"><img src="${LOGO_URL}" alt="Grow+" width="54" height="44" style="display:block;width:54px;height:44px;border:0;font-family:${FONTE};font-size:18px;font-weight:800;color:#12121a"></td></tr>
<tr><td style="padding:16px 36px 34px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${h.join('\n')}</table></td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 28px 0;font-family:${FONTE};text-align:center">
${rodape ? `<div style="font-size:12px;line-height:1.6;color:#8a8f9b">${escapa(rodape)}</div>` : ''}
<div style="padding-top:8px;font-size:12px;font-weight:700;color:#a3a8b3">Grow+ Marketing</div>
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
export function templateDaMensagem(texto, { idioma = 'pt', cor = '#0064E0' } = {}) {
  const en = idioma === 'en';
  const corpo = textoWhatsParaEmail(texto);
  return {
    id: 'msg-fila',
    nome: en ? 'Mensagem da Fila do dia (inglês)' : 'Mensagem da Fila do dia',
    idioma: en ? 'en' : 'pt',
    cor,
    assunto: en ? 'Quick question for {empresa}' : 'Uma pergunta rápida para a {empresa}',
    preheader: corpo.replace(/\*\*/g, '').replace(/\s+/g, ' ').slice(0, 110),
    blocos: [
      { id: 'm1', tipo: 'texto', texto: corpo },
      assinatura('m2'),
    ],
    rodape: en ? RODAPE_EN : RODAPE_PT,
  };
}
