# Slowfolk: como o código está organizado

Um RPG de progressão tranquilo em pixel art, no espírito de Cast n Chill: você pesca de um barquinho com o seu cachorro, e com o que pesca, minera e planta você cozinha, forja armaduras e abre lugares novos.

Abra `index.html` com dois cliques. Não precisa de servidor, de build nem de instalar nada. Na Vercel é um site estático: importe o repositório, sem framework e sem comando de build (o `vercel.json` só cuida das URLs e do cache das fontes).

A estrutura, o visual e as fontes seguem o Under Darkness: JavaScript puro em scripts numerados, tudo desenhado por código num canvas de baixa resolução esticado com pixels nítidos, painéis de pedra com moldura de bronze e a fonte pixel UD Pixel.

## Versão e novidades

A versão e as notas ficam em `js/11-versao.js` (`VERSAO` e `NOVIDADES`); a tela de início mostra as duas.

- O número segue MAIOR.MENOR.CORREÇÃO e fica em 0.x enquanto o jogo está em desenvolvimento.
- **MENOR** sobe a cada leva de conteúdo novo (ponto de pesca, ofício, tela nova): 0.1.0 → 0.2.0.
- **CORREÇÃO** sobe quando só conserta ou ajusta: 0.1.0 → 0.1.1.
- Quem publicar sobe `VERSAO` e põe a entrada nova no topo de `NOVIDADES`, escrita para o jogador.

## Como se joga

- **Pesca**: clique na água para lançar. Quando a boia afunda e aparece o "!", clique para fisgar. Depois segure (mouse ou Espaço) para puxar e solte quando a barra ficar vermelha ou o peixe estiver brigando; se a tensão encher, a linha arrebenta. O **Modo calmo** (tecla A) faz tudo sozinho, um pouco mais devagar e sem o bônus de sorte da pesca ativa, e continua pescando com o jogo fechado (até 8 horas).
- **Cozinha**: peixes e colheita viram pratos. Pratos vendem bem ou, comidos, dão efeitos (pesca mais rápida, sorte, mina mais rápida, experiência, calor).
- **Mina**: escolha um veio e ela fica minerando sozinha. De vez em quando sai uma ametista.
- **Forja**: a fornalha funde minério em barras; a bigorna faz armaduras (calor e sorte), varas (fisgada e força) e picaretas (velocidade na mina).
- **Horta**: compre sementes no mercado, plante e colha. Cresce pelo relógio de verdade. Colher às vezes dá minhocas (isca).
- **Pontos de pesca**: Lago Sereno, Rio da Pedra (nível 5 de pesca) e Baía Gelada (nível 12 e 8 de calor: armadura de ferro ou sopa apimentada).
- Atalhos: 1 a 8 abrem os painéis da doca, Esc fecha, A liga o Modo calmo, M liga e desliga o som.

## Arquivos

- `index.html`: o HTML do HUD, da doca e do painel, e a lista de scripts.
- `css/fonte.css`: as fontes locais (UD Pixel para tudo, Jersey 10 para o logo). Licenças em `fonts/OFL-*.txt`.
- `css/estilo.css`: cores (`:root`), HUD, doca, botões, cartões e o aviso de peixe pego.
- `css/paineis.css`: o conteúdo de cada painel (receitas, veios, canteiros, cesto, mercado, ficha).
- `css/titulo.css`: a tela de início.
- `css/botoes.css`: o "afundar" de todos os botões; fica por último.
- `js/`: o jogo, em scripts comuns (não são ES modules) carregados em ordem, todos dividindo as mesmas variáveis globais.

| Arquivo | O que tem |
|---|---|
| 00-texturas-ui | molduras de bronze, pedra e madeira da interface, pintadas no início em data URLs (`--tx-frame`, `--tx-frame-sm`, `--tx-stone`, `--tx-wood`) |
| 01-base | `$`, `clamp`, `lerp`, sorteios, formatação de números, tempo e peso, mistura de cores, `aviso()` |
| 02-dados | todo o conteúdo: raridades, pontos de pesca, peixes, veios, metais e peças, plantas, iscas, receitas, efeitos, habilidades e a curva de experiência. `ITENS` junta tudo que é item. Conteúdo novo entra aqui |
| 03-icones | os ícones 16x16 de cada item, desenhados por código a partir de `ITENS[id].ico` (forma + cores), com contorno automático; `icone(id)` e `icoHtml(id)` |
| 04-estado | o estado `E`, habilidades e níveis, inventário (`da`, `tira`, `tem`), equipamento, efeitos de comida, moedas e o save no navegador (`slowfolk-save`) |
| 05-audio | sons sintetizados no WebAudio, sem arquivos (`sfx.*`) |
| 06-cena | a cena: céu, sol e lua, estrelas, nuvens, montanhas, pinheiros, água com reflexo, barco, pescador (veste as cores da armadura) e cachorro, neve, gelo e vagalumes. Céu e paisagem são pintados em 4 paletas (dia, tarde, crepúsculo, noite) e cada quadro mistura duas. `PAISAGENS` define a cara de cada ponto de pesca |
| 07-pesca | a pesca: estados, mordida, fisgada, a briga com tensão e progresso, Modo calmo e a pesca com o jogo fechado |
| 08-oficios | mina, cozinha, forja e horta andando sozinhas; `tickOficios(dt)` aceita o tempo inteiro em que o jogo ficou fechado; `recuperaTempo()` |
| 09-paineis | os painéis da doca, um por função em `PAINEIS`, as ações (`data-a`) e a dica dos itens |
| 10-hud | moedas, relógio, nível de pesca, efeitos ativos, pontinhos da doca e atalhos de teclado |
| 11-versao | `VERSAO` e `NOVIDADES` |
| 12-titulo | a tela de início, o logo em latão e o resumo de "enquanto você estava fora" |
| 13-boot | início e laço principal |

## O que fica para as próximas versões

- Música ambiente (violão e lo-fi), chuva e mudanças de clima.
- Mais pontos de pesca (pântano, mar aberto, caverna subterrânea) e peixes de noite ou de chuva.
- Upgrades do barco e do cachorro (o cachorro trazer itens, por exemplo).
- Joias com as ametistas e outras gemas, encantamentos nas peças.
- Tarefas e encomendas dos moradores da vila, com recompensas.
- Opções (volume, tamanho da interface), exportar e importar o save.
- Balanceamento de preços, tempos e experiência depois de jogar bastante.
