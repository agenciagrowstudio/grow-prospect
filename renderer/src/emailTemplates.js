/**
 * Templates de e-mail da Grow+, montados em blocos (título, texto, destaque,
 * lista, botão, imagem, divisor, assinatura) e convertidos em HTML próprio
 * para e-mail: tabela de 600px e estilos inline, que é o que o Gmail e o
 * Outlook respeitam. Os templates ficam em sigma_email_templates e
 * sincronizam pela nuvem, então são os mesmos no computador e na web.
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
const MAX_ENVIADOS = 1000;

export const TIPOS_BLOCO = [
  { id: 'titulo', nome: 'Título' },
  { id: 'texto', nome: 'Texto' },
  { id: 'destaque', nome: 'Destaque' },
  { id: 'lista', nome: 'Lista' },
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
    case 'titulo': return { ...base, texto: 'Título do e-mail' };
    case 'texto': return { ...base, texto: 'Escreva aqui. Use **negrito** para destacar.' };
    case 'destaque': return { ...base, texto: 'Uma frase que merece atenção.' };
    case 'lista': return { ...base, texto: 'Primeiro item\nSegundo item\nTerceiro item' };
    case 'botao': return { ...base, texto: 'Falar no WhatsApp', link: 'https://wa.me/' };
    case 'imagem': return { ...base, url: '', alt: '' };
    case 'assinatura': return { ...base, texto: '{remetente}\nGrow+ Marketing' };
    default: return base;
  }
}

/** Templates iniciais: brasileiros nos EUA, Brasil e americanos (em inglês). */
export function templatesPadrao() {
  return [
    {
      id: 'tpl-brus-google',
      nome: 'Brasileiros nos EUA: Google e site',
      idioma: 'pt',
      cor: '#0064E0',
      assunto: 'Uma ideia para a {empresa} aparecer mais no Google',
      blocos: [
        { id: 'a1', tipo: 'titulo', texto: 'Oi, pessoal da {empresa}!' },
        { id: 'a2', tipo: 'texto', texto: 'Eu sou da Grow+, uma agência que ajuda negócios brasileiros aqui nos EUA a conseguir mais clientes pela internet.\n\nPesquisei **{nicho} em {cidade}** e encontrei vocês. Vi algumas coisas simples que podem colocar a {empresa} na frente dos concorrentes quando alguém procura esse serviço.' },
        { id: 'a3', tipo: 'lista', texto: 'Ficha do Google mais completa e com mais avaliações\nSite rápido, feito para o celular, com botão de WhatsApp\nInstagram com posts que trazem pedido de orçamento' },
        { id: 'a4', tipo: 'destaque', texto: 'Posso te mostrar, em 10 minutos, o que eu mudaria primeiro? Sem compromisso.' },
        { id: 'a5', tipo: 'botao', texto: 'Responder pelo WhatsApp', link: 'https://wa.me/' },
        { id: 'a6', tipo: 'assinatura', texto: 'Um abraço,\n{remetente}\nGrow+ Marketing' },
      ],
      rodape: 'Se não quiser receber mais e-mails, é só responder com SAIR.',
    },
    {
      id: 'tpl-br-presenca',
      nome: 'Brasil: presença digital',
      idioma: 'pt',
      cor: '#00A34D',
      assunto: '{empresa}: mais clientes vindo da internet',
      blocos: [
        { id: 'b1', tipo: 'titulo', texto: 'Olá, equipe da {empresa}!' },
        { id: 'b2', tipo: 'texto', texto: 'Encontrei vocês pesquisando **{nicho} em {cidade}** e vi uma oportunidade clara de trazer mais clientes pela internet.' },
        { id: 'b3', tipo: 'destaque', texto: 'Posso te mandar uma ideia rápida do que faria diferença para vocês?' },
        { id: 'b4', tipo: 'botao', texto: 'Quero ver a ideia', link: 'https://wa.me/' },
        { id: 'b5', tipo: 'assinatura', texto: 'Abraço,\n{remetente}\nGrow+ Marketing' },
      ],
      rodape: 'Se não quiser receber mais e-mails, é só responder com SAIR.',
    },
    {
      id: 'tpl-us-google',
      nome: 'Americanos: Google and website',
      idioma: 'en',
      cor: '#0064E0',
      assunto: 'Quick idea for {empresa}',
      blocos: [
        { id: 'c1', tipo: 'titulo', texto: 'Hi {empresa} team,' },
        { id: 'c2', tipo: 'texto', texto: 'I came across your business while searching for **{nicho} in {cidade}** and noticed a few quick wins that could bring you more customers online.' },
        { id: 'c3', tipo: 'lista', texto: 'A stronger Google Business profile\nA fast, mobile-friendly website\nSocial posts that turn into quote requests' },
        { id: 'c4', tipo: 'destaque', texto: 'Would you be open to a 10-minute call? No strings attached.' },
        { id: 'c5', tipo: 'assinatura', texto: 'Best,\n{remetente}\nGrow+ Marketing' },
      ],
      rodape: 'If you prefer not to hear from us, just reply STOP.',
    },
  ];
}

