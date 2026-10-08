# Cria o atalho "Prospector 2.0" (duplo clique, com o ícone do app).
#
# Um atalho fica na área de trabalho e outro na raiz do projeto. Pode rodar de
# novo a qualquer hora: ele recria os dois. Se mover a pasta do projeto, rode
# este arquivo outra vez, porque o atalho guarda o caminho completo.

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$lancador = Join-Path $PSScriptRoot 'abrir-app.ps1'
$icone = Join-Path $raiz 'assets\icon.ico'
$powershell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'

$destinos = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Prospector 2.0.lnk'),
    (Join-Path $raiz 'Prospector 2.0.lnk')
)

$shell = New-Object -ComObject WScript.Shell
foreach ($destino in $destinos) {
    $atalho = $shell.CreateShortcut($destino)
    $atalho.TargetPath = $powershell
    $atalho.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$lancador`""
    $atalho.WorkingDirectory = $raiz
    $atalho.IconLocation = "$icone,0"
    $atalho.Description = 'Abre o Prospector 2.0'
    $atalho.WindowStyle = 7
    $atalho.Save()
    Write-Output "Criado: $destino"
}
