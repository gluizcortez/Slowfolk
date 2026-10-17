'use strict';

/* ================= sons: tudo sintetizado na hora pelo WebAudio, sem arquivos =================
   initAudio() precisa de um clique do jogador (regra dos navegadores). M liga e desliga o som; a escolha fica salva. */
let AC = null, MIX = null, mudo = false;
try { mudo = localStorage.getItem('slowfolk-mudo') === '1'; } catch (e) { }

function initAudio() {
  if (AC) { if (AC.state === 'suspended' && !document.hidden) AC.resume().catch(() => {}); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    MIX = criaMixerAudio(AC);
    aplicaSom();
  } catch (e) { if (AC) AC.close().catch(() => {}); AC = MIX = null; }
}

// Um único mixer para efeitos e ambiente: o mudo também corta sons já iniciados.
function criaMixerAudio(ctx) {
  const master = ctx.createGain(), efeitos = ctx.createGain(), ambiente = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16; compressor.knee.value = 16;
  compressor.ratio.value = 4; compressor.attack.value = .006; compressor.release.value = .22;
  master.gain.value = 0; efeitos.gain.value = .85; ambiente.gain.value = .75;
  efeitos.connect(compressor); ambiente.connect(compressor); compressor.connect(master); master.connect(ctx.destination);
  return { master, efeitos, ambiente, buffers: new Map(), camadas: [], vozes: new Set(), proximo: 0, carretel: 0 };
}

function aplicaSom() {
  if (AC && MIX) MIX.master.gain.setTargetAtTime(mudo || document.hidden ? 0 : .75, AC.currentTime, .025);
  for (const id of ['ttSom', 'bSom']) {
    const b = $(id); if (!b) continue;
    b.textContent = 'Som: ' + (mudo ? 'desligado' : 'ligado');
    b.setAttribute('aria-pressed', String(!mudo));
  }
}
document.addEventListener('visibilitychange', () => {
  aplicaSom();
  if (!AC) return;
  if (document.hidden) {
    // Evita que um efeito agendado volte a tocar quando a aba for reaberta.
    for (const s of MIX.vozes) { try { s.stop(); } catch (_) {} }
    AC.suspend().catch(() => {});
  } else AC.resume().catch(() => {});
});

function podeSoar() { return AC && MIX && !mudo && !document.hidden && AC.state !== 'closed'; }
function ligaVoz(fonte, nos, dur, t) {
  MIX.vozes.add(fonte);
  fonte.onended = () => { MIX.vozes.delete(fonte); fonte.disconnect(); nos.forEach(n => n.disconnect()); };
  if (fonte.buffer) fonte.start(t, Math.random() * 6); else fonte.start(t);
  fonte.stop(t + dur + .03);
}
function saidaSom(g, pan) {
  if (!AC.createStereoPanner) { g.connect(MIX.efeitos); return []; }
  const p = AC.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
  g.connect(p); p.connect(MIX.efeitos); return [p];
}
function panPesca() { return clamp((PESCA.boia.x - BARCO.x) / Math.max(200, W), -.65, .65); }

function tom(freq, dur, { tipo = 'square', vol = 0.06, ate = null, atraso = 0, ataque = .004, pan = 0 } = {}) {
  if (!podeSoar()) return;
  const t = AC.currentTime + atraso, o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(ataque, dur * .3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); ligaVoz(o, [g, ...saidaSom(g, pan)], dur, t);
}

// Buffers estéreo reutilizados. As bordas se encontram sem salto no loop.
function bufferAgua(escuro = false) {
  const chave = escuro ? 'escuro' : 'claro';
  if (MIX.buffers.has(chave)) return MIX.buffers.get(chave);
  const n = Math.ceil(AC.sampleRate * 8), buf = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c); let baixo = 0;
    for (let i = 0; i < n; i++) { const v = Math.random() * 2 - 1; baixo = baixo * .97 + v * .03; d[i] = escuro ? baixo * 3 : v * .65; }
    const salto = d[n - 1] - d[0], margem = Math.floor(AC.sampleRate * .08);
    for (let i = 0; i < margem; i++) d[n - margem + i] -= salto * i / (margem - 1);
  }
  MIX.buffers.set(chave, buf); return buf;
}
function ruido(dur, { vol = 0.08, corte = 1200, atraso = 0, ate = corte, ataque = .008, pan = 0, tipo = 'lowpass', q = .7, escuro = false } = {}) {
  if (!podeSoar()) return;
  const t = AC.currentTime + atraso;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = bufferAgua(escuro); s.loop = true;
  f.type = tipo; f.Q.value = q; f.frequency.setValueAtTime(corte, t); f.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(ataque, dur * .4));
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); ligaVoz(s, [f, g, ...saidaSom(g, pan)], dur, t);
}

