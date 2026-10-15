'use strict';

/* ================= pesca: lançar, esperar a mordida, fisgar e puxar com a linha esticada =================
   Estados: parado -> lancando -> esperando -> mordida -> puxando -> parado.
   Clique (ou Espaço) na água lança; quando a boia afunda, clique para fisgar; depois segure para puxar e solte quando
   a linha ficar vermelha (o peixe está brigando). No Modo calmo o pescador faz tudo sozinho, um pouco mais devagar
   e sem o bônus de sorte da pesca ativa. */

const PESCA = { estado: 'parado', t: 0, alvo: { x: 0, y: 0 }, boia: { x: 0, y: 0 }, peixe: null, tensao: 0, prog: 0, puxa: false, puxaT: 0, segura: false, espera: 0, parado: 0, belisca: 0 };
const BONUS_ATIVA = 5;   // sorte a mais quando o jogador pesca com as próprias mãos

const varaAtual = () => ITENS[E.equip.vara] || ITENS.vara_bambu;
const pontoAtual = () => PONTOS.find(p => p.id === E.ponto);

function tempoMordida() {
  const isca = iscaAtual();
  let s = rand(5, 11) * varaAtual().vel * (isca ? ITENS[isca].vel : 1) * (1 - efeito('vel') / 100);
  s *= 1 - doBarco('portavara') / 100;
  if (E.auto) s *= 1.2;
  return Math.max(1.5, s);
}

function sorteiaPeixe(ativa) {
  const sorte = sorteTotal() + (ativa ? BONUS_ATIVA : 0);
  const rar = sorteiaPeso(ORDEM_RAR.map((r, i) => [r, RARIDADES[r].peso * (1 + sorte * 0.03 * i)]));
  const lista = PEIXES.filter(p => p.ponto === E.ponto && p.rar === rar);
  const it = escolhe(lista.length ? lista : PEIXES.filter(p => p.ponto === E.ponto));
  const peso = it.pmin + (it.pmax - it.pmin) * Math.pow(Math.random(), 2.2);
  return { id: it.id, rar: it.rar, peso };
}

function pontaVara() {
  const hx = BARCO.mx, hy = BARCO.my;
  let dx = 17, dy = -15;
  if (PESCA.estado === 'lancando' && PESCA.t < 0.25) { const k = PESCA.t / 0.25; dx = lerp(-8, 19, k); dy = lerp(-19, -11, k); }
  if (PESCA.estado === 'puxando') { dx = 18; dy = -9 + (PESCA.puxa ? Math.round(Math.sin(performance.now() / 40)) + 3 : 0); }
  if (PESCA.estado === 'mordida') dy = -12;
  return { hx, hy, x: hx + dx, y: hy + dy };
}

function lanca(xAlvo) {
  if (PESCA.estado !== 'parado') return;
  initAudio();
  const minX = BARCO.x + 50, maxX = Math.max(minX, CAM.x + W - 12);
  const x = clamp(xAlvo ?? rand(minX, maxX), minX, maxX);
  const y = WL;   // a boia cai na linha d'água; o anzol fica pendurado embaixo
  const isca = iscaAtual(); if (isca) tira(isca);
  PESCA.isca = isca;
  Object.assign(PESCA, { estado: 'lancando', t: 0, alvo: { x, y }, tensao: 0, prog: 0, peixe: null, puxa: false, segura: false, belisca: rand(1, 3) });
  sfx.lanca();
}

function fisga() {
  if (PESCA.estado !== 'mordida') return;
  PESCA.peixe = sorteiaPeixe(!E.auto);
  Object.assign(PESCA, { estado: 'puxando', t: 0, tensao: 0.15, prog: 0, puxa: false, puxaT: rand(0.6, 1.5) });
  sfx.fisgou(); respingo(PESCA.boia.x, PESCA.boia.y, 6);
}

function recolhe(msg) {
  PESCA.estado = 'parado'; PESCA.parado = 0; PESCA.segura = false;
  if (msg) estadoPesca(msg);
}

function pegou() {
  const f = PESCA.peixe, it = ITENS[f.id], novo = !E.colecao[f.id];
  da(f.id);
  const c = E.colecao[f.id] || (E.colecao[f.id] = { n: 0, maior: 0 });
  c.n++; if (f.peso > c.maior) c.maior = f.peso;
  E.total.peixes++;
  ganhaXp('pesca', RARIDADES[f.rar].xp * pontoAtual().xpMul * (E.auto ? 0.8 : 1), !jogando);
  if (jogando) { mostraPegou(it, f, novo); sfx.pegou(f.rar); }
  respingo(PESCA.boia.x, PESCA.boia.y, 10);
  recolhe();
}

