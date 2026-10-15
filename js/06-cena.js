'use strict';

/* ================= a cena: céu, montanhas, floresta, o lago visto de lado e por baixo d'água =================
   Como em Cast n Chill, a câmera fica de lado: em cima a paisagem e o céu, no meio a superfície do lago com o reflexo
   da margem, e embaixo da linha d'água a vista submersa, com peixes nadando, plantas, pedras e raios de luz.
   A tela é pintada numa resolução baixa (cerca de 240 linhas) e esticada com pixels nítidos.
   Tudo que não mexe (céu, montanhas, árvores, reflexo, fundo do lago, neblina) é pintado uma vez em 4 paletas
   (dia, tarde, crepúsculo, noite) quando a tela muda de tamanho ou de ponto de pesca; cada quadro só mistura as duas
   paletas da hora e desenha por cima o que mexe.
   O lago é mais largo que a tela (MUNDO) e a câmera (CAM) acompanha o barco: o céu fica parado, as montanhas de longe
   andam devagar, as do meio um pouco mais, a margem mais ainda, e a água, o fundo e o barco andam junto (parallax).
   O que fica na água (peixes, plantas, boia, píer, barco) está em coordenadas do mundo; o resto, em coordenadas da tela. */

const cv = $('screen'), cx = cv.getContext('2d');
let W = 420, H = 240, K = 3;          // largura, altura (pixels do jogo) e o tamanho de cada pixel na tela
let HOR = 100;                        // a margem de lá (pé das árvores)
let WL = 134;                         // a linha d'água onde o barco boia; embaixo dela é a vista submersa
let MUNDO = 1200;                     // largura do lago inteiro (o píer fica no x = 0)
const CAM = { x: 0 };                 // onde começa a tela, em x do mundo
const PAR = { longe: 0.1, medio: 0.22, terra: 0.42 };   // quanto cada camada anda quando a câmera anda 1
const largCamada = f => Math.ceil(W + (MUNDO - TERRA.ini - W) * f) + 2;   // a câmera vai de TERRA.ini (a fazenda) até o fim do lago
const FASES = ['dia', 'tarde', 'crep', 'noite'];
const CEUS = {
  dia: { topo: '#3a82cc', meio: '#74b4e2', base: '#cfe8ec', nevoa: '#d6eaee', nuvem: ['#ffffff', '#e0eaf2', '#a9bcd4'], sol: '#fffae0', halo: '#fff0b0' },
  tarde: { topo: '#4c6ebc', meio: '#ae98c0', base: '#ffcc90', nevoa: '#f2d0b0', nuvem: ['#fff2dc', '#f4c6a4', '#bc8c9c'], sol: '#fff2c4', halo: '#ffc070' },
  crep: { topo: '#1e2254', meio: '#783e76', base: '#f2825a', nevoa: '#bc7486', nuvem: ['#ffb48a', '#de7670', '#743e66'], sol: '#ffdc94', halo: '#ff8a50' },
  noite: { topo: '#05081c', meio: '#0e1536', base: '#232e5a', nevoa: '#28325e', nuvem: ['#48528a', '#323a6a', '#1e2448'], sol: '#eef0ff', halo: '#7a8ad0' }
};
// como cada fase pinta as coisas: escurece (k) e puxa para uma tinta (tk)
const LUZES = {
  dia: { k: 1, tinta: '#fff4e0', tk: 0 },
  tarde: { k: 0.95, tinta: '#ffa868', tk: 0.13 },
  crep: { k: 0.7, tinta: '#b8507a', tk: 0.24 },
  noite: { k: 0.34, tinta: '#18204c', tk: 0.42 }
};
// a hora do dia em quadros-chave: [hora, fase]
const HORAS = [[0, 'noite'], [4.5, 'noite'], [5.5, 'crep'], [6.5, 'tarde'], [8, 'dia'], [16, 'dia'], [17.5, 'tarde'], [18.7, 'crep'], [19.8, 'noite'], [24, 'noite']];

/* cada ponto de pesca tem a sua paisagem */
const PAISAGENS = {
  lago: {
    semente: 7, amp: [0.30, 0.17], montes: ['#8a9cc0', '#64809e'], neveMonte: 0.18, colina: '#46705a',
    pinho: ['#5c9450', '#38693c', '#214428'], folhas: [['#eab048', '#c87a2c', '#8a4c1c'], ['#e07034', '#b44c26', '#7a3018'], ['#7aa244', '#527c30', '#2f5420'], ['#d8c050', '#a89434', '#6a5c20']], fracFolha: 0.38,
    margem: '#6e6a48', pedra: '#8a8a80', agua: '#3e98ae', aguaFunda: '#0f3650', chao: '#8e7e54', pedraFundo: '#6a7064', alga: ['#6a9a48', '#3e6a30'],
    grama: '#6c9c46', chaoTerra: '#6a4a2e',
    corr: 2, vagalumes: true, cabana: true, juncos: true, nenufares: true, patos: true
  },
  rio: {
    semente: 21, amp: [0.34, 0.24], montes: ['#a898a8', '#8a6e64'], neveMonte: 0, colina: '#557050',
    pinho: ['#5e9050', '#3a6438', '#223e26'], folhas: [['#8aaa48', '#5c8034', '#36561e']], fracFolha: 0.2,
    margem: '#8a7a5a', pedra: '#9a8e7c', agua: '#3ea094', aguaFunda: '#0f3a40', chao: '#8a8070', pedraFundo: '#7a746a', alga: ['#7a9a40', '#4a6a2a'],
    grama: '#7c9a4c', chaoTerra: '#6e5236',
    corr: 14, vagalumes: true, paredao: true, cachoeira: true, juncos: true
  },
  baia: {
    semente: 33, amp: [0.34, 0.22], montes: ['#b4c4dc', '#7484a0'], neveMonte: 0.42, colina: '#5a7480',
    pinho: ['#4a7470', '#2e5050', '#1a3236'], folhas: [], fracFolha: 0,
    margem: '#dce8f0', pedra: '#8a98a8', agua: '#2e6c94', aguaFunda: '#0a2238', chao: '#5a6470', pedraFundo: '#465260', alga: ['#6a7a3a', '#3e4a24'],
    chaoTerra: '#5a4a3e',
    corr: 4, neva: true, gelo: true, neve: true, aurora: true
  }
};

let fundo = null;   // tudo que é pintado uma vez (ver geraFundo)

function ajustaTela() {
  K = Math.max(2, Math.round(Math.min(innerHeight / 240, innerWidth / 360)));
  W = Math.ceil(innerWidth / K); H = Math.ceil(innerHeight / K);
  cv.width = W; cv.height = H;
  HOR = Math.round(H * 0.42);
  WL = Math.round(H * 0.56);
  MUNDO = Math.round(Math.max(W * 2.6, 960));
  cx.imageSmoothingEnabled = false;
  fundo = null;
}
addEventListener('resize', ajustaTela);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
function tela(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };

// cor de um objeto na luz de uma fase, com névoa (puxa para a cor do ar) para dar distância
function naLuz(cor, fase, nevoa = 0) {
  const L = LUZES[fase];
  let c = mistura(escurece(cor, L.k), L.tinta, L.tk);
  if (nevoa) c = mistura(c, CEUS[fase].nevoa, nevoa);
  return c;
}
// a mesma cor na luz do quadro atual (mistura das duas fases), com cache por quadro
let QF = { a: 'dia', b: 'dia', t: 0 };
const _luzCache = new Map();
function luz(cor, nevoa = 0) {
  const ch = cor + nevoa;
  let c = _luzCache.get(ch);
  if (!c) { c = QF.t > 0 ? mistura(naLuz(cor, QF.a, nevoa), naLuz(cor, QF.b, nevoa), QF.t) : naLuz(cor, QF.a, nevoa); _luzCache.set(ch, c); }
  return c;
}

