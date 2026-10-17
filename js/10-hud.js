'use strict';

/* ================= HUD: ouro, relógio, a pesca no canto, efeitos ativos e os atalhos de teclado =================
   Não há barra de ofícios: cada ofício só abre no lugar dele (E). Em qualquer lugar: I abre o cesto, F a ficha e P o caderno de pesca. */
let _hudT = 0;
const ATALHOS = { KeyI: 'cesto', KeyF: 'ficha', KeyP: 'pesca' };
function atualizaHud(dt) {
  _hudT -= dt; if (_hudT > 0) return; _hudT = 0.2;
  $('hMoedas').textContent = fmt(E.moedas);
  const h = Math.floor(E.minutos / 60) % 24, m = Math.floor(E.minutos % 60);
  $('hRelogio').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  $('hDia').textContent = 'Dia ' + E.dia;
  $('hSun').classList.toggle('moon', h < 6 || h >= 19);
  $('hPescaNv').textContent = 'nv ' + nivel('pesca');
  $('hPescaXp').style.width = (fracaoNivel('pesca') * 100).toFixed(1) + '%';
  // efeitos de comida
  const agora = Date.now(), box = $('buffs');
  const html = E.efeitos.filter(f => f.fim > agora).map(f => `<div class="buff" data-item="${f.de || ''}">${f.de ? icoHtml(f.de, 'sm') : ''}<b>${EFEITOS[f.tipo].fmt(f.valor)}</b> ${fmtTempo((f.fim - agora) / 1000)}</div>`).join('');
  if (box._html !== html) { box._html = html; box.innerHTML = html; }
}

addEventListener('keydown', e => {
  if (!E || !jogando) return;
  if (e.code === 'Escape') { if (painelAberto) fechaPainel(); }
  else if (e.code === 'KeyM' && !e.repeat) alternaMudo();
  else if (e.code === 'KeyC' && !e.repeat) alternaAuto();
  else if (!e.repeat && ATALHOS[e.code]) abrePainel(ATALHOS[e.code]);
});
$('bAuto').addEventListener('click', () => { initAudio(); alternaAuto(); });
$('bSom').addEventListener('click', alternaMudo);
