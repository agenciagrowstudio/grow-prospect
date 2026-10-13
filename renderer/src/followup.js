/**
 * Follow-up da Fila do dia: quem recebeu a primeira mensagem e não respondeu
 * ganha até 3 mensagens de acompanhamento, em 2, 5 e 10 dias.
 *
 * A trava é dupla: o prazo da etapa (contado da primeira mensagem) e pelo
 * menos 24h depois da mensagem anterior. Cobrar rápido demais irrita, gera
 * denúncia e é um dos jeitos mais rápidos de ter o número bloqueado.
 *
 * Follow-up fica fora da meta diária: é extra.
 */

const HORA = 3600000;
const DIA = 24 * HORA;
export const DIAS_FOLLOWUP = [2, 5, 10];
export const INTERVALO_MINIMO = 24 * HORA;

/**
 * Próximo follow-up de um registro da Fila (sigma_abordagem_log).
 * @returns {null | {n: number, liberaEm: number, liberado: boolean}}
 */
export function proximoFollowup(registro, agora = Date.now()) {
  if (!registro || registro.status !== 'enviada' || !registro.ts) return null;
  const feitos = Array.isArray(registro.followups) ? registro.followups : [];
  if (feitos.length >= DIAS_FOLLOWUP.length) return null;
  const n = feitos.length + 1;
  const ultimo = feitos.length ? Number(feitos[feitos.length - 1].ts) || registro.ts : registro.ts;
  const liberaEm = Math.max(registro.ts + DIAS_FOLLOWUP[n - 1] * DIA, ultimo + INTERVALO_MINIMO);
  return { n, liberaEm, liberado: agora >= liberaEm };
}

/** "libera em 1d 4h", "libera em 5h 20min", "liberado". */
export function tempoAte(liberaEm, agora = Date.now()) {
  const falta = liberaEm - agora;
  if (falta <= 0) return 'liberado';
  const d = Math.floor(falta / DIA);
  const h = Math.floor((falta % DIA) / HORA);
  const m = Math.max(1, Math.floor((falta % HORA) / 60000));
  if (d > 0) return `libera em ${d}d${h ? ` ${h}h` : ''}`;
  if (h > 0) return `libera em ${h}h${m ? ` ${m}min` : ''}`;
  return `libera em ${m}min`;
}

/** Registro com o follow-up marcado como enviado. */
export function marcaFollowup(registro, texto, agora = Date.now()) {
  const feitos = Array.isArray(registro.followups) ? registro.followups : [];
  return { ...registro, followups: [...feitos, { n: feitos.length + 1, ts: agora, texto: texto || '' }] };
}

// Textos do roteiro de follow-up da Grow+ (lead que não respondeu), na ordem:
// follow-up leve, depois de três dias e último follow-up. O nome do cliente
// entra quando é conhecido; sem ele, fica "Oi!".
const oi = (nome, palavra) => `${palavra}${nome ? ` ${nome}` : ''}!`;

export const ETAPAS_FOLLOWUP = ['Follow-up leve', 'Retomando o contato', 'Último follow-up'];

const TEXTOS = {
  pt: {
    1: ({ nome }) => `${oi(nome, 'Oi')} Conseguiu ver minha última mensagem?

Quero entender melhor seu momento para te orientar com clareza, mesmo que a conclusão seja que ainda não é a hora de avançar.`,
    2: ({ nome }) => `${oi(nome, 'Oi')} Retomando nosso contato porque acredito que existe uma oportunidade importante na comunicação da sua empresa.

Não quero simplesmente te oferecer um serviço. Quero entender se a Grow+ consegue resolver o que está te impedindo de crescer com mais consistência.

Podemos continuar essa conversa?`,
    3: ({ nome }) => `${oi(nome, 'Oi')} Vou encerrar nosso contato por aqui para não ficar insistindo.

Mas deixo uma reflexão: muitas vezes, o problema não é a empresa não ter potencial. É continuar deixando a comunicação para depois enquanto outros negócios ocupam esse espaço.

Quando fizer sentido tirar essa parte do improviso, a Grow+ estará por aqui.`,
  },
  en: {
    1: ({ nome }) => `${oi(nome, 'Hi')} Did you get a chance to see my last message?

I'd like to better understand where you are right now so I can guide you clearly, even if the conclusion is that it's not the right time to move forward yet.`,
    2: ({ nome }) => `${oi(nome, 'Hi')} Following up because I believe there's an important opportunity in your company's communication.

I don't just want to offer you a service. I want to understand whether Grow+ can solve what's keeping you from growing more consistently.

Can we continue this conversation?`,
    3: ({ nome }) => `${oi(nome, 'Hi')} I'll close our conversation here so I don't keep insisting.

But I'll leave you with a thought: often the problem isn't that the business lacks potential. It's that communication keeps getting pushed back while other businesses take that space.

Whenever it makes sense to take this part out of improvisation, Grow+ will be here.`,
  },
};

/**
 * @param {{nome?: string}} dados nome do cliente (opcional)
 * @param {number} n etapa (1, 2 ou 3)
 * @param {'pt'|'en'} idioma
 */
export function textoFollowup(dados, n, idioma = 'pt') {
  const banco = TEXTOS[idioma] || TEXTOS.pt;
  const modelo = banco[n] || banco[1];
  return modelo({ nome: String(dados?.nome || '').trim() });
}
