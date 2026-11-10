const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let D;
let Q;
let F;
const carrega = async () => {
  if (D) return;
  const raiz = path.join(__dirname, '..', 'renderer/src');
  D = await import(pathToFileURL(path.join(raiz, 'disparoAutomatico.js')).href);
  Q = await import(pathToFileURL(path.join(raiz, 'qualificacaoLead.js')).href);
  F = await import(pathToFileURL(path.join(raiz, 'followup.js')).href);
};

const DIA = 24 * 3600000;
// 10/11/2026, 10:00 no horário local.
const agora = new Date(2026, 10, 10, 10, 0, 0).getTime();
const cfg = { ativo: true, meta: 20, inicio: '09:00', fim: '18:00', campanhas: [], ultimoDia: '' };
const cfgFila = { nome: 'Matheus', empresa: 'Grow+' };

// Quente: WhatsApp, sem site, Google fraco, ticket alto.
const lead = (id, extra = {}) => ({
  id, name: `Empresa ${id}`, phone: `(27) 99999-00${String(id).padStart(2, '0')}`, pais: 'BR',
  category: 'Dentista', rating: 4.2, totalReviews: 12, address: 'Rua A, 10, Vila Velha - ES',
  searchId: 'scrape_1762790000000', ...extra,
});
const qualifica = (l) => Q.qualificaLead(l);

describe('disparo automático: quem entra', () => {
  it('só lead sem site e pelo menos morno, com WhatsApp', async () => {
    await carrega();
    const comSite = lead(1, { website: 'https://empresa1.com.br' });
    const semZap = lead(2, { phone: '' });
    const frio = lead(3, { category: 'Loja', rating: 5, totalReviews: 400, phone: '', email: '' , instagram: '@x' });
    const bom = lead(4);
    const siteFalso = lead(5, { website: 'https://instagram.com/empresa5' });
    assert.equal(D.elegivelAuto(comSite, qualifica(comSite)), false, 'tem site');
    assert.equal(D.elegivelAuto(semZap, qualifica(semZap)), false, 'sem WhatsApp');
    assert.equal(D.elegivelAuto(frio, qualifica(frio)), false, 'frio ou sem WhatsApp');
    assert.equal(D.elegivelAuto(bom, qualifica(bom)), true);
    assert.equal(D.elegivelAuto(siteFalso, qualifica(siteFalso)), true, 'Instagram no campo de site não é site');
  });

  it('frio fica de fora mesmo sem site', async () => {
    await carrega();
    const l = lead(6);
    const q = { ...qualifica(l), temperatura: { id: 'frio' } };
    assert.equal(D.elegivelAuto(l, q), false);
  });

  it('extração mais nova primeiro, depois a nota', async () => {
    await carrega();
    const antigo = lead(7, { searchId: 'scrape_1700000000000' });
    const novo = lead(8, { searchId: 'scrape_1762790000000' });
    const lista = D.candidatosNovos([antigo, novo], qualifica, {}, {});
    assert.deepEqual(lista.map((c) => c.chave), ['8', '7']);
  });

  it('quem já está no registro ou foi abordado em outra campanha não entra', async () => {
    await carrega();
    const lista = D.candidatosNovos([lead(9), lead(10), lead(11)], qualifica, { 9: { status: 'pulada' } }, { 10: { canal: 'whatsapp' } });
    assert.deepEqual(lista.map((c) => c.chave), ['11']);
  });
});

