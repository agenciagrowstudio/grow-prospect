import React, { useEffect, useRef, useState } from 'react';
import {
  Mail, MapPin, Thermometer, Snowflake, ChevronDown,
  CalendarCheck, Store, Megaphone, Clapperboard,
} from 'lucide-react';
import AvatarLead from './AvatarLead';
import IconePng, { ImagemPng } from './IconePng';
import { ICONES } from '../assets/icones';

/**
 * Card do lead na lista do mapa, no formato de vitrine: foto grande à
 * esquerda e, à direita, nota do Google, nome, endereço, serviços para
 * oferecer e a qualificação. Embaixo, os canais de contato.
 *
 * WhatsApp e Instagram usam o logo oficial da marca (Simple Icons): o Lucide
 * não tem WhatsApp, e o usuário pediu os ícones exatos. Canal que o lead não
 * tem fica cinza claro, para a ausência continuar visível.
 */

const IconeQuente = ({ size }) => <IconePng src={ICONES.quente} size={size + 1} />;
const IconeSiteServico = ({ size }) => <IconePng src={ICONES.site} size={size + 3} />;
const ICONE_TEMPERATURA = { quente: IconeQuente, morno: Thermometer, frio: Snowflake };
const ICONE_SERVICO = {
  site: IconeSiteServico,
  sistema: CalendarCheck,
  google: Store,
  redes: Megaphone,
  conteudo: Clapperboard,
};

const LogoWhatsApp = ({ size }) => <IconePng src={ICONES.whatsapp} size={size + 3} />;
const LogoInstagram = ({ size }) => <IconePng src={ICONES.instagram} size={size + 3} />;
const LogoGoogle = ({ size }) => <ImagemPng src={ICONES.google} size={size + 3} />;
const IconeMail = ({ size }) => <Mail size={size} strokeWidth={1.75} aria-hidden="true" />;
const IconeSite = ({ size }) => <IconePng src={ICONES.site} size={size + 3} />;

function Canal({ ativo, Icone, rotulo, rotuloAusente, onAbrir, tom }) {
  return (
    <button
      type="button"
      className={`cl-canal cl-canal-${tom}${ativo ? '' : ' ausente'}`}
      title={ativo ? rotulo : rotuloAusente}
      aria-label={ativo ? rotulo : rotuloAusente}
      disabled={!ativo}
      onClick={(e) => {
        e.stopPropagation();
        if (ativo) onAbrir();
      }}
    >
      <Icone size={15} />
    </button>
  );
}

/**
 * Linha da qualificação: preenche de 0 a 100, com o degradê do frio ao quente
 * fixo na largura toda. Assim a cor da ponta é a cor do estado atual.
 */
function BarraQualificacao({ q }) {
  const nota = Math.max(2, q.nota);
  return (
    <div className="cl-barra-bloco" title={`Qualificação ${q.nota}/100, pelos ${q.origem}`}>
      <div className="cl-barra" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={q.nota} aria-label="Qualificação Grow+">
        <span style={{ width: `${nota}%`, backgroundSize: `${10000 / nota}% 100%` }} />
      </div>
      <span className="cl-barra-legenda">
        <b>{q.nota}</b>
        <span>{q.temperatura.funil}</span>
      </span>
    </div>
  );
}

