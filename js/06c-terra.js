'use strict';

/* ================= a terra à esquerda do píer: a fazenda e a fogueira =================
   Saindo da barraca e andando para a esquerda, o pescador chega na fazenda (os canteiros, um ao lado do outro) e,
   mais adiante, na fogueira com as ferramentas de cozinha. Cada ofício só funciona estando no lugar dele:
   - no canteiro, E planta (abre a escolha de sementes), rega ou colhe, conforme o que o canteiro precisa;
   - na placa depois do último canteiro, E compra um canteiro novo;
   - na fogueira, E abre a cozinha (js/09-paineis.js, painel 'fogueira').
   O chão parado (campo, trilha, terra, cerca, árvores) é pintado uma vez por paleta em geraTerra (chamado pelo
   geraFundo de js/06-cena.js); canteiros, plantas, fogo e panela são desenhados todo quadro. Tudo em x do mundo:
   a terra vai de TERRA.ini até o x 0, onde começa o píer. */

const TERRA = { ini: -340, margem: 34 };   // ao longe a margem avança até x = margem (a terra vista em perspectiva)
const FAZENDA = { x0: -30, passo: 20 };     // o canteiro i fica centrado em x0 - i * passo
const FOGUEIRA = { x: -266 };
const xCanteiro = i => FAZENDA.x0 - i * FAZENDA.passo;
const PERTO = 8;

function canteiroPerto() {
  if (!PE.ativo) return -1;
  for (let i = 0; i < E.horta.length; i++) if (Math.abs(PE.x - xCanteiro(i)) <= PERTO) return i;
  return -1;
}
const naPlaca = () => PE.ativo && E.horta.length < CANTEIRO_PRECO.length && Math.abs(PE.x - xCanteiro(E.horta.length)) <= PERTO;
const naFogueira = () => PE.ativo && Math.abs(PE.x - FOGUEIRA.x) <= 16;
function lugarAtual() {
  if (!PE.ativo) return null;
  if (PE.x > 0) return 'Barraca do pescador';
  if (PE.x < FOGUEIRA.x + 34) return 'Fogueira';
  return 'Fazenda';
}

/* o que o E faz em terra (devolve o texto do botão; com faz = true, faz) */
function acaoTerra(faz) {
  if (naFogueira()) { if (faz) abrePainel('fogueira'); return 'Cozinhar'; }
  if (naPlaca()) {
    const pr = CANTEIRO_PRECO[E.horta.length];
    if (faz) {
      if (gasta(pr)) { E.horta.push({ planta: null, desde: 0, bonus: 0, rega: 0 }); sfx.moeda(); aviso('Canteiro novo pronto para plantar!'); salvar(); }
      else aviso(`Faltam ${fmt(pr - E.moedas)} de ouro para o canteiro novo.`);
    }
    return `Comprar canteiro (${fmt(pr)} de ouro)`;
  }
  const i = canteiroPerto(); if (i < 0) return '';
  const c = E.horta[i];
  if (!c.planta) { if (faz) { canteiroSel = i; abrePainel('plantar'); } return 'Plantar'; }
  if (prontoCanteiro(c) >= 1) {
    if (faz) { const r = colhe(i); if (r) aviso(`Colheu ${r.n} ${ITENS[r.id].nome.toLowerCase()}${r.minhocas ? ` e ${r.minhocas} minhoca${r.minhocas > 1 ? 's' : ''}` : ''}`); salvar(); }
    return 'Colher';
  }
  if (!molhado(c)) { if (faz) { rega(i); PE.rega = 1.1; salvar(); } return 'Regar'; }
  if (faz) aviso(`${plantaDe(c.planta).nome}: molhado, falta ${fmtTempo(faltaCanteiro(c))}.`);
  return `Crescendo · ${fmtTempo(faltaCanteiro(c))}`;
}

