const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let E;
let C;
const carrega = async () => {
  if (!E) {
    E = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/extracaoAutomatica.js')).href);
    C = await import(pathToFileURL(path.join(__dirname, '..', 'renderer/src/cobertura.js')).href);
  }
};

// Área já extraída, no formato que areasExtraidas devolve.
const areaFeita = (nicho, cidade, uf, id = `${nicho}${cidade}`) => ({
  id, nicho, tipo: 'cidade', lugar: C.chaveLugar({ tipo: 'cidade', cidade, uf, pais: 'US' }),
  local: { cidade, nome: cidade, uf, pais: 'US', tipo: 'cidade' }, ts: 1,
});

describe('extração automática: configuração', () => {
  it('padrão: 15 serviços x 15 cidades, 7h, meta de 200', async () => {
    await carrega();
    const c = E.configPadrao();
    assert.equal(c.hora, '07:00');
    assert.equal(c.limite, 200);
    assert.equal(c.ativo, false);
    assert.equal(E.combinacoes(c).length, 225);
  });

  it('normaliza o que estiver guardado', async () => {
    await carrega();
    const c = E.normalizaConfig({ ativo: 1, hora: '25:99', limite: 5, nichos: ['Roofing', 'Inventado'], cidades: ['Orlando|FL', 'Lugar|XX'] });
    assert.equal(c.ativo, true);
    assert.equal(c.hora, '07:00');
    assert.equal(c.limite, E.LIMITE_MIN);
    assert.deepEqual(c.nichos, ['Roofing']);
    assert.deepEqual(c.cidades, ['Orlando|FL']);
    assert.equal(E.normalizaConfig({ limite: 99999 }).limite, E.LIMITE_MAX);
    assert.equal(E.normalizaConfig(null).limite, 200);
  });
});

describe('extração automática: o que falta extrair', () => {
  it('não repete serviço + cidade que já está no mapa', async () => {
    await carrega();
    const cfg = { ...E.configPadrao(), nichos: ['Roofing'], cidades: ['Orlando|FL', 'Newark|NJ'] };
    const areas = [areaFeita('Roofing', 'Orlando', 'FL')];
    const p = E.pendentes(cfg, areas);
    assert.deepEqual(p.map((x) => x.cidade), ['Newark']);
    assert.deepEqual(E.progresso(cfg, areas), { total: 2, feitas: 1, semResultado: 0, pendentes: 1 });
  });

  it('o mesmo lugar para outro serviço continua pendente', async () => {
    await carrega();
    const cfg = { ...E.configPadrao(), nichos: ['Roofing', 'Handyman'], cidades: ['Orlando|FL'] };
    const p = E.pendentes(cfg, [areaFeita('Roofing', 'Orlando', 'FL')]);
    assert.deepEqual(p.map((x) => x.nicho), ['Handyman']);
  });

  it('busca marcada como sem resultado sai da lista', async () => {
    await carrega();
    const cfg = { ...E.configPadrao(), nichos: ['Roofing'], cidades: ['Orlando|FL'] };
    const [unica] = E.combinacoes(cfg);
    assert.equal(E.pendentes({ ...cfg, puladas: [unica.chave] }, []).length, 0);
    assert.equal(E.progresso({ ...cfg, puladas: [unica.chave] }, []).semResultado, 1);
  });
});

