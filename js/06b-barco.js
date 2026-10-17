'use strict';

/* ================= o barco andando pelo lago, o píer e a barraca do pescador =================
   Como em Cast n Chill, A e D (ou as setas) levam o barco para os lados e a câmera vai junto, com o cenário correndo
   em camadas (js/06-cena.js). No canto esquerdo de todo ponto de pesca há um píer com a barraca do pescador: com o
   barco encostado, E desce do barco, o pescador anda pelo píer e, no balcão da barraca, E abre a loja (o Mercado).
   Seguindo para a esquerda, em terra, ficam a fazenda e a fogueira (js/06c-terra.js). De volta à ponta do píer, E embarca. A posição do barco fica salva em E.barco (x do mundo). */

const PIER = { fim: 96, balcao: 46 };   // o píer vai do x 0 ao fim; o pescador para no balcão da barraca
const VEL_BARCO = 40, VEL_PE = 30;
const PE = { ativo: false, atraca: false, x: 0, dir: -1, anda: 0, passo: 0, rega: 0 };
const teclas = { esq: false, dir: false };
let velBarco = 0, _motorT = 0;

const barcoMin = () => PIER.fim + 34;                       // encostado na ponta do píer
const barcoMax = () => Math.max(barcoMin(), MUNDO - 110);   // sobra água para lançar à direita
const pertoDoPier = () => !PE.ativo && !PE.atraca && E.barco <= barcoMin() + 30;
const naBarraca = () => PE.ativo && Math.abs(PE.x - PIER.balcao) <= 8;
const pertoDoBarco = () => PE.ativo && PE.x >= PIER.fim - 22;
const pescaLivre = () => !PE.ativo && !PE.atraca;           // a pesca só anda com o pescador no barco

function atualizaMundo(dt) {
  if (E.barco == null) E.barco = barcoMin() + 12;   // jogo novo começa encostado no píer
  E.barco = clamp(E.barco, barcoMin(), barcoMax());
  const livre = jogando && !painelAberto;
  const quer = livre ? (teclas.dir ? 1 : 0) - (teclas.esq ? 1 : 0) : 0;

  if (PE.atraca) {
    // encostando no píer antes de descer
    velBarco = 0;
    E.barco = Math.max(barcoMin(), E.barco - 45 * dt);
    if (E.barco <= barcoMin()) { PE.atraca = false; PE.ativo = true; PE.x = PIER.fim - 8; PE.dir = -1; sfx.embarca(); onda(BARCO.x - 30, WL, 6); }
  } else if (PE.ativo) {
    velBarco = 0;
    if (quer) {
      PE.dir = quer; PE.anda += dt;
      PE.x = clamp(PE.x + quer * VEL_PE * dt, TERRA.ini + 14, PIER.fim - 6);
      PE.passo -= dt; if (PE.passo <= 0) { PE.passo = 0.26; sfx.passo(); }
    } else { PE.anda = 0; PE.passo = 0; }
  } else {
    let d = quer;
    if (d && PESCA.estado === 'esperando') recolhe('Linha recolhida.');
    if (PESCA.estado !== 'parado') d = 0;   // lançando, com mordida ou puxando, o barco fica parado
    velBarco = lerp(velBarco, d * VEL_BARCO * (1 + doBarco('motor') / 100), Math.min(1, dt * (d ? 1.8 : 2.4)));
    if (!d && Math.abs(velBarco) < 0.5) velBarco = 0;
    const antes = E.barco;
    E.barco = clamp(E.barco + velBarco * dt, barcoMin(), barcoMax());
    if (E.barco === antes && d) velBarco = 0;
    if (Math.abs(velBarco) > 6) {
      // o motor faz espuma e bolhas atrás do barco
      const mx = BARCO.x - 35;
      if (Math.random() < dt * 9) onda(mx + rand(-3, 3), WL, 5);
      if (Math.random() < dt * 14) gotas.push({ x: mx, y: WL, vx: -Math.sign(velBarco) * rand(8, 25), vy: rand(-30, -12), t: 0 });
      if (Math.random() < dt * 12) bolhas.push({ x: mx + rand(-2, 2), y: WL + 9, t: 0 });
      _motorT -= dt; if (_motorT <= 0) { _motorT = 0.1; sfx.motor(); }
    }
  }

  // câmera: segue o barco (ou o pescador) com um pouco de atraso
  const foco = PE.ativo ? PE.x : E.barco + 10;
  const alvo = clamp(foco - W * 0.45, TERRA.ini, Math.max(TERRA.ini, MUNDO - W));
  CAM.x = Math.abs(alvo - CAM.x) > W ? alvo : lerp(CAM.x, alvo, Math.min(1, dt * 3));
  atualizaBotaoE();
}

