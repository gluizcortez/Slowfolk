'use strict';

/* ================= início e laço principal =================
   Antes de entrar no jogo, um estado de mentira faz o lago ao entardecer rodar atrás da tela de início. */
E = novoEstado();
E.auto = true; E.minutos = 17.6 * 60;
ajustaTela();
montaTitulo();

let ultimo = performance.now(), tempo = 0, salvaT = 0;
function quadro(agora) {
  const dt = clamp((agora - ultimo) / 1000, 0, 0.1); ultimo = agora; tempo += dt;
  // o relógio da cena: 1 s = 1 min (na tela de início o tempo anda devagar)
  E.minutos += dt * (jogando ? 1 : 0.15);
  if (E.minutos >= 24 * 60) { E.minutos -= 24 * 60; E.dia++; }
  atualizaMundo(dt);
  atualizaPesca(dt);
  if (jogando) {
    tickOficios(dt);
    atualizaHud(dt);
    if (_mudou) { _mudou = false; redesenhaPainel(); } else atualizaBarras();
    salvaT += dt; if (salvaT > 10) { salvaT = 0; salvar(); }
  }
  desenhaCena(tempo, dt);
  desenhaPesca(tempo);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
