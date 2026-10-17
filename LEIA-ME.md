# Slowfolk: como o código está organizado

Um RPG de progressão tranquilo em pixel art, no espírito de Cast n Chill: você pesca de um barquinho com o seu cachorro, planta na fazenda e cozinha na fogueira o que pescou e colheu. Os ofícios conversam entre si, e cada um só se usa estando no lugar dele.

Abra `index.html` com dois cliques. Não precisa de servidor, de build nem de instalar nada. Na Vercel é um site estático: importe o repositório, sem framework e sem comando de build (o `vercel.json` só cuida das URLs e do cache das fontes).

A estrutura, o visual e as fontes seguem o Under Darkness: JavaScript puro em scripts numerados, tudo desenhado por código num canvas de baixa resolução esticado com pixels nítidos, painéis de pedra com moldura de bronze e a fonte pixel UD Pixel.

## Visual e desempenho

O botão **Visual: cinema / leve**, no menu e no canto inferior direito durante o jogo, controla os efeitos. A preferência é salva em `slowfolk-visual`, separada do progresso. O modo cinema acrescenta iluminação em pixel art, partículas, vegetação próxima e um shader WebGL com bloom suave, correção de cor, refração e cáusticas (os desenhos de luz embaixo d'água). O modo leve mantém as novas paisagens e sprites, reduzindo os efeitos e usando apenas Canvas 2D.

`js/06d-visual.js` apresenta o canvas original em um segundo canvas, na mesma resolução baixa e sem suavizar os pixels. A interface e os controles continuam no HTML/canvas original. Sem WebGL, ou durante uma perda de contexto gráfico, o jogo continua com o renderizador 2D; quando o contexto volta, os efeitos são restaurados. A preferência do sistema por movimento reduzido pausa os novos efeitos decorativos de vento e refração. As luzes são texturas reutilizadas, e a paisagem estática continua em cache por fase do dia.

Para validar em um servidor local: `python3 -m http.server 8000 --bind 127.0.0.1`. Com Python, Playwright e Chromium disponíveis, rode `python3 tests/visual_smoke.py`. O teste cobre os três pontos de pesca, horários, chuva, celular, controles, save, modo leve e perda/restauração de WebGL. Opcionalmente, `SLOWFOLK_SCREENSHOTS=/tmp/slowfolk-capturas` salva as capturas desta execução; `SLOWFOLK_URL` altera o endereço e `CHROMIUM_PATH` seleciona o executável do navegador. Essas ferramentas são apenas de validação, sem dependências de execução do site.

## Som

O áudio é sintetizado com Web Audio e só começa após uma interação. Lago, rio e baía têm camadas estéreo de água, espuma e vento, com transições graduais, chuva e menor volume em terra ou durante a briga com o peixe. O carretel muda com a tensão, e mordida, fisgada e captura têm sons diferentes. Use **M** ou **Som: ligado/desligado** para controlar todo o áudio; a preferência fica salva em `slowfolk-mudo`. Ao sair da aba, o contexto de áudio é suspenso. Não há arquivos de áudio para baixar. `python3 tests/audio_smoke.py` valida a saída de áudio, o controle de som e a ambientação com Playwright/Chromium.

## Versão e novidades

A versão e as notas ficam em `js/11-versao.js` (`VERSAO` e `NOVIDADES`); a tela de início mostra as duas.

- O número segue MAIOR.MENOR.CORREÇÃO e fica em 0.x enquanto o jogo está em desenvolvimento.
- **MENOR** sobe a cada leva de conteúdo novo (ponto de pesca, ofício, tela nova): 0.1.0 → 0.2.0.
- **CORREÇÃO** sobe quando só conserta ou ajusta: 0.1.0 → 0.1.1.
- Quem publicar sobe `VERSAO` e põe a entrada nova no topo de `NOVIDADES`, escrita para o jogador.

## Como se joga

- **Pesca**: clique na água para lançar. Quando a boia afunda e aparece o "!", clique para fisgar. Depois segure (mouse ou Espaço) para puxar e solte quando a barra ficar vermelha ou o peixe estiver brigando; se a tensão encher, a linha arrebenta. O **Modo calmo** (tecla C) faz tudo sozinho, um pouco mais devagar e sem o bônus de sorte da pesca ativa, e continua pescando com o jogo fechado (até 8 horas).
- **Cada ofício no seu lugar**: não há barra de ofícios. Para usar um ofício, o pescador tem que estar no lugar dele: pescar no barco, comprar e vender no balcão da barraca, plantar no canteiro, cozinhar na fogueira. O E faz a coisa certa em cada lugar. O cesto (I), a ficha (F) e o caderno de pesca (P) abrem em qualquer lugar.
- **Barco e píer**: A e D (ou as setas) levam o barco para os lados; a câmera acompanha e o cenário corre em camadas (parallax). No canto esquerdo de todo ponto de pesca há um píer com a barraca do pescador. Com o barco encostado, E desce do barco; o pescador anda (A/D) e, no balcão, E abre a barraca. Na barraca você vende peixes (e o resto) por ouro e compra varas, iscas, sementes e melhorias do barco (motor, porta-vara, sonar e toldo aquecido). Na ponta do píer, E embarca de novo. No celular aparecem setas na tela e o botão do E.
- **Fazenda** (em terra, à esquerda da barraca): no canteiro, E planta (escolha a semente), rega ou colhe. As plantas crescem pelo relógio de verdade, até com o jogo fechado; regado, o canteiro fica molhado por um tempo e cresce 2,5 vezes mais rápido (`REGA`). Na placa depois do último canteiro, E compra outro. Colher às vezes dá minhocas (isca).
- **Cozinha** (na fogueira, depois da fazenda): ponha até 5 ingredientes na panela (peixes e colheita). Se a mistura é exatamente uma receita de `RECEITAS`, sai o prato dela (e a receita entra no caderno na primeira vez); qualquer outra mistura vira um prato simples (`PRATOS_SIMPLES`). As receitas que ainda não descobriu aparecem com uma dica. Só cozinha com o pescador perto da fogueira. Pratos vendem bem ou, comidos, dão efeitos (pesca mais rápida, sorte, experiência, calor, mais ouro nas vendas).
- **Mina e forja**: o código continua (veios, metais, armaduras, varas e picaretas), mas estão guardadas até ganharem um lugar no mundo; não andam e não têm botão.
- **Pontos de pesca**: Lago Sereno, Rio da Pedra (nível 5 de pesca) e Baía Gelada (nível 12 e 8 de calor: armadura de ferro ou sopa apimentada).
- Atalhos: A/D ou setas movem o barco (ou o pescador em terra), E faz a ação do lugar (descer, loja, plantar, regar, colher, cozinhar, embarcar), I abre o cesto, F a ficha, P o caderno de pesca, Esc fecha, C liga o Modo calmo, M liga e desliga o som.

## Arquivos

- `index.html`: o HTML do HUD (ouro, relógio, pesca, cesto e ficha, botão do E) e do painel, e a lista de scripts.
- `css/fonte.css`: as fontes locais (UD Pixel para tudo, Jersey 10 para o logo). Licenças em `fonts/OFL-*.txt`.
- `css/estilo.css`: cores (`:root`), HUD, botões, cartões e o aviso de peixe pego.
- `css/paineis.css`: o conteúdo de cada painel (fogueira e panela, plantar, cesto, barraca, ficha, pesca).
- `css/titulo.css`: a tela de início.
- `css/botoes.css`: o "afundar" de todos os botões; fica por último.
- `js/`: o jogo, em scripts comuns (não são ES modules) carregados em ordem, todos dividindo as mesmas variáveis globais.

| Arquivo | O que tem |
|---|---|
| 00-texturas-ui | molduras de bronze, pedra e madeira da interface, pintadas no início em data URLs (`--tx-frame`, `--tx-frame-sm`, `--tx-stone`, `--tx-wood`) |
| 01-base | `$`, `clamp`, `lerp`, sorteios, formatação de números, tempo e peso, mistura de cores, `aviso()` |
| 02-dados | todo o conteúdo: raridades, pontos de pesca, peixes, veios, metais e peças, plantas, iscas, receitas, efeitos, habilidades e a curva de experiência. `ITENS` junta tudo que é item. O que a barraca vende fica em `ISCAS_LOJA`, `VARAS_LOJA` e `UPGRADES_BARCO`. Conteúdo novo entra aqui |
| 03-icones | os ícones 16x16 de cada item, desenhados por código a partir de `ITENS[id].ico` (forma + cores), com contorno automático; `icone(id)` e `icoHtml(id)` |
| 04-estado | o estado `E`, habilidades e níveis, inventário (`da`, `tira`, `tem`), equipamento, efeitos de comida, melhorias do barco (`doBarco`), ouro (`E.moedas`) e o save no navegador (`slowfolk-save`) |
| 05-audio | efeitos de pesca, ruído estéreo reutilizável, mixer com compressor e mudo global, ambientação por local e chuva, suspensão ao ocultar a aba (`sfx.*`, `atualizaAudio`) |
| 06-cena | a cena vista de lado, como em Cast n Chill: céu, sol, lua, estrelas e aurora, nuvens, montanhas, floresta de pinheiros e árvores de outono, cabana, cachoeira, a faixa de superfície com o reflexo ondulando e, embaixo da linha d'água (`WL`), a vista submersa com chão, algas, raios de luz e o cardume (`desenhaPeixe` pinta qualquer peixe a partir das cores do item). Também o barco com motor e lanterna, o pescador (veste as cores da armadura), o cachorro, neblina, chuva, neve, pássaros e patos. Tudo que não mexe é pintado uma vez em 4 paletas (dia, tarde, crepúsculo, noite) e cada quadro mistura duas; `luz(cor)` dá a cor na luz do quadro. `PAISAGENS` define a cara de cada ponto de pesca. O lago tem a largura `MUNDO` (mais que a tela) e a câmera `CAM` anda junto com o barco: o céu fica parado, cada camada de paisagem anda na fração de `PAR`, e o que está na água (peixes, plantas, píer, barco, boia) usa x do mundo. O reflexo é copiado a cada quadro da parte de cima da tela |
| 06b-barco | o barco andando (A/D, setas), a câmera seguindo, o píer com a barraca do pescador no x = 0, o pescador descendo e andando, a tecla E (descer, abrir a loja, embarcar; em terra chama `acaoTerra`), o nome do lugar no HUD e as setas de toque |
| 06c-terra | a terra à esquerda do píer (de `TERRA.ini` até o x 0): o chão parado pintado por paleta (`geraTerra`: campo, trilha, terra em corte, muro do cais, cerca, árvores), os canteiros da fazenda (`xCanteiro(i)`) com as plantas crescendo, a placa do canteiro novo, a fogueira com tripé, panela, tábua e cesto, e o que o E faz em terra (`acaoTerra`) |
| 06d-visual | iluminação reutilizável, atmosfera, vegetação em primeiro plano, preferência de qualidade e apresentação opcional em WebGL com refração, cáusticas, bloom e cor; fallback automático para Canvas 2D |
| 07-pesca | a pesca: estados, mordida, fisgada, a briga com tensão e progresso, Modo calmo e a pesca com o jogo fechado; a boia fica na linha d'água e o anzol, a sombra do peixe chegando e o peixe fisgado aparecem embaixo d'água |
| 08-oficios | a cozinha (panela, `pratoDaPanela`, só anda perto da fogueira), a fazenda (`crescido`, `rega`, `planta`, `colhe`), a mina e a forja guardadas; `tickOficios(dt)`; `recuperaTempo()` |
| 09-paineis | os painéis, um por função em `PAINEIS` (`ONDE` diz em que lugar cada ofício abre), as ações (`data-a`) e a dica dos itens |
| 10-hud | ouro, relógio, nível de pesca, efeitos ativos e atalhos de teclado (I, F, P, C, M, Esc) |
| 11-versao | `VERSAO` e `NOVIDADES` |
| 12-titulo | a tela de início, o logo em latão e o resumo de "enquanto você estava fora" |
| 13-boot | início e laço principal |

## O que fica para as próximas versões

- Música ambiente (violão e lo-fi), chuva e mudanças de clima.
- Mais pontos de pesca (pântano, mar aberto, caverna subterrânea) e peixes de noite ou de chuva.
- Upgrades do barco e do cachorro (o cachorro trazer itens, por exemplo).
- Um lugar no mundo para a mina e para a forja (e aí voltam os botões delas pelo E).
- Joias com as ametistas e outras gemas, encantamentos nas peças.
- Tarefas e encomendas dos moradores da vila, com recompensas.
- Opções (volume, tamanho da interface), exportar e importar o save.
- Balanceamento de preços, tempos e experiência depois de jogar bastante.
