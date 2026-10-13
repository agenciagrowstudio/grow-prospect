/**
 * Proteção contra rede social vazada: o mesmo Instagram ou Facebook em vários
 * leads de nomes diferentes não é perfil deles. Foi assim que um perfil de
 * salão de unhas foi parar em 270 leads de house cleaning (o robô pegava o
 * primeiro link da página inteira). Franquia com perfil único perde pouco: o
 * campo só fica vazio.
 */

const MINIMO_REPETIDO = 4; // leads com o mesmo perfil
const MINIMO_NOMES = 3; // nomes diferentes entre eles
const CAMPOS = ['instagram', 'facebook'];

/** instagram.com/fulano?igsh=x e https://www.instagram.com/fulano/ são o mesmo perfil. */
export function normalizaPerfil(url) {
  const t = String(url || '').trim().toLowerCase();
  if (!t) return '';
  return t
    .replace(/^https?:\/\//, '')
    .replace(/^(www\.|m\.|web\.)/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

const nomeChave = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * @param {object[]} leads
 * @returns {{leads: object[], limpos: number, perfis: string[]}} limpos = quantos campos foram esvaziados
 */
export function limpaRedesRepetidas(leads = []) {
  const vazados = new Map(); // campo -> Set de perfis vazados
  CAMPOS.forEach((campo) => {
    const porPerfil = new Map();
    leads.forEach((l) => {
      const p = normalizaPerfil(l?.[campo]);
      if (!p) return;
      if (!porPerfil.has(p)) porPerfil.set(p, { qtd: 0, nomes: new Set() });
      const reg = porPerfil.get(p);
      reg.qtd += 1;
      reg.nomes.add(nomeChave(l.name));
    });
    const set = new Set();
    porPerfil.forEach((reg, p) => {
      if (reg.qtd >= MINIMO_REPETIDO && reg.nomes.size >= MINIMO_NOMES) set.add(p);
    });
    vazados.set(campo, set);
  });

  let limpos = 0;
  const novos = leads.map((l) => {
    let mudou = null;
    CAMPOS.forEach((campo) => {
      if (vazados.get(campo).has(normalizaPerfil(l?.[campo]))) {
        mudou = mudou || { ...l };
        mudou[campo] = '';
        limpos += 1;
      }
    });
    return mudou || l;
  });
  const perfis = CAMPOS.flatMap((c) => [...vazados.get(c)]);
  return { leads: limpos ? novos : leads, limpos, perfis };
}
