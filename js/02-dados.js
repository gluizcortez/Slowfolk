'use strict';

/* ================= dados do jogo: raridades, pontos de pesca, peixes, minérios, metais, receitas, sementes =================
   Tudo que é item entra em ITENS (id -> {nome, tipo, valor, ico}). Os ícones são pintados pelo js/03-icones.js a partir de `ico`.
   Para pôr conteúdo novo, basta acrescentar aqui: as telas leem estas listas. */

const RARIDADES = {
  comum: { nome: 'Comum', cor: '#c9c2b0', peso: 62, xp: 10, dif: 0.0 },
  incomum: { nome: 'Incomum', cor: '#7fd35a', peso: 24, xp: 22, dif: 0.25 },
  raro: { nome: 'Raro', cor: '#58a6ff', peso: 10, xp: 45, dif: 0.5 },
  epico: { nome: 'Épico', cor: '#c27cff', peso: 3.4, xp: 100, dif: 0.75 },
  lendario: { nome: 'Lendário', cor: '#ffb23f', peso: 0.6, xp: 240, dif: 1.0 }
};
const ORDEM_RAR = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

/* pontos de pesca: cada um muda a cena (js/06-cena.js lê `cena`) e a lista de peixes */
const PONTOS = [
  { id: 'lago', nome: 'Lago Sereno', nivel: 1, custo: 0, calor: 0, xpMul: 1, desc: 'Água parada, pinheiros e um píer velho. Onde tudo começa.' },
  { id: 'rio', nome: 'Rio da Pedra', nivel: 5, custo: 300, calor: 0, xpMul: 1.6, desc: 'Correnteza entre paredões de pedra. Peixes mais fortes.' },
  { id: 'baia', nome: 'Baía Gelada', nivel: 12, custo: 2500, calor: 8, xpMul: 2.5, desc: 'Gelo, neve e peixes enormes. Precisa de 8 de calor (armadura ou sopa quente).' }
];

const ITENS = {};
const item = (id, d) => { ITENS[id] = Object.assign({ id }, d); return ITENS[id]; };

/* peixes: [id, nome, ponto, raridade, valor, peso mín, peso máx, corpo, barriga, barbatana] */
const PEIXES = [
  ['lambari', 'Lambari', 'lago', 'comum', 3, 0.02, 0.08, '#b8c4c8', '#eef4f0', '#e0a040'],
  ['tilapia', 'Tilápia', 'lago', 'comum', 5, 0.3, 1.6, '#7c8c74', '#d8dcc0', '#5c6450'],
  ['carpa', 'Carpa', 'lago', 'incomum', 12, 1, 8, '#a8843c', '#e8d090', '#7a5a24'],
  ['traira', 'Traíra', 'lago', 'raro', 30, 0.5, 3.2, '#4c5a34', '#b8b47c', '#2c3420'],
  ['dourado', 'Dourado', 'lago', 'epico', 90, 2, 12, '#f0b830', '#fff0a0', '#d06a18'],
  ['koi', 'Carpa-koi Imperial', 'lago', 'lendario', 350, 3, 15, '#f4f0e8', '#ffffff', '#e04828'],
  ['piaba', 'Piaba', 'rio', 'comum', 8, 0.03, 0.1, '#c0b090', '#f0e8d0', '#c84838'],
  ['truta', 'Truta', 'rio', 'comum', 14, 0.4, 2.5, '#7a9070', '#e8c8b0', '#d07070'],
  ['bagre', 'Bagre', 'rio', 'incomum', 30, 1, 9, '#5a5048', '#b0a898', '#3a322c'],
  ['pintado', 'Pintado', 'rio', 'raro', 70, 3, 25, '#8c9498', '#e8e8e0', '#383c40'],
  ['salmao', 'Salmão-rei', 'rio', 'epico', 200, 4, 20, '#c86450', '#f0b8a0', '#5a6a78'],
  ['esturjao', 'Esturjão Ancião', 'rio', 'lendario', 800, 30, 120, '#5c6870', '#c8ccc8', '#2c343c'],
  ['arenque', 'Arenque', 'baia', 'comum', 20, 0.1, 0.5, '#7898b8', '#e8f0f8', '#4c6888'],
  ['bacalhau', 'Bacalhau', 'baia', 'comum', 35, 2, 12, '#988c64', '#e8e0c8', '#6c6448'],
  ['linguado', 'Linguado', 'baia', 'incomum', 70, 1, 6, '#8c7458', '#f0e8d8', '#5c4830'],
  ['halibute', 'Halibute', 'baia', 'raro', 160, 10, 80, '#5c5448', '#e8e4dc', '#3c342c'],
  ['lanterna', 'Peixe-lanterna', 'baia', 'epico', 450, 0.2, 1.4, '#283048', '#405070', '#80f0ff'],
  ['leviata', 'Leviatã-mirim', 'baia', 'lendario', 2000, 60, 300, '#2c5c6c', '#a0d0d0', '#183840']
].map(([id, nome, ponto, rar, valor, pmin, pmax, c1, c2, c3]) => item(id, { nome, tipo: 'peixe', ponto, rar, valor, pmin, pmax, ico: { f: 'peixe', c: [c1, c2, c3] } }));