/* ===== o chão parado, pintado uma vez por paleta ===== */
function geraTerra(P, f) {
  const y0 = HOR + 2, D = WL - 5, larg = -TERRA.ini + TERRA.margem, alto = H - y0;
  const c = tela(larg, alto), x = c.getContext('2d');
  const L = (cor, nev = 0) => naLuz(cor, f, nev);
  const px = wx => wx - TERRA.ini, py = y => y - y0;
  const neve = !!P.neve;
  const grama = neve ? '#dce6ee' : P.grama || '#6c9c46', gramaL = mistura(grama, '#ffffff', neve ? 0.4 : 0.22), gramaS = escurece(grama, neve ? 0.86 : 0.74);
  const trilha = neve ? '#b8b0a4' : '#a8885a', trilhaS = escurece(trilha, 0.78), chao = P.chaoTerra || '#6a4a2e';
  const prof = H - D;
  for (let wx = TERRA.ini; wx < TERRA.margem; wx++) {
    const cx0 = px(wx);
    // o campo, do pé da floresta até a trilha (ao longe, a margem do lago avança para a direita)
    for (let y = y0; y < D - 4; y++) {
      const u = (D - 4 - y) / (D - 4 - y0), borda = Math.max(0, Math.round(TERRA.margem * u + (hash(y, 3) - 0.5) * 2));
      if (wx > borda) continue;
      const nev = u * 0.18, h = hash(wx, y);
      let cor = h < 0.16 ? gramaS : h > 0.9 ? gramaL : grama;
      if (u > 0.6 && bayer(wx, y) < (u - 0.6) * 1.2) cor = gramaS;
      if (wx > borda - 2) cor = P.margem;
      x.fillStyle = L(cor, nev); x.fillRect(cx0, py(y), 1, 1);
    }
    if (wx > 0) continue;
    // a trilha batida por onde o pescador anda
    for (let y = D - 4; y < D; y++) {
      const h = hash(wx, y + 50);
      x.fillStyle = L(y === D - 4 ? gramaS : h < 0.12 ? trilhaS : h > 0.93 ? mistura(trilha, '#ffffff', 0.25) : trilha); x.fillRect(cx0, py(y), 1, 1);
    }
    // a terra em corte: escurece com a fundura, pedrinhas e raízes; no x 0, o muro de pedra do cais
    for (let y = D; y < H; y++) {
      const d = y - D, k = d / prof;
      let cor = d === 0 ? '#2a1a10' : mistura(chao, '#1a120c', Math.min(0.75, k * 0.9));
      if (d > 1 && bayer(wx, y) < k * 0.6) cor = escurece(cor, 0.82);
      if (d === 1 && !neve) cor = mistura(grama, chao, 0.5);
      if (hash(wx >> 2, y >> 1) > 0.94 && d > 3) cor = mistura('#8a8478', '#1a120c', k * 0.6);
      if (wx > -6) {
        const bloco = ((y - D) >> 2) % 2 ? (wx + 9) % 6 : (wx + 6) % 6;
        cor = (y - D) % 4 === 0 || bloco === 0 ? '#2e2a2a' : mistura(P.pedra, '#2a2830', k * 0.5);
      }
      x.fillStyle = L(cor); x.fillRect(cx0, py(y), 1, 1);
    }
  }
  // raízes e minhocas na terra
  const rr = rngSemente(P.semente * 7 + 3);
  for (let i = 0; i < 40; i++) {
    const wx = Math.floor(TERRA.ini + rr() * (-TERRA.ini - 10)), y = D + 3 + Math.floor(rr() * Math.min(30, prof - 4));
    x.fillStyle = L(rr() < 0.7 ? '#4a3220' : '#c87070');
    for (let j = 0; j < 3 + rr() * 4; j++) x.fillRect(px(wx + j), py(y + Math.round(Math.sin(j) * 1)), 1, 1);
  }
  // árvores no fim da terra e moitas no campo
  const cores = (P.folhas && P.folhas.length ? P.folhas[0] : P.pinho).map(cc => L(cc, 0.02)), tronco = L('#4a3020'), betula = L('#d8d4c8');
  const pinho = P.pinho.map(cc => L(cc, 0.02)), neveC = neve ? L('#f0f6ff') : null;
  pinheiro(x, px(TERRA.ini + 8), py(D - 4), 46, pinho, tronco, neveC);
  if (P.folhas && P.folhas.length) arvore(x, px(TERRA.ini + 26), py(D - 4), 40, cores, tronco, rngSemente(5), betula);
  else pinheiro(x, px(TERRA.ini + 24), py(D - 4), 36, pinho, tronco, neveC);
  pinheiro(x, px(TERRA.ini + 40), py(D - 5), 26, P.pinho.map(cc => L(cc, 0.08)), tronco, neveC);
  for (const wx of [-300, -236, -150, -58]) {
    for (let j = 0; j < 9; j++) for (let i = -4; i <= 4; i++) {
      if (i * i / 16 + (j - 4) * (j - 4) / 16 > 1) continue;
      const v = i + j - 4 + (hash(wx + i, j) - 0.5) * 3;
      x.fillStyle = L(neve ? (v < -1 ? '#f0f6fa' : '#b0c0cc') : v < -2 ? gramaL : v > 2 ? escurece(grama, 0.6) : gramaS, 0.04);
      x.fillRect(px(wx + i), py(D - 13 + j), 1, 1);
    }
  }
  // cerca da fazenda, atrás dos canteiros
  const ce0 = xCanteiro(CANTEIRO_PRECO.length - 1) - 12, ce1 = FAZENDA.x0 + 12;
  for (let wx = ce0; wx <= ce1; wx++) {
    x.fillStyle = L('#8a6440'); x.fillRect(px(wx), py(D - 10), 1, 1); x.fillRect(px(wx), py(D - 7), 1, 1);
    if (neve) { x.fillStyle = L('#f0f6ff'); x.fillRect(px(wx), py(D - 11), 1, 1); }
  }
  for (let wx = ce0; wx <= ce1; wx += 10) { x.fillStyle = L('#2a1a10'); x.fillRect(px(wx) - 1, py(D - 13), 3, 9); x.fillStyle = L('#a87c50'); x.fillRect(px(wx), py(D - 12), 1, 7); }
  // placa da fazenda e o suporte com enxada, pá e regador perto do píer
  const pl = px(-12);
  x.fillStyle = L('#2a1a10'); x.fillRect(pl, py(D - 12), 2, 9); x.fillRect(pl - 6, py(D - 18), 14, 7);
  x.fillStyle = L('#c8a070'); x.fillRect(pl - 5, py(D - 17), 12, 5);
  x.fillStyle = L('#5aa83a'); x.fillRect(pl - 2, py(D - 16), 1, 3); x.fillRect(pl - 3, py(D - 16), 1, 1); x.fillRect(pl - 1, py(D - 15), 1, 1);
  x.fillStyle = L('#e87818'); x.fillRect(pl + 2, py(D - 15), 3, 2); x.fillStyle = L('#5aa83a'); x.fillRect(pl + 3, py(D - 16), 1, 1);
  // lenha empilhada e um toco perto da fogueira
  const lx = px(FOGUEIRA.x - 40);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
    const ax = lx + i * 5 + r * 2.5 | 0, ay = py(D - 5 - r * 4);
    x.fillStyle = L('#2a1a10'); x.fillRect(ax, ay, 5, 5);
    x.fillStyle = L('#c8a070'); x.fillRect(ax + 1, ay + 1, 3, 3); x.fillStyle = L('#8a6440'); x.fillRect(ax + 2, ay + 2, 1, 1);
  }
  return c;
}

