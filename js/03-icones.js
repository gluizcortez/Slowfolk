'use strict';

/* ================= ícones em pixel art (16x16), pintados por código e guardados como data URL =================
   icone(id) aceita um id de ITENS ou 'ui:nome' (os da doca e do HUD). Cada desenho preenche uma grade de cores e no fim
   ganha contorno preto em volta de tudo que foi pintado, como os sprites da referência. */

const _icoCache = {};
const claro = c => mistura(c, '#ffffff', 0.38);
const escuro = c => escurece(c, 0.62);

function grade() {
  const g = new Array(256).fill(null);
  const api = {
    g,
    p(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < 16 && y < 16) g[y * 16 + x] = c; },
    r(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) api.p(x + i, y + j, typeof c === 'function' ? c(i, j, w, h) : c); },
    // elipse com sombreado: claro em cima à esquerda, escuro embaixo à direita
    e(cx, cy, rx, ry, c, sombra = true) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        let cor = typeof c === 'function' ? c(x, y, dx, dy) : c;
        if (sombra && typeof c !== 'function') cor = dx + dy < -0.9 ? claro(c) : dx + dy > 0.8 ? escuro(c) : c;
        api.p(x, y, cor);
      }
    },
    l(x0, y0, x1, y1, c) {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (; ;) { api.p(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    },
    // mapa de texto: cada letra vira uma cor da paleta
    m(linhas, pal, ox = 0, oy = 0) { linhas.forEach((ln, y) => [...ln].forEach((ch, x) => { if (pal[ch]) api.p(ox + x, oy + y, pal[ch]); })); }
  };
  return api;
}

function contorno(g) {
  const out = g.slice();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (g[y * 16 + x]) continue;
    const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < 16 && Y < 16 && g[Y * 16 + X] && g[Y * 16 + X] !== '#000'; });
    if (viz) out[y * 16 + x] = '#0b0710';
  }
  return out;
}

function gradeUrl(g) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  contorno(g).forEach((cor, i) => { if (cor) { x.fillStyle = cor; x.fillRect(i % 16, i / 16 | 0, 1, 1); } });
  return c.toDataURL();
}

