import React, { useState, useEffect, useRef } from 'react';
import { Compass, Flame, ClipboardList, BarChart3, X, ArrowRight, ArrowLeft, Check, Rocket } from 'lucide-react';
import { ehWeb } from '../ambiente';

/**
 * Tour de boas-vindas: quatro passos, na ordem do trabalho de verdade.
 * Extrair, saber quem vale a pena, abordar pela Fila do dia e acompanhar.
 *
 * Cada passo tem um botão de ação (leva à tela) separado do Próximo, para
 * quem quer ir direto não perder o tour sem querer e quem quer só ler não ser
 * jogado para outra tela.
 */

const STEPS = [
  {
    id: 'extrair',
    icon: Compass,
    cor: 'azul',
    titulo: 'Extraia leads do Google Maps',
    texto: 'Busque por nicho e local. Digite a cidade, cole um link do Maps ou clique no mapa para escolher o bairro.',
    pontos: ['Cidade inteira, bairro ou raio de 5 a 50 km', 'Os leads aparecem no mapa em tempo real', 'Brasil e EUA na mesma busca'],
    acao: { rotulo: 'Nova extração', tab: 'scraper', novaExtracao: true },
  },
  {
    id: 'qualificar',
    icon: Flame,
    cor: 'amarelo',
    titulo: 'Veja quem vale a pena abordar',
    texto: 'Cada lead ganha uma temperatura e os serviços que você pode oferecer a ele.',
    pontos: ['Quente: abordar primeiro. Morno: vale nutrir. Frio: baixa prioridade', 'Site, Google Negócio, redes, conteúdo ou sistema', 'Sem site fica em destaque: é a venda mais direta'],
    acao: { rotulo: 'Ver os leads', tab: 'scraper' },
  },
  {
    id: 'fila',
    icon: ClipboardList,
    cor: 'verde',
    titulo: 'Aborde pela Fila do dia',
    texto: 'Mensagens prontas no tom da Grow+. Você abre no WhatsApp, confere e envia à mão: o jeito mais seguro contra bloqueio.',
    pontos: ['Meta de 20 por dia, no seu ritmo', 'Português ou inglês, com um clique', 'Teste no seu próprio número antes de usar'],
    acao: { rotulo: 'Abrir a Fila do dia', tab: 'scraper' },
  },
  {
    id: 'resultados',
    icon: BarChart3,
    cor: 'roxo',
    titulo: 'Acompanhe e leve para onde for',
    texto: 'Marque quem respondeu e veja a taxa por canal, público e oferta. Em Configurações, conecte a empresa para usar em outros computadores e no celular.',
    pontos: ['Resultados mostra o que funciona melhor', 'Código da empresa liga os computadores', 'No celular: prospector.growmaisoficial.com'],
    acao: { rotulo: 'Ver resultados', tab: 'dashboard' },
  },
];

const ehMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');

export default function OnboardingTour({ onNavigate, onNewExtraction }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const proximoRef = useRef(null);

  useEffect(() => {
    try {
      if (localStorage.getItem('sigma_onboarding_done') === '1') return undefined;
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    } catch { return undefined; }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem('sigma_onboarding_done', '1'); } catch { /* sem armazenamento: aparece de novo */ }
    setOpen(false);
  };

  const ultimo = idx === STEPS.length - 1;
  const proximo = () => (ultimo ? dismiss() : setIdx((i) => i + 1));
  const voltar = () => setIdx((i) => Math.max(0, i - 1));

  const vaiPara = (acao) => {
    dismiss();
    // Na web o robô do Maps não existe: leva à tela em vez de abrir o assistente.
    if (acao.novaExtracao && !ehWeb && onNewExtraction) onNewExtraction();
    else if (acao.tab && onNavigate) onNavigate(acao.tab);
  };

  useEffect(() => {
    if (!open) return undefined;
    const tecla = (e) => {
      if (e.key === 'Escape') dismiss();
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIdx((i) => Math.min(STEPS.length - 1, i + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    };
    document.addEventListener('keydown', tecla);
    proximoRef.current?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [open]);

  if (!open) return null;
  const step = STEPS[idx];
  const Icon = step.icon;

  return (
    <div className="ob-fundo" onClick={dismiss}>
      <div className="ob-card" role="dialog" aria-modal="true" aria-labelledby="obTitulo" onClick={(e) => e.stopPropagation()}>
        <header className="ob-topo">
          <span className="ob-eyebrow"><Rocket size={13} strokeWidth={2.25} aria-hidden="true" /> Primeiros passos</span>
          <button type="button" className="ob-fechar" onClick={dismiss} aria-label="Fechar o tour"><X size={15} strokeWidth={2} /></button>
        </header>

        <ol className="ob-etapas" aria-label={`Passo ${idx + 1} de ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s.id} className={`${i < idx ? 'feito' : ''}${i === idx ? ' atual' : ''}`}>
              <button type="button" onClick={() => setIdx(i)} aria-label={`Ir para o passo ${i + 1}: ${s.titulo}`} aria-current={i === idx ? 'step' : undefined}>
                {i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}
              </button>
            </li>
          ))}
        </ol>

        <div className={`ob-corpo ob-${step.cor}`} key={step.id}>
          <span className="ob-icone"><Icon size={26} strokeWidth={1.9} /></span>
          <h2 id="obTitulo">{step.titulo}</h2>
          <p>{step.texto}</p>
          <ul className="ob-pontos">
            {step.pontos.map((p) => (
              <li key={p}><Check size={14} strokeWidth={2.75} aria-hidden="true" /><span>{p}</span></li>
            ))}
          </ul>
          <button type="button" className="ob-acao" onClick={() => vaiPara(step.acao)}>
            {step.acao.rotulo} <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>

        <footer className="ob-rodape">
          <button type="button" className="ob-pular" onClick={dismiss}>Pular tour</button>
          <span className="ob-espaco" />
          {idx > 0 && (
            <button type="button" className="ob-voltar" onClick={voltar}><ArrowLeft size={14} strokeWidth={2.25} /> Voltar</button>
          )}
          <button type="button" className="ob-proximo" onClick={proximo} ref={proximoRef}>
            {ultimo ? <>Concluir <Check size={14} strokeWidth={2.5} /></> : <>Próximo <ArrowRight size={14} strokeWidth={2.25} /></>}
          </button>
        </footer>

        <p className="ob-dica">
          <kbd>{ehMac ? '⌘ K' : 'Ctrl K'}</kbd> abre a busca global a qualquer momento.
        </p>
      </div>
    </div>
  );
}
