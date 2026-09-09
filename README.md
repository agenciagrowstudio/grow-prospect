# Grow+ Prospect

[![Release](https://img.shields.io/github/v/release/agenciagrowstudio/grow-prospect?display_name=tag)](https://github.com/agenciagrowstudio/grow-prospect/releases)
[![Licença](https://img.shields.io/github/license/agenciagrowstudio/grow-prospect)](LICENSE)

Aplicativo desktop para transformar pesquisas do Google Maps em uma operação de
prospecção: encontrar empresas, organizar leads, priorizar oportunidades e
iniciar conversas pelo WhatsApp. Tudo roda na máquina do usuário.

```text
Google Maps -> base de leads -> lead scoring -> WhatsApp -> campanha/Kanban -> métricas
```

Electron + React + Playwright, em uma única aplicação para Windows.

## Recursos

### Pesquisa e base de leads

- Pesquisa por nicho, bairro ou cidade no Google Maps, com paginação e coleta dos dados públicos disponíveis.
- Campos de negócio como nome, categoria, telefone, site, Instagram, e-mail, avaliação, endereço e coordenadas.
- Deduplicação por negócio e normalização de categorias: variações como "dentista", "clínica odontológica" e "ortodontia" viram **Odontologia**.
- Visualização em tabela ou mapa Leaflet, com pins por coordenada e indicador de precisão.
- Filtros, seleção em lote e exportação CSV/XLSX.

### Lead Scoring

- Auditoria do site do lead em busca de sinais técnicos e comerciais: HTTPS, responsividade, pixel, WhatsApp, presença digital e qualidade geral.
- Score, prioridade, argumentos de abordagem e mensagem sugerida.
- Grupos salvos por pesquisa ou filtro, para trabalhar a lista por etapas.
- Análise opcional com provedores de IA (OpenRouter, OpenCode), com queda para heurística local quando não há chave configurada.

### WhatsApp

- Conexão de múltiplos números por QR Code (Baileys) ou Meta Cloud API.
- Conversas, contatos, grupos, etiquetas, mídia, áudio e gatilhos.
- Campanhas com mensagem variável, intervalo, agendamento e limite diário por conexão.
- A campanha pode nascer como rascunho sem WhatsApp conectado; a conexão só é exigida para disparar.

### Campanhas e Kanban

- Relatório por campanha: envio, entrega, leitura, respostas e tempo de resposta.
- Kanban com três etapas persistentes (**Novos**, **Em conversa**, **Finalizados**), por arrastar ou pelo seletor acessível.

### Interface

- Sete telas: Visão Geral, Scraper Maps, Base de Leads, Lead Scoring, WhatsApp, Dashboard e Configurações.
- Design system **Modo Claro**: superfície branca, cor reservada para estado e ação, tipografia Inter, ícones Lucide.
- Gráfico de área próprio, sem biblioteca de terceiros, compartilhado entre Visão Geral, Dashboard e Base de Leads.

## Instalar no Windows

Baixe a [versão mais recente](https://github.com/agenciagrowstudio/grow-prospect/releases):

- `Grow-Prospect-<versão>-x64.exe` — instalador, recomendado.
- `Grow-Prospect-<versão>-x64.zip` — versão portátil.

A atualização automática funciona na versão instalada pelo instalador. A pasta `win-unpacked` é saída de teste local e não recebe atualização.

## Privacidade

Os dados da aplicação e as sessões de WhatsApp ficam no perfil local do Electron,
na máquina do usuário. Não existe servidor intermediário. As chamadas externas
acontecem apenas para o Google Maps, para os sites analisados pelo Lead Scoring,
para o WhatsApp e para o provedor de IA que o usuário configurar.

## Desenvolvimento

### Requisitos

- Windows 10 ou 11, 64-bit.
- Node.js 20 ou superior.

### Instalar e executar

```bash
npm install
npm start
```

`npm start` compila o renderer e abre o Electron. Rode os comandos dentro da
pasta do projeto, não na pasta acima dela.

Para trabalhar só no front-end:

```bash
npm run dev:renderer
```

### Comandos úteis

```bash
npm test                  # suíte Node --test
npm run build:renderer    # build do React/Vite
npm run qa:ui             # captura visual das rotas principais
npm run build:win         # instalador NSIS + ZIP em dist/
```

## Estrutura

```text
main.js                            Processo Electron e IPC
preload.js                         Ponte entre renderer e processo principal
renderer/                          React + Vite + interface
lead-scoring/                      Crawler, score, grupos e exportação
campaigns/                         Store, scheduler, analytics e Kanban
whatsapp/                          Providers, autenticação e normalização
scripts/                           Build, carimbo do renderer e QA visual
test/                              Testes unitários e de integração
```

## Origem e licença

O Grow+ Prospect deriva do **Sigma GMaps Scraper**, de Ferdy, distribuído sob
licença MIT. O aviso de copyright original está preservado em
[LICENSE](LICENSE) e no [NOTICE](NOTICE), como a licença exige. As mudanças de marca, interface,
design system e funcionalidades feitas pela Grow+ seguem os mesmos termos.

MIT. Veja [LICENSE](LICENSE).
