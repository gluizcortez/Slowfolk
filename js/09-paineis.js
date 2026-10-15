'use strict';

/* ================= painéis: as janelas da doca (pesca, cozinha, mina, forja, horta, cesto, mercado, ficha) =================
   Cada painel é uma função que devolve HTML. Os botões levam data-a="ação" e os parâmetros em data-x / data-n, e um único
   ouvinte no corpo do painel resolve tudo. Quando o estado muda (marcaMudou), o painel aberto é redesenhado; as barras de
   progresso andam todo quadro sem redesenhar (atualizaBarras). */

let painelAberto = null;
let cestoSel = null;

const TITULOS = { pesca: 'Pesca', cozinha: 'Cozinha', mina: 'Mina', forja: 'Forja', horta: 'Horta', cesto: 'Cesto', mercado: 'Mercado', ficha: 'Ficha' };

function abrePainel(nome) {
  if (painelAberto === nome) return fechaPainel();
  // a loja só abre no balcão da barraca do pescador, no píer
  if (nome === 'mercado' && !naBarraca()) { aviso('A loja fica na barraca do pescador, no píer à esquerda. Encoste o barco e aperte E.'); return; }
  painelAberto = nome;
  $('pTitulo').textContent = TITULOS[nome];
  $('painel').hidden = false; document.body.classList.add('com-painel');
  $('pCorpo').scrollTop = 0;
  document.querySelectorAll('#doca button').forEach(b => b.classList.toggle('on', b.dataset.p === nome));
  redesenhaPainel();
  try { sfx.select(); } catch (e) { }
}
function fechaPainel() {
  painelAberto = null; $('painel').hidden = true; document.body.classList.remove('com-painel'); $('dica').hidden = true;
  document.querySelectorAll('#doca button').forEach(b => b.classList.remove('on'));
}
function redesenhaPainel() {
  if (!painelAberto) return;
  const corpo = $('pCorpo'), sc = corpo.scrollTop;
  corpo.innerHTML = PAINEIS[painelAberto]();
  corpo.scrollTop = sc;
  atualizaBarras();
}

/* ===== pedacinhos ===== */
const nv = h => nivel(h);
const cadeado = (n, h) => `<span class="trava">${icoHtml('ui:cadeado', 'sm')} Nv ${n} de ${HABS.find(x => x.id === h).nome}</span>`;
function chipsIng(ing, vezes = 1) {
  return Object.entries(ing).map(([id, n]) => {
    const ok = qtd(id) >= n * vezes;
    return `<span class="chip ${ok ? '' : 'falta'}" data-item="${id}">${icoHtml(id, 'sm')}${qtd(id)}/${n * vezes}</span>`;
  }).join('');
}
const maxFaz = ing => Math.min(...Object.entries(ing).map(([id, n]) => Math.floor(qtd(id) / n)));
function cabecalhoHab(h) {
  const hb = HABS.find(x => x.id === h), n = nv(h);
  return `<div class="habtopo">${icoHtml(hb.ico)}<div><b>${hb.nome}</b> <span class="nv">nível ${n}</span>
    <div class="bar xp"><i style="width:${(fracaoNivel(h) * 100).toFixed(1)}%"></i></div>
    <small>${n >= NIVEL_MAX ? 'Nível máximo' : fmt(E.hab[h].xp - XP_NIVEL[n]) + ' / ' + fmt(XP_NIVEL[n + 1] - XP_NIVEL[n]) + ' de experiência'}</small></div></div>`;
}
function trabalhoAtual(nome) {
  const S = E[nome]; if (!S.rec) return `<div class="trabalho vazio">Nada no fogo. Escolha uma receita abaixo.</div>`;
  const r = ESTACOES[nome].rec(S.rec);
  return `<div class="trabalho">${icoHtml(r.faz)}<div class="tinfo"><b>${r.nome}</b><small>faltam ${S.falta} · ${fmtTempo(r.tempo)} cada</small>
    <div class="bar prog"><i data-prog="${nome}"></i></div></div><button type="button" class="ghost sm" data-a="parar" data-x="${nome}">Parar</button></div>`;
}
function linhaReceita(nome, r, h) {
  const trava = nv(h) < r.nivel, mx = maxFaz(r.ing), ativo = E[nome].rec === r.id;
  return `<div class="linha ${trava ? 'travada' : ''} ${ativo ? 'ativa' : ''}">
    <span data-item="${r.faz}">${icoHtml(r.faz)}</span>
    <div class="linfo"><b>${r.nome}${r.n > 1 ? ' ×' + r.n : ''}</b>
      <small>${trava ? cadeado(r.nivel, h) : fmtTempo(r.tempo) + ' · ' + Math.round(r.xp) + ' xp'}</small>
      <div class="chips">${chipsIng(r.ing)}</div></div>
    <div class="lbotoes">${trava ? '' : `
      <button type="button" class="sm" data-a="faz" data-x="${nome}" data-r="${r.id}" data-n="1" ${mx < 1 ? 'disabled' : ''}>×1</button>
      <button type="button" class="sm" data-a="faz" data-x="${nome}" data-r="${r.id}" data-n="5" ${mx < 5 ? 'disabled' : ''}>×5</button>
      <button type="button" class="sm" data-a="faz" data-x="${nome}" data-r="${r.id}" data-n="${mx}" ${mx < 1 ? 'disabled' : ''}>Tudo (${mx})</button>`}</div></div>`;
}

