const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  temSobrenomeBrasileiro, originalEmPortugues, resumeAvaliacoes, pontuaAvaliacoes,
} = require('../lead-scoring/avaliacoes-brasileiras');
const { avaliaSinaisBrasileiros } = require('../lead-scoring/sinais-brasileiros');

describe('avaliações: sobrenome de quem avalia', () => {
  it('reconhece sobrenome brasileiro e ignora primeiro nome e inicial', () => {
    assert.equal(temSobrenomeBrasileiro('Mayra Borges'), true);
    assert.equal(temSobrenomeBrasileiro('Rosimar Ferraz'), true);
    assert.equal(temSobrenomeBrasileiro('Ana Paula de Oliveira'), true);
    assert.equal(temSobrenomeBrasileiro('Patrick G'), false);
    assert.equal(temSobrenomeBrasileiro('Silva'), false, 'nome sozinho não conta');
    assert.equal(temSobrenomeBrasileiro('Maria Rodriguez'), false, 'sobrenome espanhol não conta');
    assert.equal(temSobrenomeBrasileiro('João Gonçalves'), true, 'com acento');
  });
});

describe('avaliações: língua original', () => {
  it('confia no aviso de tradução do Google', () => {
    assert.equal(originalEmPortugues('Excelente serviço, recomendo', 'inglês', true), false, 'traduzido do inglês');
    assert.equal(originalEmPortugues('Great job', 'Portuguese', false), true, 'tela em inglês, original em português');
    assert.equal(originalEmPortugues('Maravilhosa.', '', true), true, 'sem aviso com tela em português');
    assert.equal(originalEmPortugues('Muy bueno, gracias', '', true), false, 'espanhol sem tradução');
  });

  it('sem saber a tela, decide pelas marcas do português', () => {
    assert.equal(originalEmPortugues('Muito obrigada, atendimento ótimo, recomendo demais', '', undefined), true);
    assert.equal(originalEmPortugues('Great service, very professional team', '', undefined), false);
  });
});

describe('avaliações: resumo e pontos', () => {
  const lista = [
    { autor: 'Mayra Borges', texto: 'Serviço impecável', idiomaTexto: '', telaEmPortugues: true, resposta: 'Obrigada!', idiomaResposta: '' },
    { autor: 'Carla Oliveira', texto: 'Amei a limpeza', idiomaTexto: '', telaEmPortugues: true },
    { autor: 'Luana Carvalho', texto: 'Ótima profissional brasileira', idiomaTexto: '', telaEmPortugues: true },
    { autor: 'Patrick G', texto: 'Ótimo trabalho', idiomaTexto: 'inglês', telaEmPortugues: true },
  ];

  it('conta sem guardar nomes', () => {
    const r = resumeAvaliacoes(lista);
    assert.equal(r.lidas, 4);
    assert.equal(r.sobrenomesBr, 3);
    assert.equal(r.emPortugues, 3);
    assert.equal(r.respostaDonoPt, true);
    assert.equal(r.citamBrasil, 1);
    assert.ok(!JSON.stringify(r).includes('Borges'), 'nome de quem avaliou não fica no resumo');
  });

  it('pontua: sobrenomes, português, resposta do dono e menção ao Brasil', () => {
    const p = pontuaAvaliacoes(resumeAvaliacoes(lista));
    assert.equal(p.pontos, 35 + 30 + 25 + 20);
    assert.equal(p.sinais.length, 4);
    assert.deepEqual(pontuaAvaliacoes({ lidas: 0 }), { pontos: 0, sinais: [] });
  });

  it('cliente americano traduzido não vira brasileiro', () => {
    const americanos = [
      { autor: 'Tricia Cahill', texto: 'Utilizamos os serviços há 10 anos', idiomaTexto: 'inglês', resposta: 'Obrigada, Tricia!', idiomaResposta: 'inglês', telaEmPortugues: true },
      { autor: 'erin darcy', texto: 'Hoje fiz minha primeira limpeza', idiomaTexto: 'inglês', telaEmPortugues: true },
    ];
    assert.equal(pontuaAvaliacoes(resumeAvaliacoes(americanos)).pontos, 0);
  });

  it('entra no sinal brasileiro do lead no lugar do texto solto', () => {
    const lead = { name: 'Yasmin House Cleaning', category: 'House cleaning service', pais: 'US', avaliacoesLidas: resumeAvaliacoes(lista) };
    const s = avaliaSinaisBrasileiros(lead);
    assert.equal(s.nivel, 'alto');
    assert.ok(s.sinais.some((x) => /sobrenome brasileiro/.test(x)));
    const semLeitura = avaliaSinaisBrasileiros({ name: 'Yasmin House Cleaning', category: 'House cleaning service', pais: 'US' });
    assert.equal(semLeitura.nivel, 'baixo');
  });
});
