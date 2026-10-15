'use strict';

/* ================= ofícios que andam sozinhos: mina, cozinha, forja e horta =================
   As três estações trabalham ao mesmo tempo que a pesca (é um jogo de ficar de boa).
   - Mina: escolhe um veio e fica minerando sem parar.
   - Cozinha e forja: escolhe uma receita e quantas fazer; os ingredientes saem do cesto quando cada peça começa.
   - Horta: cada canteiro cresce pelo relógio de verdade, então cresce também com o jogo fechado.
   tickOficios(dt) aceita dt grande (o tempo que o jogo ficou fechado) e conta o que foi feito. */

const picaretaAtual = () => ITENS[E.equip.picareta] || ITENS.picareta_velha;
const tempoVeio = v => v.tempo * picaretaAtual().pic / (1 + efeito('mina') / 100);

function receitaForja(id) {
  if (id.startsWith('barra_')) {
    const m = METAIS.find(x => 'barra_' + x.id === id);
    const ing = {}; for (const [k, n] of Object.entries(m.barra)) ing['min_' + k] = n;
    return { id, nome: ITENS[id].nome, ing, tempo: m.tempo, xp: m.xp, nivel: m.nivel, faz: id, n: 1 };
  }
  const it = ITENS[id], m = METAIS.find(x => x.id === it.metal), p = PECAS.find(x => x.id === it.slot);
  return { id, nome: it.nome, ing: { ['barra_' + m.id]: p.barras }, tempo: m.tempo * p.barras * 1.5, xp: m.xp * p.barras * 1.6, nivel: m.nivel + p.mais, faz: id, n: 1 };
}
function receitaCozinha(id) {
  const r = RECEITAS.find(x => x.id === id);
  return { id, nome: r.nome, ing: r.ing, tempo: r.tempo, xp: r.xp, nivel: r.nivel, faz: r.faz ? 'isca_milho' : r.id, n: r.faz || 1 };
}

const ESTACOES = {
  cozinha: { hab: 'culinaria', rec: receitaCozinha, som: () => sfx.panela() },
  forja: { hab: 'forja', rec: receitaForja, som: () => sfx.martelo() }
};

function comecaEstacao(nome, recId, n) {
  const S = E[nome];
  if (S.rec && S.pago) devolveEstacao(nome);
  Object.assign(S, { rec: recId, falta: n, prog: 0, pago: false });
  marcaMudou();
}
function paraEstacao(nome) { devolveEstacao(nome); Object.assign(E[nome], { rec: null, falta: 0, prog: 0, pago: false }); marcaMudou(); }
// parar no meio devolve os ingredientes da peça que estava sendo feita
function devolveEstacao(nome) {
  const S = E[nome]; if (!S.rec || !S.pago) return;
  for (const [id, n] of Object.entries(ESTACOES[nome].rec(S.rec).ing)) da(id, n);
  S.pago = false;
}

function tickEstacao(nome, dt, feitos, quieto) {
  const S = E[nome], D = ESTACOES[nome];
  let guarda = 0;
  while (S.rec && dt > 0 && guarda++ < 100000) {
    const r = D.rec(S.rec);
    if (!S.pago) {
      if (S.falta <= 0 || !temTodos(r.ing)) { if (!quieto && S.falta > 0) aviso(`${nome === 'cozinha' ? 'A cozinha' : 'A forja'} parou: faltam ingredientes para ${r.nome}.`); Object.assign(S, { rec: null, falta: 0, prog: 0 }); marcaMudou(); break; }
      tiraTodos(r.ing); S.pago = true;
    }
    const falta = r.tempo - S.prog;
    if (dt < falta) { S.prog += dt; dt = 0; break; }
    dt -= falta; S.prog = 0; S.pago = false; S.falta--;
    da(r.faz, r.n); ganhaXp(D.hab, r.xp, quieto);
    feitos[r.faz] = (feitos[r.faz] || 0) + r.n;
    if (!quieto && painelAberto === nome) D.som();
    if (S.falta <= 0) { Object.assign(S, { rec: null, prog: 0 }); if (!quieto) aviso(`${nome === 'cozinha' ? 'Cozinha' : 'Forja'}: tudo pronto!`); marcaMudou(); }
  }
}

function tickMina(dt, feitos, quieto) {
  const M = E.mina; if (!M.veio) return;
  const v = VEIOS.find(x => x.id === M.veio);
  let guarda = 0;
  while (dt > 0 && guarda++ < 100000) {
    const T = tempoVeio(v), falta = T - M.prog;
    if (dt < falta) { M.prog += dt; break; }
    dt -= falta; M.prog = 0;
    da('min_' + v.id); feitos['min_' + v.id] = (feitos['min_' + v.id] || 0) + 1;
    if (Math.random() < 0.008) { da('ametista'); feitos.ametista = (feitos.ametista || 0) + 1; if (!quieto) aviso(`${icoHtml('ametista', 'sm')} Você achou uma <b class="r-epico">Ametista</b>!`); }
    ganhaXp('mineracao', v.xp, quieto);
    if (!quieto && painelAberto === 'mina') sfx.picareta();
  }
}

function tickOficios(dt, quieto = false) {
  const feitos = {};
  tickMina(dt, feitos, quieto);
  tickEstacao('cozinha', dt, feitos, quieto);
  tickEstacao('forja', dt, feitos, quieto);
  E.efeitos = E.efeitos.filter(f => f.fim > Date.now());
  return feitos;
}

/* ===== horta ===== */
const plantaDe = id => PLANTAS.find(p => p.id === id);
function prontoCanteiro(c) { if (!c.planta) return 0; return clamp((Date.now() - c.desde) / (plantaDe(c.planta).tempo * 1000), 0, 1); }
function planta(i, id) {
  const c = E.horta[i], p = plantaDe(id);
  if (c.planta || !tem('sem_' + id) || nivel('cultivo') < p.nivel) return;
  tira('sem_' + id); c.planta = id; c.desde = Date.now();
  try { sfx.planta(); } catch (e) { }
  marcaMudou();
}
function colhe(i, quieto) {
  const c = E.horta[i]; if (!c.planta || prontoCanteiro(c) < 1) return null;
  const p = plantaDe(c.planta), n = randi(p.colhe[0], p.colhe[1]);
  da(p.id, n); ganhaXp('cultivo', p.xp, quieto);
  let minhocas = 0; if (Math.random() < 0.35) { minhocas = randi(1, 3); da('minhoca', minhocas); }
  c.planta = null; c.desde = 0;
  if (!quieto) { try { sfx.colhe(); } catch (e) { } }
  marcaMudou();
  return { id: p.id, n, minhocas };
}
const hortaPronta = () => E.horta.filter(c => c.planta && prontoCanteiro(c) >= 1).length;

/* ===== o tempo em que o jogo ficou fechado ===== */
function recuperaTempo() {
  const seg = Math.min(OFFLINE_MAX, Math.max(0, (Date.now() - (E.salvo || Date.now())) / 1000));
  if (seg < 30) return null;
  const peixes = pescaOffline(seg);
  const feitos = tickOficios(seg, true);
  E.minutos += Math.min(seg, 600);
  return { seg, peixes, feitos, horta: hortaPronta() };
}