function mostraPegou(it, f, novo) {
  const el = $('pegou'), R = RARIDADES[it.rar];
  el.innerHTML = `${icoHtml(it.id)}<b style="color:${R.cor}">${it.nome}</b><small>${R.nome} · ${fmtPeso(f.peso)} · ${it.valor} de ouro</small>${novo ? '<small class="novo">Novo no caderno!</small>' : ''}`;
  el.hidden = false; el.classList.remove('sai'); void el.offsetWidth;
  clearTimeout(mostraPegou.t1); clearTimeout(mostraPegou.t2);
  mostraPegou.t1 = setTimeout(() => el.classList.add('sai'), 1900);
  mostraPegou.t2 = setTimeout(() => { el.hidden = true; }, 2300);
}

let _estadoTxt = '';
function estadoPesca(txt) { if (txt !== _estadoTxt) { _estadoTxt = txt; const el = $('hEstado'); if (el) el.textContent = txt; } }

function atualizaPesca(dt) {
  const P = PESCA; P.t += dt;
  const tip = pontaVara();
  switch (P.estado) {
    case 'parado':
      P.parado += dt;
      P.boia.x = tip.x; P.boia.y = tip.y + 6;
      if (!pescaLivre()) { P.parado = 0; estadoPesca(naBarraca() ? 'Aperte E para abrir a loja' : 'No píer: ande até a barraca'); break; }
      if (velBarco) { P.parado = 0; estadoPesca('Navegando...'); break; }
      estadoPesca(E.auto ? 'Preparando o próximo lançamento...' : 'Clique na água para lançar');
      if (E.auto && P.parado > 1.4) lanca();
      break;
    case 'lancando': {
      const k = clamp((P.t - 0.15) / 0.6, 0, 1);
      P.boia.x = lerp(tip.x, P.alvo.x, k); P.boia.y = lerp(tip.y, P.alvo.y, k) - Math.sin(k * Math.PI) * 26;
      if (k >= 1) { P.estado = 'esperando'; P.t = 0; P.espera = tempoMordida(); onda(P.alvo.x, P.alvo.y, 8); sfx.splash(); }
      estadoPesca('Lançando...');
      break;
    }
    case 'esperando':
      P.boia.x = P.alvo.x; P.boia.y = P.alvo.y + Math.round(Math.sin(P.t * 2.2) * 0.6);
      if (P.t > P.belisca && P.t < P.espera - 0.8) { P.belisca = P.t + rand(1.5, 3.5); onda(P.boia.x, P.boia.y + 1, 4); P.boia.y += 1; }
      if (P.t >= P.espera) { P.estado = 'mordida'; P.t = 0; onda(P.boia.x, P.boia.y, 10); respingo(P.boia.x, P.boia.y, 4); sfx.splash(); }
      estadoPesca('Esperando uma mordida...' + (PESCA.isca ? ' (' + ITENS[PESCA.isca].nome.toLowerCase() + ')' : ''));
      break;
    case 'mordida':
      P.boia.x = P.alvo.x; P.boia.y = P.alvo.y + 2;
      if (P.t % 0.3 < dt) onda(P.boia.x, P.boia.y, 6);
      if (E.auto && P.t > 0.45) fisga();
      else if (P.t > 1.1) { sfx.escapou(); recolhe('Ele escapou! Clique na água para lançar.'); }
      else estadoPesca('Fisgou! Clique agora!');
      break;
    case 'puxando': {
      const d = RARIDADES[P.peixe.rar].dif + PONTOS.indexOf(pontoAtual()) * 0.12;
      P.puxaT -= dt;
      if (P.puxaT <= 0) { P.puxa = !P.puxa; P.puxaT = P.puxa ? rand(0.5, 1.1 + d) : rand(0.9, 2.2 - d * 0.8); if (P.puxa) respingo(P.boia.x, P.boia.y, 5); }
      if (E.auto) P.segura = P.puxa ? P.tensao < 0.2 : P.tensao < 0.72;
      if (P.segura) {
        P.tensao += (0.25 + d * 0.3) * (P.puxa ? 3 : 1) * dt;
        P.prog += 0.28 * varaAtual().forca / (1 + d * 0.8) * dt;
        if (Math.random() < dt * 14) sfx.carretel();
      } else {
        P.tensao -= 0.6 * dt;
        if (P.puxa) P.prog -= 0.06 * dt;
      }
      P.tensao = Math.max(0, P.tensao); P.prog = clamp(P.prog, 0, 1);
      P.boia.x = lerp(P.alvo.x, tip.x + 6, P.prog); P.boia.y = P.alvo.y + (P.puxa ? Math.round(Math.sin(P.t * 30)) : 0);
      if (P.puxa && Math.random() < dt * 6) onda(P.boia.x, P.boia.y, 5);
      if (P.tensao >= 1) { sfx.arrebentou(); recolhe('A linha arrebentou! Solte quando ficar vermelho.'); aviso('A linha arrebentou...'); }
      else if (P.prog >= 1) pegou();
      else estadoPesca(P.puxa ? 'Ele está brigando! Solte!' : 'Segure para puxar');
      break;
    }
  }
}

