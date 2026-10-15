'use strict';

/* ================= a cena: céu, montanhas, água, o barquinho com o pescador e o cachorro =================
   A tela é pintada numa resolução baixa (180 linhas, mais ou menos) e esticada com pixels nítidos.
   Céu e paisagem são pintados uma vez em 4 paletas (dia, tarde, crepúsculo, noite) quando a tela muda de tamanho ou de
   ponto de pesca; cada quadro só mistura as duas paletas da hora e desenha por cima o que mexe. */

const cv = $('screen'), cx = cv.getContext('2d');
let W = 320, H = 180, K = 4;          // largura, altura (pixels do jogo) e o tamanho de cada pixel na tela
let HOR = 100;                        // linha do horizonte
const FASES = ['dia', 'tarde', 'crep', 'noite'];
const CEUS = {
  dia: { topo: '#4f9fdc', base: '#bfe6f0', luz: 1, tinta: '#ffffff', nuvem: '#ffffff' },
  tarde: { topo: '#6a8ed0', base: '#f6c890', luz: 0.92, tinta: '#ffd8a0', nuvem: '#ffe8c8' },
  crep: { topo: '#36346c', base: '#e47c68', luz: 0.62, tinta: '#e88878', nuvem: '#f0a090' },
  noite: { topo: '#080a20', base: '#232a52', luz: 0.3, tinta: '#5060a0', nuvem: '#3a4270' }
};
// a hora do dia em quadros-chave: [hora, fase]
const HORAS = [[0, 'noite'], [4.5, 'noite'], [5.5, 'crep'], [6.5, 'tarde'], [8, 'dia'], [16, 'dia'], [17.5, 'tarde'], [18.7, 'crep'], [19.8, 'noite'], [24, 'noite']];

/* cada ponto de pesca tem a sua paisagem */
const PAISAGENS = {
  lago: { semente: 7, longe: '#7e8eae', perto: '#55697e', amp: [26, 18], neve: 0, pinho: '#2a5034', pinho2: '#1d3b26', arvores: 1, margem: '#4f7a34', agua: '#3a7ea6', agua2: '#1f4d70', corr: 2, vagalumes: true },
  rio: { semente: 21, longe: '#a88a78', perto: '#8a5e44', amp: [40, 30], neve: 0, pinho: '#365c34', pinho2: '#24422a', arvores: 0.55, margem: '#8a7a5a', agua: '#3a8c88', agua2: '#1f5658', corr: 14, vagalumes: true, paredao: true },
  baia: { semente: 33, longe: '#b8c8dc', perto: '#6e7e96', amp: [34, 22], neve: 0.45, pinho: '#2a4a4c', pinho2: '#1c3436', arvores: 0.7, margem: '#dce8f0', agua: '#2c5c80', agua2: '#163650', corr: 4, neva: true, gelo: true }
};

let fundo = null;   // { ceu: {fase: canvas}, terra: {fase: canvas}, estrelas, nuvens, brilhos, gelos }

