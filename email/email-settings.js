/**
 * Conta de envio (Gmail com senha de app). A senha de app é cifrada com o
 * safeStorage do Electron, que usa o cofre do Windows. Sem safeStorage (testes),
 * fica em texto puro, só nesta máquina.
 */
const fs = require('fs');
const path = require('path');

const PADRAO = {
  user: '',
  fromName: '',
  endereco: '',
  // Conta nova de Gmail com e-mail frio: começar baixo protege a reputação.
  limite24h: 40,
  horarioInicio: '08:00',
  horarioFim: '18:00',
  senhaCifrada: '',
  senhaPura: '',
};

function cofre() {
  try {
    const { safeStorage } = require('electron');
    return safeStorage && safeStorage.isEncryptionAvailable() ? safeStorage : null;
  } catch {
    return null;
  }
}

class EmailSettings {
  constructor(userDataPath) {
    this.filePath = path.join(userDataPath, 'email-settings.json');
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return { ...PADRAO, ...JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) };
      }
    } catch (e) {
      console.log('[EMAIL] erro ao ler configuração:', e.message);
    }
    return { ...PADRAO };
  }

  _save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.filePath);
  }

  senha() {
    const c = cofre();
    if (this.data.senhaCifrada && c) {
      try {
        return c.decryptString(Buffer.from(this.data.senhaCifrada, 'base64'));
      } catch {
        return '';
      }
    }
    return this.data.senhaPura || '';
  }

  /** O que a tela pode ver: nunca a senha, só se ela existe. */
  publico() {
    const { senhaCifrada, senhaPura, ...resto } = this.data;
    return { ...resto, temSenha: !!(senhaCifrada || senhaPura) };
  }

  atualizar(patch = {}) {
    const limite = Math.round(Number(patch.limite24h ?? this.data.limite24h));
    this.data = {
      ...this.data,
      user: String(patch.user ?? this.data.user).trim().slice(0, 200),
      fromName: String(patch.fromName ?? this.data.fromName).trim().slice(0, 120),
      endereco: String(patch.endereco ?? this.data.endereco).trim().slice(0, 300),
      limite24h: Math.min(450, Math.max(5, Number.isFinite(limite) ? limite : PADRAO.limite24h)),
      horarioInicio: /^\d{2}:\d{2}$/.test(patch.horarioInicio || '') ? patch.horarioInicio : this.data.horarioInicio,
      horarioFim: /^\d{2}:\d{2}$/.test(patch.horarioFim || '') ? patch.horarioFim : this.data.horarioFim,
    };
    // Senha só muda quando vem preenchida; campo vazio mantém a atual.
    const nova = String(patch.senha || '').replace(/\s+/g, '');
    if (nova) {
      const c = cofre();
      if (c) {
        this.data.senhaCifrada = c.encryptString(nova).toString('base64');
        this.data.senhaPura = '';
      } else {
        this.data.senhaPura = nova;
        this.data.senhaCifrada = '';
      }
    }
    this._save();
    return this.publico();
  }

  pronta() {
    return !!(this.data.user && this.senha() && this.data.endereco);
  }
}

module.exports = { EmailSettings };