const PAINEIS = {
  pesca() {
    const v = varaAtual(), isca = iscaAtual();
    let h = cabecalhoHab('pesca');
    h += `<div class="info2"><span data-item="${E.equip.vara}">${icoHtml(E.equip.vara, 'sm')} ${v.nome}</span>
      <span>${isca ? icoHtml(isca, 'sm') + ' ' + ITENS[isca].nome + ' ×' + qtd(isca) : 'Sem isca (compre minhocas no mercado)'}</span>
      <span>Sorte ${sorteTotal()}% · Calor ${calorTotal()}</span></div>`;
    h += `<h3>Pontos de pesca</h3><div class="pontos">`;
    for (const p of PONTOS) {
      const aqui = E.ponto === p.id, tem = E.pontos[p.id], nvOk = nv('pesca') >= p.nivel, calorOk = calorTotal() >= p.calor;
      let bt;
      if (aqui) bt = `<button type="button" class="ghost sm" disabled>Você está aqui</button>`;
      else if (tem) bt = `<button type="button" class="sm" data-a="viaja" data-x="${p.id}" ${calorOk ? '' : 'disabled'}>${calorOk ? 'Ir para lá' : 'Frio demais'}</button>`;
      else bt = `<button type="button" class="sm" data-a="compraPonto" data-x="${p.id}" ${nvOk && E.moedas >= p.custo && calorOk ? '' : 'disabled'}>Abrir por ${fmt(p.custo)} ${icoHtml('ui:moeda', 'sm')}</button>`;
      const pegos = PEIXES.filter(f => f.ponto === p.id && E.colecao[f.id]).length, todos = PEIXES.filter(f => f.ponto === p.id).length;
      h += `<div class="ponto ${aqui ? 'aqui' : ''}"><b>${p.nome}</b><small>${p.desc}</small>
        <small>${!nvOk ? cadeado(p.nivel, 'pesca') : `Caderno: ${pegos}/${todos}`}${p.calor ? ` · precisa de ${p.calor} de calor` : ''}</small>${bt}</div>`;
    }
    h += `</div><h3>Caderno de pesca</h3>`;
    for (const p of PONTOS) {
      h += `<div class="caderno"><small class="sub">${p.nome}</small><div class="grade">`;
      for (const f of PEIXES.filter(x => x.ponto === p.id)) {
        const c = E.colecao[f.id], R = RARIDADES[f.rar];
        h += `<div class="cpeixe ${c ? '' : 'nunca'}" ${c ? `data-item="${f.id}"` : ''} style="--rc:${R.cor}">${icoHtml(f.id)}<b>${c ? f.nome : '???'}</b><small style="color:${R.cor}">${R.nome}</small>${c ? `<small>${c.n} pegos · maior ${fmtPeso(c.maior)}</small>` : ''}</div>`;
      }
      h += `</div></div>`;
    }
    return h;
  },

  cozinha() {
    let h = cabecalhoHab('culinaria') + trabalhoAtual('cozinha');
    const pratos = Object.keys(E.inv).filter(id => ITENS[id] && ITENS[id].tipo === 'prato');
    if (pratos.length) {
      h += `<h3>Na despensa</h3><div class="despensa">`;
      for (const id of pratos) { const it = ITENS[id]; h += `<div class="prato" data-item="${id}">${icoHtml(id)}<div><b>${it.nome} ×${qtd(id)}</b><small class="bonus">${EFEITOS[it.ef[0]].fmt(it.ef[1])} · ${fmtTempo(it.ef[2])}</small></div><button type="button" class="sm" data-a="come" data-x="${id}">Comer</button></div>`; }
      h += `</div>`;
    }
    h += `<h3>Receitas</h3>`;
    for (const r of RECEITAS) h += linhaReceita('cozinha', receitaCozinha(r.id), 'culinaria');
    return h;
  },

  mina() {
    const pic = picaretaAtual();
    let h = cabecalhoHab('mineracao');
    h += `<div class="info2"><span data-item="${E.equip.picareta}">${icoHtml(E.equip.picareta, 'sm')} ${pic.nome}</span>${efeito('mina') ? `<span class="bonus">+${efeito('mina')}% de velocidade</span>` : ''}<span>1 em 125 chance de achar uma ametista</span></div>`;
    h += `<div class="veios">`;
    for (const v of VEIOS) {
      const trava = nv('mineracao') < v.nivel, ativo = E.mina.veio === v.id;
      h += `<div class="veio ${trava ? 'travada' : ''} ${ativo ? 'ativa' : ''}">
        <span data-item="min_${v.id}">${icoHtml('min_' + v.id)}</span><b>${v.nome}</b>
        <small>${trava ? cadeado(v.nivel, 'mineracao') : fmtTempo(tempoVeio(v)) + ' · ' + v.xp + ' xp · tem ' + qtd('min_' + v.id)}</small>
        ${ativo ? `<div class="bar prog"><i data-prog="mina"></i></div><button type="button" class="ghost sm" data-a="paraMina">Parar</button>` : trava ? '' : `<button type="button" class="sm" data-a="minera" data-x="${v.id}">Minerar</button>`}</div>`;
    }
    return h + `</div>`;
  },

  forja() {
    let h = cabecalhoHab('forja') + trabalhoAtual('forja');
    h += `<h3>Fornalha</h3>`;
    for (const m of METAIS) h += linhaReceita('forja', receitaForja('barra_' + m.id), 'forja');
    h += `<h3>Bigorna</h3><p class="nota">Armaduras dão <b>calor</b> (para a Baía Gelada) e <b>sorte</b> (peixes raros). Varas fisgam mais rápido e puxam com mais força. Picaretas mineram mais rápido.</p>`;
    for (const m of METAIS) {
      if (nv('forja') < m.nivel - 4) { h += `<div class="linha travada"><span>${icoHtml('barra_' + m.id)}</span><div class="linfo"><b>Peças de ${m.nome.toLowerCase()}</b><small>${cadeado(m.nivel, 'forja')}</small></div></div>`; continue; }
      for (const p of PECAS) h += linhaReceita('forja', receitaForja(p.id + '_' + m.id), 'forja');
    }
    return h;
  },

  horta() {
    let h = cabecalhoHab('cultivo');
    h += `<div class="info2"><span>As plantas crescem até com o jogo fechado.</span><span>Colher às vezes dá minhocas.</span>${hortaPronta() > 1 ? `<button type="button" class="sm" data-a="colheTudo">Colher tudo</button>` : ''}</div>`;
    h += `<div class="canteiros">`;
    E.horta.forEach((c, i) => {
      if (c.planta) {
        const p = plantaDe(c.planta), k = prontoCanteiro(c);
        h += `<div class="canteiro ${k >= 1 ? 'pronto' : ''}">${icoHtml(p.id)}<b>${p.nome}</b>
          ${k >= 1 ? `<button type="button" class="sm" data-a="colhe" data-n="${i}">Colher</button>` : `<div class="bar agua"><i data-prog="horta${i}"></i></div><small data-falta="${i}"></small>`}</div>`;
      } else {
        const opcoes = PLANTAS.filter(p => tem('sem_' + p.id) && nv('cultivo') >= p.nivel);
        h += `<div class="canteiro vazio"><b>Canteiro vazio</b>${opcoes.length ? `<div class="sementes">${opcoes.map(p => `<button type="button" class="ghost sm" data-a="planta" data-n="${i}" data-x="${p.id}" data-item="sem_${p.id}">${icoHtml('sem_' + p.id, 'sm')}${qtd('sem_' + p.id)}</button>`).join('')}</div>` : `<small>Sem sementes. Compre no mercado.</small>`}</div>`;
      }
    });
    const prox = E.horta.length < CANTEIRO_PRECO.length ? CANTEIRO_PRECO[E.horta.length] : null;
    if (prox) h += `<div class="canteiro novo"><b>Novo canteiro</b><button type="button" class="sm" data-a="canteiro" ${E.moedas >= prox ? '' : 'disabled'}>${fmt(prox)} ${icoHtml('ui:moeda', 'sm')}</button></div>`;
    h += `</div><h3>O que dá para plantar</h3><div class="tabela">`;
    for (const p of PLANTAS) h += `<div class="${nv('cultivo') < p.nivel ? 'travada' : ''}">${icoHtml(p.id, 'sm')}<b>${p.nome}</b><small>${nv('cultivo') < p.nivel ? cadeado(p.nivel, 'cultivo') : fmtTempo(p.tempo) + ' · colhe ' + p.colhe.join('–') + ' · ' + p.xp + ' xp'}</small></div>`;
    return h + `</div>`;
  },

  cesto() {
    const grupos = [['peixe', 'Peixes'], ['prato', 'Pratos'], ['cultivo', 'Colheita'], ['semente', 'Sementes'], ['isca', 'Iscas'], ['minerio', 'Minérios'], ['gema', 'Gemas'], ['barra', 'Barras'], ['equip', 'Equipamento']];
    let h = '', algum = false;
    for (const [tipo, nome] of grupos) {
      const ids = Object.keys(E.inv).filter(id => ITENS[id] && ITENS[id].tipo === tipo);
      if (!ids.length) continue; algum = true;
      h += `<h3>${nome}</h3><div class="slots">`;
      for (const id of ids) h += `<button type="button" class="slot ${cestoSel === id ? 'sel' : ''}" data-a="sel" data-x="${id}" data-item="${id}" ${ITENS[id].rar ? `style="--rc:${RARIDADES[ITENS[id].rar].cor}"` : ''}>${icoHtml(id)}<span>${fmt(qtd(id))}</span></button>`;
      h += `</div>`;
    }
    if (!algum) h = '<p class="nota">O cesto está vazio. Vá pescar!</p>';
    if (cestoSel && tem(cestoSel)) {
      const it = ITENS[cestoSel];
      h = `<div class="detalhe">${icoHtml(cestoSel)}<div><b ${it.rar ? `style="color:${RARIDADES[it.rar].cor}"` : ''}>${it.nome} ×${qtd(cestoSel)}</b><small>${descItem(it)}</small></div>
        <div class="lbotoes">${it.tipo === 'equip' ? `<button type="button" class="sm" data-a="equipa" data-x="${cestoSel}">Equipar</button>` : ''}
        ${it.tipo === 'prato' ? `<button type="button" class="sm" data-a="come" data-x="${cestoSel}">Comer</button>` : ''}
        ${it.valor > 0 ? `<button type="button" class="ghost sm" data-a="vende" data-x="${cestoSel}" data-n="1">Vender 1 (${it.valor})</button><button type="button" class="ghost sm" data-a="vende" data-x="${cestoSel}" data-n="${qtd(cestoSel)}">Vender todos (${fmt(it.valor * qtd(cestoSel))})</button>` : ''}</div></div>` + h;
    }
    return h;
  },

  mercado() {
    let h = `<p class="nota">A dona Lurdes compra qualquer coisa e vende o básico para a horta e a pesca.</p><h3>Comprar</h3><div class="loja">`;
    const oferta = [['minhoca', 10], ...PLANTAS.map(p => ['sem_' + p.id, 1])];
    for (const [id, n] of oferta) {
      const it = ITENS[id], preco = it.compra * n, p = id.startsWith('sem_') ? plantaDe(id.slice(4)) : null, trava = p && nv('cultivo') < p.nivel;
      h += `<div class="oferta ${trava ? 'travada' : ''}" data-item="${id}">${icoHtml(id)}<b>${it.nome}${n > 1 ? ' ×' + n : ''}</b><small>${trava ? cadeado(p.nivel, 'cultivo') : 'você tem ' + qtd(id)}</small>
        ${trava ? '' : `<button type="button" class="sm" data-a="compra" data-x="${id}" data-n="${n}" ${E.moedas >= preco ? '' : 'disabled'}>${fmt(preco)} ${icoHtml('ui:moeda', 'sm')}</button>`}</div>`;
    }
    h += `</div><h3>Vender por tipo</h3><div class="vendas">`;
    for (const [tipo, nome] of [['peixe', 'Todos os peixes'], ['cultivo', 'Toda a colheita'], ['prato', 'Todos os pratos'], ['minerio', 'Todos os minérios'], ['gema', 'Todas as gemas'], ['barra', 'Todas as barras']]) {
      const ids = Object.keys(E.inv).filter(id => ITENS[id] && ITENS[id].tipo === tipo);
      const total = ids.reduce((s, id) => s + ITENS[id].valor * qtd(id), 0);
      h += `<div class="venda"><b>${nome}</b><small>${ids.reduce((s, id) => s + qtd(id), 0)} itens</small><button type="button" class="ghost sm" data-a="vendeTipo" data-x="${tipo}" ${total ? '' : 'disabled'}>Vender por ${fmt(total)}</button></div>`;
    }
    return h + `</div><p class="nota">Para vender um item só, abra o Cesto.</p>`;
  },

  ficha() {
    let h = `<div class="ficha"><div class="habs">`;
    for (const hb of HABS) h += `<div class="hab">${icoHtml(hb.ico)}<div><b>${hb.nome}</b> <span class="nv">${nv(hb.id)}</span><div class="bar xp"><i style="width:${(fracaoNivel(hb.id) * 100).toFixed(1)}%"></i></div></div></div>`;
    h += `</div><div class="equip">`;
    for (const [slot, nome] of SLOTS) {
      const id = E.equip[slot];
      h += `<div class="eslot" ${id ? `data-item="${id}"` : ''}><small>${nome}</small>${id ? icoHtml(id) : '<i class="ico vazio"></i>'}<b>${id ? ITENS[id].nome : '—'}</b>${id && slot !== 'vara' && slot !== 'picareta' ? `<button type="button" class="ghost sm" data-a="tira" data-x="${slot}">Tirar</button>` : ''}</div>`;
    }
    const v = varaAtual();
    h += `</div><div class="numeros"><div><small>Calor</small><b>${calorTotal()}</b></div><div><small>Sorte</small><b>${sorteTotal()}%</b></div>
      <div><small>Fisgada</small><b>${Math.round((1 / v.vel - 1) * 100)}%</b></div><div><small>Força</small><b>${v.forca.toFixed(2).replace('.', ',')}</b></div>
      <div><small>Peixes pegos</small><b>${fmt(E.total.peixes)}</b></div><div><small>Moedas ganhas</small><b>${fmt(E.total.moedas)}</b></div></div></div>
      <p class="nota">Para vestir uma peça, abra o Cesto, escolha a peça e clique em Equipar.</p>`;
    return h;
  }
};