// gradiente em faixas com pontilhado (o jeito pixel art de fazer degradê)
function pintaGrad(ctx, x0, y0, w, h, cores, faixas, curva = 1) {
  const img = ctx.createImageData(w, h), D = img.data, C = cores.map(hexRgb);
  for (let y = 0; y < h; y++) {
    const t = Math.pow(y / Math.max(1, h - 1), curva) * faixas, i = Math.floor(t), fr = t - i;
    for (let x = 0; x < w; x++) {
      const k = Math.min(faixas, i + (fr > bayer(x, y) ? 1 : 0)) / faixas;
      const s = k * (C.length - 1), j = Math.min(C.length - 2, Math.floor(s)), u = s - j;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) D[o + c] = C[j][c] + (C[j + 1][c] - C[j][c]) * u;
      D[o + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

/* ===== peças da paisagem ===== */

// perfil de relevo: senos de frequências diferentes somados, normalizado para 0..1, virado em linha do topo
function perfil(rnd, amp, base, esc, larg = W) {
  const f = [[0.008, 0.5], [0.019, 0.28], [0.043, 0.14], [0.097, 0.06], [0.23, 0.02]], fs = f.map(() => rnd() * 9), v = [];
  for (let x = 0; x < larg; x++) { let y = 0; f.forEach(([q, p], i) => { y += Math.sin(x * q * esc + fs[i]) * p; }); v.push(y); }
  let mn = Infinity, mx = -Infinity; for (const y of v) { if (y < mn) mn = y; if (y > mx) mx = y; }
  return v.map(y => Math.round(base - (y - mn) / (mx - mn || 1) * amp));
}

// montanha com face iluminada (o sol vem da esquerda), sombra e neve no alto
function montanha(x, topo, base, cor, neve, f, nev) {
  const c = naLuz(cor, f, nev), cl = naLuz(mistura(cor, '#ffffff', 0.22), f, nev), cs = naLuz(escurece(cor, 0.78), f, nev);
  const nl = naLuz('#f4f8ff', f, nev * 0.8), ns = naLuz('#b8c4dc', f, nev * 0.8);
  const L = topo.length, mn = topo.reduce((a, b) => Math.min(a, b), Infinity), linhaNeve = mn + (base - mn) * neve;
  for (let px = 0; px < L; px++) {
    // inclinação medida numa janela larga: > 0 sobe para a direita, a face olha para o sol
    const s = clamp(((topo[Math.max(0, px - 3)]) - (topo[Math.min(L - 1, px + 3)])) / 3, -2, 2);
    const prof = 5 + Math.abs(s) * 6;
    for (let y = topo[px]; y <= base; y++) {
      const d = y - topo[px];
      let cor = c;
      if (Math.abs(s) > 0.15 && d < prof && (d / prof) < 1 - bayer(px, y) * 0.9) cor = s > 0 ? cl : cs;
      if (neve && y < linhaNeve + Math.sin(px * 0.31) * 2 + Math.sin(px * 0.13 + 1) * 3 + (topo[px] - mn) * 0.15) cor = s >= -0.15 ? nl : ns;
      x.fillStyle = cor; x.fillRect(px, y, 1, 1);
    }
  }
}

// pinheiro em camadas: lado esquerdo claro, direito na sombra, a barra de baixo de cada camada mais escura
function pinheiro(x, px, base, h, [cl, cm, cs], tronco, neve) {
  const tr = Math.max(1, Math.round(h * 0.1));
  x.fillStyle = tronco; x.fillRect(px, base - tr, 1, tr + 1);
  const copa = h - tr, larg = Math.max(1.5, h * 0.27), camadas = Math.max(2, Math.round(copa / 6));
  for (let j = 0; j < copa; j++) {
    const y = base - tr - copa + j, u = j / copa;
    const cam = Math.min(camadas - 1, Math.floor(u * camadas)), uc = u * camadas - cam;
    let w = j === 0 ? 0 : Math.round(larg * (0.18 + 0.82 * u) * (0.5 + 0.5 * uc));
    if (w > 1 && hash(px, y) < 0.25) w--;
    const esq = px - w, tot = w * 2 + 1;
    if (uc > 0.78 && w > 1) {
      x.fillStyle = cm; x.fillRect(esq, y, Math.ceil(tot * 0.35), 1);
      x.fillStyle = cs; x.fillRect(esq + Math.ceil(tot * 0.35), y, tot - Math.ceil(tot * 0.35), 1);
    } else {
      x.fillStyle = cm; x.fillRect(esq, y, tot, 1);
      x.fillStyle = cl; x.fillRect(esq, y, Math.max(1, Math.round(tot * 0.4)), 1);
      x.fillStyle = cs; x.fillRect(px + 1, y, Math.max(0, Math.round(w * 0.75)), 1);
    }
    if (neve && uc < 0.3 && w > 0) { x.fillStyle = neve; x.fillRect(esq, y, Math.max(1, Math.round(tot * 0.6)), 1); }
  }
}

// árvore de copa redonda (folhas de outono no lago): bolhas somadas, luz em cima à esquerda, textura de folha
function arvore(x, px, base, h, [cl, cm, cs], tronco, rnd, betula) {
  const tr = Math.round(h * 0.38), bet = rnd() < 0.3;
  x.fillStyle = bet ? betula : tronco; x.fillRect(px, base - tr, 1 + (h > 22 ? 1 : 0), tr + 1);
  const bolhas = [], n = 4 + Math.floor(rnd() * 4), rw = h * 0.3, rh = h * 0.32, cy0 = base - tr - rh * 0.6;
  for (let i = 0; i < n; i++) bolhas.push([px + (rnd() - 0.5) * rw * 1.2, cy0 + (rnd() - 0.5) * rh * 0.9, rw * (0.45 + rnd() * 0.35)]);
  const x0 = Math.floor(px - rw * 1.4), x1 = Math.ceil(px + rw * 1.4), y0 = Math.floor(cy0 - rh * 1.4), y1 = Math.ceil(base - tr + 1);
  for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) {
    let dentro = null;
    for (const b of bolhas) { const dx = (xx + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / b[2]; if (dx * dx + dy * dy <= 1) { dentro = [dx, dy]; break; } }
    if (!dentro) continue;
    const v = dentro[0] + dentro[1] + (hash(xx, y) - 0.5) * 0.7;
    x.fillStyle = v < -0.55 ? cl : v > 0.45 ? cs : cm; x.fillRect(xx, y, 1, 1);
  }
}

// cabana de troncos com chaminé e janela (a janela acende de noite)
function cabana(x, x0, base, f) {
  const w = 22, hp = 10, L = c => naLuz(c, f, 0.08);
  for (let j = 0; j < hp; j++) { x.fillStyle = L(j % 2 ? '#7a4c2c' : '#94603a'); x.fillRect(x0, base - hp + j, w, 1); }
  x.fillStyle = L('#5a3420'); x.fillRect(x0, base - hp, 1, hp); x.fillRect(x0 + w - 1, base - hp, 1, hp);
  // telhado
  for (let j = 0; j < 8; j++) {
    const a = x0 - 2 + j, b = x0 + w + 1 - j;
    x.fillStyle = L(j === 0 ? '#3a2a24' : j % 2 ? '#5e4a3a' : '#6e5a42'); x.fillRect(a, base - hp - 1 - j, b - a + 1, 1);
    x.fillStyle = L('#7a8a4a'); if (j > 0 && j < 6) x.fillRect(a, base - hp - 1 - j, 2, 1);
  }
  x.fillStyle = L('#6a6460'); x.fillRect(x0 + w - 6, base - hp - 10, 3, 6); x.fillStyle = L('#4a4440'); x.fillRect(x0 + w - 7, base - hp - 11, 5, 1);
  // porta e janela (apagada; o brilho é desenhado por cima de noite)
  x.fillStyle = L('#3a2418'); x.fillRect(x0 + 4, base - 7, 4, 7);
  x.fillStyle = L('#2a3440'); x.fillRect(x0 + 12, base - 7, 5, 4);
  x.fillStyle = L('#5a3420'); x.fillRect(x0 + 14, base - 7, 1, 4); x.fillRect(x0 + 12, base - 6, 5, 1);
  // píer saindo da frente
  x.fillStyle = L('#8a6a44'); x.fillRect(x0 + 2, base, 26, 1); x.fillStyle = L('#5a4028'); x.fillRect(x0 + 2, base + 1, 26, 1);
  for (const p of [3, 12, 21, 27]) { x.fillStyle = L('#4a3420'); x.fillRect(x0 + p, base + 1, 1, 3); }
  return { jx: x0 + 12, jy: base - 7, cx: x0 + w - 5, cy: base - hp - 11 };
}

// paredão de pedra com camadas e rachaduras (Rio da Pedra)
function paredao(x, lado, f, rnd, LT) {
  const larg = Math.round(W * 0.17), alto = Math.round(HOR * 0.78), topo = [];
  for (let i = 0; i < larg; i++) {
    const u = i / larg;
    topo.push(Math.round(HOR - alto * (1 - Math.pow(u, 1.6) * 0.75) + Math.sin(i * 0.5) * 2 + rnd() * 2));
  }
  const cb = naLuz('#8e7a68', f, 0.04), cl = naLuz('#b49e84', f, 0.04), cs = naLuz('#5e4c40', f, 0.04), cr = naLuz('#4a3a32', f, 0.04);
  for (let i = 0; i < larg; i++) {
    const px = lado ? LT - 1 - i : i, t = topo[i];
    for (let y = t; y <= HOR; y++) {
      const d = y - t;
      let c = cb;
      if ((y + Math.round(Math.sin(i * 0.2) * 2)) % 7 === 0) c = cs;
      else if (d < 3) c = lado ? cs : cl;
      else if (hash(i, Math.floor(y / 4)) < 0.08) c = cr;
      else if ((lado ? i > larg * 0.75 : i > larg * 0.75) && bayer(i, y) < 0.5) c = lado ? cl : cs;
      x.fillStyle = c; x.fillRect(px, y, 1, 1);
    }
  }
  return topo.map((t, i) => ({ x: lado ? LT - 1 - i : i, t }));
}

// nuvem: bolhas somadas com base reta; 3 tons (luz em cima, sombra embaixo)
function geraNuvem(r, grande) {
  let w = grande ? 34 + Math.floor(r() * 40) : 14 + Math.floor(r() * 18), h = grande ? 12 + Math.floor(r() * 8) : 4 + Math.floor(r() * 3);
  const bol = [], n = grande ? 5 + Math.floor(r() * 4) : 3;
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; bol.push([w * (0.1 + u * 0.8) + (r() - 0.5) * 6, h * (0.55 + (r() - 0.3) * 0.3) - Math.sin(u * Math.PI) * h * 0.35, (grande ? h * 0.45 : h * 0.7) * (0.6 + Math.sin(u * Math.PI) * 0.6)]); }
  const mg = Math.ceil(h * 0.9), mt = Math.ceil(h * 0.6);   // folga para as bolhas não saírem cortadas
  bol.forEach(b => { b[0] += mg; b[1] += mt; });
  w += mg * 2; h += mt;
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let melhor = 9;
    for (const [bx, by, br] of bol) { const dx = (x - bx) / (br * 1.25), dy = (y - by) / br, d = dx * dx + dy * dy; if (d < 1) melhor = Math.min(melhor, dy); }
    if (melhor === 9) continue;
    m[y * w + x] = y >= h - 3 || melhor > 0.35 + (bayer(x, y) - 0.5) * 0.3 ? 3 : melhor < -0.45 + (bayer(x, y) - 0.5) * 0.3 ? 1 : 2;
  }
  const img = {};
  for (const f of FASES) {
    const c = tela(w, h), xc = c.getContext('2d'), N = CEUS[f].nuvem;
    for (let i = 0; i < w * h; i++) if (m[i]) { xc.fillStyle = N[m[i] - 1]; xc.fillRect(i % w, (i / w) | 0, 1, 1); }
    img[f] = c;
  }
  return { img, w, h, x: r() * (W + 200), y: grande ? 4 + r() * HOR * 0.38 : HOR * 0.45 + r() * HOR * 0.3, v: grande ? 0.8 + r() * 1.2 : 0.4 + r() * 0.5 };
}

/* ===== tudo que é pintado uma vez ===== */
function geraFundo() {
  const P = PAISAGENS[E.ponto] || PAISAGENS.lago;
  const rnd = rngSemente(P.semente * 977 + W);
  const HU = H - WL, B = WL - HOR;   // altura da vista submersa e da faixa de superfície
  const chaoBase = Math.max(Math.round(HU * 0.55), HU - Math.ceil(64 / K) - 4);   // o fundo fica acima do botão do E
  // cada camada do parallax tem a largura que a câmera chega a mostrar dela
  const LL = largCamada(PAR.longe), LM = largCamada(PAR.medio), LT = largCamada(PAR.terra);

  const longe = perfil(rnd, HOR * P.amp[0], HOR - 12, 1, LL);
  const medio = perfil(rnd, HOR * P.amp[1], HOR - 6, 1.6, LM);
  const colina = perfil(rnd, HOR * 0.07, HOR - 4, 3, LT);
  const cab = P.cabana ? Math.round(LT * 0.66) : -999;
  const cach = P.cachoeira ? Math.round(LM * 0.56) : -999;
  // árvores: uma fileira de trás (menor, mais apagada) e uma da frente
  const tras = [], frente = [];
  for (let x = -4; x < LT + 4; x += 2 + Math.floor(rnd() * 3)) tras.push({ x, h: Math.round(H * (0.04 + rnd() * 0.05)), folha: rnd() < P.fracFolha, cor: Math.floor(rnd() * 99) });
  for (let x = -6; x < LT + 6; x += 4 + Math.floor(rnd() * 6)) {
    if (x > cab - 6 && x < cab + 30) continue;
    const borda = Math.min(x, LT - x) < W * 0.12 ? 1.25 : 1;
    if (rnd() < 0.82) frente.push({ x, h: Math.round(H * (0.06 + rnd() * 0.09) * borda), folha: rnd() < P.fracFolha, cor: Math.floor(rnd() * 99) });
  }
  const sement = rnd() * 1e6;

  const ceu = {}, montesLonge = {}, montesMedio = {}, terra = {}, tintaRefl = {}, agua = {}, neblina = {};
  let janela = null, chamine = null, topoParedao = [];
  for (const f of FASES) {
    const C = CEUS[f];
    // céu (não anda com a câmera)
    const c1 = tela(W, HOR + 6); pintaGrad(c1.getContext('2d'), 0, 0, W, HOR + 6, [C.topo, C.meio, C.base], 14, 1.15);
    ceu[f] = c1;

    // montanhas de longe e do meio, cada uma na sua camada
    const cl = tela(LL, HOR + 6); montanha(cl.getContext('2d'), longe, HOR, P.montes[0], P.neveMonte, f, 0.5); montesLonge[f] = cl;
    const cmd = tela(LM, HOR + 6); montanha(cmd.getContext('2d'), medio, HOR, P.montes[1], P.neveMonte * 0.5, f, 0.3); montesMedio[f] = cmd;

    // terra perto: floresta, cabana, margem (um pouco além do horizonte, para a margem cobrir a faixa)
    const ct = tela(LT, HOR + 6), xt = ct.getContext('2d');
    if (P.paredao) { const r2 = rngSemente(P.semente); topoParedao = [...paredao(xt, 0, f, r2, LT), ...paredao(xt, 1, f, r2, LT)]; }
    // floresta distante: morrinhos cobertos de pontas de pinheiro
    const cc = naLuz(P.colina, f, 0.22), ccl = naLuz(mistura(P.colina, '#ffffff', 0.15), f, 0.22), ccs = naLuz(escurece(P.colina, 0.8), f, 0.22);
    for (let x = 0; x < LT; x++) { xt.fillStyle = cc; xt.fillRect(x, colina[x], 1, HOR - colina[x] + 1); }
    for (let x = 0; x < LT; x += 2) {
      const hh = 3 + Math.floor(hash(x, 7) * 5);
      for (let j = 0; j < hh; j++) { const w = Math.floor(j / 2); xt.fillStyle = ccl; xt.fillRect(x - w, colina[x] - hh + j, w + 1, 1); xt.fillStyle = ccs; xt.fillRect(x + 1, colina[x] - hh + j, w, 1); }
    }
    if (P.neve) for (let x = 0; x < LT; x++) if (hash(x, 9) < 0.5) { xt.fillStyle = naLuz('#e8f0f8', f, 0.22); xt.fillRect(x, colina[x], 1, 1); }
    const tronco = naLuz('#4a3020', f, 0.05), neve = P.neve ? naLuz('#f0f6ff', f, 0.05) : null;
    const coresPinho = (nev) => P.pinho.map(c => naLuz(c, f, nev));
    const coresFolha = (i, nev) => P.folhas[i % P.folhas.length].map(c => naLuz(c, f, nev));
    const rA = rngSemente(sement);
    const betula = naLuz('#d8d4c8', f, 0.05);
    for (const a of tras) a.folha ? arvore(xt, a.x, HOR - 2, a.h, coresFolha(a.cor, 0.16), tronco, rA, betula) : pinheiro(xt, a.x, HOR - 2, a.h, coresPinho(0.16), tronco, neve && naLuz('#e0e8f4', f, 0.16));
    if (P.cabana) { const r = cabana(xt, cab, HOR, f); janela = { x: r.jx, y: r.jy }; chamine = { x: r.cx, y: r.cy }; }
    for (const a of frente) a.folha ? arvore(xt, a.x, HOR, a.h, coresFolha(a.cor, 0.02), tronco, rA, betula) : pinheiro(xt, a.x, HOR, a.h, coresPinho(0.02), tronco, neve);
    if (P.paredao) for (const { x, t } of topoParedao) if (hash(x, 1) < 0.07) pinheiro(xt, x, t + 1, 8 + Math.floor(hash(x, 2) * 8), coresPinho(0.04), tronco, null);
    // margem: faixa de terra, pedrinhas e juncos
    const cm = naLuz(P.margem, f, 0.02), cms = naLuz(escurece(P.margem, 0.7), f, 0.02), cp = naLuz(P.pedra, f, 0.02), cpl = naLuz(mistura(P.pedra, '#ffffff', 0.3), f, 0.02);
    xt.fillStyle = cm; xt.fillRect(0, HOR - 1, LT, 2); xt.fillStyle = cms; xt.fillRect(0, HOR + 1, LT, 1);
    for (let x = 0; x < LT; x += 3 + Math.floor(hash(x, 4) * 9)) {
      const w = 2 + Math.floor(hash(x, 5) * 4);
      xt.fillStyle = cp; xt.fillRect(x, HOR - 1, w, 2); xt.fillStyle = cpl; xt.fillRect(x, HOR - 1, w - 1, 1);
    }
    if (P.juncos) for (let x = 0; x < LT; x++) if (hash(x, 6) < 0.18) { const h = 2 + Math.floor(hash(x, 8) * 4); xt.fillStyle = naLuz(hash(x, 10) < 0.5 ? '#7a8a3a' : '#5a6a2a', f, 0.02); xt.fillRect(x, HOR - h, 1, h); }
    terra[f] = ct;

    // o reflexo é copiado da própria tela a cada quadro (ver desenhaCena); aqui só a tinta da água que vai por cima
    const cr = tela(W, B), xr = cr.getContext('2d');
    const ag = naLuz(P.agua, f, 0.1), agf = naLuz(mistura(P.agua, P.aguaFunda, 0.4), f, 0);
    for (let r = 2; r < B; r++) { const u = r / B; xr.globalAlpha = 0.32 + u * 0.38; xr.fillStyle = mistura(ag, agf, u); xr.fillRect(0, r, W, 1); }
    tintaRefl[f] = cr;

    // embaixo d'água, o lago inteiro: degradê da água, chão de areia, pedras e seixos (tudo puxado para a cor da água)
    const ca = tela(MUNDO, HU), xa = ca.getContext('2d');
    const a0 = naLuz(mistura(P.agua, '#ffffff', 0.08), f, 0), a1 = naLuz(P.agua, f, 0), a2 = naLuz(mistura(P.agua, P.aguaFunda, 0.6), f, 0), a3 = naLuz(P.aguaFunda, f, 0);
    pintaGrad(xa, 0, 0, MUNDO, HU, [a0, a1, a2, a3], 12, 0.9);
    const rf = rngSemente(P.semente * 31 + W), chao = perfil(rf, 9, chaoBase, 4, MUNDO).map(v => Math.min(HU - 3, v));
    const turvo = (c, k = 0.45) => mistura(naLuz(c, f, 0), a3, k);
    const ch = turvo(P.chao), chl = turvo(mistura(P.chao, '#ffffff', 0.2), 0.4), chs = turvo(escurece(P.chao, 0.7), 0.5);
    for (let x = 0; x < MUNDO; x++) for (let y = chao[x]; y < HU; y++) {
      const d = y - chao[x];
      xa.fillStyle = d === 0 ? chl : d > 3 && bayer(x, y) < (d - 3) / 6 ? chs : ch; xa.fillRect(x, y, 1, 1);
    }
    const cpd = turvo(P.pedraFundo), cpdl = turvo(mistura(P.pedraFundo, '#ffffff', 0.25), 0.4), cpds = turvo(escurece(P.pedraFundo, 0.65), 0.5);
    for (let i = 0; i < MUNDO / 22; i++) {
      const px = Math.floor(rf() * MUNDO), rw = 3 + rf() * 8, rh = 2 + rf() * 4, py = chao[Math.min(MUNDO - 1, px)] + 2;
      for (let y = Math.floor(py - rh); y <= py + 1; y++) for (let x = Math.floor(px - rw); x <= px + rw; x++) {
        const dx = (x - px) / rw, dy = (y - py) / rh; if (dx * dx + dy * dy > 1) continue;
        xa.fillStyle = dx + dy < -0.5 ? cpdl : dx + dy > 0.4 ? cpds : cpd; xa.fillRect(x, y, 1, 1);
      }
    }
    for (let i = 0; i < MUNDO / 3; i++) { const px = Math.floor(rf() * MUNDO); xa.fillStyle = rf() < 0.5 ? cpdl : cpds; xa.fillRect(px, chao[px] + 1 + Math.floor(rf() * 3), 1, 1); }
    agua[f] = ca;

    // neblina da manhã: faixas pontilhadas em volta da margem, com o dobro da largura para correr de lado
    const nh = Math.round(B + HOR * 0.35), cn = tela(W * 2, nh), xn = cn.getContext('2d');
    const nimg = xn.createImageData(W * 2, nh), ND = nimg.data, NC = hexRgb(naLuz(mistura(C.nevoa, '#ffffff', 0.4), f, 0));
    for (let y = 0; y < nh; y++) {
      const perfilY = Math.exp(-Math.pow((y - nh * 0.42) / (nh * 0.28), 2));
      for (let x = 0; x < W * 2; x++) {
        // ondulações que fecham no dobro da largura, para a faixa emendar quando corre
        const q = x / (W * 2) * Math.PI * 2;
        const n = 0.5 + 0.28 * Math.sin(q * 3 + y * 0.12) + 0.22 * Math.sin(q * 7 - y * 0.08 + 2);
        const a = Math.round(clamp(n * perfilY * 1.1, 0, 1) * 4) / 4;   // 4 degraus, como pixel art
        const o = (y * W * 2 + x) * 4; ND[o] = NC[0]; ND[o + 1] = NC[1]; ND[o + 2] = NC[2]; ND[o + 3] = a * 170;
      }
    }
    xn.putImageData(nimg, 0, 0);
    neblina[f] = cn;
  }

  const r2 = rngSemente(99 + W);
  const estrelas = []; for (let i = 0; i < W * HOR / 70; i++) estrelas.push({ x: Math.floor(r2() * W), y: Math.floor(Math.pow(r2(), 1.3) * (HOR - 6)), b: r2(), f: r2() * 6 });
  const nuvens = []; for (let i = 0; i < 4 + Math.floor(W / 140); i++) nuvens.push(geraNuvem(r2, true));
  const fiapos = []; for (let i = 0; i < 4; i++) fiapos.push(geraNuvem(r2, false));
  const brilhos = []; for (let i = 0; i < W * B / 60; i++) brilhos.push({ x: r2() * W, y: HOR + 2 + Math.floor(Math.pow(r2(), 0.8) * (B - 3)), l: 2 + Math.floor(r2() * 6), f: r2() * 6 });
  const gelos = P.gelo ? [0, 1, 2, 3].map(() => ({ x: r2() * W, y: HOR + 3 + Math.floor(r2() * B * 0.7), w: 8 + Math.floor(r2() * 18) })) : [];
  // plantas do fundo: fitas que balançam (algas), mais altas na Baía (kelp)
  const chao0 = chaoBase - 6, plantas = [];
  for (let x = 2; x < MUNDO; x += 3 + Math.floor(r2() * 10)) if (r2() < (P.gelo ? 0.35 : 0.55)) plantas.push({ x, h: Math.round((P.gelo ? 14 + r2() * 30 : 6 + r2() * 20)), f: r2() * 6, c: r2() < 0.5 ? 0 : 1 });
  // nenúfares e touceiras de taboa espalhados pelo lago, longe do píer
  const longeDoPier = () => PIER.fim + 110 + r2() * (MUNDO - PIER.fim - 140);
  const nenufares = [];
  if (P.nenufares) for (let g = 0; g < MUNDO / 260; g++) { const x0 = longeDoPier(); for (let i = 0; i < 2 + Math.floor(r2() * 3); i++) { const w = 6 + Math.floor(r2() * 4); nenufares.push({ x: Math.round(x0 + i * 11 + r2() * 4), w, flor: w > 7 }); } }
  const juncosFrente = [];
  if (P.juncos) for (const [x0, n] of [[MUNDO - 22, 10], [longeDoPier(), 7], [longeDoPier(), 6]]) for (let i = 0; i < n; i++) juncosFrente.push({ x: Math.round(x0 + i * 2.3 + r2() * 2), h: 12 + Math.floor(r2() * 18), f: r2() * 6, taboa: r2() < 0.45 });
  // vinheta: cantos um pouco mais escuros
  const vin = tela(W, H), xv = vin.getContext('2d');
  const gv = xv.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.45, W / 2, H * 0.45, Math.hypot(W, H) * 0.62);
  gv.addColorStop(0, 'rgba(10,8,20,0)'); gv.addColorStop(1, 'rgba(10,8,20,.32)');
  xv.fillStyle = gv; xv.fillRect(0, 0, W, H);
  fundo = {
    ceu, montesLonge, montesMedio, terra, tintaRefl, agua, neblina, espelho: tela(W + 8, HOR + 2), estrelas, nuvens, fiapos, brilhos, gelos, plantas, nenufares, juncosFrente, vin,
    chaoTerra: Object.fromEntries(FASES.map(f => [f, geraTerra(P, f)])),
    janela, chamine, cach: P.cachoeira ? { x: cach, y0: Math.min(medio[cach], medio[cach + 6] ?? HOR) + 2, w: 6 } : null,
    chao0, P, ponto: E.ponto, B, HU
  };
  cardume.length = 0;
}

