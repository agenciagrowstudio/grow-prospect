const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EmailCampanhas, corpoSemCitacao } = require('../email/email-campanhas');
const { publicoDoLead, rodape } = require('../email/publico');

const DAY = 24 * 60 * 60 * 1000;
// Segunda-feira, 10h no relógio local: dentro do horário comercial.
const SEG_10H = new Date(2026, 9, 5, 10, 0, 0).getTime();

const modelos = {
  br: { assunto: 'Ideia para a {{nome}}', corpo: 'Oi {{nome}}, tudo bem?', followUps: ['Conseguiu ver?', ''] },
  brus: { assunto: 'Ideia para a {{nome}}', corpo: 'Oi {{nome}}, vi que vocês atendem brasileiros.', followUps: ['Conseguiu ver?'] },
  us: { assunto: 'Quick idea for {{nome}}', corpo: 'Hi {{nome}}, quick question.', followUps: ['Any thoughts?'] },
};

function montar(dir, relogio, recebidas = []) {
  const enviados = [];
  const gmail = {
    enviar: async (_cfg, msg) => {
      enviados.push(msg);
      return { messageId: `<m${enviados.length}@x>` };
    },
    lerRecebidas: async () => recebidas,
  };
  const settings = {
    data: { user: 'eu@gmail.com', fromName: 'Alex', endereco: 'Rua A, 1', limite24h: 2, horarioInicio: '08:00', horarioFim: '18:00' },
    senha: () => 'x',
    pronta: () => true,
  };
  const motor = new EmailCampanhas(dir, { settings, gmail, now: () => relogio.t });
  return { motor, enviados };
}

describe('público do lead', () => {
  it('separa os três públicos e só põe em português nos EUA com sinal alto', () => {
    assert.equal(publicoDoLead({ pais: 'BR' }), 'br');
    assert.equal(publicoDoLead({}), 'br');
    assert.equal(publicoDoLead({ pais: 'US', sinalBr: { nivel: 'alto' } }), 'brus');
    assert.equal(publicoDoLead({ pais: 'US', sinalBr: { nivel: 'medio' } }), 'us');
    assert.equal(publicoDoLead({ pais: 'US' }), 'us');
  });

  it('rodapé no idioma do público, com endereço e descadastro', () => {
    assert.match(rodape('us', { remetente: 'A', endereco: '1 Main St' }), /1 Main St[\s\S]*unsubscribe/);
    assert.match(rodape('brus', { remetente: 'A', endereco: 'Rua B' }), /Rua B[\s\S]*SAIR/);
  });
});

describe('campanha de e-mail', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-email-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('exige texto para cada público presente na lista', () => {
    const { motor } = montar(dir, { t: SEG_10H });
    assert.throws(
      () => motor.criar({ leads: [{ email: 'a@b.com', pais: 'US' }], modelos: { br: modelos.br } }),
      /Americanos nos EUA/,
    );
  });

  it('envia no idioma certo, respeita a cota de 24h e ignora e-mail inválido ou repetido', async () => {
    const relogio = { t: SEG_10H };
    const { motor, enviados } = montar(dir, relogio);
    const c = motor.criar({
      modelos,
      leads: [
        { email: 'ana@loja.com.br', name: 'Loja Ana', pais: 'BR' },
        { email: 'joe@shop.com', name: 'Joe Shop', pais: 'US' },
        { email: 'JOE@shop.com', name: 'Repetido', pais: 'US' },
        { email: 'invalido', name: 'X' },
        { email: 'bia@acai.com', name: 'Acai Bia', pais: 'US', sinalBr: { nivel: 'alto' } },
      ],
    });
    assert.equal(c.total, 3);
    motor.iniciar(c.id);
    for (let i = 0; i < 3; i++) {
      await motor.tick();
      relogio.t += 120 * 1000;
    }
    motor.desligar();
    assert.equal(enviados.length, 2, 'limite de 2 por 24h');
    assert.equal(enviados[0].assunto, 'Ideia para a Loja Ana');
    assert.match(enviados[1].texto, /^Hi Joe Shop[\s\S]*unsubscribe/);
    assert.equal(motor.listar()[0].motivoEspera, 'limite_24h');
  });

  it('não envia fora do horário nem no fim de semana', async () => {
    const sabado = new Date(2026, 9, 10, 10, 0, 0).getTime();
    const { motor, enviados } = montar(dir, { t: sabado });
    const c = motor.criar({ modelos, leads: [{ email: 'a@b.com', pais: 'BR' }] });
    motor.iniciar(c.id);
    await motor.tick();
    motor.desligar();
    assert.equal(enviados.length, 0);
    assert.equal(motor.listar()[0].motivoEspera, 'fora_do_horario');
  });

  it('follow-up sai como resposta na mesma conversa e para em quem respondeu', async () => {
    const relogio = { t: SEG_10H };
    const recebidas = [];
    const { motor, enviados } = montar(dir, relogio, recebidas);
    motor.settings.data.limite24h = 50;
    const c = motor.criar({
      modelos,
      followUpAtivo: true,
      followUpDias: [2],
      leads: [{ email: 'a@b.com', name: 'A', pais: 'BR' }, { email: 'c@d.com', name: 'C', pais: 'BR' }],
    });
    motor.iniciar(c.id);
    await motor.tick();
    relogio.t += 120 * 1000;
    await motor.tick();
    assert.equal(enviados.length, 2);

    // "C" responde no dia seguinte.
    recebidas.push({ de: 'c@d.com', assunto: 'Re: Ideia', trecho: 'cabecalho\n\nTenho interesse sim', data: relogio.t + DAY });
    relogio.t = SEG_10H + 2 * DAY + 1000; // quarta, 10h
    await motor.tick();
    motor.desligar();

    assert.equal(enviados.length, 3);
    assert.equal(enviados[2].para, 'a@b.com');
    assert.equal(enviados[2].assunto, 'Re: Ideia para a A');
    assert.equal(enviados[2].emRespostaA, '<m1@x>');
    const r = motor.listar()[0];
    assert.equal(r.respondidos, 1);
    assert.equal(r.followUps, 1);
  });

  it('descadastro e e-mail que voltou entram na lista de supressão', async () => {
    const relogio = { t: SEG_10H };
    const recebidas = [];
    const { motor } = montar(dir, relogio, recebidas);
    motor.settings.data.limite24h = 50;
    const c = motor.criar({ modelos, leads: [{ email: 'a@b.com', pais: 'US' }, { email: 'x@y.com', pais: 'US' }] });
    motor.iniciar(c.id);
    await motor.tick();
    relogio.t += 120 * 1000;
    await motor.tick();
    motor.desligar();
    recebidas.push(
      { de: 'a@b.com', assunto: 'Re: Quick idea', trecho: 'h\n\nPlease unsubscribe me', data: relogio.t + 1 },
      { de: 'mailer-daemon@googlemail.com', assunto: 'Delivery Status Notification', trecho: 'h\n\nAddress not found: x@y.com', data: relogio.t + 1 },
    );
    await motor.lerRespostas();
    const r = motor.listar()[0];
    assert.equal(r.descadastrados, 1);
    assert.equal(r.voltaram, 1);
    assert.ok(motor.supressao.has('a@b.com') && motor.supressao.has('x@y.com'));
  });

  it('o "unsubscribe" do nosso rodapé citado na resposta não conta como pedido', () => {
    const fonte = 'Subject: Re\n\nSounds good, call me.\n\nOn Mon, Oct 5, Alex wrote:\n> Reply "unsubscribe"';
    assert.equal(corpoSemCitacao(fonte).includes('unsubscribe'), false);
  });
});
