'use strict';

/* ================= estado do jogo, inventário, habilidades e save =================
   Todo o progresso fica em E (salvo no navegador em 'slowfolk-save'). As estações (mina, cozinha, forja) e a horta
   andam sozinhas, inclusive com o jogo fechado: ao abrir, js/08-oficios.js recupera o tempo que passou (até 8 h). */

const SAVE_KEY = 'slowfolk-save';
const OFFLINE_MAX = 8 * 3600;
let E = null;

function novoEstado() {
  const hab = {}; for (const h of HABS) hab[h.id] = { xp: 0 };
  return {
    v: 1, salvo: Date.now(),
    moedas: 25,
    hab,
    inv: { minhoca: 6, sem_batata: 4, sem_cenoura: 2 },
    equip: { capacete: null, peitoral: null, calcas: null, botas: null, vara: 'vara_bambu', picareta: 'picareta_velha' },
    ponto: 'lago', pontos: { lago: true },
    barco: null,
    barcoUp: { motor: 0, portavara: 0, sonar: 0, toldo: 0 },   // níveis das melhorias do barco                       // x do barco no lago (null = perto do píer)
    auto: false,
    colecao: {},                       // id do peixe -> { n, maior }
    mina: { veio: null, prog: 0 },
    cozinha: { rec: null, falta: 0, prog: 0 },
    forja: { rec: null, falta: 0, prog: 0 },
    horta: [0, 1, 2, 3].map(() => ({ planta: null, desde: 0 })),
    efeitos: [],                       // { tipo, valor, fim (Date.now) }
    minutos: 7 * 60,                   // hora do dia na cena (1 s de jogo = 1 min)
    dia: 1,
    total: { peixes: 0, moedas: 0 }
  };
}

/* ===== habilidades ===== */
function nivel(h) {
  const xp = E.hab[h].xp;
  let n = 1; while (n < NIVEL_MAX && xp >= XP_NIVEL[n + 1]) n++;
  return n;
}
function fracaoNivel(h) {
  const n = nivel(h); if (n >= NIVEL_MAX) return 1;
  return (E.hab[h].xp - XP_NIVEL[n]) / (XP_NIVEL[n + 1] - XP_NIVEL[n]);
}
function ganhaXp(h, qtd, quieto) {
  const antes = nivel(h);
  E.hab[h].xp += Math.round(qtd * (1 + efeito('xp') / 100));
  const depois = nivel(h);
  if (depois > antes && !quieto) {
    const hb = HABS.find(x => x.id === h);
    aviso(`${icoHtml(hb.ico, 'sm')} <b style="color:var(--moss)">${hb.nome}</b> subiu para o nível <b>${depois}</b>!`);
    try { sfx.nivel(); } catch (e) { }
  }
  return depois > antes;
}

/* ===== inventário ===== */
const qtd = id => E.inv[id] || 0;
const tem = (id, n = 1) => qtd(id) >= n;
function da(id, n = 1) { E.inv[id] = qtd(id) + n; marcaMudou(); }
function tira(id, n = 1) { const q = qtd(id) - n; if (q > 0) E.inv[id] = q; else delete E.inv[id]; marcaMudou(); }
const temTodos = ing => Object.entries(ing).every(([id, n]) => tem(id, n));
const tiraTodos = ing => { for (const [id, n] of Object.entries(ing)) tira(id, n); };

/* ===== equipamento e efeitos ===== */
function equipa(id) {
  const it = ITENS[id]; if (!it || it.tipo !== 'equip' || !tem(id)) return;
  const velho = E.equip[it.slot];
  tira(id); E.equip[it.slot] = id;
  if (velho && ITENS[velho].valor > 0) da(velho);   // a vara de bambu e a picareta velha somem ao trocar
  try { sfx.equipa(); } catch (e) { }
}
function desequipa(slot) {
  const id = E.equip[slot]; if (!id || slot === 'vara' || slot === 'picareta') return;
  E.equip[slot] = null; da(id);
}
// soma de um número de todo o equipamento vestido
function doEquip(chave) {
  let s = 0; for (const id of Object.values(E.equip)) if (id && ITENS[id][chave]) s += ITENS[id][chave];
  return s;
}
function efeito(tipo) {
  const agora = Date.now(); let s = 0;
  for (const f of E.efeitos) if (f.tipo === tipo && f.fim > agora) s += f.valor;
  return s;
}
function come(id) {
  const it = ITENS[id]; if (!it || !it.ef || !tem(id)) return;
  tira(id);
  const [tipo, valor, dur] = it.ef;
  E.efeitos = E.efeitos.filter(f => f.fim > Date.now() && f.tipo !== tipo);   // o mesmo tipo não acumula: o novo substitui
  E.efeitos.push({ tipo, valor, fim: Date.now() + dur * 1000, de: id });
  aviso(`Você comeu ${it.nome}: ${EFEITOS[tipo].fmt(valor)} por ${fmtTempo(dur)}`);
  try { sfx.come(); } catch (e) { }
}
// quanto uma melhoria do barco soma no nível atual (0 se não tem)
const doBarco = id => (E.barcoUp[id] || 0) * UPGRADES_BARCO.find(u => u.id === id).por;
const calorTotal = () => doEquip('calor') + efeito('calor') + doBarco('toldo');
const sorteTotal = () => doEquip('sorte') + efeito('sorte') + doBarco('sonar') + (iscaAtual() ? ITENS[iscaAtual()].sorte : 0);

function iscaAtual() { for (const id of ISCAS) if (tem(id)) return id; return null; }

/* ===== dinheiro ===== */
function ganhaMoedas(n) { E.moedas += n; E.total.moedas += n; marcaMudou(); }
function gasta(n) { if (E.moedas < n) return false; E.moedas -= n; marcaMudou(); return true; }
function vende(id, n) {
  n = Math.min(n, qtd(id)); if (n <= 0) return;
  tira(id, n); ganhaMoedas(ITENS[id].valor * n);
  try { sfx.moeda(); } catch (e) { }
}

/* "algo mudou": as telas abertas se redesenham no próximo quadro */
let _mudou = true;
function marcaMudou() { _mudou = true; }

/* ===== save ===== */
function salvar() {
  if (!E || !jogando) return;   // na tela de início o estado é de mentira
  E.salvo = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(E)); } catch (e) { }
}
function temSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function carregar() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
  if (!s) return false;
  // completa campos que saves antigos não têm
  const base = novoEstado();
  E = Object.assign(base, s);
  for (const h of HABS) if (!E.hab[h.id]) E.hab[h.id] = { xp: 0 };
  E.equip = Object.assign(base.equip, s.equip);
  E.barcoUp = Object.assign(base.barcoUp, s.barcoUp);
  return true;
}
function apagaSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
addEventListener('beforeunload', salvar);
document.addEventListener('visibilitychange', () => { if (document.hidden) salvar(); });
