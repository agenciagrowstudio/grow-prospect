/**
 * Conexão com o Gmail: SMTP para enviar e IMAP para ler respostas, ambos com a
 * mesma senha de app. Custo zero; o limite do Gmail comum é de 500 envios por
 * dia, e o app fica bem abaixo disso por padrão.
 */
const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');

function transporte(cfg) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: cfg.user, pass: cfg.senha },
  });
}

async function enviar(cfg, { para, assunto, texto, emRespostaA }) {
  const headers = {
    // Botão "cancelar inscrição" do próprio Gmail/Outlook, por resposta.
    'List-Unsubscribe': `<mailto:${cfg.user}?subject=unsubscribe>`,
  };
  const info = await transporte(cfg).sendMail({
    from: cfg.fromName ? { name: cfg.fromName, address: cfg.user } : cfg.user,
    to: para,
    subject: assunto,
    text: texto,
    headers,
    ...(emRespostaA ? { inReplyTo: emRespostaA, references: [emRespostaA] } : {}),
  });
  return { messageId: info.messageId };
}

function imap(cfg) {
  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.senha },
    logger: false,
  });
}

/** Testa SMTP e IMAP. Devolve a primeira falha em português. */
async function testar(cfg) {
  try {
    await transporte(cfg).verify();
  } catch (e) {
    return { success: false, error: traduzErro(e) };
  }
  const cliente = imap(cfg);
  try {
    await cliente.connect();
    await cliente.logout();
  } catch (e) {
    return { success: false, error: `Envio ok, mas a leitura de respostas falhou: ${traduzErro(e)}` };
  }
  return { success: true };
}

/**
 * Mensagens recebidas desde `desde`: remetente, assunto e o começo do texto.
 * O começo basta para achar "SAIR"/"unsubscribe" e o endereço que voltou num
 * aviso de falha de entrega.
 */
async function lerRecebidas(cfg, desde) {
  const cliente = imap(cfg);
  const recebidas = [];
  await cliente.connect();
  try {
    const trava = await cliente.getMailboxLock('INBOX');
    try {
      for await (const msg of cliente.fetch(
        { since: new Date(desde) },
        { envelope: true, source: { start: 0, maxLength: 6000 } },
      )) {
        recebidas.push({
          de: String(msg.envelope?.from?.[0]?.address || '').toLowerCase(),
          assunto: String(msg.envelope?.subject || ''),
          trecho: msg.source ? msg.source.toString('utf-8') : '',
          data: msg.envelope?.date ? new Date(msg.envelope.date).getTime() : Date.now(),
        });
      }
    } finally {
      trava.release();
    }
  } finally {
    await cliente.logout().catch(() => {});
  }
  return recebidas;
}

function traduzErro(e) {
  const msg = String(e?.response || e?.message || e);
  if (/535|Invalid login|AUTHENTICATIONFAILED|Username and Password not accepted/i.test(msg)) {
    return 'O Gmail recusou o login. Confira o e-mail e use uma senha de app (não a senha normal da conta).';
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return 'Sem conexão com o Gmail. Verifique a internet.';
  }
  if (/limit|quota|550 5\.4\.5/i.test(msg)) {
    return 'O Gmail bloqueou envios por limite diário. Tente de novo amanhã.';
  }
  return msg.slice(0, 300);
}

module.exports = { enviar, testar, lerRecebidas, traduzErro };