/* ===== o que é desenhado todo quadro ===== */
const faiscas = [], pingos = [];

function desenhaTerra(t, noite, parte) {
  const img = fundo.chaoTerra, y0 = HOR + 2, corte = WL - y0, larg = img.dia.width;
  const [sy, sh] = parte === 'cima' ? [0, corte] : [corte, img.dia.height - corte];
  if (sh <= 0) return;
  cx.globalAlpha = 1; cx.drawImage(img[QF.a], 0, sy, larg, sh, TERRA.ini, y0 + sy, larg, sh);
  if (QF.t > 0) { cx.globalAlpha = QF.t; cx.drawImage(img[QF.b], 0, sy, larg, sh, TERRA.ini, y0 + sy, larg, sh); cx.globalAlpha = 1; }
}

function desenhaFazenda(t, dt, noite) {
  if (CAM.x > 4) return;
  const D = WL - 5;
  E.horta.forEach((c, i) => desenhaCanteiro(c, xCanteiro(i), D, t));
  if (E.horta.length < CANTEIRO_PRECO.length) desenhaPlaca(xCanteiro(E.horta.length), D, t);
  desenhaFogueira(FOGUEIRA.x, D, t, dt, noite);
  // o regador na mão, com a água caindo no canteiro
  if (PE.rega > 0) {
    PE.rega -= dt;
    const rx = Math.round(PE.x) + PE.dir * 7, ry = D - 11;
    cx.fillStyle = luz('#1a1018'); cx.fillRect(rx - 3, ry - 1, 7, 6);
    cx.fillStyle = luz('#7a9ab0'); cx.fillRect(rx - 2, ry, 5, 4); cx.fillStyle = luz('#a8c4d4'); cx.fillRect(rx - 2, ry, 5, 1);
    cx.fillStyle = luz('#5a7a90'); cx.fillRect(rx + PE.dir * 3, ry + 1, 1, 1); cx.fillRect(rx + PE.dir * 4, ry + 2, 1, 1);
    if (Math.random() < dt * 40) pingos.push({ x: rx + PE.dir * 5 + rand(-1, 1), y: ry + 3, vy: rand(10, 25) });
  }
  for (let i = pingos.length - 1; i >= 0; i--) {
    const p = pingos[i]; p.vy += 120 * dt; p.y += p.vy * dt;
    if (p.y > D - 4) { pingos.splice(i, 1); continue; }
    cx.fillStyle = 'rgba(160,210,255,.85)'; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
  }
}

