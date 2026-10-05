/**
 * Uma busca por bairro, em sequência, somando os resultados. O Maps devolve no
 * máximo uns 120 por busca; dividir a cidade é o que passa desse teto.
 */
async function scrapePorAreas(scrapeFn, { nicho, cidade, areas, maxResults, onProgress, cancelToken, pais }) {
  const todos = [];
  const statistics = {};
  const warnings = [];
  for (let i = 0; i < areas.length; i++) {
    if (cancelToken.cancelled) {
      const err = new Error("Scrape cancelled");
      err.code = "SCRAPE_CANCELLED";
      throw err;
    }
    const restante = maxResults - todos.length;
    if (restante <= 0) break;
    const consulta = [nicho, areas[i], cidade].filter(Boolean).join(" ");
    onProgress(`Bairro ${i + 1}/${areas.length}: ${areas[i]} (${todos.length} leads até agora)`);
    try {
      const r = await scrapeFn(consulta, restante, onProgress, cancelToken, pais);
      if (r?.success !== false && Array.isArray(r?.data)) {
        todos.push(...r.data.map((item) => ({ ...item, bairroBusca: areas[i] })));
        for (const [k, v] of Object.entries(r.statistics || {})) statistics[k] = (statistics[k] || 0) + Number(v || 0);
      } else if (r?.error) {
        warnings.push(`${areas[i]}: ${r.error}`);
      }
    } catch (err) {
      if (err?.code === "SCRAPE_CANCELLED") throw err;
      warnings.push(`${areas[i]}: ${err.message}`);
    }
  }
  return { success: todos.length > 0, data: todos, statistics, partial: warnings.length > 0, warnings, error: warnings[0] };
}

module.exports = { scrapePorAreas };