/* mineração: cada veio produz um minério; `tempo` em segundos com a picareta velha */
const VEIOS = [
  { id: 'pedra', nome: 'Pedra', nivel: 1, tempo: 5, xp: 4, cor: '#8a8478', valor: 1 },
  { id: 'cobre', nome: 'Cobre', nivel: 1, tempo: 6, xp: 7, cor: '#d07a40', valor: 3 },
  { id: 'estanho', nome: 'Estanho', nivel: 1, tempo: 6, xp: 7, cor: '#c8ccd0', valor: 3 },
  { id: 'carvao', nome: 'Carvão', nivel: 5, tempo: 8, xp: 12, cor: '#2a2428', valor: 6 },
  { id: 'ferro', nome: 'Ferro', nivel: 10, tempo: 10, xp: 20, cor: '#a86a50', valor: 10 },
  { id: 'prata', nome: 'Prata', nivel: 20, tempo: 13, xp: 35, cor: '#e8f0f8', valor: 22 },
  { id: 'ouro', nome: 'Ouro', nivel: 30, tempo: 16, xp: 55, cor: '#ffd040', valor: 45 },
  { id: 'mitril', nome: 'Mitril', nivel: 40, tempo: 22, xp: 90, cor: '#70e0e0', valor: 90 }
];
for (const v of VEIOS) item('min_' + v.id, { nome: v.id === 'pedra' ? 'Pedra' : v.id === 'carvao' ? 'Carvão' : 'Minério de ' + v.nome.toLowerCase(), tipo: 'minerio', valor: v.valor, ico: { f: v.id === 'carvao' ? 'carvao' : 'minerio', c: [v.cor] } });
item('ametista', { nome: 'Ametista', tipo: 'gema', valor: 120, ico: { f: 'gema', c: ['#b070f0'] } });