/* E: descer do barco, abrir a loja ou embarcar, conforme onde o pescador está */
function apertaE() {
  if (!jogando) return;
  initAudio();
  if (painelAberto) { if (PAINEIS_DO_LUGAR.includes(painelAberto)) fechaPainel(); return; }
  if (PE.ativo) {
    if (pertoDoBarco()) embarca();
    else if (naBarraca()) abrePainel('mercado');
    else if (!acaoTerra(true)) aviso(PE.x > 0 ? 'Na esquerda ficam a barraca, a fazenda e a fogueira. O barco fica na ponta do píer.' : 'Ande até um canteiro ou até a fogueira e aperte E.');
  } else if (PE.atraca) return;
  else if (pertoDoPier()) desembarca();
  else aviso('O píer fica lá na esquerda: barraca, fazenda e fogueira.');
}
function desembarca() {
  if (PESCA.estado !== 'parado' && PESCA.estado !== 'esperando') { aviso('Termine de puxar o peixe primeiro.'); return; }
  recolhe(); velBarco = 0; PE.atraca = true;
}
function embarca() {
  PE.ativo = false; PE.anda = 0; PESCA.parado = 0;
  sfx.embarca(); onda(BARCO.x - 10, WL, 8); respingo(BARCO.x - 10, WL - 2, 4);
}

/* o botão "E" no HUD (também serve para tocar na tela do celular); fora do barco o painel da pesca encolhe para não
   cobrir a barraca, e o nome do lugar no canto muda (barraca, fazenda, fogueira) */
const PAINEIS_DO_LUGAR = ['mercado', 'fogueira', 'plantar'];
let _textoE = null, _noPier = null, _lugar = null;
function atualizaBotaoE() {
  const noPier = jogando && (PE.ativo || PE.atraca || (pertoDoPier() && PESCA.estado === 'parado'));
  if (noPier !== _noPier) { _noPier = noPier; document.body.classList.toggle('no-pier', noPier); }
  let txt = '';
  if (jogando && !painelAberto) {
    if (PE.ativo) txt = pertoDoBarco() ? 'Voltar ao barco' : naBarraca() ? 'Abrir a loja' : acaoTerra(false);
    else if (pertoDoPier()) txt = 'Descer do barco';
  }
  const lugar = jogando ? lugarAtual() || pontoAtual().nome : null;
  if (lugar !== _lugar) { _lugar = lugar; if (lugar) $('hLocal').textContent = lugar; }
  if (txt === _textoE) return;
  _textoE = txt;
  const b = $('bE'); if (!b) return;
  b.hidden = !txt; b.querySelector('span').textContent = txt;
}

/* ===== teclado e botões de toque ===== */
const TECLA_ESQ = ['ArrowLeft', 'KeyA'], TECLA_DIR = ['ArrowRight', 'KeyD'];
addEventListener('keydown', e => {
  if (!E || !jogando) return;
  if (TECLA_ESQ.includes(e.code)) { teclas.esq = true; if (!painelAberto) e.preventDefault(); }
  else if (TECLA_DIR.includes(e.code)) { teclas.dir = true; if (!painelAberto) e.preventDefault(); }
  else if (e.code === 'KeyE' && !e.repeat) apertaE();
});
addEventListener('keyup', e => {
  if (TECLA_ESQ.includes(e.code)) teclas.esq = false;
  else if (TECLA_DIR.includes(e.code)) teclas.dir = false;
});
addEventListener('blur', () => { teclas.esq = teclas.dir = false; });
$('bE').addEventListener('click', apertaE);
document.querySelectorAll('#setas button').forEach(b => {
  const lado = b.dataset.lado;
  const solta = () => { teclas[lado] = false; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); teclas[lado] = true; b.setPointerCapture?.(e.pointerId); });
  b.addEventListener('pointerup', solta); b.addEventListener('pointercancel', solta); b.addEventListener('lostpointercapture', solta);
});

