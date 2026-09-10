const assert = require('node:assert/strict');
const test = require('node:test');

const {
  avaliaSinaisBrasileiros,
  qualificaComIA,
  extraiJson,
} = require('../lead-scoring/sinais-brasileiros');

test('categoria que declara origem sozinha ja classifica alto', () => {
  const r = avaliaSinaisBrasileiros({
    name: 'Sabor da Terra',
    category: 'Brazilian restaurant',
    pais: 'US',
  });
  assert.equal(r.nivel, 'alto');
  assert.ok(r.sinais.some((s) => s.includes('categoria')), r.sinais.join(' | '));
});

test('negocio americano sem nenhum sinal fica baixo', () => {
  const r = avaliaSinaisBrasileiros({
    name: 'Joe\'s Auto Repair',
    category: 'Auto repair shop',
    website: 'https://joesauto.com',
    pais: 'US',
  });
  assert.equal(r.nivel, 'baixo');
  assert.equal(r.pontos, 0);
  assert.equal(r.precisaDeIA, false);
});

test('WhatsApp +55 num negocio fora do Brasil e sinal forte', () => {
  const comDdi = avaliaSinaisBrasileiros({
    name: 'Maria Cleaning', category: 'Cleaning service',
    whatsapp: '+5521999998888', pais: 'US',
  });
  const semDdi = avaliaSinaisBrasileiros({
    name: 'Maria Cleaning', category: 'Cleaning service',
    whatsapp: '+16175550123', pais: 'US',
  });
  assert.ok(comDdi.pontos > semDdi.pontos);

  // O mesmo DDI dentro do Brasil nao diz nada: la todo mundo tem +55.
  const noBrasil = avaliaSinaisBrasileiros({
    name: 'Maria Limpeza', category: 'Cleaning service',
    whatsapp: '+5521999998888', pais: 'BR',
  });
  assert.ok(!noBrasil.sinais.some((s) => s.includes('+55')), noBrasil.sinais.join(' | '));
});

test('avaliacoes em portugues contam, em espanhol nao', () => {
  const pt = avaliaSinaisBrasileiros({
    name: 'Restaurante', category: 'Restaurant', pais: 'US',
    reviews: ['Muito bom o atendimento, comida deliciosa e o pessoal é gente boa, não tenho o que reclamar'],
  });
  assert.ok(pt.sinais.some((s) => s.includes('português')), pt.sinais.join(' | '));

  // Sem isto, restaurante mexicano com avaliacao em espanhol entraria junto.
  const es = avaliaSinaisBrasileiros({
    name: 'Restaurante', category: 'Restaurant', pais: 'US',
    reviews: ['Muy bueno el servicio, la comida deliciosa y el personal muy amable, todo excelente'],
  });
  assert.ok(!es.sinais.some((s) => s.includes('português')), es.sinais.join(' | '));
});

test('reviews como numero nao quebra a avaliacao', () => {
  // O campo chega ora como contagem, ora como lista, dependendo da origem.
  const r = avaliaSinaisBrasileiros({ name: 'Padaria Brasil', category: 'Bakery', reviews: 128, pais: 'US' });
  assert.equal(typeof r.pontos, 'number');
  assert.ok(r.pontos > 0);
});

test('a faixa do meio e a que pede julgamento da IA', () => {
  const meio = avaliaSinaisBrasileiros({ name: 'Barbearia do Tico', category: 'Barber shop', pais: 'US' });
  assert.equal(meio.nivel, 'medio');
  assert.equal(meio.precisaDeIA, true);

  const claro = avaliaSinaisBrasileiros({ name: 'Churrascaria Brasil', category: 'Brazilian restaurant', pais: 'US' });
  assert.equal(claro.precisaDeIA, false, 'caso obvio nao deve gastar chamada de IA');
});

test('extraiJson aguenta resposta embrulhada em prosa ou cerca', () => {
  assert.deepEqual(extraiJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extraiJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extraiJson('Claro! Aqui esta: {"a":1} espero ter ajudado'), { a: 1 });
  assert.equal(extraiJson('sem json aqui'), null);
});

test('sem chave configurada a qualificacao usa so as regras', async () => {
  const leads = [
    { id: 'a', name: 'Churrascaria Brasil', category: 'Brazilian restaurant', pais: 'US' },
    { id: 'b', name: 'Barbearia do Tico', category: 'Barber shop', pais: 'US' },
  ];
  const r = await qualificaComIA(leads, { provider: 'gemini', apiKey: '' });
  assert.equal(r.length, 2);
  assert.ok(r.every((x) => x.fonte === 'regras'));
});

test('a IA so e chamada para os duvidosos, e o obvio nao entra no lote', async () => {
  const chamadas = [];
  const analisadorFalso = {
    resolveProviderConfig: () => ({ apiKey: 'chave-de-teste', model: 'gemini-flash-latest' }),
    requestChatCompletion: async (_config, payload) => {
      chamadas.push(payload);
      return {
        choices: [{ message: { content: JSON.stringify({
          resultados: [{ id: 'b', brasileiro: true, confianca: 1, motivo: 'atende comunidade brasileira' }],
        }) } }],
      };
    },
  };

  const leads = [
    { id: 'a', name: 'Churrascaria Brasil', category: 'Brazilian restaurant', pais: 'US' },
    { id: 'b', name: 'Barbearia do Tico', category: 'Barber shop', pais: 'US' },
    { id: 'c', name: "Joe's Auto Repair", category: 'Auto repair shop', pais: 'US' },
  ];
  const r = await qualificaComIA(leads, { provider: 'gemini', apiKey: 'x' }, { analisador: analisadorFalso });

  assert.equal(chamadas.length, 1, 'deve fazer uma unica chamada em lote');
  const enviados = chamadas[0].negocios.map((n) => n.id);
  assert.deepEqual(enviados, ['b'], 'so o duvidoso vai para a IA');

  const porId = Object.fromEntries(r.map((x) => [x.id, x]));
  assert.equal(porId.a.fonte, 'regras');
  assert.equal(porId.b.fonte, 'ia');
  assert.equal(porId.b.nivel, 'alto', 'a IA confirmou e o lead subiu de faixa');
  assert.equal(porId.c.fonte, 'regras');
});

test('falha de rede na IA nao derruba a qualificacao', async () => {
  const analisadorFalso = {
    resolveProviderConfig: () => ({ apiKey: 'chave-de-teste' }),
    requestChatCompletion: async () => { throw new Error('IA falhou: HTTP 503'); },
  };
  const leads = [{ id: 'b', name: 'Barbearia do Tico', category: 'Barber shop', pais: 'US' }];
  const r = await qualificaComIA(leads, { provider: 'gemini', apiKey: 'x' }, { analisador: analisadorFalso });
  assert.equal(r.length, 1);
  assert.equal(r[0].fonte, 'regras');
});