/* metais da forja: barra, receita da fundição e o que cada peça feita dele dá */
const METAIS = [
  { id: 'bronze', nome: 'Bronze', nivel: 1, cor: '#c88a48', barra: { cobre: 1, estanho: 1 }, tempo: 3, xp: 6, valor: 9, calor: 1, sorte: 0, vara: [0.9, 1.2, 2], pic: 0.85 },
  { id: 'ferro', nome: 'Ferro', nivel: 10, cor: '#9aa0a8', barra: { ferro: 1, carvao: 1 }, tempo: 4, xp: 14, valor: 24, calor: 2, sorte: 1, vara: [0.8, 1.45, 4], pic: 0.72 },
  { id: 'prata', nome: 'Prata', nivel: 20, cor: '#e0e8f0', barra: { prata: 2, carvao: 1 }, tempo: 5, xp: 26, valor: 60, calor: 2, sorte: 3, vara: [0.7, 1.7, 7], pic: 0.6 },
  { id: 'ouro', nome: 'Ouro', nivel: 30, cor: '#ffc830', barra: { ouro: 2, carvao: 1 }, tempo: 6, xp: 40, valor: 120, calor: 3, sorte: 5, vara: [0.62, 2.0, 10], pic: 0.5 },
  { id: 'mitril', nome: 'Mitril', nivel: 40, cor: '#60d8e0', barra: { mitril: 2, carvao: 2 }, tempo: 8, xp: 65, valor: 240, calor: 5, sorte: 7, vara: [0.52, 2.5, 14], pic: 0.4 }
];
/* peças: barras que gastam, níveis a mais que o do metal, multiplicador dos números */
const PECAS = [
  { id: 'botas', nome: 'Botas', slot: 'botas', barras: 2, mais: 0, mul: 1 },
  { id: 'capacete', nome: 'Capacete', slot: 'capacete', barras: 2, mais: 1, mul: 1 },
  { id: 'picareta', nome: 'Picareta', slot: 'picareta', barras: 2, mais: 1, mul: 0 },
  { id: 'calcas', nome: 'Calças', slot: 'calcas', barras: 3, mais: 2, mul: 1 },
  { id: 'peitoral', nome: 'Peitoral', slot: 'peitoral', barras: 4, mais: 3, mul: 2 },
  { id: 'vara', nome: 'Vara', slot: 'vara', barras: 3, mais: 4, mul: 0 }
];
const SLOTS = [['capacete', 'Cabeça'], ['peitoral', 'Peito'], ['calcas', 'Pernas'], ['botas', 'Pés'], ['vara', 'Vara'], ['picareta', 'Picareta']];
for (const m of METAIS) {
  item('barra_' + m.id, { nome: 'Barra de ' + m.nome.toLowerCase(), tipo: 'barra', valor: m.valor, ico: { f: 'barra', c: [m.cor] } });
  for (const p of PECAS) {
    const nomeP = p.id === 'vara' ? 'Vara de ' + m.nome.toLowerCase() : p.id === 'picareta' ? 'Picareta de ' + m.nome.toLowerCase() : p.nome + ' de ' + m.nome.toLowerCase();
    const d = { nome: nomeP, tipo: 'equip', slot: p.slot, metal: m.id, valor: Math.round(m.valor * p.barras * 1.6), ico: { f: p.id, c: [m.cor] } };
    if (p.mul) { d.calor = m.calor * p.mul; d.sorte = m.sorte * p.mul; }
    if (p.id === 'vara') { d.vel = m.vara[0]; d.forca = m.vara[1]; d.sorte = m.vara[2]; }
    if (p.id === 'picareta') d.pic = m.pic;
    item(p.id + '_' + m.id, d);
  }
}
// o que se tem no começo
item('vara_bambu', { nome: 'Vara de bambu', tipo: 'equip', slot: 'vara', valor: 0, vel: 1, forca: 1, sorte: 0, ico: { f: 'vara', c: ['#c8b060'] } });
item('picareta_velha', { nome: 'Picareta velha', tipo: 'equip', slot: 'picareta', valor: 0, pic: 1, ico: { f: 'picareta', c: ['#8a7058'] } });