export function leTemplates(storage = globalThis.localStorage) {
  try {
    const lista = JSON.parse(storage.getItem(CHAVE_TEMPLATES) || 'null');
    if (Array.isArray(lista) && lista.length) return lista;
  } catch { /* volta aos padrões */ }
  return templatesPadrao();
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
  return comCampos.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

const linkSeguro = (url) => (/^(https?:|mailto:|tel:)/i.test(String(url || '').trim()) ? String(url).trim() : '');
const FONTE = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";

/**
 * @returns {{assunto: string, html: string, texto: string}}
 */
export function renderizaEmail(template, dados = {}) {
  const cor = /^#[0-9a-f]{6}$/i.test(template?.cor || '') ? template.cor : '#0064E0';
  const blocos = Array.isArray(template?.blocos) ? template.blocos : [];
  const partesHtml = [];
  const partesTexto = [];

  blocos.forEach((b) => {
    switch (b.tipo) {
      case 'titulo':
        partesHtml.push(`<tr><td style="padding:0 0 16px;font-family:${FONTE};font-size:24px;line-height:1.25;font-weight:700;color:#12121a;letter-spacing:-0.5px">${htmlDoTexto(b.texto, dados)}</td></tr>`);
        partesTexto.push(preenche(b.texto, dados).replace(/\*\*/g, ''));
        break;
      case 'texto':
        String(b.texto || '').split(/\n\s*\n/).forEach((par) => {
          partesHtml.push(`<tr><td style="padding:0 0 14px;font-family:${FONTE};font-size:15px;line-height:1.6;color:#3f4350">${htmlDoTexto(par, dados)}</td></tr>`);
          partesTexto.push(preenche(par, dados).replace(/\*\*/g, ''));
        });
        break;
      case 'destaque':
        partesHtml.push(`<tr><td style="padding:4px 0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr><td style="background:${cor}12;border-left:4px solid ${cor};border-radius:10px;padding:14px 16px;font-family:${FONTE};font-size:15px;line-height:1.55;font-weight:600;color:#12121a">${htmlDoTexto(b.texto, dados)}</td></tr></table></td></tr>`);
        partesTexto.push(preenche(b.texto, dados).replace(/\*\*/g, ''));
        break;
      case 'lista': {
        const itens = String(b.texto || '').split('\n').map((i) => i.trim()).filter(Boolean);
        const linhas = itens.map((i) => `<tr><td width="22" valign="top" style="padding:2px 0 8px;font-family:${FONTE};font-size:15px;color:${cor};font-weight:700">&#10003;</td><td style="padding:2px 0 8px;font-family:${FONTE};font-size:15px;line-height:1.5;color:#3f4350">${htmlDoTexto(i, dados)}</td></tr>`).join('');
        partesHtml.push(`<tr><td style="padding:0 0 12px"><table role="presentation" cellpadding="0" cellspacing="0">${linhas}</table></td></tr>`);
        partesTexto.push(itens.map((i) => `- ${preenche(i, dados).replace(/\*\*/g, '')}`).join('\n'));
        break;
      }
      case 'botao': {
        const link = linkSeguro(b.link);
        if (!link) break;
        partesHtml.push(`<tr><td style="padding:6px 0 22px"><a href="${escapa(link)}" style="display:inline-block;background:${cor};color:#ffffff;text-decoration:none;font-family:${FONTE};font-size:15px;font-weight:700;padding:13px 24px;border-radius:999px">${htmlDoTexto(b.texto, dados)}</a></td></tr>`);
        partesTexto.push(`${preenche(b.texto, dados)}: ${link}`);
        break;
      }
      case 'imagem': {
        const url = /^https:\/\//i.test(String(b.url || '')) ? b.url : '';
        if (!url) break;
        partesHtml.push(`<tr><td style="padding:0 0 18px"><img src="${escapa(url)}" alt="${escapa(preenche(b.alt, dados))}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:12px"></td></tr>`);
        break;
      }
      case 'divisor':
        partesHtml.push('<tr><td style="padding:6px 0 20px"><div style="height:1px;background:#ebebeb;line-height:1px;font-size:1px">&nbsp;</div></td></tr>');
        partesTexto.push('---');
        break;
      case 'assinatura': {
        // Linha que ficou vazia (ex.: {remetente} sem nome configurado) some.
        const linhas = String(b.texto || '').split('\n').filter((l) => preenche(l, dados).trim()).join('\n');
        partesHtml.push(`<tr><td style="padding:8px 0 0;font-family:${FONTE};font-size:14px;line-height:1.55;color:#3f4350">${htmlDoTexto(linhas, dados)}</td></tr>`);
        partesTexto.push(preenche(linhas, dados));
        break;
      }
      default:
    }
  });

  const rodape = template?.rodape ? preenche(template.rodape, dados) : '';
  const html = `<!doctype html>
<html lang="${template?.idioma === 'en' ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapa(preenche(template?.assunto, dados))}</title></head>
<body style="margin:0;padding:0;background:#fafafa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="padding:0 4px 16px"><img src="${LOGO_URL}" alt="Grow+" width="59" height="48" style="display:block;width:59px;height:48px;border:0;font-family:${FONTE};font-size:18px;font-weight:800;color:#12121a"></td></tr>
<tr><td style="background:#ffffff;border:1px solid #ebebeb;border-radius:20px;padding:32px 32px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${partesHtml.join('\n')}</table>
</td></tr>
${rodape ? `<tr><td style="padding:16px 8px 0;font-family:${FONTE};font-size:12px;line-height:1.5;color:#8a8f9b;text-align:center">${escapa(rodape)}</td></tr>` : ''}
</table>
</td></tr></table>
</body></html>`;

  return {
    assunto: preenche(template?.assunto, dados).replace(/\*\*/g, '').slice(0, 200),
    html,
    texto: [...partesTexto, rodape].filter(Boolean).join('\n\n'),
  };
}

/** O primeiro e-mail válido do lead (o scraper grava até três). */
export function emailDoLead(lead) {
  return String(lead?.email || '').split(/[\s,;]+/).find((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) || '';
}

/** Template sugerido para o lead: inglês para americano, Brasil ou EUA pelo país. */
export function templateSugerido(lead, templates) {
  const idioma = idiomaDoLead(lead) === 'en' ? 'en' : 'pt';
  const pais = String(lead?.pais || 'BR').toUpperCase();
  const daLingua = templates.filter((t) => (t.idioma || 'pt') === idioma);
  if (idioma === 'pt' && pais === 'BR') return daLingua.find((t) => /brasil/i.test(t.nome) && !/eua/i.test(t.nome)) || daLingua[0] || templates[0];
  return daLingua.find((t) => /eua|us/i.test(t.nome)) || daLingua[0] || templates[0];
}