function ajustaTela() {
  K = Math.max(2, Math.round(innerHeight / 180));
  W = Math.ceil(innerWidth / K); H = Math.ceil(innerHeight / K);
  cv.width = W; cv.height = H;
  HOR = Math.round(H * 0.5);
  cx.imageSmoothingEnabled = false;
  fundo = null;
}
addEventListener('resize', ajustaTela);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function tela(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// cor de um objeto na luz de uma fase: escurece com a luz e puxa para a cor do céu (névoa)
function naLuz(cor, fase, nevoa = 0) {
  const C = CEUS[fase];
  let c = mistura(escurece(cor, C.luz), C.tinta, fase === 'dia' ? 0 : 0.18);
  if (nevoa) c = mistura(c, C.base, nevoa);
  return c;
}

function geraFundo() {
  const P = PAISAGENS[E.ponto] || PAISAGENS.lago;
  const rnd = rngSemente(P.semente * 977 + W);
  // relevo: duas camadas de montanha somando senos
  // picos de frequências diferentes somados e normalizados para 0..1
  const montanha = (amp, fr, fase0) => {
    const f = [[0.011, 0.5], [0.027, 0.28], [0.063, 0.14], [0.13, 0.08]], v = [];
    for (let x = 0; x < W; x++) { let y = 0; f.forEach(([q, p], i) => { y += Math.sin(x * q * fr + fase0 * (i + 1)) * p; }); v.push(y); }
    const mn = Math.min(...v), mx = Math.max(...v);
    return v.map(y => Math.round(HOR - 4 - (y - mn) / (mx - mn || 1) * amp));
  };
  const longe = montanha(P.amp[0], 1, rnd() * 9), perto = montanha(P.amp[1], 1.7, rnd() * 9).map(v => v + 8);
  // pinheiros na beira
  const arvores = [];
  for (let x = -4; x < W + 4; x += 3 + Math.floor(rnd() * 5)) if (rnd() < P.arvores) arvores.push({ x, h: 7 + Math.floor(rnd() * 15), esc: rnd() < 0.4 });
  if (P.paredao) for (const lado of [0, 1]) for (let i = 0; i < 2; i++) arvores.push({ x: lado ? W - 10 - i * 8 : 6 + i * 8, h: 20 + i * 4, esc: true });

  const ceu = {}, terra = {};
  for (const f of FASES) {
    const C = CEUS[f];
    // céu em faixas com pontilhado
    const c1 = tela(W, HOR + 2), x1 = c1.getContext('2d'), img = x1.createImageData(W, HOR + 2), D = img.data;
    const A = hexRgb(C.topo), B = hexRgb(C.base), faixas = 9;
    for (let y = 0; y < HOR + 2; y++) for (let x = 0; x < W; x++) {
      const t = y / HOR * faixas, i = Math.floor(t), fr = t - i;
      const k = Math.min(faixas, i + (fr > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 1 : 0)) / faixas;
      const o = (y * W + x) * 4; D[o] = lerp(A[0], B[0], k); D[o + 1] = lerp(A[1], B[1], k); D[o + 2] = lerp(A[2], B[2], k); D[o + 3] = 255;
    }
    x1.putImageData(img, 0, 0);
    ceu[f] = c1;

    // terra: montanhas, árvores, margem, água e o reflexo
    const c2 = tela(W, H), x2 = c2.getContext('2d');
    const terrinha = tela(W, HOR + 1), xt = terrinha.getContext('2d');
    const colLonge = naLuz(P.longe, f, 0.45), colPerto = naLuz(P.perto, f, 0.18);
    for (let x = 0; x < W; x++) {
      xt.fillStyle = colLonge; xt.fillRect(x, longe[x], 1, HOR - longe[x] + 1);
      if (P.neve) { xt.fillStyle = naLuz('#f4f8ff', f, 0.3); const topo = Math.min(...longe); const lim = topo + (HOR - topo) * P.neve * 0.6; if (longe[x] < lim) xt.fillRect(x, longe[x], 1, Math.max(1, Math.round((lim - longe[x]) * 0.7))); }
    }
    for (let x = 0; x < W; x++) {
      xt.fillStyle = colPerto; xt.fillRect(x, perto[x], 1, HOR - perto[x] + 1);
      if (P.paredao && (x * 7 + perto[x]) % 11 === 0) { xt.fillStyle = naLuz(escurece(P.perto, 0.75), f, 0.15); xt.fillRect(x, perto[x] + 2, 1, HOR - perto[x]); }
      if (P.neve && perto[x] < HOR - 14) { xt.fillStyle = naLuz('#e8f0f8', f, 0.15); xt.fillRect(x, perto[x], 1, 2); }
    }
    for (const a of arvores) pinheiro(xt, a.x, HOR, a.h, naLuz(a.esc ? P.pinho2 : P.pinho, f, 0.05), naLuz(escurece(a.esc ? P.pinho2 : P.pinho, 0.7), f, 0), P.neve ? naLuz('#f0f6ff', f, 0.1) : null);
    xt.fillStyle = naLuz(P.margem, f, 0.05); xt.fillRect(0, HOR - 1, W, 2);

    x2.drawImage(terrinha, 0, 0);
    // água: mais clara perto do horizonte, mais funda embaixo, em faixas pontilhadas
    const agA = hexRgb(naLuz(P.agua, f, 0.25)), agB = hexRgb(naLuz(P.agua2, f, 0));
    const wimg = x2.createImageData(W, H - HOR - 1), wd = wimg.data, hh = H - HOR - 1;
    for (let y = 0; y < hh; y++) for (let x = 0; x < W; x++) {
      const t = y / hh * 6, i = Math.floor(t), fr = t - i;
      const k = Math.min(6, i + (fr > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 1 : 0)) / 6;
      const o = (y * W + x) * 4; wd[o] = lerp(agA[0], agB[0], k); wd[o + 1] = lerp(agA[1], agB[1], k); wd[o + 2] = lerp(agA[2], agB[2], k); wd[o + 3] = 255;
    }
    x2.putImageData(wimg, 0, HOR + 1);
    // reflexo: a paisagem de cabeça para baixo, achatada e apagada
    x2.save(); x2.globalAlpha = f === 'noite' ? 0.22 : 0.32; x2.translate(0, HOR + 1); x2.scale(1, -0.6);
    x2.drawImage(terrinha, 0, -HOR - 1 + Math.round(HOR * 0.4)); x2.restore();
    terra[f] = c2;
  }

  const r2 = rngSemente(99);
  const estrelas = []; for (let i = 0; i < W * HOR / 90; i++) estrelas.push({ x: Math.floor(r2() * W), y: Math.floor(r2() * (HOR - 10)), b: r2(), f: r2() * 6 });
  const nuvens = []; for (let i = 0; i < 5; i++) nuvens.push(geraNuvem(r2, i));
  const brilhos = []; for (let i = 0; i < W * (H - HOR) / 120; i++) brilhos.push({ x: r2() * W, y: HOR + 2 + Math.floor(Math.pow(r2(), 1.4) * (H - HOR - 3)), l: 2 + Math.floor(r2() * 5), f: r2() * 6 });
  const gelos = P.gelo ? [0, 1, 2, 3, 4].map(() => ({ x: r2() * W, y: HOR + 4 + Math.floor(r2() * (H - HOR) * 0.5), w: 6 + Math.floor(r2() * 14) })) : [];
  fundo = { ceu, terra, estrelas, nuvens, brilhos, gelos, P, ponto: E.ponto };
}

function pinheiro(x, px, base, h, cor, sombra, neve) {
  x.fillStyle = sombra; x.fillRect(px, base - 3, 1, 3);
  for (let j = 0; j < h; j++) {
    const y = base - 2 - j, frac = j / h, saliente = (j % 4 === 0) ? 1 : 0;
    const w = Math.max(0, Math.round((1 - frac) * h * 0.32) + saliente - 0);
    x.fillStyle = cor; x.fillRect(px - w, y, w * 2 + 1, 1);
    x.fillStyle = sombra; x.fillRect(px + 1, y, w, 1);
    if (neve && saliente && w > 0) { x.fillStyle = neve; x.fillRect(px - w, y, w + 1, 1); }
  }
}
function geraNuvem(r, i) {
  const pts = [], n = 3 + Math.floor(r() * 4), w = 18 + Math.floor(r() * 26);
  for (let k = 0; k < n; k++) pts.push([r() * w, r() * 3, 4 + r() * 5]);
  const spans = [];
  for (let y = -9; y <= 4; y++) { let a = null, b = null; for (let x = -8; x < w + 8; x++) if (pts.some(([cx0, cy0, rr]) => ((x - cx0) ** 2) / (rr * rr * 1.8) + ((y - cy0) ** 2) / (rr * rr * 0.5) <= 1) && y <= 2) { if (a === null) a = x; b = x; } if (a !== null) spans.push([y, a, b]); }
  return { x: r() * 600, y: 6 + i * 9 + r() * 8, v: 0.6 + r() * 1.2, spans };
}

/* ===== o que mexe ===== */
const ondas = [];      // anéis na água
const gotas = [];      // respingos
const particulas = []; // neve e vagalumes
let pulo = null;       // um peixe pulando lá longe
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
const pesoNoite = (F) => (F.a === 'noite' ? 1 - F.t : 0) + (F.b === 'noite' ? F.t : 0);

/* posição do barco e da ponta da vara (usadas pela pesca) */
const BARCO = { x: 0, y: 0, balanco: 0 };
function posBarco(t) {
  BARCO.x = Math.round(W * 0.26);
  BARCO.balanco = Math.sin(t * 1.3) * 0.8;
  BARCO.y = Math.round(HOR + (H - HOR) * 0.42 + BARCO.balanco);
  return BARCO;
}

/* ===== sprites desenhados à mão (k = contorno) ===== */
const HEROI = [
  '....kkkkk.....',
  '...khhhhhk....',
  '...khbbbhk....',
  '.kkHHHHHHHkk..',
  '..kksssseskk..',
  '....ksssssk...',
  '....kksssk....',
  '...kccccccck..',
  '..kcccccccaak.',
  '..kccccccck...',
  '..kccccccck...',
  '..kppppppppk..',
  '..kpppppppppk.'
];
const CAO = [
  ['......kkk..', '.....kdddk.', '.....kddedk', '....kddddnk', 'k...kdddkk.', 'tk.kdddk...', '.kkdddddk..', '.kddddddk..', '.kdkddkdk..'],
  ['......kkk..', '.....kdddk.', '.....kddedk', '....kddddnk', '....kdddkk.', 'kk.kdddk...', 'tkkdddddk..', '.kddddddk..', '.kdkddkdk..']
];
function sprite(mapa, x0, y0, pal) {
  for (let y = 0; y < mapa.length; y++) { const ln = mapa[y]; for (let x = 0; x < ln.length; x++) { const c = pal[ln[x]]; if (c) { cx.fillStyle = c; cx.fillRect(x0 + x, y0 + y, 1, 1); } } }
}
function paletaHeroi(fase, luzT) {
  const L = c => mistura(escurece(c, luzT), '#3a4270', (1 - luzT) * 0.25);
  const met = s => E.equip[s] && ITENS[E.equip[s]].metal ? METAIS.find(m => m.id === ITENS[E.equip[s]].metal).cor : null;
  const cap = met('capacete'), pei = met('peitoral'), cal = met('calcas');
  return {
    k: L('#1a1018'), s: L('#f0b890'), e: L('#1a1018'), a: L('#f0b890'),
    h: L(cap || '#ecc868'), b: L(cap ? escurece(cap, 0.7) : '#b03828'), H: L(cap ? escurece(cap, 0.85) : '#c8a040'),
    c: L(pei || '#c04838'), p: L(cal || '#3a5a8a')
  };
}

function desenhaCena(t, dt) {
  if (!fundo || fundo.ponto !== E.ponto) geraFundo();
  const P = fundo.P, F = faseAgora(), noite = pesoNoite(F);
  const luzT = lerp(CEUS[F.a].luz, CEUS[F.b].luz, F.t);
  // céu
  cx.globalAlpha = 1; cx.drawImage(fundo.ceu[F.a], 0, 0);
  if (F.t > 0) { cx.globalAlpha = F.t; cx.drawImage(fundo.ceu[F.b], 0, 0); cx.globalAlpha = 1; }
  // estrelas
  if (noite > 0.05) for (const s of fundo.estrelas) {
    const a = noite * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.f))) * (s.b > 0.85 ? 1 : 0.6);
    cx.fillStyle = `rgba(255,248,220,${a.toFixed(2)})`; cx.fillRect(s.x, s.y, 1, 1);
  }
  // sol e lua: arco de um lado ao outro
  const h = F.h, dia = h >= 5.5 && h < 19.5;
  const prog = dia ? (h - 5.5) / 14 : ((h + 24 - 19.5) % 24) / 10;
  const ax = Math.round(lerp(W * 0.08, W * 0.92, prog)), ay = Math.round(HOR - 8 - Math.sin(prog * Math.PI) * (HOR * 0.75));
  if (dia) { circulo(ax, ay, 7, F.a === 'dia' && F.t < 0.5 ? '#fff4c0' : '#ffd080'); circulo(ax, ay, 5, '#fffbe4'); }
  else { circulo(ax, ay, 6, '#e8ecff'); circulo(ax + 3, ay - 1, 5, mistura(CEUS.noite.topo, CEUS.noite.base, 0.2)); }
  // nuvens
  const corN = mistura(CEUS[F.a].nuvem, CEUS[F.b].nuvem, F.t);
  for (const n of fundo.nuvens) {
    n.x += n.v * dt; const span = W + 80; const nx = Math.round((n.x % span) - 40);
    cx.fillStyle = corN; cx.globalAlpha = 0.85;
    for (const [y, a, b] of n.spans) cx.fillRect(nx + a, Math.round(n.y) + y, b - a + 1, 1);
    cx.globalAlpha = 1;
  }
  // paisagem e água
  cx.drawImage(fundo.terra[F.a], 0, 0);
  if (F.t > 0) { cx.globalAlpha = F.t; cx.drawImage(fundo.terra[F.b], 0, 0); cx.globalAlpha = 1; }
  // brilho do sol (ou da lua) na água
  for (let y = HOR + 2; y < H; y += 2) {
    const w = Math.round(2 + (y - HOR) * 0.12 + Math.sin(t * 2 + y) * 2);
    cx.fillStyle = dia ? 'rgba(255,240,190,.28)' : 'rgba(220,230,255,.18)';
    if ((y + Math.floor(t * 3)) % 4 < 2) cx.fillRect(ax - w + Math.round(Math.sin(t + y * 0.7) * 2), y, w * 2, 1);
  }
  // brilhos na água correndo com a correnteza
  const corB = mistura('#ffffff', CEUS[F.a].base, 0.4);
  for (const b of fundo.brilhos) {
    const vis = Math.sin(t * 1.4 + b.f);
    if (vis < 0.2) continue;
    const x = ((b.x + t * P.corr * (0.4 + (b.y - HOR) / (H - HOR))) % (W + 10)) - 5;
    cx.fillStyle = corB; cx.globalAlpha = 0.35 * vis; cx.fillRect(Math.round(x), b.y, b.l, 1);
  }
  cx.globalAlpha = 1;
  // blocos de gelo boiando
  for (const g of fundo.gelos) {
    const gx = Math.round(((g.x + t * 1.5) % (W + 30)) - 15), gy = g.y + Math.round(Math.sin(t + g.x) * 0.6);
    cx.fillStyle = naLuz('#e8f4ff', F.a); cx.fillRect(gx, gy, g.w, 2);
    cx.fillStyle = naLuz('#a8c8e0', F.a); cx.fillRect(gx + 1, gy + 2, g.w - 2, 1);
  }
  // peixe pulando lá longe, de vez em quando
  if (!pulo && Math.random() < dt * 0.05) pulo = { x: rand(W * 0.45, W * 0.95), y: HOR + rand(6, (H - HOR) * 0.5), t: 0 };
  if (pulo) {
    pulo.t += dt;
    const k = pulo.t / 0.9;
    if (k >= 1) { onda(pulo.x + 6, pulo.y, 6); pulo = null; }
    else {
      const px = Math.round(pulo.x + k * 6), py = Math.round(pulo.y - Math.sin(k * Math.PI) * 7);
      cx.fillStyle = naLuz('#c8d0d8', F.a); cx.fillRect(px, py, 3, 1); cx.fillRect(px + 1, py - 1, 1, 1);
      if (pulo.t < dt * 1.5) onda(pulo.x, pulo.y, 5);
    }
  }

  // ondas e respingos
  for (let i = ondas.length - 1; i >= 0; i--) {
    const o = ondas[i]; o.r += dt * 9;
    if (o.r > o.max) { ondas.splice(i, 1); continue; }
    cx.fillStyle = `rgba(230,245,255,${(0.6 * (1 - o.r / o.max)).toFixed(2)})`;
    for (let a = 0; a < 24; a++) { const an = a / 24 * Math.PI * 2; cx.fillRect(Math.round(o.x + Math.cos(an) * o.r), Math.round(o.y + Math.sin(an) * o.r * 0.3), 1, 1); }
  }

  // barco, pescador e cachorro
  posBarco(t);
  desenhaBarco(BARCO.x, BARCO.y, F, luzT, t);

  for (let i = gotas.length - 1; i >= 0; i--) {
    const g = gotas[i]; g.t += dt; g.vy += 140 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.t > 0.8) { gotas.splice(i, 1); continue; }
    cx.fillStyle = 'rgba(230,245,255,.85)'; cx.fillRect(Math.round(g.x), Math.round(g.y), 1, 1);
  }

  // neve e vagalumes
  if (P.neva && particulas.length < W / 3 && Math.random() < 0.7) particulas.push({ tipo: 'neve', x: rand(-10, W), y: -2, v: rand(6, 14), f: rand(0, 6) });
  if (P.vagalumes && noite > 0.5 && particulas.length < 24 && Math.random() < dt * 3) particulas.push({ tipo: 'luz', x: rand(0, W), y: HOR - rand(2, 16), f: rand(0, 6), vida: rand(4, 9) });
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    if (p.tipo === 'neve') {
      p.y += p.v * dt; p.x += Math.sin(t + p.f) * 4 * dt + 3 * dt;
      if (p.y > H) { particulas.splice(i, 1); continue; }
      cx.fillStyle = 'rgba(240,248,255,.85)'; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    } else {
      p.vida -= dt; p.x += Math.sin(t * 0.7 + p.f) * 3 * dt; p.y += Math.cos(t * 0.9 + p.f) * 2 * dt;
      if (p.vida <= 0 || P.neva || noite < 0.3) { particulas.splice(i, 1); continue; }
      const a = Math.max(0, Math.sin(t * 3 + p.f)) * Math.min(1, p.vida);
      cx.fillStyle = `rgba(230,255,140,${a.toFixed(2)})`; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }
}

