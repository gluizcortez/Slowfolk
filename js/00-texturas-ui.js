'use strict';

/* ================= texturas da interface: molduras de bronze e pedra, pintadas uma vez em data URLs =================
   --tx-frame     moldura grande dos cartões (border-image 10 / 20px), com uma gema verde em cada canto
   --tx-frame-sm  moldura pequena dos botões e caixinhas (border-image 4 / 8px)
   --tx-stone     blocos de pedra gasta, repetidos atrás de todo painel
   --tx-wood      tábuas de madeira (canteiros da horta, prateleiras) */
(function texturasUI() {
  const pinta = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); f(x, w, h); return c.toDataURL(); };
  const px = (x, X, Y, cor) => { x.fillStyle = cor; x.fillRect(X, Y, 1, 1); };

  // anéis de fora para dentro; um anel com [claro, escuro] fica claro em cima e à esquerda
  function moldura(n, aneis, canto) {
    const b = aneis.length;
    return pinta(n, n, (x) => {
      for (let Y = 0; Y < n; Y++) for (let X = 0; X < n; X++) {
        const r = Math.min(X, Y, n - 1 - X, n - 1 - Y); if (r >= b) continue;
        const claro = Y === r || X === r;
        const c = aneis[r]; px(x, X, Y, Array.isArray(c) ? c[claro ? 0 : 1] : c);
      }
      for (let q = 0; q < 4; q++) for (let Y = 0; Y < b; Y++) for (let X = 0; X < b; X++) {
        const c = canto(X, Y); if (!c) continue;
        px(x, q & 1 ? n - 1 - X : X, q & 2 ? n - 1 - Y : Y, c);
      }
    });
  }
  const grande = moldura(26, ['#000', '#15100a', ['#5a5262', '#221d28'], ['#3e3746', '#1a161f'], '#000', ['#f2c470', '#7a4e1a'], ['#b07a34', '#4e3210'], '#000', '#0f0b13', '#3b3046'], (X, Y) => {
    if (X === 0 || Y === 0 || X === 9 || Y === 9) return '#000';
    const d = Math.abs(X - 4.5) + Math.abs(Y - 4.5);
    if (d <= 2) return X + Y <= 8 ? (X === 4 && Y === 4 ? '#e8ffd0' : '#5cc85a') : '#1f6a2c';   // uma esmeralda no canto
    if (d <= 3) return '#000';
    if (X === 1 || Y === 1) return '#f2c470';
    if (X === 8 || Y === 8) return '#5e3c14';
    return '#b07a34';
  });
  const pequena = moldura(10, ['#000', ['#e0b060', '#6e4718'], ['#a87230', '#4e3210'], '#000'], (X, Y) => {
    if (X === 0 || Y === 0 || X === 3 || Y === 3) return '#000';
    return X === 1 && Y === 1 ? '#fff2c0' : X === 2 && Y === 2 ? '#a86a20' : '#ffd060';
  });
  let semente = 11;
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  const pedra = pinta(64, 64, (x) => {
    for (let lin = 0; lin < 4; lin++) for (let b = -1; b < 3; b++) {
      const bx = b * 32 + (lin % 2 ? 16 : 0), by = lin * 16, t = Math.floor(rnd() * 6);
      x.fillStyle = `rgb(${24 + t},${19 + t},${29 + t})`; x.fillRect(bx, by, 32, 16);
      x.fillStyle = `rgb(${33 + t},${27 + t},${38 + t})`; x.fillRect(bx + 1, by + 1, 30, 1);
      x.fillStyle = '#0d0a11'; x.fillRect(bx, by + 15, 32, 1); x.fillRect(bx + 31, by, 1, 16);
    }
    for (let i = 0; i < 520; i++) { const v = rnd(); x.fillStyle = v < 0.5 ? 'rgba(0,0,0,.35)' : 'rgba(255,235,200,.05)'; x.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1); }
  });
  const madeira = pinta(64, 32, (x) => {
    for (let t = 0; t < 4; t++) {
      const y = t * 8, k = Math.floor(rnd() * 8);
      x.fillStyle = `rgb(${92 + k},${58 + k},${32 + k})`; x.fillRect(0, y, 64, 8);
      x.fillStyle = `rgb(${120 + k},${80 + k},${44 + k})`; x.fillRect(0, y, 64, 1);
      x.fillStyle = '#2a170a'; x.fillRect(0, y + 7, 64, 1);
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(40,20,8,.45)'; x.fillRect(Math.floor(rnd() * 60), y + 2 + Math.floor(rnd() * 4), 3 + Math.floor(rnd() * 6), 1); }
    }
  });
  const R = document.documentElement.style;
  R.setProperty('--tx-frame', `url(${grande})`);
  R.setProperty('--tx-frame-sm', `url(${pequena})`);
  R.setProperty('--tx-stone', `url(${pedra})`);
  R.setProperty('--tx-wood', `url(${madeira})`);
})();