// a pesca acontece na água, então é desenhada em x do mundo (a câmera desloca tudo)
function desenhaPesca(t) {
  if (PE.ativo) return;
  cx.save(); cx.translate(-Math.round(CAM.x), 0);
  desenhaPescaMundo(t);
  cx.restore();
}
function desenhaPescaMundo(t) {
  const P = PESCA, tip = pontaVara();
  // vara
  const vara = varaAtual(), corV = vara.metal ? METAIS.find(m => m.id === vara.metal).cor : '#c8b060';
  linha(tip.hx, tip.hy, tip.x, tip.y, luz(corV), luz('#3a2414'));
  cx.fillStyle = luz('#2a2a2a'); cx.fillRect(tip.hx + 2, tip.hy - 2, 2, 2);   // carretel
  const bx = Math.round(P.boia.x), by = Math.round(P.boia.y), corLinha = 'rgba(235,235,225,.7)';
  if (P.estado === 'parado') {   // boia pendurada na ponta da vara
    cx.fillStyle = corLinha; for (let y = tip.y + 1; y < tip.y + 5; y++) cx.fillRect(tip.x, y, 1, 1);
    boia(tip.x, tip.y + 6, false);
    return;
  }
  // linha: curva caindo entre a ponta e a boia
  const tensa = P.estado === 'puxando' || P.estado === 'mordida';
  const mx = (tip.x + P.boia.x) / 2, my = Math.max(tip.y, P.boia.y) + (tensa ? -2 : 10);
  cx.fillStyle = corLinha;
  let ux = -1, uy = -1;
  const passos = Math.ceil((Math.abs(P.boia.x - tip.x) + Math.abs(P.boia.y - tip.y)) * 1.5) + 8;
  for (let i = 0; i <= passos; i++) {
    const s = i / passos, x = Math.round((1 - s) * (1 - s) * tip.x + 2 * (1 - s) * s * mx + s * s * P.boia.x), y = Math.round((1 - s) * (1 - s) * tip.y + 2 * (1 - s) * s * my + s * s * P.boia.y);
    if (x !== ux || y !== uy) { cx.fillRect(x, y, 1, 1); ux = x; uy = y; }
  }
  // embaixo d'água: a linha descendo até o anzol, a isca e os peixes
  const fundoMax = Math.min(28, (fundo ? fundo.chao0 : 40) - 8), tinta = luz((fundo ? fundo.P : PAISAGENS.lago).aguaFunda);
  if (P.estado === 'lancando') { cx.fillStyle = corLinha; cx.fillRect(bx, by + 2, 1, 3); }
  else if (P.estado === 'esperando' || P.estado === 'mordida') {
    const ay = WL + fundoMax + Math.round(Math.sin(t * 1.3) * 1), ax = bx + Math.round(Math.sin(t * 0.9) * 1.5);
    cx.fillStyle = 'rgba(225,235,230,.4)'; for (let y = WL + 1; y < ay; y++) cx.fillRect(Math.round(lerp(bx, ax, (y - WL) / (ay - WL))), y, 1, 1);
    anzol(ax, ay, P.isca);
    // uma sombra de peixe chega perto do anzol quando a mordida está para vir
    if (!P.visita) P.visita = { dir: Math.random() < 0.5 ? 1 : -1, len: randi(8, 16) };
    const falta = P.estado === 'mordida' ? 0 : P.espera - P.t;
    if (falta < 3) {
      const k = 1 - falta / 3, dist = lerp(36, 2, Math.pow(k, 1.5));
      const sx = ax - P.visita.dir * (dist + (P.estado === 'mordida' ? Math.sin(t * 25) * 1.5 : 0)), sy = ay + Math.sin(t * 2) * 1.5;
      const sombra = mistura(tinta, '#000000', 0.35);
      cx.globalAlpha = Math.min(1, k * 1.6) * 0.75; desenhaPeixe(sx, sy, P.visita.len, [sombra, sombra, sombra], P.visita.dir, t, tinta, 0); cx.globalAlpha = 1;
    }
  } else if (P.estado === 'puxando' && P.peixe) {
    // o peixe fisgado aparece com as cores dele, brigando e vindo para a superfície
    const it = ITENS[P.peixe.id], len = tamPeixe(P.peixe.id, P.peixe.peso), prof = lerp(fundoMax, 5, P.prog);
    const fx = bx + 4 + (P.puxa ? Math.round(Math.sin(t * 22) * 2) : Math.round(Math.sin(t * 3) * 1)), fy = WL + prof + (P.puxa ? Math.round(Math.cos(t * 17) * 1.5) : 0);
    cx.fillStyle = 'rgba(225,235,230,.5)'; for (let y = WL + 1; y < fy; y++) cx.fillRect(Math.round(lerp(bx, fx, (y - WL) / Math.max(1, fy - WL))), y, 1, 1);
    desenhaPeixe(fx, fy, len, it.ico.c.map(c => luz(c)), 1, t * (P.puxa ? 2.5 : 1), tinta, 0.15);
    if (P.puxa && Math.random() < 0.3) bolhas.push({ x: fx, y: fy - 2, t: 0 });
  }
  if (P.estado === 'parado' || P.estado === 'lancando') P.visita = null;
  // boia (na mordida ela afunda e só a pontinha aparece)
  if (P.estado === 'mordida') { cx.fillStyle = '#e83838'; cx.fillRect(bx - 1, WL, 3, 1); cx.fillStyle = 'rgba(232,56,56,.4)'; cx.fillRect(bx - 1, WL + 2, 3, 2); }
  else boia(bx, by, P.estado === 'esperando' || P.estado === 'puxando');
  // o "!" da mordida
  if (P.estado === 'mordida') {
    const yy = WL - 18 - Math.round(Math.abs(Math.sin(t * 12)) * 2);
    cx.fillStyle = '#1a1018'; cx.fillRect(bx - 2, yy - 1, 5, 11);
    cx.fillStyle = '#ffd34d'; cx.fillRect(bx - 1, yy, 3, 6); cx.fillRect(bx - 1, yy + 7, 3, 2);
    cx.fillStyle = '#fff4b0'; cx.fillRect(bx - 1, yy, 1, 5);
  }
  // barra de tensão e de progresso enquanto puxa
  if (P.estado === 'puxando') {
    const w = 52, x0 = Math.round(clamp(bx - w / 2, CAM.x + 4, CAM.x + W - w - 4)), y0 = Math.round(Math.max(4, WL - 30));
    cx.fillStyle = '#0b0710'; cx.fillRect(x0 - 2, y0 - 2, w + 4, 12);
    cx.fillStyle = '#7a5a34'; cx.fillRect(x0 - 1, y0 - 1, w + 2, 1); cx.fillRect(x0 - 1, y0 + 8, w + 2, 1); cx.fillRect(x0 - 1, y0 - 1, 1, 10); cx.fillRect(x0 + w, y0 - 1, 1, 10);
    cx.fillStyle = '#1a1420'; cx.fillRect(x0, y0, w, 4);
    const tw = Math.round(clamp(P.tensao, 0, 1) * w);
    cx.fillStyle = P.tensao > 0.75 ? '#e83838' : P.tensao > 0.45 ? '#f0a83c' : '#9fd65a'; cx.fillRect(x0, y0, tw, 4);
    cx.fillStyle = 'rgba(255,255,255,.3)'; cx.fillRect(x0, y0, tw, 1);
    if (P.puxa) { cx.fillStyle = Math.floor(t * 8) % 2 ? '#ff6050' : '#ffd0c0'; cx.fillRect(x0 + w - 3, y0, 3, 4); }
    cx.fillStyle = '#1a1420'; cx.fillRect(x0, y0 + 5, w, 3);
    cx.fillStyle = '#58a6ff'; cx.fillRect(x0, y0 + 5, Math.round(P.prog * w), 3);
    cx.fillStyle = 'rgba(255,255,255,.3)'; cx.fillRect(x0, y0 + 5, Math.round(P.prog * w), 1);
  }
}