function desenhaCanteiro(c, x0, D, t) {
  const x = Math.round(x0), m = c.planta && molhado(c);
  const solo = m ? '#40281a' : '#6a4428', soloL = m ? '#58382a' : '#8a5c38';
  cx.fillStyle = luz('#2a1a10'); cx.fillRect(x - 8, D - 6, 17, 6);
  cx.fillStyle = luz(soloL); cx.fillRect(x - 7, D - 5, 15, 1);
  cx.fillStyle = luz(solo); cx.fillRect(x - 7, D - 4, 15, 3);
  for (const dx of [-5, -1, 3]) { cx.fillStyle = luz(escurece(solo, 0.7)); cx.fillRect(x + dx, D - 3, 2, 1); }
  if (m) { cx.fillStyle = 'rgba(150,200,255,.35)'; cx.fillRect(x - 6, D - 5, 3, 1); cx.fillRect(x + 2, D - 5, 2, 1); }
  if (!c.planta) return;
  const p = plantaDe(c.planta), k = prontoCanteiro(c), base = D - 6;
  if (p.id === 'abobora') desenhaPlanta(p, x, base, k, t, 1);
  else for (const dx of [-4, 0, 4]) desenhaPlanta(p, x + dx, base, k, t, 0);
  if (k >= 1 && Math.sin(t * 4 + x) > 0.6) { cx.fillStyle = '#fff8c0'; const sx = x + Math.round(Math.sin(t * 1.3 + x) * 5); cx.fillRect(sx, base - 14, 1, 3); cx.fillRect(sx - 1, base - 13, 3, 1); }
}

