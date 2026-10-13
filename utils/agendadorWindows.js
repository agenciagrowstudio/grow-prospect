/**
 * Abertura automática do app no horário da extração: uma tarefa no Agendador
 * de Tarefas do Windows, só para o usuário atual (nada de administrador).
 *
 * A tarefa abre o app uma vez por dia. Se o computador estava desligado ou
 * dormindo na hora, ela roda assim que ele volta (StartWhenAvailable). Quem
 * decide extrair e o quê é o próprio app, depois de aberto.
 */
const { execFile } = require("child_process");

const NOME_TAREFA = "GrowProspectorExtracaoAutomatica";
const DESCRICAO = "Abre o Prospector 2.0 no horário da extração automática de leads.";

const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ""));
// Aspas simples dentro de texto entre aspas simples do PowerShell se dobram.
const ps = (texto) => `'${String(texto).replace(/'/g, "''")}'`;

/**
 * @param {object} p
 * @param {string} p.hora "HH:MM"
 * @param {boolean} p.empacotado app instalado (true) ou rodando do código-fonte (false)
 * @param {string} p.executavel caminho do .exe do app instalado
 * @param {string} p.scriptAbrir caminho de scripts/abrir-app.ps1 (código-fonte)
 */
function montaScriptRegistro({ hora, empacotado, executavel, scriptAbrir, nome = NOME_TAREFA }) {
  if (!horaValida(hora)) throw new Error("Horário inválido.");
  const executar = empacotado ? executavel : "powershell.exe";
  const argumentos = empacotado
    ? "--auto"
    : `-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptAbrir}" -Silencioso`;
  return [
    "$ErrorActionPreference = 'Stop'",
    `$acao = New-ScheduledTaskAction -Execute ${ps(executar)} -Argument ${ps(argumentos)}`,
    `$gatilho = New-ScheduledTaskTrigger -Daily -At ${ps(hora)}`,
    "$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 10)",
    `Register-ScheduledTask -TaskName ${ps(nome)} -Action $acao -Trigger $gatilho -Settings $config -Description ${ps(DESCRICAO)} -Force | Out-Null`,
    `Write-Output ((Get-ScheduledTaskInfo -TaskName ${ps(nome)}).NextRunTime.ToString('s'))`,
  ].join("\n");
}

function montaScriptRemocao(nome = NOME_TAREFA) {
  return `Unregister-ScheduledTask -TaskName ${ps(nome)} -Confirm:$false -ErrorAction SilentlyContinue`;
}

function montaScriptStatus(nome = NOME_TAREFA) {
  return [
    `$t = Get-ScheduledTask -TaskName ${ps(nome)} -ErrorAction SilentlyContinue`,
    "if ($t) {",
    `  $i = Get-ScheduledTaskInfo -TaskName ${ps(nome)}`,
    "  $h = ([datetime]$t.Triggers[0].StartBoundary).ToString('HH:mm')",
    "  Write-Output ('{\"existe\":true,\"hora\":\"' + $h + '\",\"proxima\":\"' + $i.NextRunTime.ToString('s') + '\"}')",
    "} else { Write-Output '{\"existe\":false}' }",
  ].join("\n");
}

function executaPowerShell(script, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    // -EncodedCommand evita qualquer problema de aspas e de acentos no caminho.
    const codificado = Buffer.from(script, "utf16le").toString("base64");
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", codificado],
      { timeout: timeoutMs, windowsHide: true },
      (erro, stdout, stderr) => {
        if (erro) return reject(new Error(String(stderr || erro.message).trim().split("\n")[0]));
        resolve(String(stdout || "").trim());
      },
    );
  });
}

async function agenda(opcoes) {
  if (process.platform !== "win32") throw new Error("O agendamento automático só existe no Windows.");
  const proxima = await executaPowerShell(montaScriptRegistro(opcoes));
  return { proxima };
}

async function remove(nome) {
  if (process.platform !== "win32") return;
  await executaPowerShell(montaScriptRemocao(nome));
}

async function status(nome) {
  if (process.platform !== "win32") return { existe: false, suportado: false };
  try {
    return { suportado: true, ...JSON.parse(await executaPowerShell(montaScriptStatus(nome))) };
  } catch {
    return { existe: false, suportado: true };
  }
}

module.exports = {
  NOME_TAREFA, horaValida, montaScriptRegistro, montaScriptRemocao, montaScriptStatus, agenda, remove, status,
};
