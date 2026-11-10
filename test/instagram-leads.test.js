const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let I;
let D;
let Q;
const carrega = async () => {
  if (I) return;
  const raiz = path.join(__dirname, '..', 'renderer/src');
  I = await import(pathToFileURL(path.join(raiz, 'instagramLeads.js')).href);
  D = await import(pathToFileURL(path.join(raiz, 'disparoAutomatico.js')).href);
  Q = await import(pathToFileURL(path.join(raiz, 'qualificacaoLead.js')).href);
};

const origem = { searchId: 'insta_1762790000000', postUrl: 'https://www.instagram.com/p/DZqZX-ZRqVH/' };
const comentarios = [
  { ownerUsername: 'Studio.Bela', text: 'Quanto custa?', timestamp: '2026-11-01T10:00:00.000Z', ownerProfilePicUrl: 'https://x/a.jpg' },
  { ownerUsername: 'studio.bela', text: 'Tem para iPhone?', timestamp: '2026-11-02T10:00:00.000Z' },
  { ownerUsername: 'ana.souza', text: 'Amei   o\nresultado', timestamp: '2026-10-30T10:00:00.000Z' },
  { ownerUsername: '', text: 'sem dono' },
  { owner: { username: 'joao_fotos' }, text: 'Top' },
];
const perfis = [
  {
    username: 'studio.bela', fullName: 'Studio Bela Fotografia', isBusinessAccount: true, businessCategoryName: 'Photographer',
    biography: 'Ensaios em Vitória\nWhatsApp (27) 99888-7766\ncontato@studiobela.com', externalUrl: '', followersCount: 5400,
  },
  { username: 'ana.souza', fullName: 'Ana Souza', isBusinessAccount: false, biography: 'mãe e fotógrafa amadora', followersCount: 310 },
];

describe('Instagram: link do post', () => {
  it('aceita post, reel e link com ?igsh, e recusa o resto', async () => {
    await carrega();
    assert.equal(I.normalizaUrlPost('https://www.instagram.com/p/DZqZX-ZRqVH/?igsh=abc123'), 'https://www.instagram.com/p/DZqZX-ZRqVH/');
    assert.equal(I.normalizaUrlPost('instagram.com/reel/DDIJAfeyemG'), 'https://www.instagram.com/reel/DDIJAfeyemG/');
    assert.equal(I.normalizaUrlPost('https://www.instagram.com/reels/DDIJAfeyemG/'), 'https://www.instagram.com/reel/DDIJAfeyemG/');
    assert.equal(I.normalizaUrlPost('https://www.instagram.com/midtrack.co/p/DZqZX-ZRqVH/'), 'https://www.instagram.com/p/DZqZX-ZRqVH/');
    assert.equal(I.normalizaUrlPost('https://www.instagram.com/midtrack.co/'), null, 'perfil não é post');
    assert.equal(I.normalizaUrlPost('https://evil.com/p/DZqZX-ZRqVH/'), null);
    assert.equal(I.normalizaUrlPost('qualquer coisa'), null);
  });

  it('custo estimado: comentário e perfil cobram cada um', async () => {
    await carrega();
    assert.equal(I.custoEstimado(200, false), 0.52);
    assert.equal(I.custoEstimado(200, true), 1.04);
  });
});

describe('Instagram: de comentário a lead', () => {
  it('uma pessoa por usuário, com os comentários dela', async () => {
    await carrega();
    const pessoas = I.pessoasDosComentarios(comentarios);
    assert.deepEqual(pessoas.map((p) => p.usuario), ['studio.bela', 'ana.souza', 'joao_fotos']);
    assert.deepEqual(pessoas[0].comentarios, ['Quanto custa?', 'Tem para iPhone?']);
    assert.equal(pessoas[1].comentarios[0], 'Amei o resultado');
  });

  it('perfil comercial vira lead com telefone e e-mail tirados da bio', async () => {
    await carrega();
    const { novos } = I.leadsDaExtracao({ comentarios, perfis }, [], origem);
    const bela = novos.find((l) => l.usuarioInstagram === 'studio.bela');
    assert.equal(bela.id, 'ig_studio.bela');
    assert.equal(bela.name, 'Studio Bela Fotografia');
    assert.equal(bela.perfilComercial, true);
    assert.equal(bela.category, 'Photographer');
    assert.equal(bela.phone, '(27) 99888-7766');
    assert.equal(bela.email, 'contato@studiobela.com');
    assert.equal(bela.source, 'instagram');
    assert.equal(bela.searchId, origem.searchId);
    assert.equal(bela.instagram, 'https://www.instagram.com/studio.bela/');
    const joao = novos.find((l) => l.usuarioInstagram === 'joao_fotos');
    assert.equal(joao.name, '@joao_fotos', 'sem perfil buscado fica o usuário');
    assert.equal(joao.perfilBuscado, false);
  });

  it('quem já está na base não entra de novo', async () => {
    await carrega();
    const base = [{ id: 'x', instagram: 'https://instagram.com/Ana.Souza' }, { id: 'y', usuarioInstagram: 'joao_fotos' }];
    const r = I.leadsDaExtracao({ comentarios, perfis }, base, origem);
    assert.deepEqual(r.novos.map((l) => l.usuarioInstagram), ['studio.bela']);
    assert.equal(r.repetidos, 2);
  });

  it('primeiro nome só quando parece nome de gente', async () => {
    await carrega();
    assert.equal(I.primeiroNome('Ana Souza'), 'Ana');
    assert.equal(I.primeiroNome('ANA'), 'Ana', 'nome curto em maiúsculas vira Ana');
    assert.equal(I.primeiroNome('Studio Bela Fotografia'), '');
    assert.equal(I.primeiroNome('MIDTRACK | Bruno e Hellen'), '');
    assert.equal(I.primeiroNome('@joao_fotos'), '');
  });
});

