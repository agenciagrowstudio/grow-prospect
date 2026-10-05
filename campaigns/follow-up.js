/**
 * Follow-up da campanha: mensagens extras para quem recebeu a abordagem e não
 * respondeu. É opt-in por campanha. Sem configuração, a campanha envia só a
 * abordagem e o resto da conversa é do usuário.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STEPS = 3;
const ELIGIBLE_STATUS = ['sent', 'delivered', 'read'];

function normalizeFollowUp(input) {
  const steps = (Array.isArray(input?.steps) ? input.steps : [])
    .map((s) => ({
      afterDays: Math.min(30, Math.max(1, Math.round(Number(s?.afterDays)) || 2)),
      text: String(s?.text || '').trim(),
    }))
    .filter((s) => s.text)
    .slice(0, MAX_STEPS);
  return { enabled: !!input?.enabled && steps.length > 0, steps };
}

function lastContactAt(lead) {
  return Number(lead.followUpSentAt || lead.sentAt || 0);
}

/**
 * @returns {{ due: number[], waiting: boolean }} índices dos leads com follow-up
 * vencido agora, e se ainda existem follow-ups futuros para esperar.
 */
function planFollowUps(campaign, now = Date.now()) {
  const cfg = normalizeFollowUp(campaign?.followUp);
  const result = { due: [], waiting: false };
  if (!cfg.enabled) return result;
  (campaign.leads || []).forEach((lead, idx) => {
    if (!ELIGIBLE_STATUS.includes(lead.status) || lead.repliedAt) return;
    const step = cfg.steps[Number(lead.followUpCount || 0)];
    if (!step || !lead.sentAt) return;
    if (now >= lastContactAt(lead) + step.afterDays * DAY_MS) result.due.push(idx);
    else result.waiting = true;
  });
  return result;
}

module.exports = { normalizeFollowUp, planFollowUps, DAY_MS, MAX_STEPS };
