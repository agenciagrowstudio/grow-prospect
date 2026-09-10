/**
 * Configuração do provedor de IA, compartilhada pelas telas.
 *
 * Estava dentro do LeadScoring, e a tela de Configurações precisava do mesmo
 * registro. Duas cópias divergem com o tempo, então virou módulo.
 */

const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    // Endpoint compatível com o formato OpenAI, que é o que este app fala.
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'],
  },
  opencode: { name: 'OpenCode', base: '', models: ['padrão local'] },
  openrouter: {
    name: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-70b'
    ]
  },
  custom: { name: 'Custom API', base: '', models: [] }
};

function readAiConfig() {
  try {
    const a = JSON.parse(localStorage.getItem('sigma_ai') || 'null');
    if (a && a.provider) return a;
  } catch {}
  return {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // Nasce vazia. Antes vinha 'sk-demo-0000-ficticia', o que fazia a tela
    // parecer configurada quando não estava.
    key: '',
    model: 'gemini-flash-latest',
    preset: 'sites',
    objective: ''
  };
}

function saveAiConfig(cfg) {
  try {
    localStorage.setItem('sigma_ai', JSON.stringify(cfg));
  } catch {}

  // Sem isto o painel era decorativo: gravava a chave no localStorage e o
  // motor, que roda no processo principal, lia de outro lugar e nunca a via.
  try {
    const envio = window.leadScoringAPI?.updateSettings?.({
      ai: {
        provider: cfg.provider,
        apiKey: cfg.key || '',
        model: cfg.model || '',
        baseUrl: cfg.baseUrl || '',
      },
    });
    if (envio && typeof envio.catch === 'function') envio.catch(() => {});
  } catch {}
}

export { PROVIDERS, readAiConfig, saveAiConfig };