/* ===== desenho: o píer, a barraca, o pescador a pé e a tecla E piscando ===== */
const HEROI_PE = [
  HEROI.slice(0, 16).concat(['...kppppppppk...', '....kppkkppk....', '....kppk.kppk...', '....kook.kook...']),
  HEROI.slice(0, 16).concat(['...kppppppppk...', '...kppkk.kppk...', '..kppk....kppk..', '..kook.....kook.']),
  HEROI.slice(0, 16).concat(['...kppppppppk...', '....kpppkpppk...', '.....kppkppk....', '.....kookook....'])
];

function desenhaPier(t, noite) {
  const D = WL - 5, P = fundo.P, tinta = luz(P.aguaFunda), fundoY = WL + fundo.chao0 + 6, L = c => luz(c);
  const naAgua = (c, y) => y > WL ? mistura(c, tinta, Math.min(0.8, 0.35 + (y - WL) * 0.012)) : c;
  // estacas até o fundo
  for (let x = 2; x < PIER.fim; x += 15) {
    for (let y = D + 3; y < fundoY; y++) {
      cx.fillStyle = naAgua(L('#4a3420'), y); cx.fillRect(x, y, 3, 1);
      cx.fillStyle = naAgua(L('#6e5034'), y); cx.fillRect(x, y, 1, 1);
    }
    cx.fillStyle = 'rgba(235,248,255,.5)'; cx.fillRect(x - 1 + (Math.floor(t * 2) % 2), WL, 5, 1);
  }
  const xf = PIER.fim - 3;
  for (let y = D + 3; y < fundoY; y++) { cx.fillStyle = naAgua(L('#4a3420'), y); cx.fillRect(xf, y, 3, 1); }
  // tábuas do deck
  cx.fillStyle = L('#1a1018'); cx.fillRect(0, D - 1, PIER.fim + 1, 1);
  cx.fillStyle = L('#b8905c'); cx.fillRect(0, D, PIER.fim, 1);
  cx.fillStyle = L('#8a6a44'); cx.fillRect(0, D + 1, PIER.fim, 1);
  cx.fillStyle = L('#5a4028'); cx.fillRect(0, D + 2, PIER.fim, 1);
  cx.fillStyle = L('#1a1018'); cx.fillRect(0, D + 3, PIER.fim + 1, 1); cx.fillRect(PIER.fim, D - 1, 1, 4);
  for (let x = 7; x < PIER.fim; x += 8) { cx.fillStyle = L('#6a4c30'); cx.fillRect(x, D, 1, 2); }
  if (P.neve) for (let x = 0; x < PIER.fim; x++) if (hash(x, 31) < 0.6) { cx.fillStyle = L('#eef4fa'); cx.fillRect(x, D - 1, 1, 1); }
  // poste de amarrar na ponta, com a corda até o barco
  cx.fillStyle = L('#1a1018'); cx.fillRect(PIER.fim - 5, D - 6, 4, 6);
  cx.fillStyle = L('#7a5634'); cx.fillRect(PIER.fim - 4, D - 5, 2, 5); cx.fillStyle = L('#9a7448'); cx.fillRect(PIER.fim - 4, D - 5, 1, 5);
  if (!PE.atraca && E.barco <= barcoMin() + 2) {
    cx.fillStyle = L('#d8c8a0');
    for (let i = 0; i <= 10; i++) cx.fillRect(PIER.fim - 2 + Math.round(i * 2.4), D - 4 + Math.round(Math.sin(i / 10 * Math.PI) * 3), 1, 1);
  }
  // rolo de corda e uma caixa de iscas no deck
  cx.fillStyle = L('#1a1018'); cx.fillRect(PIER.fim - 22, D - 4, 8, 4);
  cx.fillStyle = L('#c8b07a'); cx.fillRect(PIER.fim - 21, D - 3, 6, 3); cx.fillStyle = L('#9a8458'); cx.fillRect(PIER.fim - 19, D - 2, 2, 1);

  // a barraca: tábuas, telhado vermelho, toldo listrado, balcão com a dona Lurdes e a placa do peixe
  const x0 = 6, x1 = 54, w = x1 - x0, alto = 25, topo = D - 1 - alto;
  for (let y = topo; y < D - 1; y++) {
    const k = (y - topo) % 4;
    cx.fillStyle = L(k === 3 ? '#5e3a22' : k < 2 ? '#9a6640' : '#875632'); cx.fillRect(x0, y, w, 1);
  }
  cx.fillStyle = L('#2a1a12'); cx.fillRect(x0 - 1, topo, 1, alto); cx.fillRect(x1, topo, 1, alto);
  for (let j = 0; j < 9; j++) {
    const a = x0 - 5 + j, b = x1 + 5 - j;
    cx.fillStyle = L(j === 0 ? '#2a1a14' : j % 2 ? '#8e3a2a' : '#a8483a'); cx.fillRect(a, topo - 1 - j, b - a, 1);
    if (P.neve && j > 5) { cx.fillStyle = L('#f0f6ff'); cx.fillRect(a, topo - 1 - j, b - a, 1); }
  }
  if (P.neve) { cx.fillStyle = L('#f0f6ff'); cx.fillRect(x0 - 5, topo - 2, 3, 1); cx.fillRect(x1 + 2, topo - 2, 3, 1); }
  // placa com um peixe
  cx.fillStyle = L('#1a1018'); cx.fillRect(21, topo - 9, 20, 9);
  cx.fillStyle = L('#e8d8b0'); cx.fillRect(22, topo - 8, 18, 7);
  desenhaPeixe(35, topo - 5, 11, [L('#3e7aa0'), L('#cfe0e8'), L('#24506a')], 1, t * 0.3, '#000000', 0);
  // porta
  cx.fillStyle = L('#1a1018'); cx.fillRect(9, D - 18, 9, 17);
  cx.fillStyle = L('#5a3420'); cx.fillRect(10, D - 17, 7, 16); cx.fillStyle = L('#6e4228'); cx.fillRect(10, D - 17, 7, 1); cx.fillRect(10, D - 10, 7, 1);
  cx.fillStyle = L('#e0c060'); cx.fillRect(15, D - 10, 1, 1);
  // janela do balcão: dentro escuro (aceso de noite) e a dona Lurdes
  const acesa = Math.max(noite, pesoFase(QF, 'crep') * 0.8);
  const wx = 22, wy = D - 17, ww = 22, wh = 9;
  cx.fillStyle = L('#1a1018'); cx.fillRect(wx - 1, wy - 1, ww + 2, wh + 1);
  cx.fillStyle = acesa > 0.2 ? mistura(L('#2a1a12'), '#ffb050', 0.4 * acesa) : L('#2a1a12'); cx.fillRect(wx, wy, ww, wh);
  cx.fillStyle = L('#4a3020'); cx.fillRect(wx, wy + 3, ww, 1);   // prateleira
  for (const [px, c] of [[wx + 2, '#8ac0d0'], [wx + 5, '#e0a050'], [wx + 15, '#a0c060'], [wx + 18, '#e8d8b0']]) { cx.fillStyle = L(c); cx.fillRect(px, wy + 1, 2, 2); }
  const bal = Math.floor(t * 0.7) % 2;
  cx.fillStyle = L('#c8c4bc'); cx.fillRect(wx + 9, wy + 1 + bal, 5, 2); cx.fillRect(wx + 10, wy + bal, 3, 1);   // cabelo e coque
  cx.fillStyle = L('#e8b090'); cx.fillRect(wx + 9, wy + 3 + bal, 5, 3);
  cx.fillStyle = L('#1a1018'); cx.fillRect(wx + 12, wy + 4 + bal, 1, 1);
  cx.fillStyle = L('#5a7aa0'); cx.fillRect(wx + 8, wy + 6 + bal, 7, 3 - bal);
  // balcão com um peixe em cima
  cx.fillStyle = L('#1a1018'); cx.fillRect(wx - 2, wy + wh, ww + 4, 3);
  cx.fillStyle = L('#c8a070'); cx.fillRect(wx - 1, wy + wh, ww + 2, 1); cx.fillStyle = L('#7a5030'); cx.fillRect(wx - 1, wy + wh + 1, ww + 2, 1);
  desenhaPeixe(wx + 6, wy + wh - 1, 7, [L('#c8a050'), L('#f0e0b0'), L('#8a6a30')], 1, 0, '#000000', 0);
  // toldo listrado por cima da janela
  for (let x = wx - 3; x < wx + ww + 3; x++) {
    const lista = Math.floor((x - wx + 3) / 3) % 2;
    cx.fillStyle = L(lista ? '#e8dcc0' : '#c0503a'); cx.fillRect(x, wy - 4, 1, 3);
    if (lista) cx.fillRect(x, wy - 1, 1, 1);
  }
  cx.fillStyle = L('#1a1018'); cx.fillRect(wx - 3, wy - 5, ww + 6, 1);
  // barril do lado
  cx.fillStyle = L('#1a1018'); cx.fillRect(0, D - 10, 6, 9);
  cx.fillStyle = L('#8a5a34'); cx.fillRect(1, D - 9, 4, 7); cx.fillStyle = L('#4a4a50'); cx.fillRect(1, D - 8, 4, 1); cx.fillRect(1, D - 4, 4, 1);
  // lampião na quina, aceso de noite
  const lx = x1 + 2, ly = D - 22;
  cx.fillStyle = L('#2a2a2a'); cx.fillRect(x1, ly - 1, 3, 1); cx.fillRect(lx - 1, ly, 3, 1); cx.fillRect(lx - 1, ly + 5, 3, 1);
  cx.fillStyle = acesa > 0.2 ? '#ffd27a' : L('#8a9098'); cx.fillRect(lx - 1, ly + 1, 3, 4);
  if (acesa > 0.2) {
    const pisca = 0.9 + Math.sin(t * 8) * 0.06 + Math.sin(t * 21) * 0.04;
    VISUAL.brilho(lx, ly + 3, 48, '#ffc26d', acesa * pisca);
  }
}

