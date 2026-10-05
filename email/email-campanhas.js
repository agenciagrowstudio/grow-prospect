/**
 * Campanhas de e-mail: abordagem por público (português ou inglês), follow-up
 * opcional como resposta na mesma conversa, cota em janela móvel de 24h,
 * horário comercial e leitura da caixa de entrada para parar em quem
 * respondeu, pediu para sair ou cujo e-mail voltou.
 *
 * Depende do Gmail só pela interface { enviar, lerRecebidas, traduzErro }, o
 * que deixa o motor testável sem rede.
 */
const fs = require('fs');
const path = require('path');
const { DailyQuota } = require('../campaigns/daily-quota');
const { resolveVar, resolveSpintax } = require('../campaigns/template-engine');
const { PUBLICOS, publicoDoLead, rodape, PALAVRAS_DESCADASTRO } = require('./publico');
const { primeiroEmail } = require('../utils/emails-site');

const DAY_MS = 24 * 60 * 60 * 1000;
const COTA_ID = 'gmail';
const INTERVALO_MIN_S = 45;
const LEITURA_MS = 10 * 60 * 1000;

function preenche(texto, lead) {
  const base = String(texto || '').replace(/\{\{(\w+)\}\}/g, (_, v) => resolveVar(v, lead));
  return resolveSpintax(base).replace(/[ \t]+\n/g, '\n').trim();
}

function emailValido(e) {
  return /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(String(e || '').trim());
}

function normalizaModelos(input = {}) {
  const modelos = {};
  for (const id of Object.keys(PUBLICOS)) {
    const m = input[id] || {};
    modelos[id] = {
      assunto: String(m.assunto || '').slice(0, 200),
      corpo: String(m.corpo || '').slice(0, 8000),
      followUps: (Array.isArray(m.followUps) ? m.followUps : [])
        .slice(0, 2)
        .map((t) => String(t || '').slice(0, 4000)),
    };
  }
  return modelos;
}

/** Dia útil e dentro do horário configurado, no relógio desta máquina. */
function dentroDoHorario(cfg, now) {
  const d = new Date(now);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const ini = cfg.horarioInicio || '08:00';
  const fim = cfg.horarioFim || '18:00';
  const diaUtil = d.getDay() !== 0 && d.getDay() !== 6;
  return diaUtil && hhmm >= ini && hhmm < fim;
}

/** Tira cabeçalhos e texto citado, para o "unsubscribe" do nosso rodapé não contar como pedido. */
function corpoSemCitacao(fonte) {
  const corpo = String(fonte || '').split(/\r?\n\r?\n/).slice(1).join('\n\n');
  const linhas = [];
  for (const linha of corpo.split(/\r?\n/)) {
    if (/^>/.test(linha) || /^(On|Em) .+(wrote|escreveu):?\s*$/i.test(linha)) break;
    if (/^--\s*$/.test(linha)) break;
    linhas.push(linha);
  }
  return linhas.join('\n');
}

class EmailCampanhas {
  /**
   * @param {string} userDataPath
   * @param {{ settings: object, gmail: object, onProgresso?: Function, now?: () => number }} deps
   */
  constructor(userDataPath, deps) {
    this.filePath = path.join(userDataPath, 'email-campaigns.json');
    this.supressaoPath = path.join(userDataPath, 'email-suppression.json');
    this.settings = deps.settings;
    this.gmail = deps.gmail;
    this.onProgresso = deps.onProgresso || (() => {});
    this.now = deps.now || (() => Date.now());
    this.cota = new DailyQuota(userDataPath, 'email-quota.json');
    this.campanhas = this._ler(this.filePath, {});
    this.supressao = new Set(this._ler(this.supressaoPath, []));
    this._ultimoEnvio = 0;
    this._ultimaLeitura = 0;
    this._ocupado = false;
    this._timer = null;
  }

  _ler(arquivo, padrao) {
    try {
      if (fs.existsSync(arquivo)) return JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
    } catch (e) {
      console.log('[EMAIL] erro ao ler', path.basename(arquivo), e.message);
    }
    return padrao;
  }