function gota(atraso = 0, vol = .035, pan = 0) {
  const f = 420 + Math.random() * 460;
  tom(f, .095, { tipo: 'sine', ate: f * 1.8, vol, atraso, pan });
  tom(f * .48, .14, { tipo: 'sine', ate: f * .28, vol: vol * .45, atraso, pan });
}
function aguaPesca(forca = 1) {
  const pan = panPesca();
  ruido(.38, { vol: .19 * forca, corte: 1900, ate: 450, ataque: .012, pan });
  ruido(.58, { vol: .11 * forca, corte: 750, ate: 180, escuro: true, pan });
  for (let i = 0; i < 4; i++) gota(.07 + i * .055 + Math.random() * .025, .035 * forca, pan + (Math.random() - .5) * .2);
}

// Cinco camadas permanentes. Os ganhos se cruzam suavemente ao mudar de lugar.
function iniciaAmbiente() {
  if (MIX.camadas.length) return;
  for (const [escuro, corte, tipo, ritmo, profundidade] of [
    [true, 650, 'lowpass', .105, .65], [false, 1700, 'lowpass', .14, .8],
    [false, 1100, 'bandpass', .21, .22], [true, 420, 'lowpass', .07, .4],
    [false, 3800, 'lowpass', .19, .15]
  ]) {
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    const onda = AC.createGain(), lfo = AC.createOscillator(), mod = AC.createGain();
    s.buffer = bufferAgua(escuro); s.loop = true;
    f.type = tipo; f.frequency.value = corte; f.Q.value = .65;
    g.gain.value = 0; onda.gain.value = 1 - profundidade * .5;
    lfo.frequency.value = ritmo; mod.gain.value = profundidade * .5;
    lfo.connect(mod); mod.connect(onda.gain);
    s.connect(f); f.connect(onda); onda.connect(g); g.connect(MIX.ambiente);
    s.start(0, Math.random() * 7); lfo.start();
    MIX.camadas.push({ s, f, g, onda, lfo, mod });
  }
}
const AMBIENTES = {
  lago: [.10, .032, .018, .04, 0],
  rio: [.075, .065, .19, .025, 0],
  baia: [.27, .16, .012, .11, 0]
};
function atualizaAudio() {
  if (!AC || !MIX || AC.state !== 'running' || document.hidden) return;
  const t = AC.currentTime;
  if (t < MIX.proximo) return;
  MIX.proximo = t + .25;
  if (mudo) return;
  iniciaAmbiente();
  const perfil = AMBIENTES[E.ponto] || AMBIENTES.lago;
  const chuva = clima.chuva, terra = PE.ativo ? .55 : 1, noite = E.minutos < 360 || E.minutos > 1140;
  const pesca = PESCA.estado === 'mordida' || PESCA.estado === 'puxando' ? .72 : 1;
  MIX.camadas.forEach((c, i) => {
    const v = i === 4 ? chuva * .095 : perfil[i] * (i < 3 ? terra * pesca : 1) * (noite && i === 2 ? .75 : 1);
    if (c.alvo !== v) { c.g.gain.setTargetAtTime(v, t, 1.4); c.alvo = v; }
  });
}
const sfx = {
  lanca: () => {
    ruido(.26, { vol: .14, corte: 800, ate: 4200, tipo: 'bandpass', ataque: .045, pan: -.2 });
    ruido(.23, { vol: .07, corte: 3200, ate: 700, atraso: .12, pan: .15 });
    tom(210, .13, { tipo: 'triangle', vol: .025, ate: 90 });
  },
  splash: () => aguaPesca(.85),
  belisca: () => gota(0, .026, panPesca()),
  mordida: () => {
    aguaPesca(1.2);
    tom(880, .12, { tipo: 'sine', vol: .045, pan: panPesca() });
    tom(1320, .18, { tipo: 'sine', vol: .035, atraso: .10, pan: panPesca() });
  },
  fisgou: () => {
    ruido(.09, { vol: .11, corte: 2800, ate: 900, tipo: 'bandpass' });
    tom(150, .14, { tipo: 'triangle', vol: .055, ate: 330 });
    aguaPesca(.65);
  },
  clique: () => tom(520, 0.05, { vol: 0.03 }),
  carretel: (tensao = 0) => {
    if (!podeSoar() || AC.currentTime < MIX.carretel) return;
    const k = clamp(tensao, 0, 1); MIX.carretel = AC.currentTime + .09 - k * .025;
    for (let i = 0; i < 2; i++) {
      ruido(.023, { vol: .07, corte: 1700 + k * 2100, tipo: 'bandpass', q: 1.8, atraso: i * .032 });
      tom(155 + k * 180 + Math.random() * 25, .032, { tipo: 'triangle', vol: .025, atraso: i * .032 });
    }
    if (k > .65) tom(290 + k * 170, .1, { tipo: 'sine', vol: .016, ate: 240 });
  },
  pegou: (rar) => {
    aguaPesca(1.1);
    const base = [523, 587, 659, 784, 880][ORDEM_RAR.indexOf(rar)] || 523;
    [0, 4, 7, 12].forEach((s, i) => tom(base * Math.pow(2, s / 12), .28, { tipo: 'sine', vol: .045, atraso: .13 + i * .075, ataque: .012 }));
  },
  arrebentou: () => {
    ruido(.065, { vol: .14, corte: 5200, ate: 1800, tipo: 'highpass' });
    tom(360, .22, { tipo: 'triangle', vol: .055, ate: 65 });
    aguaPesca(.45);
  },
  escapou: () => { aguaPesca(.4); tom(310, .32, { tipo: 'sine', vol: .025, ate: 145 }); },
  nivel: () => [0, 4, 7, 12, 16].forEach((s, i) => tom(440 * Math.pow(2, s / 12), 0.22, { tipo: 'square', vol: 0.035, atraso: i * 0.08 })),
  moeda: () => { tom(1320, 0.06, { vol: 0.03 }); tom(1760, 0.1, { vol: 0.03, atraso: 0.05 }); },
  picareta: () => { tom(1400 + Math.random() * 300, 0.05, { tipo: 'square', vol: 0.02 }); ruido(0.06, { vol: 0.04, corte: 2500 }); },
  martelo: () => { tom(900, 0.08, { tipo: 'square', vol: 0.03 }); tom(1800, 0.12, { tipo: 'sine', vol: 0.02 }); },
  panela: () => ruido(0.3, { vol: 0.03, corte: 5000 }),
  planta: () => { ruido(0.12, { vol: 0.05, corte: 600 }); tom(700, 0.08, { tipo: 'sine', vol: 0.03, atraso: 0.05 }); },
  colhe: () => { tom(587, 0.08, { tipo: 'triangle', vol: 0.04 }); tom(880, 0.1, { tipo: 'triangle', vol: 0.04, atraso: 0.06 }); },
  equipa: () => { ruido(0.08, { vol: 0.05, corte: 3000 }); tom(400, 0.1, { vol: 0.03 }); },
  come: () => { [0, 1, 2].forEach(i => ruido(0.05, { vol: 0.04, corte: 1500, atraso: i * 0.09 })); },
  select: () => tom(740, 0.05, { tipo: 'triangle', vol: 0.03 }),
  passo: () => { tom(150 + Math.random() * 40, 0.05, { tipo: 'triangle', vol: 0.035 }); ruido(0.03, { vol: 0.02, corte: 900 }); },
  motor: () => tom(70 + Math.random() * 12, 0.09, { tipo: 'sawtooth', vol: 0.012 }),
  rega: () => { ruido(0.5, { vol: 0.04, corte: 2500 }); ruido(0.3, { vol: 0.03, corte: 900, atraso: 0.2 }); },
  embarca: () => { ruido(0.2, { vol: 0.05, corte: 700 }); tom(220, 0.08, { tipo: 'triangle', vol: 0.03, atraso: 0.05 }); }
};
function alternaMudo() {
  initAudio(); mudo = !mudo;
  try { localStorage.setItem('slowfolk-mudo', mudo ? '1' : '0'); } catch (e) { }
  if (mudo && MIX) for (const s of MIX.vozes) { try { s.stop(AC.currentTime + .15); } catch (_) {} }
  aplicaSom(); aviso(mudo ? 'Som desligado' : 'Som ligado');
}