function descItem(it) {
  const p = [];
  if (it.tipo === 'peixe') p.push(RARIDADES[it.rar].nome + ' · ' + PONTOS.find(x => x.id === it.ponto).nome);
  if (it.calor) p.push(`<span class="bonus">+${it.calor} de calor</span>`);
  if (it.sorte) p.push(`<span class="bonus">+${it.sorte}% de sorte</span>`);
  if (it.vel && it.tipo === 'equip') p.push(`<span class="bonus">fisgada ${Math.round((1 / it.vel - 1) * 100)}% mais rápida</span>`);
  if (it.forca) p.push(`<span class="bonus">força ${it.forca.toFixed(2).replace('.', ',')}</span>`);
  if (it.pic) p.push(`<span class="bonus">minera ${Math.round((1 / it.pic - 1) * 100)}% mais rápido</span>`);
  if (it.tipo === 'isca') p.push(`<span class="bonus">fisgada mais rápida, +${it.sorte}% de sorte</span>`);
  if (it.ef) p.push(`<span class="bonus">${EFEITOS[it.ef[0]].fmt(it.ef[1])} por ${fmtTempo(it.ef[2])}</span>`);
  if (it.valor) p.push(`vale ${it.valor} moedas`);
  return p.join('<br>');
}

/* ===== ações ===== */
$('pCorpo').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, x = b.dataset.x, n = +b.dataset.n;
  initAudio();
  switch (a) {
    case 'faz': comecaEstacao(x, b.dataset.r, n); sfx.clique(); break;
    case 'parar': paraEstacao(x); break;
    case 'minera': E.mina.veio = x; E.mina.prog = 0; sfx.clique(); break;
    case 'paraMina': E.mina.veio = null; E.mina.prog = 0; break;
    case 'come': come(x); break;
    case 'viaja': viaja(x); break;
    case 'compraPonto': { const p = PONTOS.find(q => q.id === x); if (gasta(p.custo)) { E.pontos[x] = true; sfx.moeda(); viaja(x); } break; }
    case 'planta': planta(n, x); break;
    case 'colhe': { const r = colhe(n); if (r) aviso(`Colheu ${r.n} ${ITENS[r.id].nome.toLowerCase()}${r.minhocas ? ` e ${r.minhocas} minhoca${r.minhocas > 1 ? 's' : ''}` : ''}`); break; }
    case 'colheTudo': E.horta.forEach((c, i) => colhe(i)); break;
    case 'canteiro': { const pr = CANTEIRO_PRECO[E.horta.length]; if (gasta(pr)) { E.horta.push({ planta: null, desde: 0 }); sfx.moeda(); } break; }
    case 'sel': cestoSel = cestoSel === x ? null : x; sfx.clique(); break;
    case 'equipa': equipa(x); cestoSel = null; break;
    case 'tira': desequipa(x); sfx.equipa(); break;
    case 'vende': vende(x, n); if (!tem(x)) cestoSel = null; break;
    case 'vendeTipo': for (const id of Object.keys(E.inv)) if (ITENS[id] && ITENS[id].tipo === x) vende(id, qtd(id)); break;
    case 'compra': if (gasta(ITENS[x].compra * n)) { da(x, n); sfx.moeda(); } break;
  }
  marcaMudou(); salvar();
});

