'use strict';

/* ================= os ofícios: a cozinha na fogueira, a fazenda, e a mina e a forja (guardadas) =================
   - Cozinha: só cozinha com o pescador na fogueira (js/06c-terra.js). Os ingredientes da panela saem do cesto quando
     cada prato começa; a mesma mistura pode ser repetida várias vezes. Longe da fogueira, o fogo espera.
   - Fazenda: cada canteiro cresce pelo relógio de verdade (também com o jogo fechado); regado, cresce mais rápido.
   - Mina e forja ainda não têm lugar no mundo: o código fica aqui, mas não anda (tickOficios não chama).
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
const ESTACOES = {
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
      if (S.falta <= 0 || !temTodos(r.ing)) { if (!quieto && S.falta > 0) aviso(`A forja parou: faltam ingredientes para ${r.nome}.`); Object.assign(S, { rec: null, falta: 0, prog: 0 }); marcaMudou(); break; }
      tiraTodos(r.ing); S.pago = true;
    }
    const falta = r.tempo - S.prog;
    if (dt < falta) { S.prog += dt; dt = 0; break; }
    dt -= falta; S.prog = 0; S.pago = false; S.falta--;
    da(r.faz, r.n); ganhaXp(D.hab, r.xp, quieto);
    feitos[r.faz] = (feitos[r.faz] || 0) + r.n;
    if (!quieto && painelAberto === nome) D.som();
    if (S.falta <= 0) { Object.assign(S, { rec: null, prog: 0 }); if (!quieto) aviso(`Forja: tudo pronto!`); marcaMudou(); }
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
  tickCozinha(dt, feitos, quieto);
  E.efeitos = E.efeitos.filter(f => f.fim > Date.now());
  return feitos;
}

/* ===== cozinha ===== */
// o que sai de uma panela com estes ingredientes ({id: n}): uma receita, ou um prato simples
function pratoDaPanela(ing) {
  const ids = Object.keys(ing); if (!ids.length) return null;
  const r = RECEITAS.find(q => { const k = Object.keys(q.ing); return k.length === ids.length && k.every(id => q.ing[id] === ing[id]); });
  if (r) return { id: r.id, nome: r.nome, rec: r, nivel: r.nivel, tempo: r.tempo, xp: r.xp, faz: r.faz ? 'isca_milho' : r.id, n: r.faz || 1, cor: r.cor || '#f8d040' };
  const tipos = new Set(ids.map(id => ITENS[id].tipo)), total = ids.reduce((s, id) => s + ing[id], 0);
  const p = PRATOS_SIMPLES[tipos.size > 1 ? 'misto' : tipos.has('peixe') ? 'peixe' : 'cultivo'];
  return { id: p.id, nome: p.nome, rec: null, nivel: 1, tempo: 2 + total, xp: 3 * total, faz: p.id, n: 1, cor: p.cor };
}
const contaPanela = () => { const ing = {}; for (const id of E.panela) ing[id] = (ing[id] || 0) + 1; return ing; };
const naPanelaPode = id => ITENS[id] && (ITENS[id].tipo === 'peixe' || ITENS[id].tipo === 'cultivo');

