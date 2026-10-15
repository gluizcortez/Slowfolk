'use strict';

/* ================= HUD: moedas, relógio, a pesca no canto, efeitos ativos e os pontinhos da doca ================= */
let _hudT = 0;
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
  // pontinho verde na doca: tem coisa pronta ou trabalhando
  const ponto = { horta: hortaPronta() > 0, mina: !!E.mina.veio, cozinha: !!E.cozinha.rec, forja: !!E.forja.rec };
  document.querySelectorAll('#doca button').forEach(b => {
    const on = !!ponto[b.dataset.p], tem = b.querySelector('.aceso');
    if (on && !tem) b.insertAdjacentHTML('beforeend', '<i class="aceso"></i>');
    else if (!on && tem) tem.remove();
  });
}

addEventListener('keydown', e => {
  if (!E || !jogando) return;
  if (e.code === 'Escape') { if (painelAberto) fechaPainel(); }
  else if (e.code === 'KeyM') alternaMudo();
  else if (e.code === 'KeyC' && !e.repeat) alternaAuto();
  else if (/^Digit[1-8]$/.test(e.code)) { const b = document.querySelectorAll('#doca button')[+e.code.slice(5) - 1]; if (b) abrePainel(b.dataset.p); }
});
$('bAuto').addEventListener('click', () => { initAudio(); alternaAuto(); });
