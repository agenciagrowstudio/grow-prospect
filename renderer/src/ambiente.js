/**
 * Onde o app está rodando. No app do computador (Electron) existe a ponte
 * electronAPI; no navegador (prospector.growmaisoficial.com) não existe, e as
 * funções que dependem do computador (robô do Maps, WhatsApp, e-mail, Kanban)
 * ficam indisponíveis.
 */
export const ehWeb = typeof window !== 'undefined' && !window.electronAPI;