/** Badge "Serviços": bolinhas sobrepostas; o clique abre a lista com o motivo de cada um. */
function BadgeServicos({ servicos }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  if (!servicos.length) return null;

  return (
    <div className="cl-servicos-badge" ref={ref}>
      <button
        type="button"
        className="cl-badge"
        aria-expanded={aberto}
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className="cl-pilha" aria-hidden="true">
          {servicos.map((s) => {
            const Icone = ICONE_SERVICO[s.id];
            return (
              <span key={s.id} className={`cl-ic cl-servico-${s.id}`}>
                <Icone size={12} strokeWidth={2.2} />
              </span>
            );
          })}
        </span>
        Serviços
        <small>{servicos.length}</small>
        <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="cl-servicos-lista" role="dialog" aria-label="Serviços para oferecer" onClick={(e) => e.stopPropagation()}>
          <b>Pode oferecer</b>
          <ul>
            {servicos.map((s) => {
              const Icone = ICONE_SERVICO[s.id];
              return (
                <li key={s.id} className={`cl-servico-${s.id}`}>
                  <span className="cl-ic" aria-hidden="true"><Icone size={14} strokeWidth={1.9} /></span>
                  <span><strong>{s.rotulo}</strong>{s.motivo}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function fmt(n) {
  return Number(n).toFixed(1).replace('.', ',');
}

export default function CardLead({
  lead, qualificacao: q, selecionado, local, distancia, atraso = 0,
  onSelecionar, onWhatsApp, onMapa, refCard,
}) {
  const nome = lead.name || lead.n || 'Empresa';
  const categoria = lead.category || lead.cat || 'Geral';
  const IconeTemp = ICONE_TEMPERATURA[q.temperatura.id];
  const abrir = (url) => window.open(url, '_blank', 'noopener');
  const { nota, avaliacoes } = q.google;

  return (
    <div
      ref={refCard}
      role="button"
      tabIndex={0}
      className="lead-card cl-card"
      style={{ animationDelay: `${atraso}ms` }}
      aria-current={selecionado ? 'true' : 'false'}
      onClick={onSelecionar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelecionar();
        }
      }}
    >
      <div className="cl-foto">
        <AvatarLead lead={lead} size={88} />
      </div>

      <div className="cl-corpo">
        <div className="cl-l1">
          <span className="cl-google" title={nota ? `Google: ${fmt(nota)} em ${avaliacoes} avaliações` : 'Sem nota no Google'}>
            <LogoGoogle size={13} />
            {nota ? fmt(nota) : 'sem nota'}
            {avaliacoes > 0 && <small>({avaliacoes})</small>}
          </span>
          <span className={`cl-temp cl-temp-${q.temperatura.id}`} title={`${q.temperatura.rotulo}: ${q.temperatura.funil}`}>
            <IconeTemp size={11} strokeWidth={2} />
            {q.temperatura.rotulo}
          </span>
        </div>

        <b className="cl-nome">{nome}</b>
        <span className="cl-sub">{local ? `${categoria} · ${local}` : categoria}</span>

        <BadgeServicos servicos={q.servicos} />
        <BarraQualificacao q={q} />
      </div>

      <div className="cl-rodape">
        <div className="cl-canais">
          <Canal tom="whatsapp" ativo={!!q.canais.whatsapp} Icone={LogoWhatsApp} rotulo="Abrir no WhatsApp" rotuloAusente="Sem WhatsApp" onAbrir={onWhatsApp} />
          <Canal tom="instagram" ativo={!!q.canais.instagram} Icone={LogoInstagram} rotulo="Abrir Instagram" rotuloAusente="Sem Instagram"
            onAbrir={() => abrir(/^https?:/i.test(q.canais.instagram) ? q.canais.instagram : `https://instagram.com/${q.canais.instagram.replace('@', '')}`)} />
          <Canal tom="email" ativo={!!q.canais.email} Icone={IconeMail} rotulo={`E-mail: ${q.canais.email}`} rotuloAusente="Sem e-mail" onAbrir={() => abrir(`mailto:${q.canais.email}`)} />
          <Canal tom="site" ativo={!!q.canais.site} Icone={IconeSite} rotulo="Abrir site" rotuloAusente="Sem site"
            onAbrir={() => abrir(/^https?:/i.test(q.canais.site) ? q.canais.site : `https://${q.canais.site}`)} />
        </div>
        <div className="cl-acoes">
          {distancia && <span className="dist" title="Distância em linha reta">{distancia}</span>}
          <button
            type="button"
            className="cl-canal"
            title="Ver no mapa"
            aria-label="Ver no mapa"
            onClick={(e) => {
              e.stopPropagation();
              onMapa();
            }}
          >
            <MapPin size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
