# Prospector 2.0

[![Release](https://img.shields.io/github/v/release/agenciagrowstudio/grow-prospect?display_name=tag)](https://github.com/agenciagrowstudio/grow-prospect/releases)
[![Licença](https://img.shields.io/github/license/agenciagrowstudio/grow-prospect)](LICENSE)

Aplicativo desktop para transformar pesquisas do Google Maps em uma operação de
prospecção: encontrar empresas, qualificar leads, escolher o que oferecer e
abordar por WhatsApp ou e-mail. Feito para três públicos: brasileiros no
Brasil, brasileiros nos EUA e americanos. Tudo roda na máquina do usuário.

```text
Google Maps -> base de leads -> qualificação -> WhatsApp / e-mail -> follow-up -> Kanban -> métricas
```

Electron + React + Playwright, em uma única aplicação para Windows.

## Recursos

### Pesquisa e base de leads

- Pesquisa por nicho e local no Google Maps. O local é um campo só, com sugestões do Brasil e dos EUA juntas; o país sai do lugar escolhido.
- Área da busca: cidade inteira, bairro inteiro ou raio de 5, 10, 30 ou 50 km em volta de um ponto. Aceita colar coordenadas ou link do Google Maps.
- Cidade dividida por bairros (uma busca por bairro, somadas sem repetição) para passar do limite de uns 120 resultados por busca. Os bairros podem ser sugeridos pelo OpenStreetMap.
- E-mail do lead buscado no site: página inicial e, se preciso, páginas de contato, inclusive e-mail escondido pelo Cloudflare.
- Campos de negócio como nome, categoria, telefone, site, Instagram, e-mail, avaliação, endereço e coordenadas.
- Deduplicação por negócio e normalização de categorias: variações como "dentista", "clínica odontológica" e "ortodontia" viram **Odontologia**.
- Visualização em tabela ou mapa Leaflet, com pinos na cor da temperatura do lead. Lead sem endereço e sem posição real fica sem pino.
- Lista filtrada por busca, com banner da cidade (foto da Wikipédia) e contagem de quentes, mornos e frios.
- Filtros, seleção em lote e exportação CSV/XLSX.

### Qualificação

- Cada lead recebe nota de 0 a 100, temperatura (quente, morno, frio) e nível de funil ("Abordar agora", "Nutrir", "Baixa prioridade"), calculados na hora com os dados da extração.
- Serviços que a Grow+ pode oferecer, com o motivo: Site, Sistema, Google Negócio, Gestão de redes e Conteúdo.
- Canais de contato no card (WhatsApp, Instagram, e-mail, site), em cinza claro quando o lead não tem.

### Lead Scoring

- Auditoria do site do lead em busca de sinais técnicos e comerciais: HTTPS, responsividade, pixel, WhatsApp, presença digital e qualidade geral.
- Score, prioridade, argumentos de abordagem e mensagem sugerida.
- Grupos salvos por pesquisa ou filtro, para trabalhar a lista por etapas.
- Análise opcional com provedores de IA (OpenRouter, OpenCode), com queda para heurística local quando não há chave configurada.

### WhatsApp

- Conexão de múltiplos números por QR Code (Baileys) ou pela API oficial da Meta. Na API oficial, a abordagem sai como modelo aprovado, escolhido da lista da conta.
- Limite por número em janela móvel de 24h no WhatsApp Web, para evitar banimento; a campanha retoma sozinha quando uma vaga libera. A API oficial fica fora desse limite.
- Follow-up opcional para quem não respondeu; quem responde sai da fila.
- Aviso de lead já abordado em outra campanha, cruzando WhatsApp e e-mail.
- Número da conexão mostrado só com os 4 finais.
- Conversas, contatos, grupos, etiquetas, mídia, áudio e gatilhos.
- Campanhas com mensagem variável, intervalo, agendamento e limite diário por conexão.
- A campanha pode nascer como rascunho sem WhatsApp conectado; a conexão só é exigida para disparar.

### E-mail

- Envio pelo Gmail do usuário (senha de app, cifrada no Windows) e leitura da caixa de entrada por IMAP.
- Texto por público: português para brasileiros, inglês para americanos.
- Rodapé com endereço e descadastro, como pedem a CAN-SPAM e a LGPD. Quem responde, pede para sair ou tem o e-mail devolvido sai da fila.
- Limite em 24h, horário comercial e follow-up como resposta na mesma conversa.

### Campanhas e Kanban

- Relatório por campanha: envio, entrega, leitura, respostas e tempo de resposta.
- Kanban com três etapas persistentes (**Novos**, **Em conversa**, **Finalizados**), por arrastar ou pelo seletor acessível.

### Interface

- Oito telas: Visão Geral, Scraper Maps, Base de Leads, Lead Scoring, Kanban, WhatsApp, E-mail e Dashboard, mais Configurações.
- Design system **Modo Claro**: superfície branca, cor reservada para estado e ação, tipografia Inter, ícones Lucide.
- Gráfico de área próprio, sem biblioteca de terceiros, compartilhado entre Visão Geral, Dashboard e Base de Leads.

## Instalar no Windows

Baixe a [versão mais recente](https://github.com/agenciagrowstudio/grow-prospect/releases):

- `Prospector-<versão>-x64.exe`: instalador, recomendado.
- `Prospector-<versão>-x64.zip`: versão portátil.

No computador de desenvolvimento, o atalho "Prospector 2.0" (criado por
`scripts\criar-atalho.cmd`) abre o app com dois cliques e reconstrói a
interface só quando o código mudou.

A atualização automática funciona na versão instalada pelo instalador. A pasta `win-unpacked` é saída de teste local e não recebe atualização.

## Privacidade

Os dados da aplicação e as sessões de WhatsApp ficam no perfil local do Electron,
na máquina do usuário (`%APPDATA%\Grow+ Prospect` no app instalado). A pasta
mantém o nome antigo de propósito: trocá-la esconderia os dados já coletados.
Não existe servidor intermediário. As chamadas externas acontecem para o Google
Maps, os sites analisados, o WhatsApp ou a API da Meta, o Gmail, o
OpenStreetMap e a Wikipédia (sugestão de local e foto da cidade) e o provedor
de IA que o usuário configurar.

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
campaigns/                         Store, scheduler, follow-up, cota de 24h, analytics e Kanban
email/                             Gmail (SMTP e IMAP), campanhas de e-mail e públicos
whatsapp/                          Providers, autenticação e normalização
utils/                             Bairros, busca por raio, e-mail do site, foto da cidade, endereço
scripts/                           Build, carimbo do renderer, QA visual e atalho
test/                              Testes unitários e de integração
```

## Origem e licença

O Prospector 2.0 deriva do **Sigma GMaps Scraper**, de Ferdy, distribuído sob
licença MIT. O aviso de copyright original está preservado em
[LICENSE](LICENSE) e no [NOTICE](NOTICE), como a licença exige. As mudanças de marca, interface,
design system e funcionalidades feitas pela Grow+ seguem os mesmos termos.

MIT. Veja [LICENSE](LICENSE).
