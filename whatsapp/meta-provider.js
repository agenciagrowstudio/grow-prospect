const { WhatsAppProvider } = require('./provider');
const { AuthStore } = require('./auth-store');

/**
 * WhatsApp pela API oficial da Meta (Cloud API).
 *
 * Regra da Meta que manda em tudo aqui: a empresa só inicia conversa com um
 * modelo de mensagem aprovado (template). Texto livre só é aceito nas 24h
 * seguintes a uma mensagem do cliente. Por isso a abordagem de campanha usa
 * sendTemplate, e sendMessage serve para responder quem escreveu.
 *
 * Respostas e confirmações de leitura chegam à Meta por webhook, que exige um
 * endereço público na internet. Este app roda só no computador, então não as
 * recebe. Com a "coexistência" da Meta, o mesmo número segue no app WhatsApp
 * Business do celular, e é lá que as respostas aparecem.
 */
const VERSAO = 'v21.0';
const GRAPH = `https://graph.facebook.com/${VERSAO}`;

function cofre() {
  try {
    const { safeStorage } = require('electron');
    return safeStorage && safeStorage.isEncryptionAvailable() ? safeStorage : null;
  } catch {
    return null;
  }
}

/** Grava o token cifrado com o cofre do Windows; sem cofre (testes), puro. */
function salvaConfig(store, { phoneNumberId, accessToken, wabaId }) {
  const c = cofre();
  store.saveMetaConfig({
    phoneNumberId,
    wabaId: wabaId || '',
    ...(c
      ? { tokenCifrado: c.encryptString(accessToken).toString('base64') }
      : { accessToken }),
  });
}

function lerConfig(store) {
  const cfg = store.loadMetaConfig();
  if (!cfg) return null;
  let accessToken = cfg.accessToken || '';
  const c = cofre();
  if (cfg.tokenCifrado && c) {
    try {
      accessToken = c.decryptString(Buffer.from(cfg.tokenCifrado, 'base64'));
    } catch {
      accessToken = '';
    }
  }
  return { phoneNumberId: cfg.phoneNumberId, wabaId: cfg.wabaId || '', accessToken };
}

/** A Cloud API quer só os dígitos com DDI: "5521999990000". */
function soDigitos(destino) {
  return String(destino || '').split('@')[0].replace(/\D/g, '');
}

function textoDe(message) {
  if (typeof message === 'string') return message;
  return String(message?.text || message?.caption || '');
}

function traduzErroMeta(json, status) {
  const e = json?.error || {};
  const code = Number(e.code);
  if (code === 131047 || code === 470) {
    return 'A Meta só aceita texto livre até 24h depois da última mensagem do cliente. Para abordar, use um modelo aprovado.';
  }
  if (code === 190) return 'Token da Meta inválido ou expirado. Gere um token permanente de usuário do sistema.';
  if (code === 132001) return 'Modelo não encontrado ou não aprovado para esse idioma.';
  if (code === 132000) return 'O número de variáveis não bate com o modelo aprovado.';
  if (code === 131026) return 'Esse número não tem WhatsApp ou não pode receber a mensagem.';
  if (code === 131056 || code === 130429) return 'Limite de envio da Meta atingido. Tente mais tarde.';
  return e.error_user_msg || e.message || `Erro da Meta (HTTP ${status})`;
}

class MetaProvider extends WhatsAppProvider {
  constructor(config, onStatus, userDataPath, fetchFn = fetch) {
    super(config, onStatus);
    this.authStore = new AuthStore(userDataPath);
    const salvo = lerConfig(this.authStore) || {};
    this.phoneNumberId = String(config?.phoneNumberId || salvo.phoneNumberId || '').trim();
    this.accessToken = String(config?.accessToken || salvo.accessToken || '').trim();
    this.wabaId = String(config?.wabaId || salvo.wabaId || '').trim();
    this.fetch = fetchFn;
    this._status = 'disconnected';
    this._telefone = null;
  }