function desenhaPlanta(p, x, b, k, t, grande) {
  const L = c => luz(c), folha = p.folha, folhaL = mistura(folha, '#ffffff', 0.25), folhaS = escurece(folha, 0.7);
  const bal = Math.round(Math.sin(t * 1.6 + x * 0.7) * 0.6);
  const px = (dx, dy, cor, w = 1, h = 1) => { cx.fillStyle = L(cor); cx.fillRect(x + dx, b + dy, w, h); };
  if (k < 0.12) { px(0, 0, mistura(p.cor, '#3a2414', 0.4)); return; }
  if (k < 0.4) { px(0, -1, folha, 1, 2); px(-1, -2, folhaL); px(1, -2, folhaL); return; }
  if (k < 1) {
    const alto = p.id === 'milho' ? 4 + Math.round((k - 0.4) / 0.6 * 6) : 3 + Math.round((k - 0.4) / 0.6 * 3);
    if (p.id === 'abobora') { for (let i = -4; i <= 4; i++) px(i, -1 - (Math.abs(i) % 3 === 1 ? 1 : 0), i % 2 ? folha : folhaS); px(-2 + bal, -3, folhaL, 2); px(2, -3, folhaL, 2); return; }
    px(0, -alto, folha, 1, alto);
    for (let j = 1; j < alto; j += 2) px(j % 4 === 1 ? -1 + bal : 1 + bal, -j - 1, folhaL);
    px(bal, -alto - 1, folhaL);
    return;
  }
  // pronto para colher
  switch (p.id) {
    case 'batata':
      px(-2, -1, '#a07040', 2); px(1, -1, '#a07040', 2);
      for (const [dx, dy, w] of [[-2, -2, 5], [-2, -3, 5], [-1, -4, 4], [-1, -5, 3]]) px(dx + (dy < -3 ? bal : 0), dy, folha, w);
      px(-2, -3, folhaL); px(0, -5 + 0, folhaL); px(2, -2, folhaS); px(0 + bal, -6, '#e8e0f0');
      break;
    case 'cenoura':
      px(-1, -2, p.cor, 3, 2); px(0, -3, escurece(p.cor, 0.8));
      for (let j = 0; j < 5; j++) { px(-1 + bal, -4 - j, j % 2 ? folhaL : folha); px(1 + bal, -4 - j, j % 2 ? folha : folhaL); }
      break;
    case 'milho':
      px(0, -13, folha, 1, 13); px(bal, -15, '#e8d080', 1, 2);
      for (const j of [3, 6, 9]) { px(-1 + bal, -j, folhaL); px(-2 + bal, -j + 1, folhaL); px(1 + bal, -j - 1, folhaS); px(2 + bal, -j, folhaS); }
      px(1, -9, p.cor, 2, 3); px(1, -10, '#a8c060');
      break;
    case 'tomate':
      px(0, -10, '#8a6440', 1, 10);
      for (let j = 1; j < 9; j++) px(j % 2 ? -1 + bal : 1 + bal, -j, j % 3 ? folha : folhaL);
      px(-2, -4, p.cor, 2, 2); px(1, -7, p.cor, 2, 2); px(-1, -9, p.cor, 2, 1); px(-2, -4, '#ff9080');
      break;
    case 'pimenta':
      for (const [dx, dy, w] of [[-2, -2, 5], [-2, -3, 5], [-1, -4, 3], [0, -5, 1]]) px(dx + (dy < -3 ? bal : 0), dy, folha, w);
      px(-2, -3, p.cor, 1, 2); px(2, -4, p.cor, 1, 2); px(0 + bal, -6, p.cor);
      break;
    case 'abobora': {
      for (let i = -5; i <= 5; i++) px(i, -1 - (Math.abs(i) % 4 === 2 ? 1 : 0), i % 2 ? folha : folhaS);
      for (let j = 0; j < 6; j++) for (let i = -4; i <= 4; i++) {
        if (i * i / 20 + (j - 2.5) * (j - 2.5) / 7 > 1) continue;
        px(i, -j - 1, i === -1 || i === 2 ? escurece(p.cor, 0.75) : i < -2 && j > 2 ? mistura(p.cor, '#ffffff', 0.3) : p.cor);
      }
      px(0, -8, '#5a7a30', 1, 2); px(1, -9, folhaL);
      break;
    }
    default:   // ervas finas
      for (let i = -2; i <= 2; i++) { const h = 4 + (i % 2 ? 1 : 0); px(i + (h > 4 ? bal : 0), -h, folha, 1, h); px(i + bal, -h - 1, folhaL); }
      px(0, -6, '#f0f0ff');
  }
}