const DESENHOS = {
  peixe(G, [corpo, barriga, barb]) {
    G.r(6, 4, 3, 1, barb); G.r(5, 5, 5, 1, barb);                                           // barbatana de cima
    for (let x = 12; x <= 15; x++) { const h = x - 11; G.r(x, 8 - h, 1, h * 2 + 1, x === 15 ? escuro(barb) : barb); }   // rabo
    G.e(7, 8.5, 6, 3.3, (x, y, dx, dy) => dy > 0.25 ? barriga : dy < -0.55 ? claro(corpo) : corpo, false);
    G.r(7, 11, 2, 1, barb);                                                                  // barbatana de baixo
    G.l(5, 7, 5, 9, escuro(corpo));                                                          // guelra
    G.p(3, 7, '#0b0710'); G.p(2, 7, '#ffffff');                                              // olho
  },
  minerio(G, [c]) {
    G.e(8, 9.5, 6.5, 5, '#6a6460');
    for (const [x, y] of [[5, 7], [9, 6], [10, 10], [6, 11], [8, 9], [12, 8]]) { G.p(x, y, c); G.p(x + 1, y, claro(c)); G.p(x, y + 1, escuro(c)); }
  },
  carvao(G) { G.e(8, 9.5, 6.5, 5, '#3a3438'); for (const [x, y] of [[5, 7], [9, 6], [10, 10], [6, 11]]) { G.p(x, y, '#121014'); G.p(x + 1, y, '#5a5458'); } },
  gema(G, [c]) {
    G.m(['....aaaa....', '...abbbba...', '..abbbbbba..', '.cccccccccc.', '..cccccccc..', '...dcccccd..', '....dccd....', '.....dd.....'], { a: claro(c), b: mistura(c, '#ffffff', .6), c, d: escuro(c) }, 2, 4);
  },
  barra(G, [c]) {
    G.m(['....aaaaaaaa..', '...abbbbbbbba.', '..cccccccccccd', '.cccccccccccdd', '.ccccccccccdd.', '.ddddddddddd..'], { a: mistura(c, '#ffffff', .6), b: claro(c), c, d: escuro(c) }, 1, 6);
  },
  capacete(G, [c]) {
    G.m(['....aaaaaa....', '...abbbbbbc...', '..abbbbbbbbc..', '..bbbbbbbbbc..', '..bbbbbbbbbc..', '.dbbkkkkkkbcd.', '.dbbk....kbcd.', '..bbk....kbc..', '..ccc....ccc..'], { a: claro(c), b: c, c: escuro(c), d: escuro(escuro(c)), k: '#1a1418' }, 1, 3);
  },
  peitoral(G, [c]) {
    G.m(['..aa......aa..', '.abbb....bbbc.', '.abbbbbbbbbbc.', '..bbbbbbbbbc..', '..bbbaabbbbc..', '..bbbbbbbbbc..', '..bbbbbbbbbc..', '...bbbbbbbc...', '...cccccccc...'], { a: claro(c), b: c, c: escuro(c) }, 1, 3);
  },
  calcas(G, [c]) {
    G.m(['..aaaaaaaaaa..', '..bbbbbbbbbc..', '..bbbbbbbbbc..', '..bbbb..bbbc..', '..bbbb..bbbc..', '..bbbb..bbbc..', '..bbbb..bbbc..', '..cccc..cccc..'], { a: claro(c), b: c, c: escuro(c) }, 1, 4);
  },
  botas(G, [c]) {
    G.m(['..ab.....ab...', '..bb.....bb...', '..bb.....bb...', '..bbb....bbb..', '..bbbbb..bbbbb', '..ccccc..ccccc'], { a: claro(c), b: c, c: escuro(c) }, 0, 6);
  },
  vara(G, [c]) {
    G.l(2, 14, 13, 2, '#6a4a28'); G.l(3, 14, 13, 3, c); G.l(4, 13, 7, 10, claro(c));
    G.r(4, 10, 3, 3, '#3a3438'); G.p(5, 11, '#c8c0b0');                                         // carretilha
    G.l(13, 3, 14, 9, '#e8e8e0'); G.p(14, 10, '#e04040'); G.p(14, 11, '#ffffff');               // linha e boia
  },
  picareta(G, [c]) {
    G.l(3, 14, 10, 7, '#8a6038'); G.l(4, 14, 11, 7, '#5a3a20');
    G.m(['.aaaa......', 'abbbbbaa...', '.ccbbbbbba.', '....ccbbbbb', '......cccbb', '.........cb', '..........c'], { a: claro(c), b: c, c: escuro(c) }, 4, 1);
  },
  semente(G, [c]) {
    G.m(['....aa....', '...abba...', '..abbbbb..', '.abbbbbbb.', '.bbbccbbb.', '.bbcddcbb.', '.bbbccbbc.', '..bbbbbc..'], { a: '#e8d0a0', b: '#c8a870', c: c, d: claro(c) }, 3, 5);
  },
  minhoca(G, [c]) { G.m(['......aa.....', '.....abba....', '....ab..bc...', '...ab....b...', '.abb.....bc..', 'abc.......bba', '.c.........c.'], { a: claro(c), b: c, c: escuro(c) }, 1, 5); G.p(7, 5, '#0b0710'); },
  isca(G, [c]) { for (const [x, y] of [[6, 8], [9, 7], [7, 11], [10, 10], [4, 10]]) G.e(x, y, 2.2, 2.2, c); },
  prato(G, [c]) {
    G.e(8, 8, 5.5, 2.6, c);
    G.e(6, 7.5, 1.6, 1, claro(c), false);
    G.m(['aaaaaaaaaaaaaa', '.bbbbbbbbbbbb.', '..bbbbbbbbbb..', '...cccccccc...'], { a: '#f0e8d8', b: '#d8cbb0', c: '#a89878' }, 1, 9);
  },
  cultivo_batata(G, [c]) { G.e(7, 9, 5, 4, c); G.p(5, 8, escuro(c)); G.p(9, 10, escuro(c)); G.p(8, 7, escuro(c)); },
  cultivo_cenoura(G, [c, f]) { G.m(['.f.f.f.', '..fff..', '...f...'], { f }, 7, 1); G.m(['.aaaa.', 'abbbbc', '.bbbc.', '.bbbc.', '..bc..', '..bc..', '...c..', '...c..'], { a: claro(c), b: c, c: escuro(c) }, 6, 4); },
  cultivo_milho(G, [c, f]) { G.m(['....aa....', '...abba...', '..fabbaf..', '..fbbbbf..', '..fbcbbf..', '..fbbcbf..', '..fbbbbf..', '..ffbbff..', '...ffff...', '....ff....'], { a: claro(c), b: c, c: escuro(c), f }, 3, 3); },
  cultivo_tomate(G, [c, f]) { G.e(8, 9.5, 5, 4.5, c); G.m(['f.f.f', '.fff.'], { f }, 6, 4); G.p(6, 7, '#ffd0c0'); },
  cultivo_pimenta(G, [c, f]) { G.m(['..ff....', '..f.....', '.abb....', '.bbbb...', '..bbbb..', '...bbbb.', '....bbbc', '.....bcc'], { a: claro(c), b: c, c: escuro(c), f }, 4, 3); },
  cultivo_abobora(G, [c, f]) { G.m(['......ff....', '.....f......'], { f: '#6a4a28' }, 2, 3); G.e(8, 10, 6.5, 4.5, (x, y, dx) => Math.abs(dx) > .45 && Math.abs(dx) < .6 ? escuro(c) : Math.abs(dx) < .08 ? escuro(c) : c, false); G.p(4, 8, claro(c)); },
  cultivo_ervas(G, [c, f]) { G.l(8, 14, 8, 6, f); G.e(5.5, 6, 2.5, 2, c); G.e(10.5, 6, 2.5, 2, c); G.e(8, 3.5, 2, 2, c); G.e(5.5, 10, 2.5, 1.8, c); G.e(10.5, 10, 2.5, 1.8, c); },
  // ===== interface
  'ui:vara'(G) { DESENHOS.vara(G, ['#c8b060']); },
  'ui:panela'(G) {
    G.m(['..k...........k', '.aaaaaaaaaaaaa.', '.bbbbbbbbbbbbbc', 'kbbbbbbbbbbbbck', '.bbbbbbbbbbbbc.', '.bbbbbbbbbbbbc.', '..bbbbbbbbbbc..', '...cccccccccc..'], { a: '#9aa0a8', b: '#5a6068', c: '#383c44', k: '#2a2428' }, 0, 6);
    G.r(5, 3, 1, 2, '#e8e8f0'); G.r(8, 2, 1, 3, '#e8e8f0'); G.r(11, 3, 1, 2, '#e8e8f0');
  },
  'ui:picareta'(G) { DESENHOS.picareta(G, ['#9aa0a8']); },
  'ui:bigorna'(G) { G.m(['aaaaaaaaaaaa..', 'bbbbbbbbbbbbbb', '.cbbbbbbbbbc..', '...cbbbbbc....', '....bbbbc.....', '...bbbbbbc....', '..cccccccccc..'], { a: '#b8c0c8', b: '#6a7078', c: '#3a3e44' }, 1, 5); G.p(13, 3, '#ffd060'); G.p(11, 2, '#ff9030'); },
  'ui:broto'(G) { G.m(['..aa....aa..', '.abbb..bbba.', '.bbbbccbbbb.', '..bbb.c.bb..', '......c.....', '......c.....'], { a: '#a8e070', b: '#5aa83a', c: '#3a7a28' }, 2, 2); G.m(['.aaaaaaaaaa.', 'bbbbbbbbbbbb', '.cccccccccc.'], { a: '#8a6038', b: '#6a4628', c: '#3a2414' }, 2, 10); },
  'ui:cesto'(G) { G.m(['...aaaaaaaa...', '..a........a..', '.bbbbbbbbbbbb.', '.bcbcbcbcbcbc.', '.cbcbcbcbcbcb.', '..bcbcbcbcbc..', '..cbcbcbcbcb..', '...cccccccc...'], { a: '#8a6038', b: '#c89858', c: '#8a6038' }, 1, 4); G.p(6, 6, '#58a6ff'); G.p(9, 5, '#e0a040'); },
  'ui:bolsa'(G) { G.m(['....aaaa....', '.....bb.....', '...cccccc...', '..cdddddcc..', '.cddeeddddc.', '.cdddddddcc.', '.cdddddddcc.', '..cccccccc..'], { a: '#c89858', b: '#6a4628', c: '#6a4628', d: '#a87840', e: '#ffd060' }, 2, 4); },
  'ui:chapeu'(G) { G.m(['....aaaaaa....', '...abbbbbbc...', '...bbbbbbbc...', '...dddddddd...', 'abbbbbbbbbbbbc', '.cccccccccccc.'], { a: '#f8e0a0', b: '#e8c060', c: '#a07830', d: '#c04030' }, 1, 5); },
  'ui:moeda'(G) { G.e(8, 8, 6, 6, '#ffc830'); G.e(8, 8, 3.5, 3.5, '#e0a020', false); G.r(7, 6, 2, 4, '#fff0a0'); },
  'ui:cadeado'(G) { G.m(['...aaaa...', '..a....a..', '..a....a..', '.bbbbbbbb.', '.bbbbbbbb.', '.bbbccbbb.', '.bbbccbbb.', '.bbbbbbbb.'], { a: '#9aa0a8', b: '#c89838', c: '#3a2414' }, 3, 3); }
};

function icone(id) {
  if (_icoCache[id]) return _icoCache[id];
  const G = grade();
  if (id.startsWith('ui:')) DESENHOS[id](G);
  else {
    const it = ITENS[id];
    if (!it) return '';
    DESENHOS[it.ico.f](G, it.ico.c);
  }
  return (_icoCache[id] = gradeUrl(G.g));
}
const icoHtml = (id, cls = '') => `<i class="ico ${cls}" style="background-image:url(${icone(id)})"></i>`;

function pintaIcones(raiz = document) {
  raiz.querySelectorAll('[data-ico]').forEach(el => { el.style.backgroundImage = `url(${icone(el.dataset.ico)})`; });
}