function cozinha(n) {
  const ing = contaPanela(), pr = pratoDaPanela(ing);
  if (!pr || n < 1 || E.cozinha.rec) return;
  if (pr.nivel > nivel('culinaria')) { aviso(`Ainda não dá para fazer isso direito: precisa de nível ${pr.nivel} de Culinária.`); return; }
  if (!temTodos(ing)) { aviso('Faltam ingredientes no cesto.'); return; }
  Object.assign(E.cozinha, { rec: pr.id, ing, falta: n, prog: 0, pago: false, cor: pr.cor });
  try { sfx.panela(); } catch (e) { }
  marcaMudou();
}
function paraCozinha() {
  const S = E.cozinha;
  if (S.rec && S.pago) for (const [id, n] of Object.entries(S.ing)) da(id, n);
  Object.assign(S, { rec: null, ing: null, falta: 0, prog: 0, pago: false });
  marcaMudou();
}
function tickCozinha(dt, feitos, quieto) {
  const S = E.cozinha;
  if (!S.rec || !naFogueira()) return;   // longe da fogueira, a panela espera
  let guarda = 0;
  while (S.rec && dt > 0 && guarda++ < 1000) {
    const pr = pratoDaPanela(S.ing);
    if (!S.pago) {
      if (S.falta <= 0 || !temTodos(S.ing)) { if (!quieto && S.falta > 0) aviso(`Acabaram os ingredientes para ${pr.nome}.`); Object.assign(S, { rec: null, ing: null, falta: 0, prog: 0 }); marcaMudou(); break; }
      tiraTodos(S.ing); S.pago = true;
    }
    const falta = pr.tempo - S.prog;
    if (dt < falta) { S.prog += dt; break; }
    dt -= falta; S.prog = 0; S.pago = false; S.falta--;
    da(pr.faz, pr.n); ganhaXp('culinaria', pr.xp, quieto);
    feitos[pr.faz] = (feitos[pr.faz] || 0) + pr.n;
    if (pr.rec && !E.receitas[pr.id]) { E.receitas[pr.id] = true; if (!quieto) aviso(`${icoHtml(pr.faz, 'sm')} Receita nova: <b style="color:var(--moss)">${pr.nome}</b>! Ela foi para o caderno.`); }
    else if (!quieto) aviso(`${icoHtml(pr.faz, 'sm')} ${pr.nome}${pr.n > 1 ? ' ×' + pr.n : ''} pronto!`);
    if (!quieto) { try { sfx.colhe(); } catch (e) { } }
    if (S.falta <= 0) { Object.assign(S, { rec: null, ing: null, prog: 0 }); E.panela = []; }
    marcaMudou();
  }
}

/* ===== fazenda =====
   O crescimento é só conta com o relógio: o tempo desde que plantou, mais o bônus das regas. Cada rega deixa o canteiro
   molhado por REGA.dur(planta) segundos e, enquanto está molhado, ele cresce REGA.mult vezes mais rápido. */
const plantaDe = id => PLANTAS.find(p => p.id === id);
function crescido(c, agora = Date.now()) {
  if (!c.planta) return 0;
  const p = plantaDe(c.planta), dur = REGA.dur(p);
  const molhando = c.rega ? clamp((agora - c.rega) / 1000, 0, dur) : 0;
  return (agora - c.desde) / 1000 + (c.bonus || 0) + (REGA.mult - 1) * molhando;
}
function prontoCanteiro(c) { if (!c.planta) return 0; return clamp(crescido(c) / plantaDe(c.planta).tempo, 0, 1); }
const molhado = c => !!c.rega && Date.now() < c.rega + REGA.dur(plantaDe(c.planta)) * 1000;
// quanto falta, contando que a água que já está na terra ainda vai ajudar
function faltaCanteiro(c) {
  const p = plantaDe(c.planta), resto = p.tempo - crescido(c);
  if (resto <= 0) return 0;
  const agua = molhado(c) ? (c.rega + REGA.dur(p) * 1000 - Date.now()) / 1000 : 0;
  return resto <= agua * REGA.mult ? resto / REGA.mult : agua + (resto - agua * REGA.mult);
}
function planta(i, id) {
  const c = E.horta[i], p = plantaDe(id);
  if (!c || c.planta || !tem('sem_' + id) || nivel('cultivo') < p.nivel) return;
  tira('sem_' + id); Object.assign(c, { planta: id, desde: Date.now(), bonus: 0, rega: 0 });
  try { sfx.planta(); } catch (e) { }
  marcaMudou();
}
function rega(i) {
  const c = E.horta[i]; if (!c || !c.planta || molhado(c) || prontoCanteiro(c) >= 1) return;
  const p = plantaDe(c.planta);
  if (c.rega) c.bonus += (REGA.mult - 1) * REGA.dur(p);   // a rega anterior já secou: o bônus dela vira fixo
  c.rega = Date.now();
  ganhaXp('cultivo', Math.max(1, Math.round(p.xp * 0.15)));
  try { sfx.rega(); } catch (e) { }
  marcaMudou();
}
function colhe(i, quieto) {
  const c = E.horta[i]; if (!c || !c.planta || prontoCanteiro(c) < 1) return null;
  const p = plantaDe(c.planta), n = randi(p.colhe[0], p.colhe[1]);
  da(p.id, n); ganhaXp('cultivo', p.xp, quieto);
  let minhocas = 0; if (Math.random() < 0.35) { minhocas = randi(1, 3); da('minhoca', minhocas); }
  Object.assign(c, { planta: null, desde: 0, bonus: 0, rega: 0 });
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
