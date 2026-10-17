'use strict';

/* ================= versão e novidades =================
   MAIOR.MENOR.CORREÇÃO, em 0.x enquanto o jogo está em desenvolvimento. MENOR sobe a cada leva de conteúdo novo,
   CORREÇÃO quando só conserta ou ajusta. Quem publicar sobe VERSAO e põe a entrada nova no topo de NOVIDADES. */
const VERSAO = '0.5.0';
const NOVIDADES = [
  {
    v: '0.5.0', data: '15/10/2026', titulo: 'A fazenda e a fogueira',
    itens: [
      'Descendo do barco e andando para a esquerda, depois da barraca, agora tem terra firme: a fazenda e, mais adiante, uma fogueira com panela, tábua e faca.',
      'Na fazenda, pare num canteiro e aperte E para plantar, regar ou colher. Regado, o canteiro cresce 2,5 vezes mais rápido até secar. Na placa depois do último canteiro dá para comprar mais.',
      'Na fogueira você cozinha: ponha até 5 ingredientes na panela, peixes e o que colheu. As combinações certas viram receitas, com efeitos diferentes, e entram no caderno; o resto vira um prato simples.',
      'Pratos novos: purê com cenoura e caldo de peixe. Efeito novo, Boa lábia: mais ouro nas vendas da barraca.',
      'A cozinha só cozinha com você na fogueira. Não existe mais a barra com todos os ofícios: cada ofício se usa no lugar dele. O cesto (I), a ficha (F) e o caderno de pesca (P) abrem em qualquer lugar.',
      'A mina e a forja ficam guardadas até ganharem um lugar no mundo.'
    ]
  },
  {
    v: '0.4.0', data: '15/10/2026', titulo: 'A barraca abre as portas',
    itens: [
      'Na barraca do pescador você vende seus peixes por ouro: um por um, todos de um tipo ou tudo de uma vez.',
      'Com o ouro dá para comprar quatro varas novas (carvalho, fibra, carbono e a vara do mestre), que já vêm equipadas.',
      'Iscas novas: grilo e isca brilhante, além de minhoca e isca de milho em pacotes. A melhor isca que você tiver é usada primeiro.',
      'Melhorias do barco: motor mais rápido, porta-vara (fisgada mais rápida), sonar (mais sorte) e toldo aquecido (mais calor para a Baía Gelada). Cada uma aparece no barco.',
      'O dinheiro do jogo agora se chama ouro.'
    ]
  },
  {
    v: '0.3.0', data: '15/10/2026', titulo: 'Rumo ao píer',
    itens: [
      'O barco anda! Use A e D (ou as setas) para navegar pelo lago, e o cenário passa em camadas, as montanhas devagar e a margem mais rápido.',
      'No canto esquerdo de todo ponto de pesca tem um píer com a barraca do pescador, onde a dona Lurdes atende.',
      'A loja agora fica na barraca: encoste o barco no píer, aperte E para descer, ande até o balcão e aperte E de novo.',
      'No celular aparecem setas na tela e um botão para fazer o mesmo que o E.',
      'O Modo calmo passou para a tecla C.'
    ]
  },
  {
    v: '0.2.0', data: '15/10/2026', titulo: 'Um lago de verdade',
    itens: [
      'Visual todo refeito: agora dá para ver embaixo d\'água, com peixes nadando, algas, pedras e raios de luz.',
      'Montanhas, floresta de outono, cabana com píer e o reflexo da margem ondulando na água.',
      'Na pesca, a boia fica na superfície, o anzol desce e você vê a sombra do peixe chegando e o peixe fisgado brigando.',
      'Barco novo com motor de popa e uma lanterna que acende de noite.',
      'Neblina de manhã, chuva de vez em quando, pássaros, patos, estrelas cadentes, cachoeira no Rio da Pedra e aurora na Baía Gelada.'
    ]
  },
  {
    v: '0.1.0', data: '15/10/2026', titulo: 'O primeiro barquinho',
    itens: [
      'Pesca no Lago Sereno, no Rio da Pedra e na Baía Gelada, com 18 peixes em 5 raridades e um caderno de pesca.',
      'Fisgar e puxar com a linha esticada, ou deixar no Modo calmo e só olhar a água.',
      'Cozinha com 12 receitas: pratos para vender ou comer e ganhar efeitos.',
      'Mina com 8 veios, forja com 5 metais, armaduras, varas e picaretas.',
      'Horta com 7 plantas que crescem até com o jogo fechado.',
      'Dia e noite, estrelas, vagalumes e neve.'
    ]
  }
];