function desenhaPlaca(x0, D, t) {
  const x = Math.round(x0);
  // o lugar do canteiro marcado com estacas e a placa de vende-se
  cx.fillStyle = luz('#7a5634'); for (const dx of [-7, 7]) cx.fillRect(x + dx, D - 6, 1, 3);
  cx.fillStyle = 'rgba(40,24,14,.35)'; cx.fillRect(x - 6, D - 4, 13, 1);
  cx.fillStyle = luz('#2a1a10'); cx.fillRect(x, D - 14, 2, 10); cx.fillRect(x - 5, D - 20, 12, 7);
  cx.fillStyle = luz('#c8a070'); cx.fillRect(x - 4, D - 19, 10, 5);
  cx.fillStyle = luz('#ffc830'); cx.fillRect(x - 1, D - 18, 4, 3); cx.fillStyle = luz('#e0a020'); cx.fillRect(x, D - 17, 2, 1);
}

function desenhaFogueira(x0, D, t, dt, noite) {
  const x = Math.round(x0), L = c => luz(c), cozinhando = !!E.cozinha.rec;
  const vivo = cozinhando ? 1 : 0.55;
  // o brilho do fogo (mais forte de noite)
  const pisca = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.07;
  cx.globalCompositeOperation = 'lighter';
  for (const [r, a] of [[46, 0.03], [28, 0.05], [16, 0.08], [8, 0.12]]) circulo(x, D - 6, r, `rgba(255,150,60,${(a * (0.35 + noite) * vivo * pisca).toFixed(3)})`);
  cx.globalCompositeOperation = 'source-over';
  // toco com a tábua e a faca, à direita
  const tx = x + 22;
  cx.fillStyle = L('#2a1a10'); cx.fillRect(tx - 6, D - 9, 13, 9);
  cx.fillStyle = L('#7a5634'); cx.fillRect(tx - 5, D - 7, 11, 7); cx.fillStyle = L('#5a3e24'); cx.fillRect(tx - 2, D - 6, 1, 6); cx.fillRect(tx + 3, D - 6, 1, 5);
  cx.fillStyle = L('#c8a070'); cx.fillRect(tx - 5, D - 8, 11, 1);
  cx.fillStyle = L('#e0c090'); cx.fillRect(tx - 4, D - 10, 8, 2); cx.fillStyle = L('#1a1018'); cx.fillRect(tx - 4, D - 9, 8, 1);
  cx.fillStyle = L('#d8dce0'); cx.fillRect(tx - 2, D - 11, 5, 1); cx.fillStyle = L('#4a2e1c'); cx.fillRect(tx + 3, D - 11, 2, 1);
  desenhaPeixe(tx - 6, D - 12, 6, [L('#b8c4c8'), L('#eef4f0'), L('#e0a040')], 1, 0, '#000000', 0);
  // cesto com legumes, à esquerda
  const bx = x - 22;
  cx.fillStyle = L('#1a1018'); cx.fillRect(bx - 5, D - 7, 11, 7);
  cx.fillStyle = L('#c89858'); cx.fillRect(bx - 4, D - 6, 9, 5); cx.fillStyle = L('#8a6038'); for (let i = -4; i < 5; i += 2) cx.fillRect(bx + i, D - 5, 1, 3);
  cx.fillStyle = L('#f08830'); cx.fillRect(bx - 3, D - 8, 2, 2); cx.fillStyle = L('#c8a060'); cx.fillRect(bx, D - 8, 3, 2); cx.fillStyle = L('#6ab040'); cx.fillRect(bx - 3, D - 9, 1, 1);
  // pedras em volta e a lenha cruzada
  for (let i = -8; i <= 7; i += 3) { cx.fillStyle = L('#1a1018'); cx.fillRect(x + i, D - 3, 3, 3); cx.fillStyle = L(i % 2 ? '#8a8478' : '#a8a090'); cx.fillRect(x + i, D - 3, 2, 2); }
  cx.fillStyle = L('#4a3020'); cx.fillRect(x - 6, D - 4, 12, 1); cx.fillStyle = L('#6a4628'); cx.fillRect(x - 4, D - 5, 8, 1);
  // tripé com a panela pendurada
  cx.fillStyle = L('#3a2618');
  for (let j = 0; j < 20; j++) { cx.fillRect(x - 9 + Math.round(j * 0.45), D - 1 - j, 1, 1); cx.fillRect(x + 9 - Math.round(j * 0.45), D - 1 - j, 1, 1); }
  cx.fillStyle = L('#6a6a70'); cx.fillRect(x, D - 20, 1, 6);
  cx.fillStyle = L('#1a1018'); cx.fillRect(x - 5, D - 15, 11, 7);
  cx.fillStyle = L('#3a3a42'); cx.fillRect(x - 4, D - 14, 9, 5); cx.fillStyle = L('#5a5a64'); cx.fillRect(x - 4, D - 14, 9, 1); cx.fillRect(x - 6, D - 14, 1, 1); cx.fillRect(x + 6, D - 14, 1, 1);
  if (cozinhando) { cx.fillStyle = L(E.cozinha.cor || '#d8a050'); cx.fillRect(x - 3, D - 15, 7, 1); }
  // o fogo: chamas que dançam embaixo da panela (maiores quando está cozinhando)
  const alto = cozinhando ? 9 : 5;
  for (let dx = -4; dx <= 4; dx++) {
    const h = Math.max(1, Math.round(alto * (1 - Math.abs(dx) / 5.5) * (0.65 + 0.35 * Math.sin(t * 11 + dx * 1.9) * Math.sin(t * 7 - dx))));
    for (let j = 0; j < h; j++) {
      const u = j / h;
      cx.fillStyle = u < 0.3 && Math.abs(dx) < 3 ? '#fff0a0' : u < 0.65 ? '#ffb030' : '#e0502a';
      cx.fillRect(x + dx, D - 4 - j, 1, 1);
    }
  }
  // fumaça, vapor e faíscas
  if (Math.random() < dt * (cozinhando ? 10 : 3)) faiscas.push({ x: x + rand(-3, 3), y: D - 8, vy: -rand(12, 26), vx: rand(-4, 4), t: 0, vida: rand(0.5, 1.1), tipo: 'faisca' });
  if (cozinhando && Math.random() < dt * 5) faiscas.push({ x: x + rand(-3, 3), y: D - 16, vy: -rand(5, 9), vx: rand(-2, 3), t: 0, vida: rand(1.5, 2.6), tipo: 'vapor' });
  for (let i = faiscas.length - 1; i >= 0; i--) {
    const s = faiscas[i]; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.t > s.vida) { faiscas.splice(i, 1); continue; }
    const a = 1 - s.t / s.vida;
    cx.fillStyle = s.tipo === 'vapor' ? `rgba(235,235,240,${(a * 0.45).toFixed(2)})` : `rgba(255,${160 + Math.round(a * 80)},60,${a.toFixed(2)})`;
    const sz = s.tipo === 'vapor' ? 1 + Math.floor(s.t) : 1;
    cx.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
  }
}
