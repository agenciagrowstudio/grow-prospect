# Prospector 2.0

[![Release](https://img.shields.io/github/v/release/agenciagrowstudio/grow-prospect?display_name=tag)](https://github.com/agenciagrowstudio/grow-prospect/releases)
[![Licença](https://img.shields.io/github/license/agenciagrowstudio/grow-prospect)](LICENSE)

Aplicativo desktop para transformar pesquisas do Google Maps em uma operação de
prospecção: encontrar empresas, qualificar leads, escolher o que oferecer e
abordar pela Fila do dia (envio à mão no WhatsApp), por campanha de WhatsApp ou
por e-mail. Feito para três públicos: brasileiros no Brasil, brasileiros nos EUA
e americanos. O robô, o WhatsApp e o e-mail rodam no computador; os dados de
trabalho podem sincronizar entre computadores e com a versão web.

```text
Google Maps -> base de leads -> qualificação -> Fila do dia / WhatsApp / e-mail -> resultados
```

Electron + React + Playwright, em uma única aplicação para Windows. A interface
também roda no navegador (versão web), ligada à mesma empresa na nuvem.

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
- Base de Leads com a tabela no topo, filtros rápidos por canal (WhatsApp, e-mail, Instagram, site, brasileiros), grupos, seleção em lote e exportação CSV, XLSX ou JSON.

### Qualificação

- Cada lead recebe nota de 0 a 100, temperatura (quente, morno, frio) e nível de funil ("Abordar agora", "Nutrir", "Baixa prioridade"), calculados na hora com os dados da extração.
- Serviços que a Grow+ pode oferecer, com o motivo: Site, Sistema, Google Negócio, Gestão de redes e Conteúdo.
- Canais de contato no card (WhatsApp, Instagram, e-mail, site), em cinza claro quando o lead não tem.

### Fila do dia (abordagem manual)

- Depois da extração, separa até 20 leads qualificados por dia (a meta é ajustável) e escreve a primeira mensagem de cada um. Você abre no WhatsApp, confere e envia à mão: o jeito de menor risco de bloqueio. O app não envia nada sozinho.
- Mensagens no tom da Grow+ para brasileiros nos EUA (serviço em inglês, como a comunidade fala; cidade e estado por extenso), com 3 a 4 versões por oferta. Brasileiros no Brasil e americanos têm bancos próprios.
- Botão Português | English traduz a mesma versão para o inglês. A edição de cada idioma fica guardada.
- Formatação do WhatsApp: a marca, o nome da empresa e a nota saem em negrito, com uma estrela na nota. A prévia mostra o texto como chega.
- Botão para testar no seu próprio número, registro de quem foi abordado e de quem respondeu, e atalho para quem não tem WhatsApp.
- No celular (versão web), "Abrir no WhatsApp" abre o aplicativo do telefone com a mensagem pronta.

### Lead Scoring

- Auditoria do site do lead em busca de sinais técnicos e comerciais: HTTPS, responsividade, pixel, WhatsApp, presença digital e qualidade geral.
- Score, prioridade, argumentos de abordagem e mensagem sugerida.
- Grupos salvos por pesquisa ou filtro, para trabalhar a lista por etapas.
- Análise opcional com provedores de IA (Google Gemini, OpenCode, OpenRouter ou um endereço próprio), com queda para heurística local quando não há chave configurada.

### WhatsApp

- Conexão de múltiplos números por QR Code (Baileys) ou pela API oficial da Meta. Na API oficial, a abordagem sai como modelo aprovado; os modelos são criados, enviados para aprovação e acompanhados dentro do app. A Meta não entrega modelo de marketing para números dos EUA (+1): para americanos, use e-mail ou a Fila do dia.
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
- Kanban com etapas configuráveis (padrão: **Novos**, **Em contato**, **Qualificados**, **Proposta**, **Ganhos**, **Perdidos**), regras de movimento automático e limite por etapa. Mover é por arrastar ou pelo detalhe do card, que abre com clique ou Enter.
- **Resultados**: abordagens enviadas, respostas e taxa por canal, por público e por oferta, gráfico dos últimos 30 dias e funil.

### Interface

- Oito telas: Visão Geral, Scraper Maps, Base de Leads, Lead Scoring, Kanban, WhatsApp, E-mail e Resultados, mais Configurações.
- Design system **Modo Claro**: superfície branca, cor reservada para estado e ação, tipografia Inter, ícones Lucide.
- Menu lateral que abre e fecha por botão; janela sem moldura, arrastada pelo cabeçalho; tour de boas-vindas no primeiro uso.
- Gráfico de área próprio, sem biblioteca de terceiros, na Visão Geral.

### Empresa e sincronização

- Cada instalação se conecta a uma **empresa** com login (e-mail e senha) e um código tipo número de série (`GROW-XXXX-XXXX-XXXX`). Para ligar outro computador: copie a pasta ou instale, entre com o mesmo login e digite o código.
- Sincroniza leads, buscas, grupos, Lead Scoring, histórico, Fila do dia e mensagens rápidas, mesclando as mudanças dos dois lados sem perder nada. Sessão do WhatsApp, senha do Gmail e chave de IA ficam só em cada computador.
- **Versão web** em `prospector.growmaisoficial.com`: mesma interface no navegador e no celular. Robô do Maps, WhatsApp, e-mail e Kanban continuam no computador.
- Os dados ficam no Supabase da Grow+, com acesso por empresa (RLS). O modelo do e-mail de confirmação está em [docs/email](docs/email/confirmar-conta.html).

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
Sem conectar a empresa, nada sai do computador além das chamadas externas. Ao
conectar, os dados de trabalho (leads, buscas, grupos, Fila do dia e histórico)
também ficam na nuvem da Grow+, protegidos pelo login e pelo código da empresa.
Sessão do WhatsApp, senha do Gmail e chave de IA nunca saem do computador.
As chamadas externas acontecem para o Google Maps, os sites analisados, o
WhatsApp ou a API da Meta, o Gmail, o OpenStreetMap e a Wikipédia (sugestão de
local e foto da cidade), o provedor de IA que o usuário configurar e o
Supabase da Grow+, quando a empresa está conectada.

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
kanban/                            Funil comercial: etapas, regras e movimentos
utils/                             Bairros, busca por raio, e-mail do site, foto da cidade, endereço
docs/email/                        Modelo do e-mail de confirmação de conta (Supabase)
scripts/                           Build, carimbo do renderer, QA visual e atalho
test/                              Testes unitários e de integração
```

## Origem e licença

O Prospector 2.0 deriva do **Sigma GMaps Scraper**, de Ferdy, distribuído sob
licença MIT. O aviso de copyright original está preservado em
[LICENSE](LICENSE) e no [NOTICE](NOTICE), como a licença exige. As mudanças de marca, interface,
design system e funcionalidades feitas pela Grow+ seguem os mesmos termos.

MIT. Veja [LICENSE](LICENSE).
