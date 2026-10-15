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
  const hx = BARCO.x + 9, hy = BARCO.y - 5;
  let dx = 12, dy = -11;
  if (PESCA.estado === 'lancando' && PESCA.t < 0.25) { const k = PESCA.t / 0.25; dx = lerp(-5, 13, k); dy = lerp(-13, -8, k); }
  if (PESCA.estado === 'puxando') { dx = 12; dy = -6 + (PESCA.puxa ? Math.round(Math.sin(performance.now() / 40)) + 2 : 0); }
  if (PESCA.estado === 'mordida') dy = -9;
  return { hx, hy, x: hx + dx, y: hy + dy };
}

function lanca(xAlvo) {
  if (PESCA.estado !== 'parado') return;
  initAudio();
  const minX = BARCO.x + 40, maxX = W - 12;
  const x = clamp(xAlvo ?? rand(minX, maxX), minX, maxX);
  const y = Math.round(HOR + (H - HOR) * rand(0.22, 0.55));
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
  el.innerHTML = `${icoHtml(it.id)}<b style="color:${R.cor}">${it.nome}</b><small>${R.nome} · ${fmtPeso(f.peso)} · ${it.valor} moedas</small>${novo ? '<small class="novo">Novo no caderno!</small>' : ''}`;
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
      P.boia.x = lerp(P.alvo.x, tip.x + 6, P.prog); P.boia.y = lerp(P.alvo.y, BARCO.y + 3, P.prog) + (P.puxa ? Math.round(Math.sin(P.t * 30)) : 0);
      if (P.puxa && Math.random() < dt * 6) onda(P.boia.x, P.boia.y, 5);
      if (P.tensao >= 1) { sfx.arrebentou(); recolhe('A linha arrebentou! Solte quando ficar vermelho.'); aviso('A linha arrebentou...'); }
      else if (P.prog >= 1) pegou();
      else estadoPesca(P.puxa ? 'Ele está brigando! Solte!' : 'Segure para puxar');
      break;
    }
  }
}

function desenhaPesca(t) {
  const P = PESCA, tip = pontaVara();
  // vara
  const vara = varaAtual(), corV = vara.metal ? METAIS.find(m => m.id === vara.metal).cor : '#c8b060';
  linha(tip.hx, tip.hy, tip.x, tip.y, corV, '#3a2414');
  // linha: curva caindo entre a ponta e a boia
  if (P.estado !== 'parado') {
    const tensa = P.estado === 'puxando' || P.estado === 'mordida';
    const mx = (tip.x + P.boia.x) / 2, my = Math.max(tip.y, P.boia.y) + (tensa ? 0 : 8);
    cx.fillStyle = 'rgba(235,235,225,.75)';
    let ux = -1, uy = -1;
    const passos = Math.ceil((Math.abs(P.boia.x - tip.x) + Math.abs(P.boia.y - tip.y)) * 1.5) + 8;
    for (let i = 0; i <= passos; i++) {
      const s = i / passos, x = Math.round((1 - s) * (1 - s) * tip.x + 2 * (1 - s) * s * mx + s * s * P.boia.x), y = Math.round((1 - s) * (1 - s) * tip.y + 2 * (1 - s) * s * my + s * s * P.boia.y);
      if (x !== ux || y !== uy) { cx.fillRect(x, y, 1, 1); ux = x; uy = y; }
    }
  }
  // boia
  const bx = Math.round(P.boia.x), by = Math.round(P.boia.y);
  if (P.estado === 'mordida') { cx.fillStyle = '#e83838'; cx.fillRect(bx - 1, by - 1, 2, 1); }
  else if (P.estado !== 'parado') { cx.fillStyle = '#ffffff'; cx.fillRect(bx - 1, by - 3, 2, 1); cx.fillStyle = '#e83838'; cx.fillRect(bx - 1, by - 2, 2, 2); }
  // o "!" da mordida
  if (P.estado === 'mordida') {
    const yy = by - 12 - Math.round(Math.abs(Math.sin(t * 12)) * 2);
    cx.fillStyle = '#000'; cx.fillRect(bx - 2, yy - 1, 4, 9);
    cx.fillStyle = '#ffd34d'; cx.fillRect(bx - 1, yy, 2, 5); cx.fillRect(bx - 1, yy + 6, 2, 1);
  }
  // barra de tensão e de progresso enquanto puxa
  if (P.estado === 'puxando') {
    const w = 44, x0 = Math.round(clamp(bx - w / 2, 4, W - w - 4)), y0 = Math.round(Math.max(HOR + 2, by - 18));
    cx.fillStyle = '#000'; cx.fillRect(x0 - 1, y0 - 1, w + 2, 9);
    cx.fillStyle = '#1a1420'; cx.fillRect(x0, y0, w, 4);
    const tw = Math.round(clamp(P.tensao, 0, 1) * w);
    cx.fillStyle = P.tensao > 0.75 ? '#e83838' : P.tensao > 0.45 ? '#f0a83c' : '#9fd65a'; cx.fillRect(x0, y0, tw, 4);
    if (P.puxa) { cx.fillStyle = Math.floor(t * 8) % 2 ? '#ff6050' : '#ffd0c0'; cx.fillRect(x0 + w - 3, y0, 3, 4); }
    cx.fillStyle = '#1a1420'; cx.fillRect(x0, y0 + 5, w, 2);
    cx.fillStyle = '#58a6ff'; cx.fillRect(x0, y0 + 5, Math.round(P.prog * w), 2);
  }
}

function linha(x0, y0, x1, y1, cor, cabo) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const s = i / n; cx.fillStyle = s < 0.25 ? cabo : cor; cx.fillRect(Math.round(lerp(x0, x1, s)), Math.round(lerp(y0, y1, s)), 1, 1); }
}

/* entrada: clique na água ou Espaço */
function acaoPesca(xTela, desce) {
  const P = PESCA;
  if (desce) {
    initAudio();
    if (P.estado === 'parado' && !E.auto) lanca(xTela);
    else if (P.estado === 'mordida' && !E.auto) fisga();
    else if (P.estado === 'puxando' && !E.auto) P.segura = true;
    else if (P.estado === 'esperando' && !E.auto) recolhe('Linha recolhida.');
  } else P.segura = false;
}
cv.addEventListener('pointerdown', e => { if (!E || !jogando) return; acaoPesca(e.clientX / K, true); });
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