/* ===== o que mexe ===== */
const ondas = [];      // anéis na água
const gotas = [];      // respingos
const particulas = []; // neve, chuva, vagalumes, fumaça
const bolhas = [];     // bolhinhas subindo embaixo d'água
const cardume = [];    // peixes nadando na vista submersa
const passaros = [];   // bandos cruzando o céu
let pulo = null;       // um peixe pulando
let patos = null;      // a pata com os filhotes atravessando o lago
let cadente = null;    // estrela cadente
const clima = { chuva: 0, alvo: 0, t: 40 };
function onda(x, y, max = 10) { ondas.push({ x, y, r: 1, max }); }
function respingo(x, y, n = 8) { for (let i = 0; i < n; i++) gotas.push({ x, y, vx: rand(-25, 25), vy: rand(-55, -20), t: 0 }); }

function faseAgora() {
  const h = (E.minutos / 60) % 24;
  for (let i = 0; i < HORAS.length - 1; i++) {
    const [h0, f0] = HORAS[i], [h1, f1] = HORAS[i + 1];
    if (h >= h0 && h < h1) return { a: f0, b: f1, t: f0 === f1 ? 0 : (h - h0) / (h1 - h0), h };
  }
  return { a: 'noite', b: 'noite', t: 0, h };
}
const pesoFase = (F, nome) => (F.a === nome ? 1 - F.t : 0) + (F.b === nome ? F.t : 0);
const pesoNoite = F => pesoFase(F, 'noite');