/* fazenda: semente -> colheita; `tempo` em segundos de relógio (cresce com o jogo fechado) */
const PLANTAS = [
  { id: 'batata', nome: 'Batata', nivel: 1, tempo: 60, custo: 4, colhe: [2, 3], valor: 5, xp: 8, cor: '#c8a060', folha: '#5a9a3a' },
  { id: 'cenoura', nome: 'Cenoura', nivel: 1, tempo: 90, custo: 6, colhe: [2, 3], valor: 7, xp: 10, cor: '#f08830', folha: '#6ab040' },
  { id: 'milho', nome: 'Milho', nivel: 4, tempo: 120, custo: 10, colhe: [2, 4], valor: 9, xp: 14, cor: '#f8d040', folha: '#7ab040' },
  { id: 'tomate', nome: 'Tomate', nivel: 6, tempo: 150, custo: 14, colhe: [2, 4], valor: 12, xp: 18, cor: '#e83c30', folha: '#4a8a30' },
  { id: 'pimenta', nome: 'Pimenta', nivel: 10, tempo: 240, custo: 22, colhe: [3, 5], valor: 15, xp: 28, cor: '#d82020', folha: '#3a7a28' },
  { id: 'abobora', nome: 'Abóbora', nivel: 14, tempo: 420, custo: 40, colhe: [1, 2], valor: 55, xp: 50, cor: '#e87818', folha: '#4a8a30' },
  { id: 'ervas', nome: 'Ervas finas', nivel: 18, tempo: 300, custo: 35, colhe: [2, 4], valor: 26, xp: 42, cor: '#78c050', folha: '#3a8a40' }
];
for (const p of PLANTAS) {
  item(p.id, { nome: p.nome, tipo: 'cultivo', valor: p.valor, ico: { f: 'cultivo_' + p.id, c: [p.cor, p.folha] } });
  item('sem_' + p.id, { nome: 'Sementes de ' + p.nome.toLowerCase(), tipo: 'semente', valor: Math.ceil(p.custo / 2), compra: p.custo, ico: { f: 'semente', c: [p.cor] } });
}

/* iscas: uma por lançamento, a de cima da lista (a melhor) é usada primeiro */
const ISCAS = ['isca_brilho', 'grilo', 'isca_milho', 'minhoca'];
item('minhoca', { nome: 'Minhoca', tipo: 'isca', valor: 1, compra: 3, vel: 0.85, sorte: 2, ico: { f: 'minhoca', c: ['#d87878'] } });
item('isca_milho', { nome: 'Isca de milho', tipo: 'isca', valor: 3, compra: 5, vel: 0.8, sorte: 5, ico: { f: 'isca', c: ['#f8d040'] } });
item('grilo', { nome: 'Grilo', tipo: 'isca', valor: 3, compra: 8, vel: 0.76, sorte: 8, ico: { f: 'isca', c: ['#7a9a3a'] } });
item('isca_brilho', { nome: 'Isca brilhante', tipo: 'isca', valor: 8, compra: 20, vel: 0.68, sorte: 12, ico: { f: 'isca', c: ['#7ae0ff'] } });

/* a barraca do pescador (no píer): o que a dona Lurdes vende por ouro */
// iscas: [id, quantos vêm no pacote, nível de pesca para comprar]
const ISCAS_LOJA = [['minhoca', 10, 1], ['isca_milho', 5, 3], ['grilo', 5, 8], ['isca_brilho', 5, 15]];
// varas compradas (as de metal saem da forja)
const VARAS_LOJA = [
  { id: 'vara_carvalho', nome: 'Vara de carvalho', nivel: 1, preco: 80, vel: 0.92, forca: 1.15, sorte: 1, cor: '#a8743c' },
  { id: 'vara_fibra', nome: 'Vara de fibra', nivel: 5, preco: 350, vel: 0.84, forca: 1.35, sorte: 3, cor: '#e8e4d0' },
  { id: 'vara_carbono', nome: 'Vara de carbono', nivel: 12, preco: 1400, vel: 0.72, forca: 1.7, sorte: 6, cor: '#4a5058' },
  { id: 'vara_mestre', nome: 'Vara do mestre', nivel: 20, preco: 5000, vel: 0.6, forca: 2.1, sorte: 10, cor: '#d04a3a' }
];
for (const v of VARAS_LOJA) item(v.id, { nome: v.nome, tipo: 'equip', slot: 'vara', valor: Math.round(v.preco * 0.4), compra: v.preco, vel: v.vel, forca: v.forca, sorte: v.sorte, ico: { f: 'vara', c: [v.cor] } });
// melhorias do barco: cada nível soma `por` ao efeito; `precos` tem um preço por nível
const UPGRADES_BARCO = [
  { id: 'motor', nome: 'Motor', ico: 'ui:motor', por: 30, txt: n => `barco ${n}% mais rápido`, precos: [150, 600, 2000] },
  { id: 'portavara', nome: 'Porta-vara', ico: 'ui:portavara', por: 7, txt: n => `fisgada ${n}% mais rápida`, precos: [250, 900, 3000] },
  { id: 'sonar', nome: 'Sonar de peixe', ico: 'ui:sonar', por: 3, txt: n => `+${n}% de sorte`, precos: [400, 1500, 4500] },
  { id: 'toldo', nome: 'Toldo aquecido', ico: 'ui:toldo', por: 2, txt: n => `+${n} de calor`, precos: [300, 1200] }
];