// boia vermelha e branca com contorno; na água fica meio afundada
function boia(x, y, naAgua) {
  cx.fillStyle = '#1a1018'; cx.fillRect(x - 2, y - 4, 5, naAgua ? 5 : 7);
  cx.fillStyle = '#f4f0e8'; cx.fillRect(x - 1, y - 3, 3, 2);
  cx.fillStyle = '#e03a30'; cx.fillRect(x - 1, y - 1, 3, naAgua ? 1 : 3);
  cx.fillStyle = '#1a1018'; cx.fillRect(x, y - 5, 1, 1);
  if (naAgua) { cx.fillStyle = 'rgba(224,58,48,.35)'; cx.fillRect(x - 1, y + 1, 3, 2); }
}
function anzol(x, y, isca) {
  cx.fillStyle = 'rgba(200,210,215,.8)'; cx.fillRect(x, y, 1, 3); cx.fillRect(x + 1, y + 3, 1, 1); cx.fillRect(x + 2, y + 2, 1, 1);
  if (isca) { cx.fillStyle = 'rgba(232,140,150,.85)'; cx.fillRect(x - 1, y + 1, 1, 2); cx.fillRect(x + 1, y + 2, 1, 1); }
}

function linha(x0, y0, x1, y1, cor, cabo) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const s = i / n; cx.fillStyle = s < 0.25 ? cabo : cor; cx.fillRect(Math.round(lerp(x0, x1, s)), Math.round(lerp(y0, y1, s)), 1, 1); }
}

