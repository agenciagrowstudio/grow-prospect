import React from 'react';
import {
  Star, StarHalf, MessageCircle, Instagram, Mail, Globe, MapPin, Flame, Thermometer, Snowflake,
} from 'lucide-react';
import AvatarLead from './AvatarLead';

/**
 * Card do lead na lista do mapa, no formato de vitrine: foto grande à
 * esquerda e, à direita, nota do Google, nome, endereço, serviços para
 * oferecer e a qualificação. Embaixo, os canais de contato.
 *
 * Canal que o lead não tem fica apagado em vez de sumir: a ausência também é
 * informação, e o site que falta é justamente o que se vende.
 */

const ICONE_TEMPERATURA = { quente: Flame, morno: Thermometer, frio: Snowflake };

function Estrelas({ valor }) {
  const cheias = Math.floor(valor);
  const meia = valor - cheias >= 0.5;
  return (
    <span className="cl-estrelas" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => {
        if (i < cheias) return <Star key={i} size={12} strokeWidth={0} fill="currentColor" />;
        if (i === cheias && meia) {
          return (
            <span key={i} className="cl-estrela-meia">
              <Star size={12} strokeWidth={1.5} className="vazia" />
              <StarHalf size={12} strokeWidth={0} fill="currentColor" />
            </span>
          );
        }
        return <Star key={i} size={12} strokeWidth={1.5} className="vazia" />;
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
      <Icone size={14} strokeWidth={1.75} aria-hidden="true" />
    </button>
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
            <Star size={12} strokeWidth={0} fill="currentColor" aria-hidden="true" />
            {nota ? fmt(nota) : 'sem nota'}
            {avaliacoes > 0 && <small>({avaliacoes})</small>}
          </span>
          <span className={`cl-temp cl-temp-${q.temperatura.id}`} title={`${q.temperatura.rotulo}: ${q.temperatura.funil}`}>
            <IconeTemp size={11} strokeWidth={2} aria-hidden="true" />
            {q.temperatura.rotulo}
          </span>
        </div>

        <b className="cl-nome">{nome}</b>
        <span className="cl-sub">{local ? `${categoria} · ${local}` : categoria}</span>

        {q.servicos.length > 0 && (
          <span className="cl-detalhes" aria-label="Serviços para oferecer">
            {q.servicos.map((s) => (
              <span key={s.id} className={`cl-det cl-servico-${s.id}`}>{s.rotulo}</span>
            ))}
          </span>
        )}

        <span className="cl-qualif" title={`Qualificação ${q.nota}/100, pelos ${q.origem}`}>
          <Estrelas valor={q.estrelas} />
          <b>{fmt(q.estrelas)}</b>
          <span className="cl-funil">{q.temperatura.funil}</span>
        </span>
      </div>

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
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