function viaja(id) {
  const p = PONTOS.find(q => q.id === id);
  if (calorTotal() < p.calor) { aviso('Frio demais! Precisa de ' + p.calor + ' de calor.'); return; }
  E.ponto = id; recolhe(); $('hLocal').textContent = p.nome;
  PE.ativo = PE.atraca = false;
  fechaPainel();
  aviso(`Você chegou em <b>${p.nome}</b>`);
}

/* ===== dica ao passar o mouse ===== */
document.addEventListener('pointerover', e => {
  const el = e.target.closest('[data-item]'), d = $('dica');
  if (!el) { d.hidden = true; return; }
  const it = ITENS[el.dataset.item]; if (!it) return;
  d.innerHTML = `<b ${it.rar ? `style="color:${RARIDADES[it.rar].cor}"` : ''}>${it.nome}</b><em>${descItem(it)}</em>`;
  d.hidden = false;
  const r = el.getBoundingClientRect();
  d.style.left = Math.min(innerWidth - d.offsetWidth - 8, r.right + 6) + 'px';
  d.style.top = Math.min(innerHeight - d.offsetHeight - 8, r.top) + 'px';
});

/* ===== barras que andam todo quadro ===== */
function atualizaBarras() {
  if (!painelAberto) return;
  const c = $('pCorpo');
  for (const el of c.querySelectorAll('[data-prog]')) {
    const k = el.dataset.prog; let f = 0;
    if (k === 'mina' && E.mina.veio) f = E.mina.prog / tempoVeio(VEIOS.find(v => v.id === E.mina.veio));
    else if (k === 'cozinha' || k === 'forja') { const S = E[k]; if (S.rec) f = S.prog / ESTACOES[k].rec(S.rec).tempo; }
    else if (k.startsWith('horta')) f = prontoCanteiro(E.horta[+k.slice(5)] || {});
    el.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + '%';
  }
  for (const el of c.querySelectorAll('[data-falta]')) {
    const cc = E.horta[+el.dataset.falta]; if (!cc || !cc.planta) continue;
    el.textContent = fmtTempo(plantaDe(cc.planta).tempo * (1 - prontoCanteiro(cc)));
    if (prontoCanteiro(cc) >= 1) marcaMudou();
  }
}

$('pFechar').addEventListener('click', fechaPainel);
$('painel').addEventListener('pointerdown', e => { if (e.target === $('painel')) fechaPainel(); });
document.querySelectorAll('#doca button').forEach(b => b.addEventListener('click', () => { initAudio(); abrePainel(b.dataset.p); }));