/* posição do barco (em x do mundo, guardada em E.barco) e da mão do pescador (usadas pela pesca) */
const BARCO = { x: 0, y: 0, balanco: 0, mx: 0, my: 0 };
function posBarco(t) {
  BARCO.x = Math.round(E.barco);
  BARCO.balanco = Math.sin(t * 1.3) * 0.7;
  BARCO.y = WL + Math.round(BARCO.balanco);
  BARCO.mx = BARCO.x + 9; BARCO.my = BARCO.y - 14;
  return BARCO;
}

/* ===== sprites desenhados à mão (k = contorno) ===== */
const HEROI = [
  '......kkkkk.....',
  '.....khhhhhk....',
  '....khhhhhhhk...',
  '....kHHHHHHHk...',
  '..kkbbbbbbbbbkk.',
  '...kkrrssssk....',
  '....krSssesk....',
  '....krSsssssk...',
  '....kkSsssrk....',
  '.....kkSSkk.....',
  '...kkccccckk....',
  '..kcllcccccCk...',
  '..kcllccccCCkaak',
  '..kcllccccCCaaak',
  '..kclllcccCCkkk.',
  '..kcllccccccCk..',
  '..kkppppppppkk..',
  '..kppppppppppk..',
  '..kppppppppppk..'
];
const CAO = [
  ['.....k...k...', '....kdk.kdk..', '....kddkddk..', '...kdddddddk.', '...kdddddedk.', '...kddddwwwnk', '...kdddwwwkk.', '..kdddwwwk...', 'k.kddwwwwk...', 'dkddddwwdk...', 'kddddddddk...', '.kdddddddk...', '.kdkddkdkk...'],
  ['.....k...k...', '....kdk.kdk..', '....kddkddk..', '...kdddddddk.', '...kdddddedk.', '...kddddwwwnk', '...kdddwwwkk.', '..kdddwwwk...', '..kddwwwwk...', 'kkddddwwdk...', 'dddddddddk...', 'kkdddddddk...', '.kdkddkdkk...']
];
function sprite(mapa, x0, y0, pal, espelha) {
  for (let y = 0; y < mapa.length; y++) { const ln = mapa[y]; for (let x = 0; x < ln.length; x++) { const c = pal[ln[x]]; if (c) { cx.fillStyle = c; cx.fillRect(espelha ? x0 + 15 - x : x0 + x, y0 + y, 1, 1); } } }
}
function paletaHeroi(luz) {
  const met = s => E.equip[s] && ITENS[E.equip[s]].metal ? METAIS.find(m => m.id === ITENS[E.equip[s]].metal).cor : null;
  const cap = met('capacete'), pei = met('peitoral'), cal = met('calcas'), bot = met('botas');
  const jaq = pei || '#c0503a';
  return {
    k: luz('#1a1018'), s: luz('#f0b890'), S: luz('#c8866a'), e: luz('#1a1018'), a: luz('#f0b890'), r: luz('#6a3a24'),
    h: luz(cap || '#e4c068'), H: luz(cap ? escurece(cap, 0.7) : '#a8442c'), b: luz(cap ? escurece(cap, 0.85) : '#c8a048'),
    c: luz(jaq), l: luz(mistura(jaq, '#ffffff', 0.25)), C: luz(escurece(jaq, 0.7)), p: luz(cal || '#3a5a8a'), o: luz(bot || '#4a2e1c')
  };
}