/* entrada: clique na água ou Espaço */
function acaoPesca(xTela, desce) {
  const P = PESCA;
  if (desce && !pescaLivre()) return;
  if (desce) {
    initAudio();
    if (P.estado === 'parado' && !E.auto) lanca(xTela);
    else if (P.estado === 'mordida' && !E.auto) fisga();
    else if (P.estado === 'puxando' && !E.auto) P.segura = true;
    else if (P.estado === 'esperando' && !E.auto) recolhe('Linha recolhida.');
  } else P.segura = false;
}
cv.addEventListener('pointerdown', e => { if (!E || !jogando) return; acaoPesca(e.clientX / K + CAM.x, true); });
addEventListener('pointerup', () => { if (E) acaoPesca(0, false); });
addEventListener('keydown', e => {
  if (!E || !jogando || e.repeat) return;
  if (e.code === 'Space' && $('painel').hidden) { e.preventDefault(); acaoPesca(null, true); }
});
addEventListener('keyup', e => { if (e.code === 'Space' && E) acaoPesca(0, false); });

function alternaAuto() {
  E.auto = !E.auto;
  if (E.auto && PESCA.estado === 'parado') PESCA.parado = 1;
  PESCA.segura = false;
  atualizaBotaoAuto();
}
function atualizaBotaoAuto() {
  const b = $('bAuto'); if (!b) return;
  b.setAttribute('aria-pressed', E.auto ? 'true' : 'false');
  b.textContent = 'Modo calmo: ' + (E.auto ? 'ligado' : 'desligado');
}

/* pesca com o jogo fechado: só conta se o Modo calmo estava ligado */
function pescaOffline(seg) {
  if (!E.auto) return {};
  const ciclo = 8 * varaAtual().vel * 1.2 + 6 / varaAtual().forca + 2;
  let n = Math.min(3000, Math.floor(seg / ciclo));
  const pegos = {};
  for (let i = 0; i < n; i++) {
    const isca = iscaAtual(); if (isca) tira(isca);
    const f = sorteiaPeixe(false);
    if (Math.random() < 0.08 * (1 + RARIDADES[f.rar].dif)) continue;   // alguns escapam
    da(f.id); pegos[f.id] = (pegos[f.id] || 0) + 1;
    const c = E.colecao[f.id] || (E.colecao[f.id] = { n: 0, maior: 0 }); c.n++; if (f.peso > c.maior) c.maior = f.peso;
    E.total.peixes++;
    ganhaXp('pesca', RARIDADES[f.rar].xp * pontoAtual().xpMul * 0.8, true);
  }
  return pegos;
}