describe('extração automática: roteiro inteligente', () => {
  it('prioriza cidade e serviço com mais brasileiros prestando serviço', async () => {
    await carrega();
    const topo = E.roteiro(E.configPadrao(), [], null, 3);
    assert.ok(['Framingham', 'Newark', 'Deerfield Beach'].includes(topo[0].cidade));
    assert.ok(['House cleaning', 'Painting contractor'].includes(topo[0].nicho));
    const ultimo = E.roteiro(E.configPadrao(), [], null, 225).pop();
    assert.equal(ultimo.nicho, 'Auto repair');
  });

  it('o sorteio favorece o peso maior, mas sem ser fixo', async () => {
    await carrega();
    const cfg = { ...E.configPadrao() };
    const vistos = new Set();
    for (let i = 0; i < 200; i += 1) vistos.add(E.escolheProxima(cfg, [], new Set(), Math.random).chave);
    assert.ok(vistos.size > 5, 'varia entre as buscas');
    // Com sorteio neutro, sai a de maior peso.
    const fixa = E.escolheProxima(cfg, [], new Set(), () => 0.5);
    assert.equal(E.pesoDaBusca(fixa), 25);
  });

  it('pula as ignoradas e devolve null quando nada resta', async () => {
    await carrega();
    const cfg = { ...E.configPadrao(), nichos: ['Roofing'], cidades: ['Orlando|FL'] };
    const [unica] = E.combinacoes(cfg);
    assert.equal(E.escolheProxima(cfg, [], new Set([unica.chave])), null);
  });

  it('aprende: cidade que rende brasileiros sobe, a que não rende desce', async () => {
    await carrega();
    const mkLeads = (searchId, n, brasileiros) => Array.from({ length: n }, (_, i) => ({
      id: `${searchId}-${i}`, searchId, pais: 'US', sinalBr: { nivel: i < brasileiros ? 'alto' : 'baixo' },
    }));
    const areas = [areaFeita('Roofing', 'Orlando', 'FL', 'a'), areaFeita('Roofing', 'Newark', 'NJ', 'b')];
    const leads = [...mkLeads('a', 100, 90), ...mkLeads('b', 100, 2)];
    const d = E.desempenhoPorGrupo(areas, leads, {});
    assert.equal(d.cidades['Orlando|FL'].leads, 100);
    assert.equal(d.cidades['Orlando|FL'].br, 90);
    const sobe = E.fatorAprendido(d.cidades['Orlando|FL']);
    const desce = E.fatorAprendido(d.cidades['Newark|NJ']);
    assert.ok(sobe > 1 && desce < 1);
    assert.equal(E.fatorAprendido(null), 1);
    assert.equal(E.fatorAprendido({ leads: 0 }), 1);
  });

  it('quem responde mais pesa mais', async () => {
    await carrega();
    const base = { leads: 60, br: 18, enviadas: 40, respostas: 0 };
    assert.ok(E.fatorAprendido({ ...base, respostas: 12 }) > E.fatorAprendido({ ...base, respostas: 0 }));
  });
});

describe('extração automática: quando rodar', () => {
  it('só depois do horário e uma vez por dia', async () => {
    await carrega();
    const c = { ...E.configPadrao(), ativo: true, hora: '07:00' };
    assert.equal(E.devidoAgora(c, new Date(2026, 9, 13, 6, 59)), false);
    assert.equal(E.devidoAgora(c, new Date(2026, 9, 13, 7, 0)), true);
    assert.equal(E.devidoAgora(c, new Date(2026, 9, 13, 21, 0)), true, 'quem abre o app tarde recupera o dia');
    assert.equal(E.devidoAgora({ ...c, ultimoDia: '2026-10-13' }, new Date(2026, 9, 13, 8, 0)), false);
    assert.equal(E.devidoAgora({ ...c, ultimoDia: '2026-10-12' }, new Date(2026, 9, 13, 8, 0)), true);
    assert.equal(E.devidoAgora({ ...c, ativo: false }, new Date(2026, 9, 13, 8, 0)), false);
  });

  it('calcula a próxima execução', async () => {
    await carrega();
    const c = { ...E.configPadrao(), ativo: true, hora: '07:00' };
    const antes = E.proximaExecucao(c, new Date(2026, 9, 13, 5, 0));
    assert.equal(antes.quando.getHours(), 7);
    assert.equal(antes.quando.getDate(), 13);
    const depoisJaRodou = E.proximaExecucao({ ...c, ultimoDia: '2026-10-13' }, new Date(2026, 9, 13, 9, 0));
    assert.equal(depoisJaRodou.quando.getDate(), 14);
    assert.equal(E.proximaExecucao(c, new Date(2026, 9, 13, 9, 0)).pendente, true);
  });
});

