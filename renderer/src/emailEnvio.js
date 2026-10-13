/**
 * Envio de um e-mail de template, pelo caminho que existir: pelo Gmail deste
 * computador (app instalado com a conta configurada) ou pela nuvem da Grow+
 * (web, com a conta guardada no cofre). Depois de enviar, guarda no histórico
 * e marca o lead como abordado por e-mail, o que já o coloca no Kanban.
 */
import { enviarEmailPelaNuvem, lerEmpresa } from './nuvem';
import { registraEnviado } from './emailTemplates';
import { aplicaStatus } from './statusLead';

const CHAVE_LOG = 'sigma_abordagem_log';

export const temComputador = () => typeof window !== 'undefined' && typeof window.emailAPI?.enviarUm === 'function';

/** Conta do Gmail deste computador (sem senha), ou null. */
export async function contaDoComputador() {
  if (!temComputador()) return null;
  try {
    const r = await window.emailAPI.getSettings();
    return r?.success && r.settings?.user && r.settings.temSenha ? r.settings : null;
  } catch {
    return null;
  }
}

/** 'computador', 'web' ou '' (nenhum caminho configurado ainda). */
export async function viaDeEnvio(contaWeb) {
  if (await contaDoComputador()) return 'computador';
  if (lerEmpresa()?.id && contaWeb) return 'web';
  return '';
}

export async function enviaEmail({ lead = null, para, assunto, html, texto, templateId = '', via }) {
  const r = via === 'computador'
    ? await window.emailAPI.enviarUm({ para, assunto, html, texto })
    : await enviarEmailPelaNuvem({ para, assunto, html, texto });
  if (!r?.success) throw new Error(r?.error || 'O e-mail não saiu. Tente de novo.');

  registraEnviado({ leadId: lead?.id != null ? String(lead.id) : '', para, empresa: lead?.name || '', assunto, templateId, via });

  // Primeira abordagem do lead: entra no funil como enviada por e-mail.
  if (lead?.id != null) {
    try {
      const log = JSON.parse(localStorage.getItem(CHAVE_LOG) || '{}') || {};
      if (!log[String(lead.id)]) {
        localStorage.setItem(CHAVE_LOG, JSON.stringify(aplicaStatus(log, lead, 'enviada', new Date(), 'email')));
      }
    } catch { /* registro ilegível: o histórico de e-mails já guardou o envio */ }
  }
  window.dispatchEvent(new Event('sigma:leads-updated'));
  return r;
}