  _gravar() {
    const escreve = (arquivo, dados) => {
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(`${arquivo}.tmp`, JSON.stringify(dados, null, 2), { mode: 0o600 });
      fs.renameSync(`${arquivo}.tmp`, arquivo);
    };
    escreve(this.filePath, this.campanhas);
    escreve(this.supressaoPath, [...this.supressao]);
  }

  // ---------- cadastro ----------

  criar(dados = {}) {
    const vistos = new Set();
    const leads = [];
    for (const l of Array.isArray(dados.leads) ? dados.leads.slice(0, 5000) : []) {
      // O scraper grava até três e-mails, do melhor para o pior; vale o primeiro.
      const email = primeiroEmail(l.email);
      if (!emailValido(email) || vistos.has(email)) continue;
      vistos.add(email);
      leads.push({
        leadId: String(l.leadId || l.id || email),
        email,
        name: String(l.name || l.company || '').slice(0, 160),
        category: String(l.category || '').slice(0, 120),
        website: String(l.website || '').slice(0, 300),
        address: String(l.address || '').slice(0, 300),
        publico: publicoDoLead(l),
        status: 'pending',
      });
    }
    if (!leads.length) throw new Error('Nenhum lead com e-mail válido.');

    const modelos = normalizaModelos(dados.modelos);
    const usados = [...new Set(leads.map((l) => l.publico))];
    const faltando = usados.filter((p) => !modelos[p].assunto.trim() || !modelos[p].corpo.trim());
    if (faltando.length) {
      throw new Error(`Escreva assunto e mensagem para: ${faltando.map((p) => PUBLICOS[p].nome).join(', ')}.`);
    }

    const dias = (Array.isArray(dados.followUpDias) ? dados.followUpDias : [3, 7])
      .slice(0, 2)
      .map((d) => Math.min(30, Math.max(1, Math.round(Number(d)) || 3)));
    const id = `mail_${this.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.campanhas[id] = {
      id,
      nome: String(dados.nome || 'Campanha de e-mail').slice(0, 160),
      status: 'ready',
      modelos,
      followUp: { ativo: !!dados.followUpAtivo, dias },
      intervaloS: Math.max(INTERVALO_MIN_S, Math.round(Number(dados.intervaloS) || 90)),
      leads,
      criadaEm: this.now(),
      motivoEspera: null,
    };
    this._gravar();
    return this.resumo(this.campanhas[id]);
  }

  /** E-mails que já receberam abordagem, com a mais recente, e quem está na supressão. */
  jaAbordados(emails = []) {
    const resultado = {};
    const alvo = new Set(emails.map((e) => primeiroEmail(e)).filter(Boolean));
    for (const c of Object.values(this.campanhas)) {
      for (const l of c.leads) {
        if (!alvo.has(l.email) || !l.sentAt) continue;
        const atual = resultado[l.email];
        if (!atual || l.sentAt > atual.quando) {
          resultado[l.email] = { canal: 'email', campanha: c.nome, quando: l.sentAt, respondeu: !!l.repliedAt };
        }
      }
    }
    for (const e of alvo) {
      if (this.supressao.has(e)) resultado[e] = { ...(resultado[e] || { canal: 'email' }), bloqueado: true };
    }
    return resultado;
  }

  listar() {
    return Object.values(this.campanhas)
      .sort((a, b) => b.criadaEm - a.criadaEm)
      .map((c) => this.resumo(c));
  }

  obter(id) {
    const c = this.campanhas[id];
    return c ? { ...this.resumo(c), leads: c.leads, modelos: c.modelos } : null;
  }

  resumo(c) {
    const conta = (fn) => c.leads.filter(fn).length;
    return {
      id: c.id,
      nome: c.nome,
      status: c.status,
      motivoEspera: c.motivoEspera,
      followUp: c.followUp,
      intervaloS: c.intervaloS,
      criadaEm: c.criadaEm,
      porPublico: Object.fromEntries(Object.keys(PUBLICOS).map((p) => [p, conta((l) => l.publico === p)])),
      total: c.leads.length,
      enviados: conta((l) => l.sentAt),
      pendentes: conta((l) => l.status === 'pending'),
      respondidos: conta((l) => l.repliedAt),
      descadastrados: conta((l) => l.status === 'unsubscribed'),
      voltaram: conta((l) => l.status === 'bounced'),
      falhas: conta((l) => l.status === 'failed'),
      followUps: c.leads.reduce((s, l) => s + Number(l.followUpCount || 0), 0),
    };
  }

  iniciar(id) {
    const c = this.campanhas[id];
    if (!c) throw new Error('Campanha não encontrada.');
    if (!this.settings.pronta()) {
      throw new Error('Configure a conta Gmail (e-mail, senha de app e endereço) antes de iniciar.');
    }
    c.status = 'running';
    c.motivoEspera = null;
    this._gravar();
    this.ligar();
    return this.resumo(c);
  }

  pausar(id) {
    const c = this.campanhas[id];
    if (!c) throw new Error('Campanha não encontrada.');
    c.status = 'paused';
    c.motivoEspera = null;
    this._gravar();
    return this.resumo(c);
  }

  excluir(id) {
    delete this.campanhas[id];
    this._gravar();
  }

  // ---------- motor ----------

  ligar() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this.tick().catch((e) => console.log('[EMAIL] tick:', e.message));
    }, 15 * 1000);
    if (this._timer.unref) this._timer.unref();
  }

  desligar() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  /** Retoma campanhas que estavam rodando quando o app fechou. */
  retomar() {
    if (Object.values(this.campanhas).some((c) => c.status === 'running')) this.ligar();
  }

  /** Abordagem primeiro; follow-up só quando não resta ninguém a abordar. */
  _proximo(c, now) {
    const pend = c.leads.findIndex((l) => l.status === 'pending' && !this.supressao.has(l.email));
    if (pend >= 0) return { indice: pend, followUp: false };
    if (!c.followUp?.ativo) return null;
    let esperando = false;
    for (let i = 0; i < c.leads.length; i++) {
      const l = c.leads[i];
      if (l.status !== 'sent' || l.repliedAt || this.supressao.has(l.email)) continue;
      const passo = Number(l.followUpCount || 0);
      const texto = c.modelos[l.publico]?.followUps?.[passo];
      const dias = c.followUp.dias[passo];
      if (!texto || !texto.trim() || !dias) continue;
      const desde = Number(l.followUpSentAt || l.sentAt);
      if (now >= desde + dias * DAY_MS) return { indice: i, followUp: true };
      esperando = true;
    }
    return esperando ? { esperando: true } : null;
  }

  _espera(c, motivo) {
    if (c.motivoEspera === motivo) return;
    c.motivoEspera = motivo;
    this._gravar();
    this.onProgresso(c.id, 'espera', { motivo });
  }

  async tick() {
    if (this._ocupado) return;
    this._ocupado = true;
    try {
      const now = this.now();
      if (now - this._ultimaLeitura >= LEITURA_MS) {
        await this.lerRespostas().catch((e) => console.log('[EMAIL] leitura:', e.message));
      }

      const ativas = Object.values(this.campanhas).filter((c) => c.status === 'running');
      if (!ativas.length) {
        this.desligar();
        return;
      }
      const cfg = { ...this.settings.data, senha: this.settings.senha() };
      // Um envio por vez para a conta inteira, com intervalo e variação.
      const intervalo = Math.min(...ativas.map((c) => c.intervaloS)) * 1000;
      const jitter = 0.7 + Math.random() * 0.6;
      if (this._ultimoEnvio && now - this._ultimoEnvio < intervalo * jitter) return;

      for (const c of ativas) {
        if (!dentroDoHorario(cfg, now)) {
          this._espera(c, 'fora_do_horario');
          continue;
        }
        const alvo = this._proximo(c, now);
        if (!alvo) {
          c.status = 'completed';
          c.motivoEspera = null;
          this._gravar();
          this.onProgresso(c.id, 'concluida', this.resumo(c));
          continue;
        }
        if (alvo.esperando) {
          this._espera(c, 'aguardando_follow_up');
          continue;
        }
        if (!this.cota.check(COTA_ID, { dailyLimit: cfg.limite24h }, now).allowed) {
          this._espera(c, 'limite_24h');
          continue;
        }
        await this._enviar(c, alvo, cfg, now);
        return;
      }
    } finally {
      this._ocupado = false;
    }
  }

  async _enviar(c, alvo, cfg, now) {
    const lead = c.leads[alvo.indice];
    const modelo = c.modelos[lead.publico];
    const passo = Number(lead.followUpCount || 0);
    const corpo = alvo.followUp ? modelo.followUps[passo] : modelo.corpo;
    const assuntoBase = preenche(modelo.assunto, lead);
    const assinatura = rodape(lead.publico, { remetente: cfg.fromName || cfg.user, endereco: cfg.endereco });
    const texto = `${preenche(corpo, lead)}\n\n${assinatura}`;
    this._ultimoEnvio = now;
    try {
      const r = await this.gmail.enviar(cfg, {
        para: lead.email,
        assunto: alvo.followUp ? `Re: ${lead.assunto || assuntoBase}` : assuntoBase,
        texto,
        emRespostaA: alvo.followUp ? lead.messageId : null,
      });
      this.cota.recordSend(COTA_ID, 1, now);
      if (alvo.followUp) {
        lead.followUpCount = passo + 1;
        lead.followUpSentAt = now;
      } else {
        lead.status = 'sent';
        lead.sentAt = now;
        lead.messageId = r.messageId;
        lead.assunto = assuntoBase;
      }
      lead.erro = null;
    } catch (e) {
      const erro = this.gmail.traduzErro ? this.gmail.traduzErro(e) : e.message;
      if (alvo.followUp) {
        lead.followUpCount = passo + 1;
        lead.followUpSentAt = now;
      } else {
        lead.status = 'failed';
      }
      lead.erro = erro;
      // Bloqueio do próprio Gmail: parar é melhor que insistir.
      if (/limite diário/i.test(erro)) c.status = 'paused';
    }
    c.motivoEspera = null;
    this._gravar();
    this.onProgresso(c.id, 'enviado', this.resumo(c));
  }

  /**
   * Lê a caixa de entrada e marca respostas, pedidos de descadastro e e-mails
   * que voltaram. Vale para todas as campanhas: quem responde a uma sai de
   * todas, e quem pede para sair nunca mais recebe.
   */
  async lerRespostas() {
    this._ultimaLeitura = this.now();
    const enviados = Object.values(this.campanhas).flatMap((c) => c.leads.filter((l) => l.sentAt));
    if (!enviados.length || !this.settings.pronta()) return { lidas: 0, mudou: 0 };
    const desde = Math.min(...enviados.map((l) => l.sentAt)) - DAY_MS;
    const cfg = { ...this.settings.data, senha: this.settings.senha() };
    const recebidas = await this.gmail.lerRecebidas(cfg, desde);

    const porEmail = new Map();
    for (const l of enviados) {
      if (!porEmail.has(l.email)) porEmail.set(l.email, []);
      porEmail.get(l.email).push(l);
    }

    let mudou = 0;
    for (const m of recebidas) {
      if (/mailer-daemon|postmaster/i.test(m.de)) {
        const texto = m.trecho.toLowerCase();
        for (const [email, leads] of porEmail) {
          if (!texto.includes(email)) continue;
          for (const l of leads) {
            if (l.status === 'bounced' || m.data < l.sentAt) continue;
            l.status = 'bounced';
            mudou++;
          }
          this.supressao.add(email);
        }
        continue;
      }
      const leads = porEmail.get(m.de);
      if (!leads) continue;
      const sair = PALAVRAS_DESCADASTRO.test(`${m.assunto}\n${corpoSemCitacao(m.trecho)}`);
      for (const l of leads) {
        if (m.data < l.sentAt) continue;
        if (!l.repliedAt) {
          l.repliedAt = m.data;
          mudou++;
        }
        if (sair && l.status !== 'unsubscribed') {
          l.status = 'unsubscribed';
          mudou++;
        }
      }
      if (sair) this.supressao.add(m.de);
    }
    if (mudou) {
      this._gravar();
      this.onProgresso(null, 'respostas', { mudou });
    }
    return { lidas: recebidas.length, mudou };
  }
}

module.exports = { EmailCampanhas, preenche, dentroDoHorario, corpoSemCitacao, emailValido };
