import React, { useState } from 'react';
import { Bot, Eye, EyeOff, Check, X, Loader } from 'lucide-react';
import { PROVIDERS, readAiConfig, saveAiConfig } from '../configIA';

/**
 * Tela de Configurações.
 *
 * A chave da IA morava dentro do Lead Scoring, num modal que só quem já estava
 * naquela tela encontrava. O lugar dela é aqui: é configuração do aplicativo,
 * não daquela tela. O Lead Scoring continua mostrando o resumo do que está
 * valendo, e o modal de lá edita a mesma configuração.
 */

const AJUDA_DA_CHAVE = {
  gemini: { onde: 'aistudio.google.com/apikey', nome: 'Google AI Studio' },
  openrouter: { onde: 'openrouter.ai/keys', nome: 'OpenRouter' },
  opencode: { onde: 'opencode.ai', nome: 'OpenCode' },
  custom: null,
};

export default function Configuracoes({ versao, onNotificar }) {
  const [cfg, setCfg] = useState(() => readAiConfig());
  const [mostrarChave, setMostrarChave] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const provedor = PROVIDERS[cfg.provider] || PROVIDERS.gemini;
  const ajuda = AJUDA_DA_CHAVE[cfg.provider];

  const trocaProvedor = (chave) => {
    const p = PROVIDERS[chave];
    setResultado(null);
    setCfg((prev) => ({
      ...prev,
      provider: chave,
      baseUrl: chave !== 'custom' && p.base ? p.base : prev.baseUrl,
      // O modelo de um provedor não existe no outro, então não pode ficar.
      model: (p.models && p.models[0]) || '',
    }));
  };

  const salvar = () => {
    saveAiConfig(cfg);
    onNotificar?.({
      type: 'success',
      title: 'Configuração salva',
      message: `${provedor.name}${cfg.model ? ` · ${cfg.model}` : ''}`,
    });
  };

  const testar = async () => {
    if (testando) return;
    setTestando(true);
    setResultado(null);
    try {
      // Salva antes de testar: testar uma coisa e guardar outra confundiria.
      saveAiConfig(cfg);
      const r = await window.electronAPI?.testarIA?.({
        provider: cfg.provider,
        apiKey: cfg.key || '',
        model: cfg.model || '',
        baseUrl: cfg.baseUrl || '',
      });
      setResultado(r || { success: false, error: 'A ponte do desktop não respondeu.' });
    } catch (erro) {
      setResultado({ success: false, error: erro?.message || 'Falha ao testar.' });
    } finally {
      setTestando(false);
    }
  };

  return (
    <section className="settings-open-design-view cfg-view">
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}>Configurações</h1>
          <p className="cfg-tagline">Chave de IA, provedor e informações da instalação.</p>
        </div>
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <span className="cfg-icone"><Bot size={18} strokeWidth={1.5} /></span>
          <div>
            <h2>Inteligência artificial</h2>
            <p>
              Usada para analisar sites e para decidir os casos em que as regras não
              bastam ao qualificar negócio brasileiro. Sem chave, o app continua
              funcionando pelas regras.
            </p>
          </div>
        </div>

        <div className="field">
          <label>Provedor</label>
          <div className="cfg-provedores">
            {Object.keys(PROVIDERS).map((chave) => {
              const escolhido = cfg.provider === chave;
              return (
                <button
                  key={chave}
                  type="button"
                  className={`cfg-provedor${escolhido ? ' on' : ''}`}
                  aria-pressed={escolhido}
                  onClick={() => trocaProvedor(chave)}
                >
                  {PROVIDERS[chave].name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="cfg-linha">
          <div className="field">
            <label htmlFor="cfgModelo">Modelo</label>
            {provedor.models && provedor.models.length > 0 ? (
              <select
                id="cfgModelo"
                value={cfg.model || ''}
                onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
              >
                {provedor.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                id="cfgModelo"
                autoComplete="off"
                spellCheck="false"
                placeholder="nome do modelo"
                value={cfg.model || ''}
                onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
              />
            )}
          </div>

          <div className="field">
            <label htmlFor="cfgBase">Endereço da API</label>
            <input
              id="cfgBase"
              autoComplete="off"
              spellCheck="false"
              readOnly={cfg.provider !== 'custom'}
              placeholder={cfg.provider === 'custom' ? 'https://sua-api.com/v1' : ''}
              value={cfg.baseUrl || ''}
              onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="cfgChave">Chave de API</label>
          <div className="cfg-chave">
            <input
              id="cfgChave"
              type={mostrarChave ? 'text' : 'password'}
              autoComplete="off"
              spellCheck="false"
              placeholder="cole a chave aqui"
              value={cfg.key || ''}
              onChange={(e) => {
                setResultado(null);
                setCfg({ ...cfg, key: e.target.value });
              }}
            />
            <button
              type="button"
              className="cfg-olho"
              onClick={() => setMostrarChave((v) => !v)}
              aria-label={mostrarChave ? 'Esconder a chave' : 'Mostrar a chave'}
            >
              {mostrarChave ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
            </button>
          </div>
          {ajuda && (
            <span className="cfg-dica">
              Gere a chave em {ajuda.onde} ({ajuda.nome}). Ela fica guardada só nesta
              máquina e não é enviada para lugar nenhum além do próprio provedor.
            </span>
          )}
        </div>

        <div className="cfg-acoes">
          <button type="button" className="btn btn-primary" onClick={salvar}>
            Salvar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={testar}
            disabled={testando || !cfg.key}
          >
            {testando ? <Loader size={15} strokeWidth={1.5} className="cfg-girando" /> : null}
            {testando ? 'Testando…' : 'Testar conexão'}
          </button>
        </div>

        {resultado && (
          <div className={`cfg-resultado ${resultado.success ? 'ok' : 'erro'}`}>
            {resultado.success ? <Check size={15} strokeWidth={2} /> : <X size={15} strokeWidth={2} />}
            <span>
              {resultado.success
                ? `Respondeu em ${resultado.ms} ms usando ${resultado.modelo}.`
                : resultado.error}
            </span>
          </div>
        )}
      </div>

      <div className="cfg-card">
        <div className="cfg-card-head">
          <div>
            <h2>Sobre esta instalação</h2>
            <p>
              Os leads, as conversas e as sessões de WhatsApp ficam no perfil do
              usuário, nesta máquina. Não existe servidor no meio. As chamadas
              externas acontecem só para o Google Maps, para os sites analisados,
              para o WhatsApp e para o provedor de IA configurado acima.
            </p>
          </div>
        </div>
        <div className="cfg-sobre">
          <div><span>Versão</span><b>{versao || '—'}</b></div>
          <div><span>Interface</span><b>Modo claro</b></div>
        </div>
      </div>
    </section>
  );
}
