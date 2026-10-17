'use strict';

/* ================= tela de início =================
   O lago ao entardecer fica rodando atrás (com o pescador no Modo calmo), o nome em latão no alto à esquerda e o menu
   em texto puro no canto de baixo. Continuar só aparece com save; Novo jogo com save pede um segundo clique. */

function pintaLogo() {
  const TXT = 'SLOWFOLK', F = '"Jersey 10", monospace';
  const W0 = 210, H0 = 72;
  const tmp = document.createElement('canvas'); tmp.width = W0; tmp.height = H0;
  const t = tmp.getContext('2d');
  t.fillStyle = '#fff'; t.textBaseline = 'alphabetic';
  t.font = `52px ${F}`;
  const w = t.measureText(TXT).width, tam = Math.min(52, 52 * (W0 - 10) / w);
  t.font = `${tam}px ${F}`; t.fillText(TXT, 4, 48);
  const mw = Math.round(t.measureText(TXT).width);
  const src = t.getImageData(0, 0, W0, H0).data;
  const m = new Uint8Array(W0 * H0); for (let i = 0; i < W0 * H0; i++) m[i] = src[i * 4 + 3] > 110 ? 1 : 0;
  // uma linha de pesca com anzol embaixo do nome
  const yl = 55; for (let x = 6; x < 4 + mw; x++) m[yl * W0 + x] = 2;
  for (let y = yl; y < yl + 7; y++) m[y * W0 + 4 + mw] = 2;
  m[(yl + 7) * W0 + 3 + mw] = 2; m[(yl + 6) * W0 + 2 + mw] = 2; m[(yl + 5) * W0 + 2 + mw] = 2;

  const out = document.createElement('canvas'); out.width = W0; out.height = H0;
  const o = out.getContext('2d'), img = o.createImageData(W0, H0), D = img.data;
  const LATAO = ['#fff3d2', '#f0d8a0', '#d8b06a', '#b98a4a', '#8e5e32', '#5e3a20'].map(hexRgb);
  const pinta = (x, y, c, a = 255) => { const i = (y * W0 + x) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = a; };
  const at = (x, y) => x >= 0 && y >= 0 && x < W0 && y < H0 ? m[y * W0 + x] : 0;
  let topo = H0, fundo = 0; for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) if (at(x, y) === 1) { topo = Math.min(topo, y); fundo = Math.max(fundo, y); }
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) if (!at(x, y) && (at(x - 2, y - 2) || at(x - 1, y - 2) || at(x - 2, y - 1))) pinta(x, y, hexRgb('#0c1a24'), 220);
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) if (!at(x, y)) {
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (at(x + a, y + b)) { pinta(x, y, hexRgb('#06080c')); break; }
  }
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const v = at(x, y); if (!v) continue;
    let c;
    if (v === 2) c = hexRgb('#e8e8e0');
    else {
      const f = (y - topo) / Math.max(1, fundo - topo), tt = f * (LATAO.length - 1.2), i = Math.floor(tt);
      c = LATAO[Math.min(LATAO.length - 1, (tt - i) > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? i + 1 : i)];
      if (!at(x, y - 1)) c = hexRgb('#fff8e4');
      else if (!at(x + 1, y) && f > 0.3) c = LATAO[Math.min(5, i + 2)];
    }
    pinta(x, y, c);
  }
  o.putImageData(img, 0, 0);
  return out;
}

let jogando = false;