function desenhaPescadorAPe(t, noite) {
  const D = WL - 5, quadro = PE.anda > 0 ? 1 + Math.floor(PE.anda * 8) % 2 : 0;
  const quente = (PE.x > 0 && PE.x < PIER.balcao + 20) || Math.abs(PE.x - FOGUEIRA.x) < 34;   // o lampião da barraca e a fogueira
  const L = c => noite > 0.3 && quente ? mistura(luz(c), mistura(c, '#ffb060', 0.25), 0.3 * noite) : luz(c);
  // Sombra projetada no chão; perto do fogo ela se afasta da fonte de luz.
  const direcao = noite > .3 && quente ? Math.sign(PE.x - (PE.x > 0 ? 56 : FOGUEIRA.x)) : Math.sin((faseAgora().h - 12) / 12 * Math.PI);
  cx.save(); cx.translate(Math.round(PE.x), D);
  cx.transform(1, 0, -direcao * .8, .16, 0, 0); cx.globalAlpha = .23;
  const sombra = Object.fromEntries(Object.keys(paletaHeroi(L)).map(c => [c, '#071a25']));
  sprite(HEROI_PE[quadro], -8, -20, sombra, PE.dir < 0); cx.restore();
  sprite(HEROI_PE[quadro], Math.round(PE.x) - 8, D - 20, paletaHeroi(L), PE.dir < 0);
}

function desenhaTeclaE(t) {
  if (!_textoE) return;
  let x, y;
  if (PE.ativo) { x = Math.round(PE.x); y = WL - 5 - 32; }
  else { x = BARCO.x - 4; y = BARCO.y - (E.barcoUp && E.barcoUp.toldo ? 46 : 36); }
  y += Math.round(Math.sin(t * 5) * 1);
  cx.fillStyle = '#1a1018'; cx.fillRect(x - 4, y - 1, 9, 10);
  cx.fillStyle = '#efe2c4'; cx.fillRect(x - 3, y, 7, 7);
  cx.fillStyle = '#a8997f'; cx.fillRect(x - 3, y + 7, 7, 1);
  cx.fillStyle = '#1a1018'; cx.fillRect(x - 1, y + 1, 1, 5); cx.fillRect(x, y + 1, 2, 1); cx.fillRect(x, y + 3, 2, 1); cx.fillRect(x, y + 5, 2, 1);
}
