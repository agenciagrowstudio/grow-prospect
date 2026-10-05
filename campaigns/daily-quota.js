/**
 * Controle de cota de mensagens (janela móvel de 24h) por número WhatsApp.
 * Persistido em userData para sobreviver a reinícios do app.
 */
const path = require('path');
const fs = require('fs');

const LIMIT_TIERS = [10, 30, 60, 100];
const WINDOW_MS = 24 * 60 * 60 * 1000;

function todayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

class DailyQuota {
  constructor(userDataPath, fileName = 'whatsapp-daily-quota.json') {
    this.filePath = path.join(userDataPath, fileName);
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        if (raw && typeof raw === 'object') return raw;
      }
    } catch (e) {
      console.log('[DAILY-QUOTA] load error:', e.message);
    }
    return { date: todayKey(), byConnection: {} };
  }

  _save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, this.filePath);
    } catch (e) {
      console.log('[DAILY-QUOTA] save error:', e.message);
    }
  }

    /**
   * Janela móvel de 24h: cada envio ocupa uma vaga por 24h e a vaga volta
   * exatamente 24h depois dele, em vez de zerar à meia-noite. Migra o formato
   * antigo (contador por dia) tratando o que já foi enviado como enviado agora,
   * que é o caminho conservador.
   */
  _roll(now = Date.now()) {
    const by = this.data.byConnection || (this.data.byConnection = {});
    let changed = false;
    for (const id of Object.keys(by)) {
      let list = by[id];
      if (!Array.isArray(list)) {
        list = Array.from({ length: Math.max(0, Number(list) || 0) }, () => now);
        changed = true;
      }
      const fresh = list.filter((t) => now - t < WINDOW_MS);
      if (fresh.length !== list.length) changed = true;
      if (fresh.length) by[id] = fresh;
      else {
        delete by[id];
        changed = true;
      }
    }
    this.data.date = todayKey(now);
    if (changed) this._save();
  }

  getUsage(connectionId, now = Date.now()) {
    this._roll(now);
    if (!connectionId) return 0;
    return (this.data.byConnection[connectionId] || []).length;
  }

  /** Quando a próxima vaga volta, ou null se ainda há vaga. */
  _nextFreeAt(connectionId, limit, now) {
    const list = this.data.byConnection[connectionId] || [];
    if (list.length < limit) return null;
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[list.length - limit] + WINDOW_MS;
  }

  getAllUsage(now = Date.now()) {
    this._roll(now);
    const byConnection = {};
    for (const [id, list] of Object.entries(this.data.byConnection)) {
      byConnection[id] = list.length;
    }
    return { date: this.data.date, windowMs: WINDOW_MS, byConnection };
  }

  /**
   * @returns {{ unlimited: boolean, limit: number|null, used: number, remaining: number|null, allowed: boolean, nextFreeAt: number|null }}
   */
  check(connectionId, campaignSettings, now = Date.now()) {
    const cfg = campaignSettings || {};
    const unlimited = !!cfg.manualUnlimited;
    const limit = unlimited
      ? null
      : Number(cfg.dailyLimit) > 0
        ? Number(cfg.dailyLimit)
        : 10;
    const used = this.getUsage(connectionId, now);
    if (unlimited) {
      return { unlimited: true, limit: null, used, remaining: null, allowed: true, nextFreeAt: null };
    }
    const remaining = Math.max(0, limit - used);
    return {
      unlimited: false,
      limit,
      used,
      remaining,
      allowed: remaining > 0,
      nextFreeAt: remaining > 0 ? null : this._nextFreeAt(connectionId, limit, now),
    };
  }

  /** Registra o envio confirmado. */
  recordSend(connectionId, count = 1, now = Date.now()) {
    if (!connectionId) return this.getUsage(connectionId, now);
    this._roll(now);
    const list = this.data.byConnection[connectionId] || (this.data.byConnection[connectionId] = []);
    for (let i = 0; i < Math.max(1, count); i++) list.push(now);
    this._save();
    return list.length;
  }

  /**
   * Resolve o limite efetivo a partir das settings do app.
   * Tiers progressivos: 10 → 30 → 60 → 100; manualUnlimited ignora teto.
   */
  static resolveLimitConfig(settingsCampaigns) {
    const c = settingsCampaigns || {};
    if (c.manualUnlimited) {
      return { manualUnlimited: true, dailyLimit: null };
    }
    let limit = Number(c.dailyLimit);
    if (!LIMIT_TIERS.includes(limit)) limit = 10;
    const unlocked = Array.isArray(c.unlockedLimits)
      ? c.unlockedLimits.map(Number).filter((n) => LIMIT_TIERS.includes(n))
      : [10];
    if (!unlocked.includes(10)) unlocked.unshift(10);
    // Se o limite escolhido não está desbloqueado, usa o maior desbloqueado
    if (!unlocked.includes(limit)) {
      limit = Math.max(...unlocked);
    }
    return { manualUnlimited: false, dailyLimit: limit, unlockedLimits: unlocked };
  }
}

module.exports = { DailyQuota, LIMIT_TIERS, WINDOW_MS, todayKey };
