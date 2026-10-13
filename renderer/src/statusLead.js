/**
 * Estado do lead na prospecção. Fica no mesmo registro da Fila do dia
 * (sigma_abordagem_log, por id do lead), então mudar aqui ou na Fila dá no
 * mesmo: quem está "Sem interesse" sai da Fila e dos follow-ups.
 */
import { chaveDoDia } from './abordagem.js';

export const STATUS_LEAD = [
  { id: 'novo', nome: 'Para abordar', dica: 'Ainda não contatado. Entra na Fila do dia.' },
  { id: 'enviada', nome: 'Mensagem enviada', dica: 'Aguardando resposta. Recebe os follow-ups.' },
  { id: 'respondeu', nome: 'Respondeu', dica: 'Conversa em andamento.' },
  { id: 'sem_interesse', nome: 'Sem interesse', dica: 'Não precisa dos serviços. Sai da Fila e dos follow-ups.' },
  { id: 'sem_whatsapp', nome: 'Sem WhatsApp', dica: 'O número não tem WhatsApp. Sai da Fila.' },
  { id: 'pulada', nome: 'Pulado', dica: 'Fica fora da Fila por enquanto.' },
];

const IDS = new Set(STATUS_LEAD.map((s) => s.id));
// Ordem para ordenar a coluna: do que pede ação ao que já foi resolvido.
const ORDEM = { respondeu: 5, enviada: 4, novo: 3, pulada: 2, sem_whatsapp: 1, sem_interesse: 0 };

export const nomeDoStatus = (id) => STATUS_LEAD.find((s) => s.id === id)?.nome || 'Para abordar';
export const ordemDoStatus = (id) => ORDEM[id] ?? 3;

/**
 * O que vale: a marcação da Fila (ou feita na Base); sem ela, o histórico das
 * campanhas de WhatsApp (enviou, respondeu); sem nada, "Para abordar".
 */
export function statusDoLead(id, log = {}, historico = []) {
  const marcado = log?.[String(id)]?.status;
  if (IDS.has(marcado)) return marcado;
  if (historico.some((e) => e.k === 'reply')) return 'respondeu';
  if (historico.some((e) => e.k === 'sent')) return 'enviada';
  return 'novo';
}

/**
 * Novo registro da Fila com o estado escolhido. "Para abordar" apaga a
 * marcação (o lead volta para a Fila). Mudar o estado não apaga o que já
 * estava guardado (texto enviado, follow-ups feitos).
 */
export function aplicaStatus(log = {}, lead = {}, status, agora = new Date(), canal = '') {
  const chave = String(lead.id);
  const proximo = { ...log };
  if (status === 'novo' || !IDS.has(status)) {
    delete proximo[chave];
    return proximo;
  }
  const antes = log[chave];
  proximo[chave] = {
    ...(antes || { dia: chaveDoDia(agora), ts: agora.getTime(), nome: lead.name || '', texto: '', origem: 'base' }),
    status,
    alteradoEm: agora.getTime(),
    // Por onde foi o contato (WhatsApp, Instagram, e-mail, ligação...).
    ...(canal ? { canal } : {}),
  };
  return proximo;
}
