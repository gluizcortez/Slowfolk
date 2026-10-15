'use strict';

/* ================= sons: tudo sintetizado na hora pelo WebAudio, sem arquivos =================
   initAudio() precisa de um clique do jogador (regra dos navegadores). M liga e desliga o som; a escolha fica salva. */
let AC = null, mudo = false;
try { mudo = localStorage.getItem('slowfolk-mudo') === '1'; } catch (e) { }

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
}
function tom(freq, dur, { tipo = 'square', vol = 0.06, ate = null, atraso = 0 } = {}) {
  if (!AC || mudo) return;
  const t = AC.currentTime + atraso, o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
function ruido(dur, { vol = 0.08, corte = 1200, atraso = 0 } = {}) {
  if (!AC || mudo) return;
  const t = AC.currentTime + atraso, n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = corte; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t);
}
const sfx = {
  lanca: () => { ruido(0.25, { vol: 0.05, corte: 3000 }); tom(900, 0.2, { tipo: 'sine', vol: 0.03, ate: 400 }); },
  splash: () => ruido(0.35, { vol: 0.09, corte: 900 }),
  fisgou: () => { tom(660, 0.08, { vol: 0.05 }); tom(990, 0.12, { vol: 0.05, atraso: 0.08 }); },
  clique: () => tom(520, 0.05, { vol: 0.03 }),
  carretel: () => tom(180 + Math.random() * 40, 0.03, { tipo: 'triangle', vol: 0.025 }),
  pegou: (rar) => { const base = [523, 587, 659, 784, 880][ORDEM_RAR.indexOf(rar)] || 523; [0, 4, 7, 12].forEach((s, i) => tom(base * Math.pow(2, s / 12), 0.18, { tipo: 'triangle', vol: 0.05, atraso: i * 0.07 })); },
  arrebentou: () => { tom(300, 0.25, { tipo: 'sawtooth', vol: 0.04, ate: 80 }); ruido(0.1, { vol: 0.05, corte: 4000 }); },
  escapou: () => tom(330, 0.3, { tipo: 'triangle', vol: 0.04, ate: 160 }),
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
  embarca: () => { ruido(0.2, { vol: 0.05, corte: 700 }); tom(220, 0.08, { tipo: 'triangle', vol: 0.03, atraso: 0.05 }); }
};
function alternaMudo() { mudo = !mudo; try { localStorage.setItem('slowfolk-mudo', mudo ? '1' : '0'); } catch (e) { } aviso(mudo ? 'Som desligado' : 'Som ligado'); }