/* um peixe visto de lado, pintado por código a partir das cores do item (corpo, barriga, barbatana) */
function tamPeixe(id, peso) { const it = ITENS[id]; return Math.round(clamp(11 + Math.log10(peso ?? (it.pmin + it.pmax) * 0.4) * 5, 7, 28)); }
function desenhaPeixe(x0, y0, len, cores, dir, t, tinta, k) {
  const [c1, c2, c3] = cores.map(c => k ? mistura(c, tinta, k) : c);
  const esc = escurece(c1, 0.72), cl = mistura(c1, '#ffffff', 0.3);
  const corpo = Math.max(4, Math.round(len * 0.76)), alt = Math.max(1, Math.round(len * 0.2));
  const P = (i, j, c) => { cx.fillStyle = c; cx.fillRect(Math.round(x0 - dir * i), Math.round(y0 + j), 1, 1); };
  for (let i = 0; i < corpo; i++) {
    const u = i / corpo, hh = Math.round(alt * Math.sqrt(Math.max(0, Math.sin(Math.PI * (0.06 + u * 0.82)))));
    for (let j = -hh; j <= hh; j++) P(i, j, j === -hh ? esc : j < -hh * 0.35 ? (j === -hh + 1 ? cl : c1) : j > hh * 0.3 ? c2 : c1);
    if (u > 0.32 && u < 0.6) P(i, -hh - 1, c3);
    if (u > 0.55 && u < 0.7 && len > 9) P(i, hh + 1, c3);
  }
  const ond = Math.round(Math.sin(t * 10 + x0 * 0.3) * (len > 10 ? 1 : 0.6));
  for (let i = corpo; i < len; i++) { const s = 1 + Math.round((i - corpo) * 0.9); for (let j = -s; j <= s; j++) if (Math.abs(j) > s - 2 || i === len - 1 || i === corpo) P(i, j + (i > corpo ? ond : 0), c3); }
  P(Math.max(1, Math.round(len * 0.12)), -Math.max(0, Math.round(alt * 0.3)), '#0a0a12');
}

// peixes do ponto atual, sorteados pela raridade (os comuns aparecem mais)
function sorteiaVisitante() {
  const lista = PEIXES.filter(p => p.ponto === E.ponto);
  return sorteiaPeso(lista.map(p => [p, RARIDADES[p.rar].peso + 4]));
}
function atualizaCardume(dt, t) {
  const F = fundo, alvo = Math.max(4, Math.round(W / 60));
  while (cardume.length < alvo) {
    const it = sorteiaVisitante(), dir = Math.random() < 0.5 ? 1 : -1;
    const ini = cardume.length < alvo - 1 && !F.semeado;
    const CX = CAM.x;
    cardume.push({ id: it.id, len: tamPeixe(it.id), dir, x: ini ? CX + rand(0, W) : dir > 0 ? CX - 20 : CX + W + 20, y: WL + rand(10, F.chao0 - 6), v: rand(5, 13), f: rand(0, 6), vy: 0 });
  }
  F.semeado = true;
  for (let i = cardume.length - 1; i >= 0; i--) {
    const p = cardume[i];
    p.x += p.dir * p.v * dt; p.y += Math.sin(t * 0.6 + p.f) * 1.5 * dt;
    p.y = clamp(p.y, WL + 8, WL + F.chao0 - 4);
    if (Math.random() < dt * 0.04) p.dir *= -1;
    if (Math.random() < dt * 0.15) bolhas.push({ x: p.x + p.dir * 2, y: p.y - 1, t: 0 });
    if (p.x < CAM.x - 60 || p.x > CAM.x + W + 60) cardume.splice(i, 1);
  }
}

