'use strict';

/* ================= base: utilitários que todo arquivo usa =================
   Os scripts não são ES modules: carregam em ordem e dividem as mesmas variáveis globais. */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const escolhe = arr => arr[Math.floor(Math.random() * arr.length)];

// gerador com semente (para a cena sair igual toda vez)
function rngSemente(s) {
  let t = s >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
}

// sorteio por peso: lista de [valor, peso]
function sorteiaPeso(lista) {
  let tot = 0; for (const [, p] of lista) tot += p;
  let r = Math.random() * tot;
  for (const [v, p] of lista) { r -= p; if (r <= 0) return v; }
  return lista[lista.length - 1][0];
}

const fmt = n => {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0).replace('.', ',') + ' mil';
  return (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
};
const fmtTempo = s => {
  s = Math.max(0, Math.ceil(s));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return m + 'min' + (r ? ' ' + r + 's' : '');
  const h = Math.floor(m / 60);
  return h + 'h' + (m % 60 ? ' ' + (m % 60) + 'min' : '');
};
const fmtPeso = kg => kg < 1 ? Math.round(kg * 1000) + ' g' : kg.toFixed(kg < 10 ? 2 : 1).replace('.', ',') + ' kg';

const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mistura = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); };
const escurece = (h, k) => { const A = hexRgb(h); return rgbHex(A[0] * k, A[1] * k, A[2] * k); };

// avisos curtos no topo da tela
function aviso(txt, cls) {
  const box = $('avisos'); if (!box) return;
  const d = document.createElement('div'); d.className = 'av' + (cls ? ' ' + cls : ''); d.innerHTML = txt;
  box.appendChild(d);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { d.classList.add('sai'); setTimeout(() => d.remove(), 500); }, 2600);
}
