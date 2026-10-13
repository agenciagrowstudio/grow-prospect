/**
 * Instagram da prospecção: os perfis dos leads abrem numa janela do próprio
 * app, com sessão guardada só para ela. A pessoa entra uma vez, com a senha
 * digitada direto na página do Instagram (o app não vê nem guarda a senha), e
 * daí em diante todo clique no Instagram de um lead abre já logado.
 */
const PARTICAO = "persist:instagram";
// Com "Electron" no navegador, o Instagram trata como navegador estranho.
const NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const URL_LOGIN = "https://www.instagram.com/accounts/login/";

function ehInstagram(url) {
  try {
    const u = new URL(String(url || ""));
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    return h === "instagram.com" || h.endsWith(".instagram.com") || h === "instagr.am";
  } catch {
    return false;
  }
}

/** Sempre https e www, para cair na mesma sessão. */
function normalizaUrl(url) {
  const u = new URL(String(url));
  u.protocol = "https:";
  if (u.hostname === "instagram.com" || u.hostname === "instagr.am") u.hostname = "www.instagram.com";
  return u.toString();
}

function criaJanelaInstagram({ BrowserWindow, session, shell, icone }) {
  let janela = null;

  const sessao = () => {
    const s = session.fromPartition(PARTICAO);
    s.setUserAgent(NAVEGADOR);
    // Nada de câmera, microfone, localização ou notificação nessa janela.
    s.setPermissionRequestHandler((_wc, _perm, responde) => responde(false));
    return s;
  };

  function abre(url = URL_LOGIN) {
    const destino = ehInstagram(url) ? normalizaUrl(url) : URL_LOGIN;
    if (janela && !janela.isDestroyed()) {
      janela.loadURL(destino);
      if (janela.isMinimized()) janela.restore();
      janela.show();
      janela.focus();
      return;
    }
    janela = new BrowserWindow({
      width: 1100,
      height: 860,
      minWidth: 420,
      title: "Instagram",
      icon: icone,
      autoHideMenuBar: true,
      webPreferences: {
        session: sessao(),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    // Link do Instagram continua aqui; link de fora vai para o navegador.
    janela.webContents.setWindowOpenHandler(({ url: alvo }) => {
      if (ehInstagram(alvo)) janela.loadURL(normalizaUrl(alvo));
      else if (/^https?:\/\//i.test(alvo)) shell.openExternal(alvo).catch(() => {});
      return { action: "deny" };
    });
    janela.on("closed", () => { janela = null; });
    janela.loadURL(destino);
  }

  async function status() {
    const cookies = await sessao().cookies.get({ url: "https://www.instagram.com" });
    const logado = cookies.some((c) => c.name === "sessionid" && c.value);
    return { logado };
  }

  async function sair() {
    await sessao().clearStorageData();
    if (janela && !janela.isDestroyed()) janela.close();
  }

  return { abre, status, sair };
}

module.exports = { ehInstagram, normalizaUrl, criaJanelaInstagram, PARTICAO, URL_LOGIN };
