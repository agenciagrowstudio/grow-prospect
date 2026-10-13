/**
 * Rascunhos da Fila do dia no WhatsApp do Prospector.
 *
 * A Fila prepara a mensagem e deixa como rascunho; a pessoa abre a conversa no
 * WhatsApp do Prospector, confere e aperta enviar. Nada sai sozinho. Quando a
 * mensagem é enviada, o rascunho some e o lead conta na meta do dia.
 *
 * Fica só neste computador: o rascunho é do WhatsApp conectado aqui.
 */
import { chaveDoDia } from './abordagem.js';

const CHAVE = 'sigma_wa_rascunhos';
const CHAVE_LOG = 'sigma_abordagem_log';
export const EVENTO_RASCUNHOS = 'prospector:rascunhos';

export const digitos = (t) => String(t || '').replace(/@.*$/, '').replace(/\D/g, '');

// Celular do Brasil pode aparecer com ou sem o 9 depois do DDD.
function semNoveBr(d) {
  return d.startsWith('55') && d.length === 13 ? d.slice(0, 4) + d.slice(5) : d;
}

export function mesmoNumero(a, b) {
  const x = digitos(a);
  const y = digitos(b);
  if (!x || !y) return false;
  return x === y || semNoveBr(x) === semNoveBr(y);
}

export function lerRascunhos() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch { return {}; }
}

function grava(mapa) {
  try { localStorage.setItem(CHAVE, JSON.stringify(mapa)); } catch { /* sem espaço */ }
  window.dispatchEvent(new CustomEvent(EVENTO_RASCUNHOS));
}

/** @returns {[string, object] | null} número e rascunho */
export function rascunhoDoNumero(mapa, numero) {
  return Object.entries(mapa || {}).find(([d]) => mesmoNumero(d, numero)) || null;
}

/** Cria ou atualiza vários de uma vez. itens: [{ numero, texto, nome, chave, angulo, publico, idioma }] */
export function criaRascunhos(itens) {
  const mapa = lerRascunhos();
  itens.forEach((r) => {
    const d = digitos(r.numero);
    if (!d || !String(r.texto || '').trim()) return;
    mapa[d] = { ...r, numero: d, ts: Date.now() };
  });
  grava(mapa);
  return mapa;
}

export function apagaRascunho(numero) {
  const mapa = lerRascunhos();
  const achado = rascunhoDoNumero(mapa, numero);
  if (!achado) return;
  delete mapa[achado[0]];
  grava(mapa);
}

/**
 * Mensagem enviada pelo WhatsApp do Prospector: se era rascunho da Fila,
 * apaga o rascunho e marca o lead como enviado (conta na meta do dia).
 */
export function concluiRascunho(numero, textoEnviado) {
  const mapa = lerRascunhos();
  const achado = rascunhoDoNumero(mapa, numero);
  if (!achado) return false;
  const [d, r] = achado;
  delete mapa[d];
  grava(mapa);
  if (r.chave) {
    try {
      const log = JSON.parse(localStorage.getItem(CHAVE_LOG) || '{}') || {};
      log[r.chave] = {
        status: 'enviada',
        dia: chaveDoDia(),
        ts: Date.now(),
        nome: r.nome || '',
        texto: textoEnviado || r.texto || '',
        angulo: r.angulo || 'geral',
        publico: r.publico || null,
        idioma: r.idioma || 'pt',
        via: 'prospector',
      };
      localStorage.setItem(CHAVE_LOG, JSON.stringify(log));
    } catch { /* o envio aconteceu; só a meta não contou */ }
  }
  return true;
}
