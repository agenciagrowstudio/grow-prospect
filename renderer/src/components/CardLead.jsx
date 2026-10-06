import React from 'react';
import {
  Star, StarHalf, MessageCircle, Instagram, Mail, Globe, MapPin, Flame, Thermometer, Snowflake,
  MonitorSmartphone, CalendarCheck, Store, Megaphone, Clapperboard,
} from 'lucide-react';
import AvatarLead from './AvatarLead';
import SeloNota from './SeloNota';

/**
 * Card do lead na lista do mapa.
 *
 * Três blocos, na ordem em que a decisão acontece: vale abordar (estrelas e
 * temperatura), o que oferecer (serviços da Grow+) e por onde falar (canais).
 * Canal que o lead não tem fica apagado em vez de sumir: a ausência também é
 * informação, e o site que falta é justamente o que se vende.
 */

const ICONE_TEMPERATURA = { quente: Flame, morno: Thermometer, frio: Snowflake };
const ICONE_SERVICO = {
  site: MonitorSmartphone,
  sistema: CalendarCheck,
  google: Store,
  redes: Megaphone,
  conteudo: Clapperboard,
};

function Estrelas({ valor }) {
  const cheias = Math.floor(valor);
  const meia = valor - cheias >= 0.5;
  return (
    <span className="cl-estrelas" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => {
        if (i < cheias) return <Star key={i} size={13} strokeWidth={0} fill="currentColor" />;
        if (i === cheias && meia) {
          return (
            <span key={i} className="cl-estrela-meia">
              <Star size={13} strokeWidth={1.5} className="vazia" />
              <StarHalf size={13} strokeWidth={0} fill="currentColor" />
            </span>
          );
        }
        return <Star key={i} size={13} strokeWidth={1.5} className="vazia" />;
      })}
    </span>
  );
}

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
      <Icone size={15} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

export default function CardLead({
  lead, qualificacao: q, selecionado, local, distancia, atraso = 0,
  onSelecionar, onWhatsApp, onMapa, refCard,
}) {
  const nome = lead.name || lead.n || 'Empresa';
  const categoria = lead.category || lead.cat || 'Geral';
  const IconeTemp = ICONE_TEMPERATURA[q.temperatura.id];
  const abrir = (url) => window.open(url, '_blank', 'noopener');

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
      <div className="cl-topo">
        <AvatarLead lead={lead} size={56} />
        <div className="cl-texto">
          <div className="cl-linha-nome">
            <b className="cl-nome">{nome}</b>
            <span className={`cl-temp cl-temp-${q.temperatura.id}`} title={`${q.temperatura.rotulo}: ${q.temperatura.funil}`}>
              <IconeTemp size={12} strokeWidth={2} aria-hidden="true" />
              {q.temperatura.rotulo}
            </span>
          </div>
          <span className="cl-sub">
            {categoria}
            {local ? <> · <MapPin size={11} strokeWidth={1.5} aria-hidden="true" /> {local}</> : null}
          </span>
          <div className="cl-notas">
            <span className="cl-qualif" title={`Qualificação ${q.nota}/100, pelos ${q.origem}`}>
              <Estrelas valor={q.estrelas} />
              <b>{q.estrelas.toFixed(1).replace('.', ',')}</b>
              <span className="cl-funil">{q.temperatura.funil}</span>
            </span>
            <SeloNota nota={q.google.nota} avaliacoes={q.google.avaliacoes} size="sm" />
          </div>
        </div>
      </div>

      {q.servicos.length > 0 && (
        <div className="cl-servicos" aria-label="Serviços para oferecer">
          {q.servicos.map((s) => {
            const Icone = ICONE_SERVICO[s.id];
            return (
              <span key={s.id} className={`cl-servico cl-servico-${s.id}`}>
                <Icone size={12} strokeWidth={1.75} aria-hidden="true" />
                {s.rotulo}
              </span>
            );
          })}
        </div>
      )}

      <div className="cl-rodape">
        <div className="cl-canais">
          <Canal tom="whatsapp" ativo={!!q.canais.whatsapp} Icone={MessageCircle} rotulo="Abrir no WhatsApp" rotuloAusente="Sem WhatsApp" onAbrir={onWhatsApp} />
          <Canal tom="instagram" ativo={!!q.canais.instagram} Icone={Instagram} rotulo="Abrir Instagram" rotuloAusente="Sem Instagram"
            onAbrir={() => abrir(/^https?:/i.test(q.canais.instagram) ? q.canais.instagram : `https://instagram.com/${q.canais.instagram.replace('@', '')}`)} />
          <Canal tom="email" ativo={!!q.canais.email} Icone={Mail} rotulo={`E-mail: ${q.canais.email}`} rotuloAusente="Sem e-mail" onAbrir={() => abrir(`mailto:${q.canais.email}`)} />
          <Canal tom="site" ativo={!!q.canais.site} Icone={Globe} rotulo="Abrir site" rotuloAusente="Sem site"
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