describe('disparo automático: o lote do dia', () => {
  it('total por dia: follow-ups primeiro, o resto vira abordagem nova', async () => {
    await carrega();
    const log = {};
    for (let i = 0; i < 5; i += 1) {
      log[`f${i}`] = { status: 'enviada', auto: true, ts: agora - 2 * DIA, nome: `F${i}`, idioma: 'pt', telefone: '5527999990000' };
    }
    const leads = Array.from({ length: 40 }, (_, i) => lead(100 + i));
    const r = D.montaLote({ leads, qualifica, log, cfg, cfgFila, agora });
    assert.equal(r.itens.length, 20, 'nunca passa da meta');
    assert.equal(r.followups, 5);
    assert.equal(r.novos, 15);
    assert.ok(r.itens.slice(0, 5).every((i) => i.etapa === 1), 'follow-ups na frente');
    assert.match(r.itens[0].texto, /Conseguiu ver minha última mensagem/);
    assert.match(r.itens[5].texto, /site/i, 'abordagem nova fala do site');
  });

  it('mensagens que já contam hoje diminuem o lote', async () => {
    await carrega();
    const leads = Array.from({ length: 40 }, (_, i) => lead(200 + i));
    const r = D.montaLote({ leads, qualifica, log: {}, cfg: { ...cfg, meta: 25 }, cfgFila, ocupadas: 10, agora });
    assert.equal(r.itens.length, 15);
  });

  it('follow-up do robô: 1, 3 e 7 dias, com 24h entre um e outro', async () => {
    await carrega();
    const fimDoDia = new Date(2026, 10, 10, 17, 45).getTime();
    const base = { status: 'enviada', auto: true, ts: agora - 20 * 3600000 };
    // 20h atrás às 10:00: às 17:45 já passou de 24h.
    assert.equal(D.followupsDevidos({ a: base }, cfg, agora).length, 1);
    // 6h atrás: não chega a 24h até o fim do dia.
    assert.equal(D.followupsDevidos({ a: { ...base, ts: agora - 6 * 3600000 } }, cfg, agora).length, 0);
    // Já mandou o 1º há 1 dia; o 2º só no 3º dia.
    const comUm = { ...base, ts: agora - 2 * DIA, followups: [{ n: 1, ts: agora - DIA }] };
    assert.equal(D.followupsDevidos({ a: comUm }, cfg, agora).length, 0);
    const p = F.proximoFollowup(comUm, fimDoDia, { dias: D.DIAS_FOLLOWUP_AUTO, robo: true });
    assert.equal(p.n, 2);
    // Três feitos: acabou.
    const tres = { ...base, followups: [{ n: 1, ts: 1 }, { n: 2, ts: 2 }, { n: 3, ts: 3 }] };
    assert.equal(D.followupsDevidos({ a: tres }, cfg, agora).length, 0);
  });

  it('follow-up do robô fica fora da lista manual da Fila, e o manual fora do robô', async () => {
    await carrega();
    const velho = agora - 30 * DIA;
    assert.equal(F.proximoFollowup({ status: 'enviada', auto: true, ts: velho }, agora), null);
    assert.ok(F.proximoFollowup({ status: 'enviada', ts: velho }, agora));
    assert.equal(D.followupsDevidos({ m: { status: 'enviada', ts: velho } }, cfg, agora).length, 0);
  });

  it('quem respondeu não recebe follow-up', async () => {
    await carrega();
    assert.equal(D.followupsDevidos({ a: { status: 'respondeu', auto: true, ts: agora - 5 * DIA } }, cfg, agora).length, 0);
  });

  it('espalha o lote até o fim do horário', async () => {
    await carrega();
    const ms = D.intervaloDoLote(20, cfg, agora);
    assert.ok(ms >= 4 * 60000 && ms <= 40 * 60000);
    // 20 mensagens * 1,4 (variação máxima do motor) cabem antes das 18h.
    assert.ok(agora + 20 * ms * 1.4 <= new Date(2026, 10, 10, 18, 0).getTime() + 15 * 60000);
  });

  it('horário: dentro da janela e uma vez por dia', async () => {
    await carrega();
    assert.equal(D.devidoHoje(cfg, agora), true);
    assert.equal(D.devidoHoje({ ...cfg, ultimoDia: '2026-11-10' }, agora), false);
    assert.equal(D.devidoHoje({ ...cfg, ativo: false }, agora), false);
    assert.equal(D.devidoHoje(cfg, new Date(2026, 10, 10, 8, 0).getTime()), false, 'antes do início');
    assert.equal(D.devidoHoje(cfg, new Date(2026, 10, 10, 17, 50).getTime()), false, 'sem tempo para mandar');
  });

  it('configuração: meta só 20 ou 25 e janela mínima de 2 horas', async () => {
    await carrega();
    assert.equal(D.normalizaConfig({ meta: 80 }).meta, 20);
    assert.equal(D.normalizaConfig({ meta: 25 }).meta, 25);
    assert.equal(D.normalizaConfig({ inicio: '10:00', fim: '10:30' }).fim, '12:00');
    assert.equal(D.normalizaConfig({ inicio: 'xx' }).inicio, '09:00');
  });
});

describe('disparo automático: volta para a Fila', () => {
  it('agendada vira enviada, follow-up entra e resposta encerra', async () => {
    await carrega();
    const leads = [lead(300), lead(301), lead(302)];
    const { itens } = D.montaLote({ leads, qualifica, log: {}, cfg, cfgFila, agora });
    let log = D.registraLote({}, itens, agora);
    assert.equal(log['300'].status, 'agendada');
    assert.equal(log['300'].auto, true);

    const dest = D.destinatarios(itens);
    assert.equal(dest[0].leadId, '300#0');
    assert.ok(dest[0].mensagemPronta.length > 20);

    const campanha = {
      createdAt: agora,
      leads: [
        { leadId: '300#0', status: 'sent', sentAt: agora + 60000 },
        { leadId: '301#0', status: 'failed', errorMessage: 'Número não está no WhatsApp' },
        { leadId: '302#0', status: 'failed', errorMessage: 'Connection Closed' },
      ],
    };
    log = D.aplicaCampanhas(log, [campanha]);
    assert.equal(log['300'].status, 'enviada');
    assert.equal(log['301'].status, 'sem_whatsapp');
    assert.equal(log['302'], undefined, 'falha comum volta para a Fila');

    const dia2 = { createdAt: agora + DIA, leads: [{ leadId: '300#1', status: 'sent', sentAt: agora + DIA + 60000, etapa: 1 }] };
    log = D.aplicaCampanhas(log, [campanha, dia2]);
    assert.equal(log['300'].followups.length, 1);
    assert.equal(D.aplicaCampanhas(log, [campanha, dia2]), log, 'sem mudança devolve o mesmo registro');

    const respondeu = { ...dia2, leads: [{ ...dia2.leads[0], status: 'replied', repliedAt: agora + DIA + 3600000 }] };
    log = D.aplicaCampanhas(log, [campanha, respondeu]);
    assert.equal(log['300'].status, 'respondeu');
  });

  it('registro manual (sem auto) não é mexido', async () => {
    await carrega();
    const log = { 400: { status: 'enviada', ts: agora } };
    const r = D.aplicaCampanhas(log, [{ leads: [{ leadId: '400#0', status: 'replied', sentAt: agora, repliedAt: agora }] }]);
    assert.equal(r, log);
  });

  it('resumo de hoje', async () => {
    await carrega();
    const r = D.resumoDeHoje([{ createdAt: agora, leads: [
      { status: 'sent', sentAt: agora, etapa: 0 },
      { status: 'sent', sentAt: agora, etapa: 1 },
      { status: 'pending' },
      { status: 'replied', sentAt: agora - DIA, repliedAt: agora },
    ] }], agora);
    assert.deepEqual(r, { enviadas: 2, pendentes: 1, followups: 1, respostas: 1, falhas: 0 });
  });
});
