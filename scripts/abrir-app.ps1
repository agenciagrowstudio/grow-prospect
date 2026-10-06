# Abre o Grow+ Prospect com a interface atualizada.
#
# Chamado pelo atalho "Grow+ Prospect". Faz três coisas, nessa ordem:
#   1. Se o app já está aberto, avisa e para (abrir duas cópias brigam pela
#      mesma sessão de WhatsApp).
#   2. Reconstrói a interface só quando o código mudou depois da última
#      construção. Sem mudança, abre direto.
#   3. Abre o Electron sem janela de terminal.
#
# Erros aparecem numa caixa de mensagem, porque o atalho roda sem terminal.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$raiz = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $raiz 'node_modules\electron\dist\electron.exe'
$dist = Join-Path $raiz 'renderer\dist\index.html'
$log = Join-Path $env:TEMP 'grow-prospect-abrir.log'
$titulo = 'Grow+ Prospect'

function Avisa($texto, $icone = 'Information') {
    [System.Windows.Forms.MessageBox]::Show($texto, $titulo, 'OK', $icone) | Out-Null
}

function Roda($comando) {
    # cmd /c para o npm.cmd; saída vai para o log, e o código de saída decide.
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c $comando >> `"$log`" 2>&1" `
        -WorkingDirectory $raiz -WindowStyle Hidden -Wait -PassThru
    return $p.ExitCode
}

try {
    Set-Content -Path $log -Value "Abertura em $(Get-Date -Format 's')" -Encoding UTF8

    # 1. Já está aberto?
    $aberto = Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$raiz\node_modules\electron*" }
    if ($aberto) {
        Avisa 'O Grow+ Prospect já está aberto. Procure a janela dele na barra de tarefas.'
        exit 0
    }

    # Primeira vez neste computador: instala as dependências.
    if (-not (Test-Path $electron)) {
        if ((Roda 'npm install') -ne 0) { throw 'Não consegui instalar as dependências. Verifique a internet e tente de novo.' }
    }

    # 2. Interface desatualizada?
    $fontes = @(
        Get-ChildItem -Path (Join-Path $raiz 'renderer\src') -Recurse -File
        Get-Item (Join-Path $raiz 'renderer\styles.css')
        Get-Item (Join-Path $raiz 'renderer\tokens-clarity.css')
        Get-Item (Join-Path $raiz 'renderer\index.html')
        Get-Item (Join-Path $raiz 'vite.config.js')
        Get-Item (Join-Path $raiz 'package.json')
    )
    $maisNova = ($fontes | Measure-Object -Property LastWriteTime -Maximum).Maximum
    $precisaBuild = (-not (Test-Path $dist)) -or ($maisNova -gt (Get-Item $dist).LastWriteTime)
    if ($precisaBuild) {
        if ((Roda 'npm run build:renderer') -ne 0) {
            $fim = (Get-Content $log -Tail 12) -join "`n"
            throw "Não consegui montar a interface.`n`n$fim"
        }
    }

    # 3. Abre o app, sem terminal.
    Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $raiz
}
catch {
    Avisa "Não foi possível abrir.`n`n$($_.Exception.Message)" 'Error'
    exit 1
}