function circulo(x0, y0, r, cor) {
  cx.fillStyle = cor;
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); cx.fillRect(x0 - w, y0 + y, w * 2 + 1, 1); }
}

function desenhaBarco(bx, by, F, luzT, t) {
  const L = c => mistura(escurece(c, luzT), '#3a4270', (1 - luzT) * 0.25);
  // cachorro sentado na proa de trás, pescador no meio
  const cauda = Math.floor(t * 4) % 2;
  sprite(CAO[cauda], bx - 15, by - 9, { k: L('#1a1018'), d: L('#c88848'), e: L('#1a1018'), n: L('#2a1810'), t: L('#c88848') });
  sprite(HEROI, bx - 2, by - 13, paletaHeroi(F, luzT));
  // casco: tábuas, borda clara, sombra embaixo
  const comp = 40, x0 = bx - 20;
  for (let j = 0; j < 7; j++) {
    const enc = j < 1 ? 0 : Math.round(j * j * 0.18);
    cx.fillStyle = j === 0 ? L('#d8a868') : j === 1 ? L('#2a1810') : j % 2 ? L('#8a5a30') : L('#74482a');
    cx.fillRect(x0 + enc - (j === 0 ? 1 : 0), by + j, comp - enc * 2 + (j === 0 ? 2 : 0), 1);
  }
  cx.fillStyle = L('#2a1810'); cx.fillRect(x0 - 1, by - 1, 2, 2); cx.fillRect(x0 + comp - 1, by - 1, 2, 2);
  // sombra e reflexo do barco
  cx.fillStyle = 'rgba(10,20,40,.35)'; cx.fillRect(x0 + 6, by + 7, comp - 12, 1); cx.fillRect(x0 + 10, by + 8, comp - 20, 1);
  // ondinhas batendo no casco
  if (Math.floor(t * 2) % 2) { cx.fillStyle = 'rgba(230,245,255,.5)'; cx.fillRect(x0 - 3, by + 5, 3, 1); cx.fillRect(x0 + comp + 1, by + 4, 3, 1); }
}