describe('extração automática: o laço do dia', () => {
  const semPausa = () => Promise.resolve();
  const cfgPequena = (limite) => ({ ...E.configPadrao(), limite, nichos: ['Roofing', 'Handyman'], cidades: ['Orlando|FL', 'Newark|NJ', 'Danbury|CT'] });

  it('para quando bate a meta de leads novos', async () => {
    await carrega();
    const feitas = [];
    const r = await E.executaDia({
      cfg: cfgPequena(100),
      lerAreas: () => feitas.map((f) => areaFeita(f.nicho, f.cidade, f.uf)),
      iniciar: async (item) => { feitas.push(item); return { ok: true, novos: 60 }; },
      esperar: semPausa,
    });
    assert.equal(r.motivo, 'meta');
    assert.equal(r.novos, 120);
    assert.equal(r.buscas, 2);
  });

  it('para quando tudo já foi extraído', async () => {
    await carrega();
    const feitas = [];
    const r = await E.executaDia({
      cfg: cfgPequena(5000),
      lerAreas: () => feitas.map((f) => areaFeita(f.nicho, f.cidade, f.uf)),
      iniciar: async (item) => { feitas.push(item); return { ok: true, novos: 1 }; },
      esperar: semPausa,
    });
    assert.equal(r.motivo, 'tudo');
    assert.equal(r.buscas, 6);
  });

  it('três falhas seguidas param o dia e nada fica marcado como vazio', async () => {
    await carrega();
    const r = await E.executaDia({
      cfg: cfgPequena(200),
      lerAreas: () => [],
      iniciar: async () => ({ ok: false, erro: 'timeout' }),
      esperar: semPausa,
    });
    assert.equal(r.motivo, 'falhas');
    assert.equal(r.falhas, 3);
    assert.deepEqual(r.novasPuladas, []);
  });

  it('busca sem resultado é anotada e o laço segue', async () => {
    await carrega();
    const feitas = [];
    let vez = 0;
    const r = await E.executaDia({
      cfg: cfgPequena(30),
      lerAreas: () => feitas.map((f) => areaFeita(f.nicho, f.cidade, f.uf)),
      iniciar: async (item) => {
        vez += 1;
        if (vez === 1) return { ok: false, semResultado: true, erro: 'Nenhum negócio foi encontrado' };
        feitas.push(item);
        return { ok: true, novos: 40 };
      },
      esperar: semPausa,
    });
    assert.equal(r.motivo, 'meta');
    assert.equal(r.vazias, 1);
    assert.equal(r.novasPuladas.length, 1);
    assert.equal(r.buscas, 1);
  });

  it('respeita o pedido de parar e a extração manual em andamento', async () => {
    await carrega();
    let parar = false;
    const r1 = await E.executaDia({
      cfg: cfgPequena(5000),
      lerAreas: () => [],
      iniciar: async () => { parar = true; return { ok: true, novos: 3 }; },
      esperar: semPausa,
      deveParar: () => parar,
    });
    assert.equal(r1.motivo, 'parada');
    assert.equal(r1.novos, 3);
    const r2 = await E.executaDia({ cfg: cfgPequena(200), lerAreas: () => [], iniciar: async () => ({ ok: false, ocupado: true }), esperar: semPausa });
    assert.equal(r2.motivo, 'ocupado');
    assert.equal(r2.buscas, 0);
  });

  it('espera entre as buscas, mas não depois de bater a meta', async () => {
    await carrega();
    const esperas = [];
    await E.executaDia({
      cfg: cfgPequena(100),
      lerAreas: () => [],
      iniciar: async () => ({ ok: true, novos: 60 }),
      esperar: async (ms) => { esperas.push(ms); },
      rng: () => 0.5,
    });
    assert.equal(esperas.length, 1);
    assert.ok(esperas[0] >= E.PAUSA_MIN_MS && esperas[0] <= E.PAUSA_MAX_MS);
  });
});

describe('extração automática: textos e histórico', () => {
  it('detecta busca sem resultado pela mensagem do app', async () => {
    await carrega();
    assert.equal(E.ehSemResultado('Nenhum negócio foi encontrado para esta busca. Tente ajustar nicho ou localização.'), true);
    assert.equal(E.ehSemResultado('A busca foi concluída, mas não retornou leads válidos.'), true);
    assert.equal(E.ehSemResultado('net::ERR_INTERNET_DISCONNECTED'), false);
  });

  it('guarda o histórico do dia sem duplicar e só os últimos 30', async () => {
    await carrega();
    let c = E.configPadrao();
    const r = { novos: 210, buscas: 4, motivo: 'meta', feitas: [{ nicho: 'Roofing', cidade: 'Orlando', uf: 'FL', novos: 80 }] };
    c = E.registraDia(c, r, new Date(2026, 9, 13, 7, 30));
    c = E.registraDia(c, { ...r, novos: 220 }, new Date(2026, 9, 13, 9, 0));
    assert.equal(c.historico.length, 1);
    assert.equal(c.historico[0].novos, 220);
    assert.equal(c.historico[0].dia, '2026-10-13');
    for (let i = 1; i <= 40; i += 1) c = E.registraDia(c, r, new Date(2026, 10, i));
    assert.equal(c.historico.length, 30);
  });

  it('frase do resultado fala português', async () => {
    await carrega();
    assert.match(E.textoResultado({ novos: 1, buscas: 1, motivo: 'meta' }, 200), /Meta de 200 atingida: 1 lead novo em 1 busca/);
    assert.match(E.textoResultado({ novos: 0, buscas: 0, motivo: 'falhas' }, 200), /Tenta de novo amanhã/);
  });
});
