/**
 * Cotação do dólar em reais e a conta de quanto se recebe.
 *
 * Fonte principal: AwesomeAPI (gratuita, brasileira). Reserva: open.er-api.com.
 * Sem internet, vale a última cotação guardada, com a hora dela.
 * Para quem recebe em dólar, a cotação que importa é a de compra (o que o
 * banco paga pelo dólar): é ela que entra na conta.
 */

const CHAVE = 'prospector_cotacao_usd';
const CHAVE_TAXA = 'prospector_cotacao_taxa';

/** Lê a resposta da AwesomeAPI (/json/last/USD-BRL). */
export function leAwesome(json) {
  const c = json?.USDBRL;
  const compra = Number(c?.bid);
  if (!Number.isFinite(compra) || compra <= 0) return null;
  const venda = Number(c?.ask);
  return {
    compra,
    venda: Number.isFinite(venda) && venda > 0 ? venda : compra,
    variacao: Number(c?.pctChange) || 0,
    ts: Number(c?.timestamp) ? Number(c.timestamp) * 1000 : Date.now(),
    fonte: 'AwesomeAPI',
  };
}

/** Lê a resposta da open.er-api.com (/v6/latest/USD). */
export function leErApi(json) {
  const brl = Number(json?.rates?.BRL);
  if (json?.result !== 'success' || !Number.isFinite(brl) || brl <= 0) return null;
  return { compra: brl, venda: brl, variacao: null, ts: Number(json.time_last_update_unix) * 1000 || Date.now(), fonte: 'ExchangeRate-API' };
}

export function cotacaoGuardada() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; }
}

export async function buscaCotacao(fetchImpl = fetch) {
  const fontes = [
    ['https://economia.awesomeapi.com.br/json/last/USD-BRL', leAwesome],
    ['https://open.er-api.com/v6/latest/USD', leErApi],
  ];
  for (const [url, le] of fontes) {
    try {
      const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
      if (!res.ok) continue;
      const c = le(await res.json());
      if (c) {
        try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch {}
        return c;
      }
    } catch { /* tenta a próxima fonte */ }
  }
  const guardada = cotacaoGuardada();
  if (guardada) return { ...guardada, antiga: true };
  throw new Error('Sem cotação agora. Confira a internet.');
}

export function taxaGuardada() {
  try {
    const n = Number(localStorage.getItem(CHAVE_TAXA));
    return Number.isFinite(n) && n >= 0 && n <= 30 ? n : 0;
  } catch { return 0; }
}
export function guardaTaxa(n) {
  try { localStorage.setItem(CHAVE_TAXA, String(n)); } catch {}
}

/** "1.234,56" ou "1234.56" vira número. */
export function numeroDigitado(texto) {
  const t = String(texto || '').replace(/[^\d.,]/g, '');
  if (!t) return 0;
  // "1.500" (pt) ou "1,500" (en): grupos de 3 dígitos são milhar, não decimal.
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ''));
  const virgula = t.lastIndexOf(',');
  const ponto = t.lastIndexOf('.');
  const decimal = virgula > ponto ? ',' : '.';
  const limpo = decimal === ',' ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {number} dolares valor em US$
 * @param {number} cotacao R$ por US$ (compra)
 * @param {number} taxaPct taxa e spread da forma de recebimento (%)
 */
export function calculaRecebimento(dolares, cotacao, taxaPct = 0) {
  const bruto = Math.max(0, dolares) * Math.max(0, cotacao);
  const desconto = bruto * (Math.max(0, taxaPct) / 100);
  return { bruto, desconto, liquido: bruto - desconto };
}

export const reais = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dolares = (n) => `US$ ${Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