describe('Instagram: buscador', () => {
  it('posts com mais comentários primeiro, sem os de comentário fechado', async () => {
    await carrega();
    const r = I.postsDaBusca([
      { url: 'https://www.instagram.com/p/DcUrXaOx3xX/', commentsCount: 3, ownerUsername: 'jf', caption: 'ANTES → DEPOIS', productType: 'clips' },
      { url: 'https://www.instagram.com/p/DZqZX-ZRqVH/', commentsCount: 859, ownerUsername: 'midtrack.co', likesCount: 3248 },
      { url: 'https://www.instagram.com/p/DZqZX-ZRqVH/', commentsCount: 859, ownerUsername: 'midtrack.co' },
      { url: 'https://www.instagram.com/p/FECHADOxx/', commentsCount: 90, isCommentsDisabled: true },
    ]);
    assert.deepEqual(r.map((p) => p.autor), ['midtrack.co', 'jf']);
    assert.equal(r[1].reel, true);
  });

  it('anúncios agrupados por anunciante, com o texto mais recente', async () => {
    await carrega();
    const r = I.anunciantesDaBusca([
      { adArchiveID: '1', pageID: '10', pageName: 'Revivah', startDateFormatted: '2026-05-06T07:00:00.000Z', snapshot: { body: { text: 'antigo' } } },
      { adArchiveID: '2', pageID: '10', pageName: 'Revivah', startDateFormatted: '2026-09-18T07:00:00.000Z', snapshot: { body: { text: 'novo' }, title: 'Converse conosco', linkUrl: 'https://api.whatsapp.com/send' } },
      { adArchiveID: '3', pageID: '20', pageName: 'Aline', startDateFormatted: '2026-11-05T08:00:00.000Z', snapshot: { body: { text: 'curso' } } },
    ]);
    assert.equal(r.length, 2);
    assert.equal(r[0].nome, 'Revivah');
    assert.equal(r[0].anuncios, 2);
    assert.equal(r[0].texto, 'novo');
    assert.equal(r[0].anuncioId, '2');
    assert.equal(I.linkAnuncio('2'), 'https://www.facebook.com/ads/library/?id=2');
  });
});

describe('Instagram: Fila do Direct', () => {
  const leads = () => I.leadsDaExtracao({ comentarios, perfis }, [], origem).novos;

  it('só leads do Instagram, comercial primeiro, sem quem já foi tratado', async () => {
    await carrega();
    const lista = [...leads(), { id: 'maps1', source: 'maps', name: 'Dentista' }];
    assert.deepEqual(I.filaDirect(lista, {}).map((l) => l.usuarioInstagram), ['studio.bela', 'ana.souza', 'joao_fotos']);
    assert.deepEqual(I.filaDirect(lista, {}, { soComercial: true }).map((l) => l.usuarioInstagram), ['studio.bela']);
    assert.deepEqual(I.filaDirect(lista, { 'ig_studio.bela': { status: 'enviada' } }).map((l) => l.usuarioInstagram), ['ana.souza', 'joao_fotos']);
  });

  it('mensagem com o primeiro nome, quem assina e a oferta', async () => {
    await carrega();
    const ana = leads().find((l) => l.usuarioInstagram === 'ana.souza');
    const versoes = [0, 1].map((v) => I.mensagemDirect(ana, { nome: 'Matheus', oferta: 'site' }, v));
    assert.ok(versoes.every((t) => t.startsWith('Oi, Ana!')));
    assert.ok(versoes.some((t) => t.includes('Matheus aqui, da Grow+')));
    assert.notEqual(versoes[0], versoes[1], 'outra versão troca o texto');
    const bela = leads().find((l) => l.usuarioInstagram === 'studio.bela');
    assert.ok(I.mensagemDirect(bela, { nome: 'Matheus', oferta: 'bio' }).startsWith('Oi!'), 'empresa não ganha primeiro nome');
    assert.ok(!/aqui aqui/.test(I.mensagemDirect(bela, { oferta: 'site' }, 1)));
  });

  it('meta do Direct separada da do WhatsApp', async () => {
    await carrega();
    const hoje = new Date(2026, 10, 10, 12);
    const r1 = I.registroDirect({ name: 'Ana' }, 'enviada', 'Oi', { oferta: 'site' }, hoje.getTime());
    const log = { a: r1, b: { status: 'enviada', dia: '2026-11-10', canal: 'whatsapp' } };
    assert.equal(I.directsHoje(log, hoje), 1);
    assert.equal(r1.canal, 'instagram');
    assert.equal(I.linkDirect('@ana.souza'), 'https://ig.me/m/ana.souza');
  });

  it('lead do Instagram não entra no disparo automático do WhatsApp', async () => {
    await carrega();
    const bela = leads().find((l) => l.usuarioInstagram === 'studio.bela');
    assert.equal(D.elegivelAuto(bela, Q.qualificaLead(bela)), false);
  });
});
