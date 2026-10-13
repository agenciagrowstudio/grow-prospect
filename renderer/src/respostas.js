/**
 * Respostas prontas do roteiro de atendimento da Grow+: objeções, lead
 * inbound, depois da reunião e depois da proposta. Texto do próprio roteiro;
 * o [Nome do Cliente] entra quando a pessoa digita o nome, e sem ele a frase
 * continua correta.
 */

// "Entendo, Nayara." / "Entendo."
const v = (nome) => (nome ? `, ${nome}` : '');
// "Nayara, podemos avaliar" / "Podemos avaliar"
const ini = (nome, resto) => (nome ? `${nome}, ${resto}` : resto.charAt(0).toUpperCase() + resto.slice(1));
// "Oi Nayara!" / "Oi!"
const oi = (nome) => `Oi${nome ? ` ${nome}` : ''}!`;

export const GRUPOS_RESPOSTAS = [
  { id: 'objecoes', nome: 'Objeções' },
  { id: 'inbound', nome: 'Lead inbound' },
  { id: 'reuniao', nome: 'Depois da reunião' },
  { id: 'proposta', nome: 'Depois da proposta' },
  { id: 'perfil', nome: 'Sem perfil' },
];

export const RESPOSTAS = [
  {
    grupo: 'objecoes', titulo: 'Está caro',
    texto: (n) => `Entendo${v(n)}. É importante que o investimento faça sentido para o momento da empresa.\n\nMas também precisamos comparar com o custo de continuar sem constância, sem direção e com uma comunicação que talvez não transmita a qualidade real do negócio.\n\nO que pesou mais para você: o valor mensal ou o retorno que ainda não ficou claro?`,
  },
  {
    grupo: 'objecoes', titulo: 'Vou pensar',
    texto: (n) => `Claro${v(n)}, é uma decisão importante.\n\nPara eu não te deixar pensando sem as informações certas: qual ponto você sente que ainda precisa avaliar melhor?`,
  },
  {
    grupo: 'objecoes', titulo: 'Preciso falar com meu sócio',
    texto: (n) => `Sem problema${v(n)}. É importante que os dois estejam seguros sobre a decisão.\n\nPosso preparar um resumo com o cenário que identificamos, a solução recomendada e os próximos passos para facilitar essa conversa.\n\nQuando vocês acreditam que conseguem avaliar juntos?`,
  },
  {
    grupo: 'objecoes', titulo: 'Estou pesquisando outras agências',
    texto: (n) => `Faz sentido comparar${v(n)}.\n\nSó recomendo que você não compare apenas quantidade de posts, vídeos ou artes. Compare quem realmente vai entender o negócio, definir uma direção e assumir o peso da execução.\n\nAlém do preço, quais critérios estão sendo mais importantes nessa escolha?`,
  },
  {
    grupo: 'objecoes', titulo: 'Agora não é o momento',
    texto: (n) => `Entendo${v(n)}.\n\nSó vale analisar se realmente não é o momento ou se a falta de estrutura está fazendo a empresa adiar justamente aquilo que poderia ajudar no crescimento.\n\nO que precisaria acontecer para esse projeto se tornar uma prioridade?`,
  },
  {
    grupo: 'objecoes', titulo: 'Não tenho orçamento',
    texto: (n) => `Entendo${v(n)}. Não faria sentido assumir algo que comprometa o caixa da empresa.\n\nAo mesmo tempo, precisamos avaliar se a falta de investimento na comunicação não está limitando a entrada de novos clientes.\n\nHoje, qual faixa de investimento seria viável para vocês?`,
  },
  {
    grupo: 'objecoes', titulo: 'Quero começar com algo menor',
    texto: (n) => `${ini(n, 'podemos avaliar uma entrada mais pontual, desde que ela tenha um objetivo claro.')}\n\nA ideia não é reduzir o projeto até ele perder o sentido, mas definir uma primeira etapa que já ajude a empresa a avançar.\n\nQual seria a prioridade número um hoje?`,
  },
  {
    grupo: 'objecoes', titulo: 'Quero fazer um teste primeiro',
    texto: (n) => `${ini(n, 'entendo a necessidade de segurança.')}\n\nO ponto é que crescimento e posicionamento dificilmente podem ser avaliados por uma peça isolada ou poucos dias de trabalho. Precisamos de tempo suficiente para planejar, executar, analisar e ajustar.\n\nO que você precisaria enxergar para se sentir seguro em avançar?`,
  },
  {
    grupo: 'objecoes', titulo: 'Vocês garantem resultados?',
    texto: (n) => `${ini(n, 'nós garantimos estratégia, qualidade de execução, acompanhamento e melhoria contínua.')}\n\nO que nenhuma empresa séria deveria prometer é um número exato de vendas sem considerar oferta, atendimento, mercado, investimento e capacidade comercial.\n\nNosso trabalho é construir uma comunicação muito mais preparada para gerar confiança, oportunidades e crescimento.`,
  },
  {
    grupo: 'objecoes', titulo: 'Já tive uma experiência ruim com agência',
    texto: (n) => `Entendo${v(n)}, e isso é mais comum do que deveria.\n\nMuitas empresas recebem posts e relatórios, mas continuam sem direção, sem acompanhamento e sem saber o que realmente está sendo construído.\n\nNa Grow+, a proposta é diferente: entender o negócio, definir prioridades e atuar como parceiro de crescimento, não apenas como fornecedor de peças.\n\nO que mais te frustrou na experiência anterior?`,
  },
  {
    grupo: 'objecoes', titulo: 'Eu mesmo consigo fazer',
    texto: (n) => `Com certeza${v(n)}. A questão não é apenas conseguir fazer, mas quanto tempo isso consome, com qual frequência é executado e qual resultado está gerando.\n\nNormalmente, a Grow+ entra quando o empreendedor percebe que precisa parar de carregar toda a execução sozinho e voltar a focar no crescimento do negócio.\n\nHoje essa parte está funcionando bem ou acaba ficando para depois?`,
  },
  {
    grupo: 'objecoes', titulo: 'Preciso contratar alguém interno',
    texto: () => 'Pode ser uma opção.\n\nMas contratar uma única pessoa raramente resolve estratégia, design, vídeo, conteúdo, tráfego, branding e análise ao mesmo tempo.\n\nA Grow+ entra justamente para oferecer uma estrutura integrada sem que você precise montar e gerenciar um departamento inteiro.',
  },
  {
    grupo: 'inbound', titulo: 'Dia seguinte: visualizou e não respondeu',
    texto: (n) => `${oi(n)} Passando por aqui sem intenção de cobrar uma resposta.\n\nComo você procurou a Grow+ porque existe algo que gostaria de melhorar, não queria deixar essa conversa se perder no meio da rotina.\n\nDependendo do cenário, continuar adiando essa estrutura pode significar mais tempo perdido e oportunidades de venda passando despercebidas.\n\nAinda faz sentido conversarmos?`,
  },
  {
    grupo: 'reuniao', titulo: 'Depois da reunião',
    texto: (n) => `${oi(n)} Gostei bastante da nossa conversa.\n\nPelo que identificamos, existe uma oportunidade clara de melhorar a forma como a empresa se posiciona, mantém consistência e transforma comunicação em novas oportunidades.\n\nFicou alguma dúvida ou algum ponto que você gostaria de entender melhor antes de avançarmos?`,
  },
  {
    grupo: 'proposta', titulo: 'Depois da proposta',
    texto: (n) => `${oi(n)} Conseguiu analisar a proposta?\n\nMais do que saber se você gostou do documento, quero entender se a solução apresentada faz sentido para o momento e para os objetivos da empresa.\n\nExiste algum ponto que esteja impedindo a decisão?`,
  },
  {
    grupo: 'proposta', titulo: 'Visualizou a proposta e sumiu',
    texto: (n) => `${oi(n)} Sei que a rotina acaba engolindo algumas decisões, então estou retomando nossa conversa.\n\nA proposta foi construída a partir dos problemas que você nos apresentou. E quanto mais tempo a empresa continua sem resolver esses pontos, mais oportunidades podem continuar sendo perdidas.\n\nO que você precisa para conseguirmos definir o próximo passo?`,
  },
  {
    grupo: 'perfil', titulo: 'Quando o lead não tem perfil',
    texto: (n) => `${ini(n, 'pelo que você me explicou, acredito que nossa estrutura completa ainda não seja a melhor opção para o momento da empresa.')}\n\nPrefiro ser transparente em vez de te vender algo que talvez não faça sentido agora.\n\nMinha recomendação é organizar primeiro as prioridades internas e, quando houver espaço para investir em uma comunicação mais estruturada, podemos retomar a conversa.`,
  },
  {
    grupo: 'perfil', titulo: 'Quando o lead quer apenas preço baixo',
    texto: (n) => `${ini(n, 'entendo que o valor é um critério importante.')}\n\nMas a Grow+ provavelmente não será a melhor escolha caso a decisão esteja baseada apenas em encontrar a opção mais barata.\n\nNosso trabalho envolve estratégia, direção e execução integrada para ajudar a empresa a crescer. Não competimos apenas por quantidade de peças ou menor preço.`,
  },
];