/* ===== o quadro ===== */
function desenhaCena(t, dt) {
  if (!fundo || fundo.ponto !== E.ponto) geraFundo();
  const P = fundo.P, F = faseAgora(), noite = pesoNoite(F), B = fundo.B;
  if (F.a !== QF.a || F.b !== QF.b || Math.abs(F.t - QF.t) > 0.01) { QF = { a: F.a, b: F.b, t: F.t }; _luzCache.clear(); }
  // uma janela da largura da tela de cada camada, a partir de sx, misturando as duas paletas da hora
  const faixa = (img, sx = 0, y = 0) => {
    const a = img[F.a], h = a.height;
    cx.globalAlpha = 1; cx.drawImage(a, sx, 0, W, h, 0, y, W, h);
    if (F.t > 0) { cx.globalAlpha = F.t; cx.drawImage(img[F.b], sx, 0, W, h, 0, y, W, h); cx.globalAlpha = 1; }
  };
  const ceuF = k => mistura(CEUS[F.a][k], CEUS[F.b][k], F.t);
  const CX = Math.round(CAM.x), CR = CX - TERRA.ini, oL = Math.round(CR * PAR.longe), oM = Math.round(CR * PAR.medio), oT = Math.round(CR * PAR.terra);
  const modW = (v, m) => ((v % m) + m) % m;

  // clima: de vez em quando chove (na Baía, neva mais forte)
  clima.t -= dt;
  if (clima.t <= 0) { clima.alvo = Math.random() < 0.22 ? 1 : 0; clima.t = clima.alvo ? rand(50, 140) : rand(90, 260); }
  clima.chuva = clamp(clima.chuva + Math.sign(clima.alvo - clima.chuva) * dt * 0.06, 0, 1);
  const chuva = clima.chuva, sol = 1 - chuva * 0.8;

  // céu e estrelas
  faixa(fundo.ceu);
  if (noite > 0.05) for (const s of fundo.estrelas) {
    const a = noite * sol * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.7 + s.f * 3))) * (s.b > 0.9 ? 1 : 0.55);
    cx.fillStyle = `rgba(255,248,225,${a.toFixed(2)})`; cx.fillRect(s.x, s.y, 1, 1);
    if (s.b > 0.97 && a > 0.6) { cx.globalAlpha = a * 0.4; cx.fillRect(s.x - 1, s.y, 3, 1); cx.fillRect(s.x, s.y - 1, 1, 3); cx.globalAlpha = 1; }
  }
  if (noite > 0.6 && !cadente && Math.random() < dt * 0.04) cadente = { x: rand(W * 0.2, W), y: rand(4, HOR * 0.4), t: 0 };
  if (cadente) {
    cadente.t += dt; if (cadente.t > 0.7) cadente = null;
    else for (let i = 0; i < 8; i++) { cx.fillStyle = `rgba(255,250,230,${((1 - i / 8) * (1 - cadente.t / 0.7)).toFixed(2)})`; cx.fillRect(Math.round(cadente.x - cadente.t * 90 + i * 2), Math.round(cadente.y + cadente.t * 40 - i), 1, 1); }
  }
  // aurora na Baía Gelada
  if (P.aurora && noite > 0.3) {
    for (let x = 0; x < W; x++) {
      const base = HOR * 0.28 + Math.sin(x * 0.02 + t * 0.15) * 10 + Math.sin(x * 0.053 - t * 0.2) * 5;
      const a = noite * sol * Math.max(0, Math.sin(x * 0.031 + t * 0.3) * 0.5 + Math.sin(x * 0.11 - t * 0.5) * 0.3 + 0.25);
      if (a <= 0.02) continue;
      const alto = 14 + Math.sin(x * 0.07 + t * 0.4) * 6;
      for (let j = 0; j < alto; j += 1) {
        const u = j / alto; if (bayer(x, j) > (1 - u) * 0.9) continue;
        cx.fillStyle = u < 0.25 ? `rgba(120,255,180,${(a * 0.5).toFixed(2)})` : u < 0.7 ? `rgba(90,230,170,${(a * 0.32).toFixed(2)})` : `rgba(170,110,230,${(a * 0.25).toFixed(2)})`;
        cx.fillRect(x, Math.round(base - j), 1, 1);
      }
    }
  }

  // sol e lua num arco de um lado ao outro, com halo
  const h = F.h, dia = h >= 5.5 && h < 19.5;
  const prog = dia ? (h - 5.5) / 14 : ((h + 24 - 19.5) % 24) / 10;
  const ax = Math.round(lerp(W * 0.06, W * 0.94, prog)), ay = Math.round(HOR - 4 - Math.sin(prog * Math.PI) * (HOR * 0.8));
  const halo = hexRgb(ceuF('halo'));
  for (const [r, a] of [[26, 0.05], [18, 0.08], [12, 0.14]]) circulo(ax, ay, r, `rgba(${halo},${(a * sol).toFixed(2)})`);
  if (dia) { circulo(ax, ay, 8, ceuF('halo')); circulo(ax, ay, 6, ceuF('sol')); }
  else {
    circulo(ax, ay, 6, '#e8ecf8'); cx.fillStyle = '#c4cadc';
    cx.fillRect(ax - 2, ay - 2, 2, 2); cx.fillRect(ax + 2, ay + 1, 2, 1); cx.fillRect(ax - 1, ay + 3, 1, 1); cx.fillRect(ax + 3, ay - 3, 1, 1);
  }

  // nuvens: fiapos baixos e devagar, as grandes mais rápidas (e andam um pouquinho com a câmera)
  for (const grupo of [fundo.fiapos, fundo.nuvens]) for (const n of grupo) {
    n.x += n.v * dt * (1 + chuva); const span = W + n.w + 40, nx = Math.round(modW(n.x - CX * 0.05, span) - n.w - 20);
    cx.globalAlpha = 0.95; cx.drawImage(n.img[F.a], nx, Math.round(n.y));
    if (F.t > 0) { cx.globalAlpha = 0.95 * F.t; cx.drawImage(n.img[F.b], nx, Math.round(n.y)); }
    cx.globalAlpha = 1;
  }
  // pássaros: um bando em V de vez em quando
  if (!passaros.length && noite < 0.5 && Math.random() < dt * 0.03) {
    const n = 3 + randi(0, 4), y0 = rand(10, HOR * 0.55), dir = Math.random() < 0.5 ? 1 : -1, v = rand(14, 22);
    for (let i = 0; i < n; i++) passaros.push({ x: (dir > 0 ? -10 : W + 10) - dir * i * 6, y: y0 + i * 3 * (i % 2 ? 1 : 0.6), dir, v, f: rand(0, 6) });
  }
  for (let i = passaros.length - 1; i >= 0; i--) {
    const p = passaros[i]; p.x += p.dir * p.v * dt;
    if (p.x < -30 || p.x > W + 30) { passaros.splice(i, 1); continue; }
    const asa = Math.sin(t * 10 + p.f) > 0, x = Math.round(p.x), y = Math.round(p.y + Math.sin(t * 2 + p.f));
    cx.fillStyle = luz('#2a2a38', 0.25);
    cx.fillRect(x, y, 1, 1); cx.fillRect(x - 1, y - (asa ? 1 : 0), 1, 1); cx.fillRect(x + 1, y - (asa ? 1 : 0), 1, 1);
    cx.fillRect(x - 2, y - (asa ? 2 : 0), 1, 1); cx.fillRect(x + 2, y - (asa ? 2 : 0), 1, 1);
  }

  // a paisagem em camadas: montanhas de longe, do meio (com a cachoeira caindo delas) e a margem
  faixa(fundo.montesLonge, oL);
  faixa(fundo.montesMedio, oM);
  if (fundo.cach) {
    const { x, y0, w } = fundo.cach, qx = x - oM;
    if (qx > -w && qx < W) {
      for (let y = y0; y < HOR; y++) for (let i = 0; i < w; i++) {
        const v = ((y - t * 40 + i * 5) % 9 + 9) % 9;
        cx.fillStyle = luz(v < 2 ? '#ffffff' : v < 5 ? '#cfe8f0' : '#8ec0d0', 0.05); cx.fillRect(qx + i, y, 1, 1);
      }
    }
  }
  faixa(fundo.terra, oT);
  // janela acesa e fumaça da chaminé (a fumaça fica na camada da margem)
  if (fundo.janela) {
    const j = fundo.janela, jx = j.x - oT, acesa = Math.max(noite, pesoFase(F, 'crep') * 0.8);
    if (acesa > 0.05 && jx > -10 && jx < W + 10) {
      cx.fillStyle = `rgba(255,200,100,${(acesa * 0.9).toFixed(2)})`; cx.fillRect(jx, j.y, 2, 1); cx.fillRect(jx + 3, j.y, 2, 1); cx.fillRect(jx, j.y + 2, 2, 2); cx.fillRect(jx + 3, j.y + 2, 2, 2);
      circulo(jx + 2, j.y + 2, 5, `rgba(255,180,90,${(acesa * 0.12).toFixed(2)})`);
    }
    if (Math.random() < dt * 2.5) particulas.push({ tipo: 'fumaca', x: fundo.chamine.x, y: fundo.chamine.y, t: 0 });
  }

  // superfície do lago: o céu e a margem que acabaram de ser pintados, de cabeça para baixo e ondulando linha por linha
  const esp = fundo.espelho, xe = esp.getContext('2d'), HE = HOR + 2;
  xe.drawImage(cv, 0, 0, W, HE, 4, 0, W, HE);
  xe.drawImage(cv, 0, 0, 1, HE, 0, 0, 4, HE); xe.drawImage(cv, W - 1, 0, 1, HE, W + 4, 0, 4, HE);
  for (let r = 2; r < B; r++) {
    const u = r / B, dx = Math.round(Math.sin(t * 1.4 + r * 0.6 + Math.sin(t * 0.5 + r * 0.13)) * (0.4 + u * 2.2));
    cx.drawImage(esp, 4 - dx, Math.max(0, HOR - Math.floor(r * 1.15)), W, 1, 0, HOR + r, W, 1);
  }
  faixa(fundo.tintaRefl, 0, HOR);
  if (fundo.janela) {
    const j = fundo.janela, jx = j.x - oT, acesa = Math.max(noite, pesoFase(F, 'crep') * 0.8);
    if (acesa > 0.05) { cx.fillStyle = `rgba(255,190,90,${(acesa * 0.35).toFixed(2)})`; cx.fillRect(jx, HOR + 3, 5, 1); cx.fillRect(jx + 1, HOR + 5, 3, 1); }
  }
  // brilho do sol (ou da lua) na água
  const corBrilho = dia ? `rgba(${hexRgb(ceuF('halo'))},` : 'rgba(225,232,255,';
  for (let y = HOR + 2; y < WL; y++) {
    if ((y + Math.floor(t * 3)) % 3 === 0) continue;
    const w = Math.round(1 + (y - HOR) * 0.25 + Math.sin(t * 2 + y) * 1.5);
    cx.fillStyle = corBrilho + ((dia ? 0.45 : 0.3) * sol).toFixed(2) + ')';
    cx.fillRect(ax - w + Math.round(Math.sin(t + y * 0.7) * 2), y, w * 2, 1);
  }
  // riscos de luz correndo com a correnteza (andam junto com a água)
  const corB = mistura('#ffffff', ceuF('base'), 0.35);
  cx.fillStyle = corB;
  for (const b of fundo.brilhos) {
    const vis = Math.sin(t * 1.2 + b.f); if (vis < 0.25) continue;
    const x = modW(b.x + t * P.corr * (0.3 + (b.y - HOR) / B) - CX, W + 10) - 5;
    cx.globalAlpha = 0.4 * vis * sol; cx.fillRect(Math.round(x), b.y, b.l, 1);
  }
  cx.globalAlpha = 1;
  // gelo boiando
  for (const g of fundo.gelos) {
    const gx = Math.round(modW(g.x + t * 1.2 - CX * 0.7, W + 40) - 20), gy = g.y + Math.round(Math.sin(t + g.x) * 0.5);
    cx.fillStyle = luz('#f0f8ff'); cx.fillRect(gx + 1, gy - 1, g.w - 3, 1); cx.fillRect(gx, gy, g.w, 1);
    cx.fillStyle = luz('#a8c8e0'); cx.fillRect(gx, gy + 1, g.w, 1);
    cx.fillStyle = 'rgba(200,230,255,.25)'; cx.fillRect(gx + 1, gy + 2, g.w - 2, 1);
  }
  // patos atravessando o lago de dia
  if (P.patos && !patos && noite < 0.3 && Math.random() < dt * 0.012) patos = { x: W + 8, y: HOR + 3 + randi(0, Math.max(1, B - 12)), v: rand(4, 6) };
  if (patos) {
    patos.x -= patos.v * dt; if (patos.x < -40) patos = null;
    else [[0, 1], [9, 0.6], [15, 0.6], [21, 0.6]].forEach(([o, s], i) => {
      const x = Math.round(patos.x + o), y = patos.y + (i ? 1 : 0) + Math.round(Math.sin(t * 3 + i) * 0.4);
      cx.fillStyle = luz(i ? '#c8a860' : '#7a5a3a'); cx.fillRect(x, y, s > 0.8 ? 6 : 3, s > 0.8 ? 2 : 1);
      cx.fillStyle = luz(i ? '#b89850' : '#2a6a3a'); cx.fillRect(x - 1, y - (s > 0.8 ? 3 : 2), 2, s > 0.8 ? 3 : 2);
      cx.fillStyle = luz('#e0a030'); cx.fillRect(x - 2, y - (s > 0.8 ? 2 : 1), 1, 1);
      cx.fillStyle = 'rgba(230,245,255,.35)'; cx.fillRect(x + (s > 0.8 ? 6 : 3), y + 1, 3, 1);
    });
  }
  // vagalumes perto da margem
  if (P.vagalumes && noite > 0.5 && chuva < 0.3 && particulas.filter(p => p.tipo === 'luz').length < 26 && Math.random() < dt * 4) particulas.push({ tipo: 'luz', x: oT + rand(0, W), y: HOR - rand(1, 18), f: rand(0, 6), vida: rand(4, 9) });

  // neblina de manhã cedo (e um pouco na Baía e na chuva)
  const nevoa = clamp(Math.exp(-Math.pow((h - 6.6) / 1.3, 2)) * 0.85 + (P.gelo ? 0.2 : 0) + chuva * 0.35, 0, 0.9);
  if (nevoa > 0.03) {
    const nh = fundo.neblina.dia.height, y0 = Math.round(HOR - nh * 0.55);
    for (const [vel, al, dy] of [[2, 0.6, 0], [5, 0.4, 4]]) {
      const off = Math.round(modW(t * vel + CX * PAR.terra, W));
      cx.globalAlpha = nevoa * al; cx.drawImage(fundo.neblina[F.a], off, 0, W, nh, 0, y0 + dy, W, nh);
      if (F.t > 0) { cx.globalAlpha = nevoa * al * F.t; cx.drawImage(fundo.neblina[F.b], off, 0, W, nh, 0, y0 + dy, W, nh); }
    }
    cx.globalAlpha = 1;
  }
  // raios de sol atravessando o ar quando o sol está baixo
  const baixo = dia ? Math.max(0, 1 - Math.sin(prog * Math.PI) * 1.4) : 0;
  if (baixo > 0.05 && sol > 0.5) {
    cx.fillStyle = `rgba(${halo},1)`;
    for (let i = 0; i < 5; i++) {
      const an = (prog < 0.5 ? 0.25 : Math.PI - 0.25) + (i - 2) * 0.13 + Math.sin(t * 0.1 + i) * 0.02;
      cx.globalAlpha = baixo * 0.06 * (0.6 + 0.4 * Math.sin(t * 0.4 + i * 2));
      cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(ax + Math.cos(an - 0.035) * W, ay + Math.sin(an - 0.035) * W); cx.lineTo(ax + Math.cos(an + 0.035) * W, ay + Math.sin(an + 0.035) * W); cx.closePath(); cx.fill();
    }
    cx.globalAlpha = 1;
  }

  // ===== embaixo d'água =====
  faixa(fundo.agua, CX, WL);
  // raios de luz entrando na água
  const claridade = (1 - noite) * sol;
  if (claridade > 0.05) {
    cx.fillStyle = '#e8fff8';
    for (let i = 0; i < 6; i++) {
      const bx = modW(i * W / 5 + t * 3 + Math.sin(t * 0.3 + i) * 12 - CX, W + 60) - 30, lw = 6 + (i % 3) * 4;
      cx.globalAlpha = claridade * 0.07 * (0.6 + 0.4 * Math.sin(t * 0.7 + i * 1.7));
      cx.beginPath(); cx.moveTo(bx, WL); cx.lineTo(bx + lw, WL); cx.lineTo(bx + lw + 34, H); cx.lineTo(bx + 16, H); cx.closePath(); cx.fill();
    }
    cx.globalAlpha = 1;
  }

  // daqui até o barco, tudo está em x do mundo
  cx.save(); cx.translate(-CX, 0);
  const visivel = (x, folga = 40) => x > CX - folga && x < CX + W + folga;
  // a terra à esquerda do píer (a parte de cima; a de baixo cobre os peixes que passam por baixo do cais)
  const comTerra = CX < TERRA.margem;
  if (comTerra) desenhaTerra(t, noite, 'cima');
  // plantas balançando
  const tintaAgua = luz(P.aguaFunda), corAlga = [luz(P.alga[0]), luz(P.alga[1])];
  for (const p of fundo.plantas) {
    if (!visivel(p.x)) continue;
    const base = WL + fundo.chao0 + 4;
    for (let j = 0; j < p.h; j++) {
      const sx = Math.round(p.x + Math.sin(t * 1.1 + p.f + j * 0.18) * j * 0.09);
      cx.fillStyle = mistura(corAlga[(j >> 2) % 2 ? 1 - p.c : p.c], tintaAgua, 0.25 + j / p.h * 0.1);
      cx.fillRect(sx, base - j, P.gelo ? 2 : 1, 1);
      if (j % 5 === 3) cx.fillRect(sx + ((j / 5 | 0) % 2 ? 1 : -1), base - j, 1, 1);
    }
  }
  // caules dos nenúfares
  for (const n of fundo.nenufares) { if (!visivel(n.x)) continue; cx.fillStyle = mistura(corAlga[1], tintaAgua, 0.55); cx.globalAlpha = 0.6; for (let y = WL + 1; y < WL + fundo.chao0 + 6; y += 1) cx.fillRect(n.x + Math.round(Math.sin(t * 0.8 + y * 0.1) * 1.5), y, 1, 1); cx.globalAlpha = 1; }
  // o píer e a barraca do pescador, no canto esquerdo do lago (as estacas ficam atrás dos peixes)
  if (visivel(0, PIER.fim + 60)) desenhaPier(t, noite);
  // peixes nadando (mais apagados quanto mais fundo)
  atualizaCardume(dt, t);
  for (const p of cardume) {
    const it = ITENS[p.id], fundoK = 0.12 + (p.y - WL) / fundo.HU * 0.4;
    desenhaPeixe(p.x, p.y, p.len, it.ico.c.map(c => luz(c)), p.dir, t + p.f, tintaAgua, fundoK);
  }
  // bolhinhas
  for (let i = bolhas.length - 1; i >= 0; i--) {
    const b = bolhas[i]; b.t += dt; b.y -= 9 * dt; b.x += Math.sin(t * 4 + b.t * 3) * 3 * dt;
    if (b.y <= WL + 1) { bolhas.splice(i, 1); continue; }
    cx.fillStyle = 'rgba(220,245,255,.5)'; cx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
  }
  if (comTerra) desenhaTerra(t, noite, 'baixo');
  // a linha d'água: borda clara ondulando e um brilho logo embaixo
  const corSup = mistura('#ffffff', ceuF('base'), 0.4);
  for (let x = Math.max(CX, 1); x < CX + W; x++) {
    const o = Math.sin(x * 0.18 + t * 2.2) + Math.sin(x * 0.07 - t * 1.3) > 1.1 ? -1 : 0;
    cx.fillStyle = corSup; cx.globalAlpha = 0.75 * (0.4 + 0.6 * (1 - noite)); cx.fillRect(x, WL + o, 1, 1);
    cx.globalAlpha = 0.18; cx.fillRect(x, WL + 1 + o, 1, 1);
    if (((x + Math.floor(t * 6)) % 23) < 3) { cx.globalAlpha = 0.25 * claridade; cx.fillRect(x, WL + 2, 1, 1); }
  }
  cx.globalAlpha = 1;
  // nenúfares na superfície
  for (const n of fundo.nenufares) {
    if (!visivel(n.x)) continue;
    cx.fillStyle = luz('#3e7a34'); cx.fillRect(n.x - (n.w >> 1), WL - 1, n.w, 1);
    cx.fillStyle = luz('#5a9a44'); cx.fillRect(n.x - (n.w >> 1) + 1, WL - 2, n.w - 3, 1);
    if (n.flor) { cx.fillStyle = luz('#f4c8d8'); cx.fillRect(n.x - 1, WL - 4, 3, 2); cx.fillStyle = luz('#ffffff'); cx.fillRect(n.x, WL - 5, 1, 1); cx.fillStyle = luz('#f0d050'); cx.fillRect(n.x, WL - 4, 1, 1); }
  }

  // peixe pulando, de vez em quando (longe do píer)
  if (!pulo && Math.random() < dt * 0.06) { const it = sorteiaVisitante(); pulo = { x: Math.max(PIER.fim + 20, CX + rand(W * 0.45, W * 0.95)), t: 0, id: it.id, len: Math.min(12, tamPeixe(it.id)) }; }
  if (pulo) {
    pulo.t += dt;
    const k = pulo.t / 1.0;
    if (k >= 1) { onda(pulo.x + 14, WL, 7); respingo(pulo.x + 14, WL, 5); pulo = null; }
    else {
      if (pulo.t < dt * 1.5) { onda(pulo.x, WL, 6); respingo(pulo.x, WL, 4); }
      const px = pulo.x + k * 14, py = WL - Math.sin(k * Math.PI) * 14;
      desenhaPeixe(px, py, pulo.len, ITENS[pulo.id].ico.c.map(c => luz(c)), 1, t, '#000000', 0);
    }
  }

  // ondas na superfície e respingos
  for (let i = ondas.length - 1; i >= 0; i--) {
    const o = ondas[i]; o.r += dt * 9;
    if (o.r > o.max) { ondas.splice(i, 1); continue; }
    cx.fillStyle = `rgba(235,248,255,${(0.7 * (1 - o.r / o.max)).toFixed(2)})`;
    const rr = Math.round(o.r); cx.fillRect(Math.round(o.x - rr), WL - 1, 2, 1); cx.fillRect(Math.round(o.x + rr - 1), WL - 1, 2, 1);
    if (rr > 2) { cx.fillRect(Math.round(o.x - rr * 0.6), WL - 2, 2, 1); cx.fillRect(Math.round(o.x + rr * 0.6 - 1), WL - 2, 2, 1); }
  }

  // taboas e juncos na frente
  for (const j of fundo.juncosFrente) {
    if (!visivel(j.x)) continue;
    const bal = Math.sin(t * 1.3 + j.f);
    for (let y = 0; y < j.h; y++) {
      const sx = Math.round(j.x + bal * (y / j.h) * 1.5), py = WL + 6 - y;
      cx.fillStyle = py > WL ? mistura(luz('#4a6a2a'), tintaAgua, 0.45) : luz(y > j.h - 4 ? '#8aa040' : '#5e7e30');
      cx.fillRect(sx, py, 1, 1);
    }
    if (j.taboa) { const sx = Math.round(j.x + bal * 1.5); cx.fillStyle = luz('#6a4228'); cx.fillRect(sx, WL + 6 - j.h + 2, 2, 5); cx.fillStyle = luz('#8a5a34'); cx.fillRect(sx, WL + 6 - j.h + 2, 1, 4); }
  }

  // barco, pescador e cachorro; o pescador anda pelo píer quando desce
  if (comTerra) desenhaFazenda(t, dt, noite);
  posBarco(t);
  desenhaBarco(BARCO.x, BARCO.y, t, noite);
  if (PE.ativo) desenhaPescadorAPe(t, noite);
  desenhaTeclaE(t);

  for (let i = gotas.length - 1; i >= 0; i--) {
    const g = gotas[i]; g.t += dt; g.vy += 140 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.t > 0.8 || (g.vy > 0 && g.y > WL)) { gotas.splice(i, 1); continue; }
    cx.fillStyle = 'rgba(235,248,255,.9)'; cx.fillRect(Math.round(g.x), Math.round(g.y), 1, 1);
  }
  cx.restore();

  // chuva: céu fechado, pingos inclinados e respingos na água
  if (chuva > 0.02) {
    cx.fillStyle = luz('#4a5468'); cx.globalAlpha = chuva * 0.35; cx.fillRect(0, 0, W, WL); cx.globalAlpha = chuva * 0.2; cx.fillRect(0, WL, W, H - WL); cx.globalAlpha = 1;
    if (!P.neva) {
      if (Math.random() < chuva) for (let i = 0; i < Math.ceil(W / 25 * chuva); i++) particulas.push({ tipo: 'chuva', x: rand(-20, W), y: rand(-10, 0), v: rand(150, 200) });
      if (Math.random() < chuva * dt * 30) { const ox = CX + rand(0, W); if (ox > 2) onda(ox, WL, 3); }
    }
  }
  // neve e chuva (na tela), vagalumes e fumaça (na camada da margem)
  if (P.neva && particulas.length < W / 2.5 * (1 + chuva * 2) && Math.random() < 0.8) particulas.push({ tipo: 'neve', x: rand(-10, W), y: -2, v: rand(6, 14) * (1 + chuva), f: rand(0, 6), g: Math.random() < 0.2 });
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    if (p.tipo === 'neve') {
      p.y += p.v * dt; p.x += Math.sin(t + p.f) * 4 * dt + (3 + chuva * 10) * dt;
      if (p.y > WL) { particulas.splice(i, 1); continue; }
      cx.fillStyle = 'rgba(240,248,255,.85)'; cx.fillRect(Math.round(p.x), Math.round(p.y), p.g ? 2 : 1, p.g ? 2 : 1);
    } else if (p.tipo === 'chuva') {
      p.y += p.v * dt; p.x -= p.v * 0.25 * dt;
      if (p.y > WL) { particulas.splice(i, 1); continue; }
      cx.fillStyle = 'rgba(200,215,235,.4)'; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2); cx.fillRect(Math.round(p.x) + 1, Math.round(p.y) - 3, 1, 3);
    } else if (p.tipo === 'fumaca') {
      p.t += dt; p.y -= 5 * dt; p.x += (2 + Math.sin(t + p.t) * 2) * dt;
      if (p.t > 5) { particulas.splice(i, 1); continue; }
      cx.fillStyle = `rgba(${hexRgb(luz('#d8d4d0'))},${(0.4 * (1 - p.t / 5)).toFixed(2)})`; const s = 1 + Math.floor(p.t * 0.6); cx.fillRect(Math.round(p.x) - oT, Math.round(p.y), s, s);
    } else {
      p.vida -= dt; p.x += Math.sin(t * 0.7 + p.f) * 3 * dt; p.y += Math.cos(t * 0.9 + p.f) * 2 * dt;
      if (p.vida <= 0 || noite < 0.3) { particulas.splice(i, 1); continue; }
      const a = Math.max(0, Math.sin(t * 3 + p.f)) * Math.min(1, p.vida), lx = Math.round(p.x) - oT;
      cx.fillStyle = `rgba(230,255,140,${a.toFixed(2)})`; cx.fillRect(lx, Math.round(p.y), 1, 1);
      cx.fillStyle = `rgba(230,255,140,${(a * 0.25).toFixed(2)})`; cx.fillRect(lx - 1, Math.round(p.y), 3, 1); cx.fillRect(lx, Math.round(p.y) - 1, 1, 3);
    }
  }
  cx.drawImage(fundo.vin, 0, 0);
}