function montaTitulo() {
  const root = document.createElement('div');
  root.id = 'title';
  root.innerHTML = `
    <div class="shade"></div>
    <h1 class="logo"><canvas id="ttLogo" role="img" aria-label="Slowfolk"></canvas><span class="tsub">um lugar para ir devagar.</span></h1>
    <nav class="tmenu" id="ttMain" aria-label="Menu principal">
      <button type="button" id="ttCont" hidden>Continuar</button>
      <button type="button" id="ttNew">Novo jogo</button>
      <button type="button" id="ttNews">Novidades</button>
      <button type="button" id="ttSom">Som: ligado</button>
    </nav>
    <section class="tnews" id="ttNewsBox" aria-label="Novidades" hidden><h2>Novidades</h2><div class="tnlist" id="ttNewsList"></div><nav class="tmenu"><button type="button" class="back" id="ttNewsBack">Voltar</button></nav></section>
    <button type="button" class="tvisual ghost sm" data-visual aria-pressed="true">Visual: cinema</button>
    <div class="tver">v${VERSAO}</div>`;
  document.body.appendChild(root);

  function desenhaLogo() {
    const lg = pintaLogo(), c = $('ttLogo');
    c.width = lg.width; c.height = lg.height; c.getContext('2d').drawImage(lg, 0, 0);
    ajustaLogo();
  }
  function ajustaLogo() {
    const k = Math.max(1, Math.round(Math.min(innerWidth / 420, innerHeight / 240) * 0.95));
    const c = $('ttLogo'); if (!c) return; c.style.width = c.width * k + 'px'; c.style.height = c.height * k + 'px';
  }
  addEventListener('resize', ajustaLogo);
  desenhaLogo();
  try { document.fonts.load('52px "Jersey 10"').then(desenhaLogo, () => { }); document.fonts.ready.then(desenhaLogo); } catch (e) { }

  const temS = temSave();
  $('ttCont').hidden = !temS;
  const somTxt = () => { $('ttSom').textContent = 'Som: ' + (mudo ? 'desligado' : 'ligado'); };
  somTxt();
  $('ttSom').onclick = () => { alternaMudo(); sfx.select(); };
  $('ttCont').onclick = () => { initAudio(); sfx.select(); carregar(); entra(true); };
  let certeza = false;
  $('ttNew').onclick = () => {
    initAudio(); sfx.select();
    if (temS && !certeza) { certeza = true; $('ttNew').textContent = 'Apagar o save e começar?'; $('ttNew').classList.add('warn'); return; }
    apagaSave(); E = novoEstado(); entra(false);
  };
  $('ttNews').onclick = () => {
    sfx.select();
    $('ttNewsList').innerHTML = NOVIDADES.map(n => `<article><h3>${n.v} · ${n.titulo}</h3><small>${n.data}</small><ul>${n.itens.map(i => `<li>${i}</li>`).join('')}</ul></article>`).join('');
    $('ttMain').hidden = true; $('ttNewsBox').hidden = false;
  };
  $('ttNewsBack').onclick = () => { sfx.select(); $('ttMain').hidden = false; $('ttNewsBox').hidden = true; };

  function entra(continuando) {
    root.classList.add('out'); setTimeout(() => root.remove(), 300);
    Object.assign(PESCA, { estado: 'parado', parado: 0, segura: false });
    Object.assign(PE, { ativo: false, atraca: false });
    jogando = true;
    $('hud').hidden = false;
    $('hLocal').textContent = pontoAtual().nome;
    atualizaBotaoAuto();
    pintaIcones();
    marcaMudou();
    if (continuando) {
      const r = recuperaTempo();
      if (r) mostraFora(r);
    } else {
      aviso('Bem-vindo ao Slowfolk! Clique na água para lançar a linha.');
      setTimeout(() => aviso('A e D (ou as setas) movem o barco. No píer, à esquerda, ficam a barraca, a fazenda e a fogueira.'), 3200);
      setTimeout(() => aviso('Encoste no píer e aperte E para descer. Cada lugar tem o seu ofício: é só chegar e apertar E.'), 6400);
      setTimeout(() => aviso('Dica: o Modo calmo (tecla C) pesca sozinho, até com o jogo fechado.'), 9600);
    }
    salvar();
  }
}

function mostraFora(r) {
  const lin = (obj) => Object.entries(obj).map(([id, n]) => `<span class="chip" data-item="${id}">${icoHtml(id, 'sm')}${fmt(n)}</span>`).join('');
  const peixes = lin(r.peixes), feitos = lin(r.feitos);
  PAINEIS.fora = () => `<p class="nota">Você ficou fora por <b>${fmtTempo(r.seg)}</b>${r.seg >= OFFLINE_MAX ? ' (o máximo que conta são 8 horas)' : ''}.</p>
    ${peixes ? `<h3>O Modo calmo pescou</h3><div class="chips">${peixes}</div>` : E.auto ? '' : '<p class="nota">Deixe o Modo calmo ligado para pescar enquanto você está fora.</p>'}
    ${feitos ? `<h3>Na fogueira</h3><div class="chips">${feitos}</div>` : ''}
    ${r.horta ? `<h3>Fazenda</h3><p class="nota">${r.horta} canteiro${r.horta > 1 ? 's prontos' : ' pronto'} para colher.</p>` : ''}`;
  TITULOS.fora = 'Enquanto você estava fora';
  painelAberto = null; abrePainel('fora');
}
