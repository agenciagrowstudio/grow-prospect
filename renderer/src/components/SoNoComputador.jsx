import React from 'react';
import { Monitor, ClipboardList } from 'lucide-react';
import BaixarApp from './BaixarApp';

/** Aviso da versão web para o que só roda no app do computador. */
const TEXTOS = {
  whatsapp: {
    titulo: 'WhatsApp fica no app do computador',
    texto: 'A sessão do WhatsApp, as conversas e as campanhas rodam no Prospector instalado no PC. Pelo celular, use a Fila do dia: ela abre o WhatsApp do seu telefone com a mensagem pronta.',
  },
  email: {
    titulo: 'E-mail fica no app do computador',
    texto: 'O envio pelo Gmail usa a senha de app guardada no PC. Abra o Prospector no computador para criar e acompanhar campanhas de e-mail.',
  },
  kanban: {
    titulo: 'Kanban fica no app do computador',
    texto: 'O quadro do Kanban ainda é guardado no PC. Por aqui você acompanha os leads na Base de Leads e os resultados no painel.',
  },
};

export default function SoNoComputador({ recurso, onNavigate }) {
  const t = TEXTOS[recurso] || { titulo: 'Disponível no app do computador', texto: 'Abra o Prospector no PC para usar esta parte.' };
  return (
    <section className="settings-open-design-view">
      <div className="cfg-card sc-vazio">
        <span className="sc-vazio-icone"><Monitor size={26} strokeWidth={1.75} /></span>
        <b>{t.titulo}</b>
        <span>{t.texto}</span>
        <BaixarApp className="btn btn-primary sc-vazio-btn" />
        <button type="button" className="btn btn-ghost sc-vazio-btn" onClick={() => onNavigate?.('scraper')}>
          <ClipboardList size={15} strokeWidth={2} /> Ir para a Fila do dia
        </button>
      </div>
    </section>
  );
}