function circulo(x0, y0, r, cor) {
  cx.fillStyle = cor;
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); cx.fillRect(x0 - w, y0 + y, w * 2 + 1, 1); }
}

/* o barco: casco de madeira pintado, motor de popa, caixa de pesca e a lanterna na proa (acesa de noite) */
function desenhaBarco(bx, by, t, noite) {
  const x0 = bx - 30, comp = 60, P = fundo.P, tintaAgua = luz(P.agua);
  // cachorro sentado na proa, pescador no meio
  const cauda = Math.floor(t * 4) % 2, pisca = (t % 4.2) < 0.15;
  const acesa = noite > 0.2 || pesoFase(QF, 'crep') > 0.5 ? 1 : 0;
  // de noite a lanterna esquenta e clareia o pescador e o cachorro
  const L = c => acesa ? mistura(luz(c), mistura(c, '#ffb060', 0.25), 0.35 * Math.max(noite, 0.5)) : luz(c);
  sprite(CAO[cauda], bx + 12, by - 18, { k: L('#1a1018'), d: L('#d08e4c'), w: L('#f4e4c8'), e: pisca ? L('#d08e4c') : L('#1a1018'), n: L('#2a1810') });
  if (!PE.ativo) sprite(HEROI, bx - 6, by - 24 + (Math.floor(t * 0.8) % 2), paletaHeroi(L));
  // motor de popa
  cx.fillStyle = luz('#3a3e44'); cx.fillRect(x0 - 3, by + 1, 2, 9);
  cx.fillStyle = mistura(luz('#3a3e44'), tintaAgua, 0.4); cx.fillRect(x0 - 5, by + 8, 5, 2);
  // a capa do motor muda de cor a cada melhoria (branca, vermelha, azul, preta com dourado)
  const up = E.barcoUp || {}, CAPAS = [['#d8d8d0', '#c03a2c'], ['#c03a2c', '#f0e8d8'], ['#3a6ac0', '#f0e8d8'], ['#2a2a30', '#e8b830']], [capa, faixa] = CAPAS[up.motor || 0];
  cx.fillStyle = luz(capa); cx.fillRect(x0 - 7, by - 10, 7, 6); cx.fillStyle = luz(escurece(capa, 0.75)); cx.fillRect(x0 - 7, by - 5, 7, 2);
  cx.fillStyle = luz(faixa); cx.fillRect(x0 - 7, by - 8, 7, 1); cx.fillStyle = luz('#1a1018'); cx.fillRect(x0 - 8, by - 10, 1, 7); cx.fillRect(x0 - 7, by - 11, 7, 1);
  // porta-vara na popa, com uma segunda vara armada
  if (up.portavara) {
    cx.fillStyle = luz('#5a6068'); cx.fillRect(x0 + 5, by - 9, 2, 3);
    for (let i = 0; i < 14; i++) { cx.fillStyle = luz(i < 3 ? '#3a2414' : '#c8b060'); cx.fillRect(x0 + 6 - Math.round(i * 0.6), by - 9 - i, 1, 1); }
    cx.fillStyle = 'rgba(235,235,225,.5)'; for (let y = by - 22; y < WL; y += 2) cx.fillRect(x0 - 2 - Math.round((y - by + 22) * 0.15), y, 1, 1);
  }
  // sonar: telinha verde piscando ao lado da caixa de pesca
  if (up.sonar) {
    cx.fillStyle = luz('#1a1018'); cx.fillRect(bx - 26, by - 12, 6, 6);
    cx.fillStyle = '#123a2a'; cx.fillRect(bx - 25, by - 11, 4, 4);
    if (Math.floor(t * 3) % 3) { cx.fillStyle = '#7aff9a'; cx.fillRect(bx - 25 + Math.floor(t * 3) % 4, by - 10, 1, 1); }
  }
  // toldo listrado por cima do pescador
  if (up.toldo) {
    cx.fillStyle = luz('#5a4028'); cx.fillRect(bx - 15, by - 31, 1, 25); cx.fillRect(bx + 11, by - 31, 1, 25);
    for (let x = bx - 17; x <= bx + 13; x++) { cx.fillStyle = luz(Math.floor((x - bx + 17) / 3) % 2 ? '#e8dcc0' : '#2f7a8a'); cx.fillRect(x, by - 33, 1, 3); }
    cx.fillStyle = luz('#1a1018'); cx.fillRect(bx - 17, by - 34, 31, 1);
    if (up.toldo > 1) { cx.fillStyle = `rgba(255,170,70,${(0.08 + 0.03 * Math.sin(t * 6)).toFixed(3)})`; cx.fillRect(bx - 14, by - 30, 25, 24); }
  }
  // caixa de pesca e lanterna
  cx.fillStyle = luz('#3a7a5a'); cx.fillRect(bx - 18, by - 10, 7, 4); cx.fillStyle = luz('#5aa07a'); cx.fillRect(bx - 18, by - 10, 7, 1); cx.fillStyle = luz('#e0c060'); cx.fillRect(bx - 15, by - 8, 1, 1);
  cx.fillStyle = luz('#4a3420'); cx.fillRect(bx + 27, by - 22, 1, 16); cx.fillRect(bx + 25, by - 22, 3, 1);
  const lx = bx + 24, ly = by - 21;
  cx.fillStyle = luz('#2a2a2a'); cx.fillRect(lx - 1, ly, 3, 1); cx.fillRect(lx - 1, ly + 5, 3, 1);
  const piscaL = 0.9 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.05;
  cx.fillStyle = acesa ? '#ffd27a' : luz('#8a9098'); cx.fillRect(lx - 1, ly + 1, 3, 4);
  if (acesa) {
    cx.fillStyle = '#fff4c8'; cx.fillRect(lx, ly + 2, 1, 2);
    cx.globalCompositeOperation = 'lighter';
    for (const [r, a] of [[22, 0.04], [14, 0.06], [8, 0.1], [4, 0.16]]) circulo(lx, ly + 3, r, `rgba(255,170,70,${(a * piscaL).toFixed(3)})`);
    for (let y = WL + 1; y < WL + 14; y += 2) { const w = 3 + Math.round((y - WL) * 0.4); cx.fillStyle = `rgba(255,170,70,${(0.12 * piscaL * (1 - (y - WL) / 14)).toFixed(3)})`; cx.fillRect(lx - w + Math.round(Math.sin(t * 2 + y) * 1.5), y, w * 2, 1); }
    cx.globalCompositeOperation = 'source-over';
  }
  // casco: popa reta à esquerda, proa subindo à direita
  const linhas = 12, borda = by - 6;
  for (let j = 0; j < linhas; j++) {
    const u = j / (linhas - 1), encE = Math.round(Math.pow(u, 1.6) * 4), encD = Math.round(Math.pow(u, 1.3) * 16);
    const y = borda + j, a = x0 + encE, b = x0 + comp - encD - (j < 2 ? 0 : 0);
    let cor;
    if (j === 0) cor = '#e8c080'; else if (j === 1) cor = '#5a3420'; else if (j < 4) cor = '#ece0c4'; else if (j < 6) cor = '#2f7a8a'; else if (j === 6) cor = '#ece0c4'; else cor = '#9a3428';
    if (j > 7) cor = escurece(cor, 0.85);
    let c = luz(cor);
    if (y > WL) c = mistura(c, tintaAgua, 0.35 + (y - WL) * 0.06);
    cx.fillStyle = c; cx.fillRect(a, y, b - a, 1);
    cx.fillStyle = luz('#1a1018'); if (y > WL) cx.fillStyle = mistura(luz('#1a1018'), tintaAgua, 0.4);
    cx.fillRect(a - 1, y, 1, 1); cx.fillRect(b, y, 1, 1);
    if (j === linhas - 1) cx.fillRect(a, y + 1, b - a, 1);
    if (j > 1 && j < 6 && j % 2 === 0) { cx.fillStyle = luz('#ffffff'); cx.globalAlpha = 0.25; cx.fillRect(a + 2, y, b - a - 6, 1); cx.globalAlpha = 1; }
  }
  // proa levantada e borda superior
  cx.fillStyle = luz('#1a1018'); cx.fillRect(x0 - 1, borda - 1, comp - 2, 1); cx.fillRect(x0 + comp - 3, borda - 2, 3, 1);
  cx.fillStyle = luz('#e8c080'); cx.fillRect(x0 + comp - 4, borda - 1, 4, 1);
  // a água batendo no casco
  cx.fillStyle = 'rgba(235,248,255,.6)';
  const ond = Math.floor(t * 2) % 2;
  cx.fillRect(x0 - 2 - ond, WL, 3, 1); cx.fillRect(x0 + comp - 14 + ond, WL, 4, 1); cx.fillRect(x0 + 8 + ond * 2, WL, 6, 1);
  // sombra do barco no fundo
  cx.fillStyle = 'rgba(5,15,30,.18)'; cx.fillRect(x0 + 6, WL + fundo.chao0 + 2, comp - 10, 1); cx.fillRect(x0 + 10, WL + fundo.chao0 + 3, comp - 18, 1);
}