  async _chamar(caminho, opcoes = {}) {
    const resp = await this.fetch(`${GRAPH}/${caminho}`, {
      ...opcoes,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(opcoes.headers || {}),
      },
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(traduzErroMeta(json, resp.status));
    return json;
  }

  async connect() {
    if (!this.phoneNumberId || !this.accessToken) {
      const msg = 'Informe o ID do número e o token da Meta.';
      this._status = 'error';
      this.onStatus('error', { error: msg });
      throw new Error(msg);
    }
    this._status = 'connecting';
    this.onStatus('connecting');
    try {
      const info = await this._chamar(`${this.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`);
      this._telefone = soDigitos(info.display_phone_number) || null;
      this.qualidade = info.quality_rating || null;
      this.nomeVerificado = info.verified_name || null;
      salvaConfig(this.authStore, { phoneNumberId: this.phoneNumberId, accessToken: this.accessToken, wabaId: this.wabaId });
      this._status = 'connected';
      this.onStatus('connected', { phoneNumber: this._telefone });
    } catch (err) {
      this._status = 'error';
      this.onStatus('error', { error: `Falha ao conectar na Meta: ${err.message}` });
      throw err;
    }
  }

  async disconnect() {
    this._status = 'disconnected';
    this.onStatus('disconnected');
  }

  getStatus() { return this._status; }
  isReady() { return this._status === 'connected'; }
  getPhoneNumber() { return this._telefone; }

  /** Texto livre. Só funciona dentro das 24h após mensagem do cliente. */
  async sendMessage(to, message) {
    if (!this.isReady()) return { success: false, error: 'Não conectado' };
    const body = textoDe(message);
    if (!body.trim()) return { success: false, error: 'Mensagem vazia' };
    try {
      const json = await this._chamar(`${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ messaging_product: 'whatsapp', to: soDigitos(to), type: 'text', text: { body } }),
      });
      return { success: true, messageId: json.messages?.[0]?.id, jid: soDigitos(to) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Modelo aprovado, o único jeito de iniciar conversa.
   * @param {{ nome: string, idioma: string, parametros: string[] }} modelo
   */
  async sendTemplate(to, modelo) {
    if (!this.isReady()) return { success: false, error: 'Não conectado' };
    const parametros = (modelo.parametros || []).map((t) => ({ type: 'text', text: String(t || '-').slice(0, 1000) }));
    try {
      const json = await this._chamar(`${this.phoneNumberId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: soDigitos(to),
          type: 'template',
          template: {
            name: modelo.nome,
            language: { code: modelo.idioma || 'pt_BR' },
            ...(parametros.length ? { components: [{ type: 'body', parameters: parametros }] } : {}),
          },
        }),
      });
      return { success: true, messageId: json.messages?.[0]?.id, jid: soDigitos(to) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /** Modelos aprovados da conta, para a tela escolher. Exige o ID da conta (WABA). */
  async listTemplates() {
    if (!this.wabaId) throw new Error('Informe o ID da conta do WhatsApp Business (WABA) para listar os modelos.');
    const json = await this._chamar(`${this.wabaId}/message_templates?status=APPROVED&limit=100&fields=name,language,category,components`);
    return (json.data || []).map((t) => {
      const corpo = (t.components || []).find((c) => c.type === 'BODY')?.text || '';
      const variaveis = (corpo.match(/\{\{\d+\}\}/g) || []).length;
      return { nome: t.name, idioma: t.language, categoria: t.category, corpo, variaveis };
    });
  }

  async sendMedia() {
    return { success: false, error: 'Mídia ainda não suportada na API oficial neste app' };
  }

  async sendAudio() {
    return { success: false, error: 'Áudio ainda não suportado na API oficial neste app' };
  }
}

module.exports = { MetaProvider, soDigitos, traduzErroMeta, lerConfig };