/* cozinha (na fogueira): ingredientes na panela -> prato; pratos vendem bem ou, comidos, dão um efeito por um tempo.
   A receita sai quando a panela tem exatamente aqueles ingredientes; a primeira vez que acerta, ela entra no caderno.
   Qualquer outra mistura de peixes e colheita vira um prato simples (PRATOS_SIMPLES). */
const EFEITOS = {
  vel: { nome: 'Fisgada rápida', fmt: v => '+' + v + '% velocidade de pesca' },
  sorte: { nome: 'Sorte', fmt: v => '+' + v + '% chance de peixe raro' },
  mina: { nome: 'Braço forte', fmt: v => '+' + v + '% velocidade na mina' },
  xp: { nome: 'Barriga cheia', fmt: v => '+' + v + '% de experiência' },
  calor: { nome: 'Quentinho', fmt: v => '+' + v + ' de calor' },
  ouro: { nome: 'Boa lábia', fmt: v => '+' + v + '% de ouro nas vendas' }
};
const RECEITAS = [
  { id: 'lambari_frito', nome: 'Lambari frito', nivel: 1, tempo: 3, xp: 8, ing: { lambari: 2 }, valor: 10, cor: '#e0a040', ef: ['vel', 5, 120] },
  { id: 'pure_cenoura', nome: 'Purê com cenoura', nivel: 1, tempo: 3, xp: 8, ing: { batata: 1, cenoura: 1 }, valor: 14, cor: '#f0c060', ef: ['ouro', 5, 180] },
  { id: 'tilapia_grelhada', nome: 'Tilápia grelhada', nivel: 2, tempo: 4, xp: 14, ing: { tilapia: 1, batata: 1 }, valor: 20, cor: '#d8b070', ef: ['sorte', 3, 180] },
  { id: 'caldo_peixe', nome: 'Caldo de peixe', nivel: 3, tempo: 4, xp: 16, ing: { lambari: 1, batata: 1, cenoura: 1 }, valor: 22, cor: '#d0b080', ef: ['xp', 5, 240] },
  { id: 'isca_milho', nome: 'Isca de milho', nivel: 4, tempo: 3, xp: 10, ing: { milho: 2 }, faz: 5 },
  { id: 'ensopado_carpa', nome: 'Ensopado de carpa', nivel: 6, tempo: 6, xp: 30, ing: { carpa: 1, batata: 1, cenoura: 1 }, valor: 48, cor: '#c08040', ef: ['ouro', 10, 300] },
  { id: 'moqueca', nome: 'Moqueca de traíra', nivel: 10, tempo: 8, xp: 55, ing: { traira: 1, tomate: 1, pimenta: 1 }, valor: 115, cor: '#e06830', ef: ['sorte', 6, 300] },
  { id: 'sopa_quente', nome: 'Sopa apimentada', nivel: 12, tempo: 7, xp: 45, ing: { pimenta: 2, abobora: 1 }, valor: 90, cor: '#d84020', ef: ['calor', 3, 600] },
  { id: 'truta_ervas', nome: 'Truta com ervas', nivel: 15, tempo: 8, xp: 60, ing: { truta: 1, ervas: 1 }, valor: 70, cor: '#d09070', ef: ['vel', 10, 300] },
  { id: 'torta_abobora', nome: 'Torta de abóbora', nivel: 16, tempo: 10, xp: 70, ing: { abobora: 1, milho: 2 }, valor: 140, cor: '#e89030', ef: ['xp', 10, 300] },
  { id: 'sopa_bagre', nome: 'Sopa de bagre', nivel: 18, tempo: 9, xp: 75, ing: { bagre: 1, cenoura: 1, milho: 1 }, valor: 95, cor: '#b09060', ef: ['vel', 12, 300] },
  { id: 'caldeirada', nome: 'Caldeirada', nivel: 22, tempo: 12, xp: 110, ing: { pintado: 1, tomate: 2, abobora: 1 }, valor: 260, cor: '#d06038', ef: ['sorte', 8, 420] },
  { id: 'salmao_assado', nome: 'Salmão assado', nivel: 28, tempo: 14, xp: 180, ing: { salmao: 1, ervas: 1, batata: 2 }, valor: 560, cor: '#f08060', ef: ['sorte', 12, 420] },
  { id: 'bacalhoada', nome: 'Bacalhoada', nivel: 30, tempo: 12, xp: 160, ing: { bacalhau: 2, batata: 2, tomate: 1 }, valor: 200, cor: '#e8d0a0', ef: ['calor', 5, 900] }
];
for (const r of RECEITAS) if (!r.faz) item(r.id, { nome: r.nome, tipo: 'prato', valor: r.valor, ef: r.ef, ico: { f: 'prato', c: [r.cor] } });
const RECEITAS_INICIO = ['lambari_frito'];   // a dona Lurdes já ensina esta; as outras o jogador descobre na panela
const PANELA_MAX = 5;
// o que sai quando a mistura não é receita: só peixe, só colheita ou os dois juntos
const PRATOS_SIMPLES = {
  peixe: { id: 'peixe_brasa', nome: 'Peixe na brasa', valor: 6, cor: '#c89058', ef: ['vel', 3, 90] },
  cultivo: { id: 'legumes_brasa', nome: 'Legumes na brasa', valor: 5, cor: '#a0b050', ef: ['xp', 3, 90] },
  misto: { id: 'cozido_roca', nome: 'Cozido da roça', valor: 10, cor: '#b08050', ef: ['sorte', 2, 120] }
};
for (const p of Object.values(PRATOS_SIMPLES)) item(p.id, { nome: p.nome, tipo: 'prato', valor: p.valor, ef: p.ef, ico: { f: 'prato', c: [p.cor] } });

/* habilidades: cada uma tem nível e experiência */
const HABS = [
  { id: 'pesca', nome: 'Pesca', ico: 'ui:vara' },
  { id: 'culinaria', nome: 'Culinária', ico: 'ui:panela' },
  { id: 'mineracao', nome: 'Mineração', ico: 'ui:picareta' },
  { id: 'forja', nome: 'Forja', ico: 'ui:bigorna' },
  { id: 'cultivo', nome: 'Cultivo', ico: 'ui:broto' }
];
const NIVEL_MAX = 60;
// experiência total para chegar no nível n (o nível 1 começa no 0)
const XP_NIVEL = [0, 0];
for (let n = 2; n <= NIVEL_MAX + 1; n++) XP_NIVEL[n] = XP_NIVEL[n - 1] + Math.round(60 * Math.pow(1.17, n - 2));

const CANTEIRO_PRECO = [0, 0, 0, 0, 150, 400, 900, 2000, 4500, 9000];   // os 4 primeiros já vêm; depois, 6 a mais para comprar
// regar: o canteiro fica molhado por `dur(planta)` segundos e, molhado, cresce `mult` vezes mais rápido
const REGA = { mult: 2.5, dur: p => Math.max(30, Math.round(p.tempo * 0.4)) };
