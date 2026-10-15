'use strict';

/* ================= painéis: as janelas que abrem por cima do mundo =================
   Cada ofício só abre no lugar dele: a barraca no balcão do píer, a fogueira (cozinha) e a escolha de sementes
   (plantar) na fazenda, sempre com o E. O cesto, a ficha e o caderno de pesca abrem em qualquer lugar (I, F e P).
   Mina e forja ainda não têm lugar no mundo: os painéis delas ficam aqui guardados, sem botão que os abra.
   Cada painel é uma função que devolve HTML. Os botões levam data-a="ação" e os parâmetros em data-x / data-n, e um único
   ouvinte no corpo do painel resolve tudo. Quando o estado muda (marcaMudou), o painel aberto é redesenhado; as barras de
   progresso andam todo quadro sem redesenhar (atualizaBarras). */

let painelAberto = null;
let cestoSel = null;
let canteiroSel = 0;   // o canteiro em que o pescador apertou E para plantar

const TITULOS = { pesca: 'Pesca', fogueira: 'Fogueira', plantar: 'Plantar', mina: 'Mina', forja: 'Forja', cesto: 'Cesto', mercado: 'Barraca do pescador', ficha: 'Ficha' };
// onde cada painel de ofício pode abrir
const ONDE = {
  mercado: [() => naBarraca(), 'A loja fica na barraca do pescador, no píer à esquerda. Encoste o barco e aperte E.'],
  fogueira: [() => naFogueira(), 'Para cozinhar, vá até a fogueira, depois da fazenda, e aperte E.'],
  plantar: [() => canteiroPerto() >= 0, 'Para plantar, pare num canteiro da fazenda e aperte E.'],
  mina: [() => false, 'A mina ainda não tem lugar no mundo.'], forja: [() => false, 'A forja ainda não tem lugar no mundo.']
};

function abrePainel(nome) {
  if (painelAberto === nome) return fechaPainel();
  if (ONDE[nome] && !ONDE[nome][0]()) { aviso(ONDE[nome][1]); return; }
  painelAberto = nome;
  $('pTitulo').textContent = TITULOS[nome];
  $('painel').hidden = false; document.body.classList.add('com-painel');
  $('pCorpo').scrollTop = 0;
  document.querySelectorAll('#hud [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === nome));
  redesenhaPainel();
  try { sfx.select(); } catch (e) { }
}
function fechaPainel() {
  painelAberto = null; $('painel').hidden = true; document.body.classList.remove('com-painel'); $('dica').hidden = true;
  document.querySelectorAll('#hud [data-p]').forEach(b => b.classList.remove('on'));
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
      <span>${isca ? icoHtml(isca, 'sm') + ' ' + ITENS[isca].nome + ' ×' + qtd(isca) : 'Sem isca (compre na barraca do pescador)'}</span>
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

  // a fogueira: a panela (até PANELA_MAX ingredientes), o que sai dela, a despensa e o caderno de receitas
  fogueira() {
    let h = cabecalhoHab('culinaria');
    const S = E.cozinha, cozinhando = !!S.rec;
    if (cozinhando) {
      const pr = pratoDaPanela(S.ing);
      h += `<div class="trabalho">${icoHtml(pr.faz)}<div class="tinfo"><b>${pr.nome}${pr.n > 1 ? ' ×' + pr.n : ''}</b><small>${S.falta > 1 ? 'faltam ' + S.falta + ' · ' : ''}${fmtTempo(pr.tempo)} cada</small>
        <div class="bar prog"><i data-prog="cozinha"></i></div></div><button type="button" class="ghost sm" data-a="paraCozinha">Parar</button></div>`;
    } else {
      const ing = contaPanela(), pr = pratoDaPanela(ing);
      h += `<h3>Panela</h3><div class="panela">`;
      for (let i = 0; i < PANELA_MAX; i++) {
        const id = E.panela[i];
        h += id ? `<button type="button" class="slot" data-a="tiraPanela" data-n="${i}" data-item="${id}" aria-label="Tirar ${ITENS[id].nome}">${icoHtml(id)}</button>` : `<span class="slot vazio"></span>`;
      }
      h += `</div>`;
      if (pr) {
        const sabe = !pr.rec || E.receitas[pr.id], trava = pr.nivel > nv('culinaria'), mx = maxFaz(ing), it = ITENS[pr.faz];
        const desc = !sabe ? 'Uma combinação que você nunca fez. Cozinhe para descobrir!' : it.ef ? `${EFEITOS[it.ef[0]].fmt(it.ef[1])} por ${fmtTempo(it.ef[2])}` : `vira ${pr.n} ${it.nome.toLowerCase()}`;
        h += `<div class="resultado">${sabe ? icoHtml(pr.faz) : '<span class="misterio">?</span>'}<div><b>${sabe ? pr.nome + (pr.n > 1 ? ' ×' + pr.n : '') : 'Será uma receita?'}</b>
          <small class="${sabe && it.ef ? 'bonus' : ''}">${trava ? cadeado(pr.nivel, 'culinaria') : desc}</small><small>${fmtTempo(pr.tempo)} · ${pr.xp} xp</small></div>
          <div class="lbotoes">${trava ? '' : `<button type="button" class="sm" data-a="cozinha" data-n="1" ${mx < 1 ? 'disabled' : ''}>Cozinhar</button>
          ${mx > 1 ? `<button type="button" class="ghost sm" data-a="cozinha" data-n="${mx}">Fazer ${mx}</button>` : ''}`}
          <button type="button" class="ghost sm" data-a="esvazia">Esvaziar</button></div></div>`;
      } else h += `<p class="nota">Ponha na panela peixes e o que você colheu na fazenda (clique abaixo). Combinações certas viram receitas com efeitos melhores.</p>`;
      // ingredientes do cesto
      const ings = Object.keys(E.inv).filter(naPanelaPode).sort((a, b) => ITENS[a].tipo.localeCompare(ITENS[b].tipo) || ITENS[a].valor - ITENS[b].valor);
      h += `<h3>Ingredientes no cesto</h3>`;
      if (!ings.length) h += `<p class="nota">Nada para cozinhar. Pesque alguns peixes e colha alguma coisa na fazenda.</p>`;
      else {
        h += `<div class="slots">`;
        const usados = contaPanela();
        for (const id of ings) {
          const sobra = qtd(id) - (usados[id] || 0);
          h += `<button type="button" class="slot" data-a="poePanela" data-x="${id}" data-item="${id}" ${sobra < 1 || E.panela.length >= PANELA_MAX ? 'disabled' : ''} ${ITENS[id].rar ? `style="--rc:${RARIDADES[ITENS[id].rar].cor}"` : ''}>${icoHtml(id)}<span>${fmt(sobra)}</span></button>`;
        }
        h += `</div>`;
      }
    }
    // pratos prontos
    const pratos = Object.keys(E.inv).filter(id => ITENS[id] && ITENS[id].tipo === 'prato');
    if (pratos.length) {
      h += `<h3>Pratos no cesto</h3><div class="despensa">`;
      for (const id of pratos) { const it = ITENS[id]; h += `<div class="prato" data-item="${id}">${icoHtml(id)}<div><b>${it.nome} ×${qtd(id)}</b><small class="bonus">${EFEITOS[it.ef[0]].fmt(it.ef[1])} · ${fmtTempo(it.ef[2])}</small></div><button type="button" class="sm" data-a="come" data-x="${id}">Comer</button></div>`; }
      h += `</div>`;
    }
    // o caderno de receitas
    const sabidas = RECEITAS.filter(r => E.receitas[r.id]).length;
    h += `<h3>Caderno de receitas · ${sabidas}/${RECEITAS.length}</h3>`;
    for (const r of RECEITAS) {
      const sabe = E.receitas[r.id], trava = nv('culinaria') < r.nivel, faz = r.faz ? 'isca_milho' : r.id, it = ITENS[faz];
      if (sabe) {
        h += `<div class="linha"><span data-item="${faz}">${icoHtml(faz)}</span><div class="linfo"><b>${r.nome}${r.faz ? ' ×' + r.faz : ''}</b>
          <small class="bonus">${it.ef ? EFEITOS[it.ef[0]].fmt(it.ef[1]) + ' por ' + fmtTempo(it.ef[2]) : 'isca para pescar'}</small><div class="chips">${chipsIng(r.ing)}</div></div>
          <div class="lbotoes"><button type="button" class="ghost sm" data-a="receita" data-x="${r.id}" ${cozinhando || !temTodos(r.ing) ? 'disabled' : ''}>Pôr na panela</button></div></div>`;
      } else {
        h += `<div class="linha ${trava ? 'travada' : ''}"><span class="misterio">?</span><div class="linfo"><b>???</b>
          <small>${trava ? cadeado(r.nivel, 'culinaria') : 'Dica: ' + dicaReceita(r)}</small></div><div></div></div>`;
      }
    }
    return h;
  },

  // escolher a semente do canteiro em que o pescador parou
  plantar() {
    let h = cabecalhoHab('cultivo');
    const opcoes = PLANTAS.filter(p => tem('sem_' + p.id) && nv('cultivo') >= p.nivel);
    h += `<p class="nota">Canteiro ${canteiroSel + 1}. Depois de plantar, aperte E de novo no canteiro para <b>regar</b>: molhado, ele cresce ${String(REGA.mult).replace('.', ',')} vezes mais rápido até secar. As plantas crescem até com o jogo fechado.</p>`;
    if (!opcoes.length) h += `<p class="nota">Você não tem sementes. A dona Lurdes vende na barraca do pescador.</p>`;
    else {
      h += `<h3>Suas sementes</h3><div class="loja">`;
      for (const p of opcoes) h += `<div class="oferta" data-item="sem_${p.id}">${icoHtml('sem_' + p.id)}<b>${p.nome} <span class="nv">×${qtd('sem_' + p.id)}</span></b>
        <small>${fmtTempo(p.tempo)} sem regar · colhe ${p.colhe.join('–')}</small><button type="button" class="sm" data-a="planta" data-x="${p.id}">Plantar</button></div>`;
      h += `</div>`;
    }
    h += `<h3>O que dá para plantar</h3><div class="tabela">`;
    for (const p of PLANTAS) h += `<div class="${nv('cultivo') < p.nivel ? 'travada' : ''}">${icoHtml(p.id, 'sm')}<b>${p.nome}</b><small>${nv('cultivo') < p.nivel ? cadeado(p.nivel, 'cultivo') : fmtTempo(p.tempo) + ' · colhe ' + p.colhe.join('–') + ' · ' + p.xp + ' xp'}</small></div>`;
    return h + `</div>`;
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

  // a barraca do pescador, no píer: vende peixes por ouro e compra varas, iscas, sementes e melhorias do barco
  mercado() {
    const ouro = n => `${fmt(n)} ${icoHtml('ui:moeda', 'sm')}`;
    const botao = (a, x, n, preco, txt) => `<button type="button" class="sm" data-a="${a}" data-x="${x}" ${n != null ? `data-n="${n}"` : ''} ${E.moedas >= preco ? '' : 'disabled'}>${txt || ouro(preco)}</button>`;
    let h = `<p class="nota">A dona Lurdes compra seus peixes e vende o que um pescador precisa. Você tem <b class="ouro">${ouro(E.moedas)}</b></p>`;

    // vender peixes
    const peixes = Object.keys(E.inv).filter(id => ITENS[id] && ITENS[id].tipo === 'peixe').sort((a, b) => ITENS[b].valor - ITENS[a].valor);
    const totalPeixes = peixes.reduce((s, id) => s + ITENS[id].valor * qtd(id), 0);
    h += `<h3>Vender peixes</h3>`;
    if (!peixes.length) h += `<p class="nota">Nenhum peixe no cesto. Volte quando pescar alguma coisa.</p>`;
    else {
      h += `<div class="venda destaque"><b>Todos os peixes</b><small>${peixes.reduce((s, id) => s + qtd(id), 0)} peixes</small><button type="button" class="sm" data-a="vendeTipo" data-x="peixe">Vender por ${ouro(totalPeixes)}</button></div><div class="vendas">`;
      for (const id of peixes) {
        const it = ITENS[id];
        h += `<div class="venda peixe" data-item="${id}">${icoHtml(id, 'sm')}<b style="color:${RARIDADES[it.rar].cor}">${it.nome} ×${qtd(id)}</b><small>${it.valor} cada</small>
          <span class="lbotoes"><button type="button" class="ghost sm" data-a="vende" data-x="${id}" data-n="1">Vender 1</button><button type="button" class="ghost sm" data-a="vende" data-x="${id}" data-n="${qtd(id)}">Todos (${fmt(it.valor * qtd(id))})</button></span></div>`;
      }
      h += `</div>`;
    }

    // varas
    h += `<h3>Varas</h3><div class="loja">`;
    for (const v of VARAS_LOJA) {
      const trava = nv('pesca') < v.nivel, usando = E.equip.vara === v.id, noCesto = tem(v.id);
      let bt;
      if (usando) bt = `<button type="button" class="ghost sm" disabled>Equipada</button>`;
      else if (noCesto) bt = `<button type="button" class="sm" data-a="equipa" data-x="${v.id}">Equipar</button>`;
      else if (!trava) bt = botao('compraVara', v.id, null, v.preco);
      h += `<div class="oferta ${trava ? 'travada' : ''}" data-item="${v.id}">${icoHtml(v.id)}<b>${v.nome}</b>
        <small>${trava ? cadeado(v.nivel, 'pesca') : `fisgada ${Math.round((1 / v.vel - 1) * 100)}% · força ${v.forca.toFixed(2).replace('.', ',')} · sorte ${v.sorte}%`}</small>${bt || ''}</div>`;
    }
    h += `</div>`;

    // iscas
    h += `<h3>Iscas</h3><div class="loja">`;
    for (const [id, n, nivelMin] of ISCAS_LOJA) {
      const it = ITENS[id], preco = it.compra * n, trava = nv('pesca') < nivelMin;
      h += `<div class="oferta ${trava ? 'travada' : ''}" data-item="${id}">${icoHtml(id)}<b>${it.nome} ×${n}</b>
        <small>${trava ? cadeado(nivelMin, 'pesca') : `+${it.sorte}% de sorte · você tem ${qtd(id)}`}</small>${trava ? '' : botao('compra', id, n, preco)}</div>`;
    }
    h += `</div>`;

    // melhorias do barco
    h += `<h3>Melhorias do barco</h3><div class="loja">`;
    for (const u of UPGRADES_BARCO) {
      const n = E.barcoUp[u.id] || 0, max = u.precos.length, preco = u.precos[n];
      h += `<div class="oferta"><i class="ico" style="background-image:url(${icone(u.ico)})"></i><b>${u.nome} <span class="nv">${n}/${max}</span></b>
        <small>${n ? 'agora: ' + u.txt(n * u.por) : 'ainda não tem'}${n < max ? `<br>próximo: ${u.txt((n + 1) * u.por)}` : ''}</small>
        ${n < max ? botao('upBarco', u.id, null, preco) : `<button type="button" class="ghost sm" disabled>No máximo</button>`}</div>`;
    }
    h += `</div>`;

    // sementes para a fazenda
    h += `<h3>Sementes</h3><div class="loja">`;
    for (const p of PLANTAS) {
      const id = 'sem_' + p.id, it = ITENS[id], trava = nv('cultivo') < p.nivel;
      h += `<div class="oferta ${trava ? 'travada' : ''}" data-item="${id}">${icoHtml(id)}<b>${it.nome}</b><small>${trava ? cadeado(p.nivel, 'cultivo') : 'você tem ' + qtd(id)}</small>${trava ? '' : botao('compra', id, 1, it.compra)}</div>`;
    }

    // vender o resto
    h += `</div><h3>Vender outras coisas</h3><div class="vendas">`;
    for (const [tipo, nome] of [['cultivo', 'Toda a colheita'], ['prato', 'Todos os pratos'], ['minerio', 'Todos os minérios'], ['gema', 'Todas as gemas'], ['barra', 'Todas as barras']]) {
      const ids = Object.keys(E.inv).filter(id => ITENS[id] && ITENS[id].tipo === tipo);
      const total = ids.reduce((s, id) => s + ITENS[id].valor * qtd(id), 0);
      if (!total && !['cultivo', 'prato'].includes(tipo)) continue;   // minérios, gemas e barras só aparecem se tiver
      h += `<div class="venda"><b>${nome}</b><small>${ids.reduce((s, id) => s + qtd(id), 0)} itens</small><button type="button" class="ghost sm" data-a="vendeTipo" data-x="${tipo}" ${total ? '' : 'disabled'}>Vender por ${ouro(total)}</button></div>`;
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
      <div><small>Peixes pegos</small><b>${fmt(E.total.peixes)}</b></div><div><small>Ouro ganho</small><b>${fmt(E.total.moedas)}</b></div></div></div>
      <p class="nota">Para vestir uma peça, abra o Cesto, escolha a peça e clique em Equipar.</p>`;
    return h;
  }
};

// a dica de uma receita que o jogador ainda não fez: a colheita pelo nome, o peixe só pela raridade e pelo lugar
function dicaReceita(r) {
  return Object.entries(r.ing).map(([id, n]) => {
    const it = ITENS[id];
    if (it.tipo === 'peixe') return `${n} peixe${n > 1 ? 's' : ''} ${RARIDADES[it.rar].nome.toLowerCase()}${n > 1 ? 's' : ''} (${PONTOS.find(p => p.id === it.ponto).nome})`;
    return `${n} ${it.nome.toLowerCase()}`;
  }).join(' + ');
}

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
  if (it.valor) p.push(`vale ${it.valor} de ouro`);
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
    case 'planta': planta(canteiroSel, x); fechaPainel(); aviso(`Plantou ${ITENS[x].nome.toLowerCase()}. Aperte E para regar.`); break;
    case 'poePanela': if (E.panela.length < PANELA_MAX && naPanelaPode(x) && qtd(x) > (contaPanela()[x] || 0)) { E.panela.push(x); sfx.clique(); } break;
    case 'tiraPanela': E.panela.splice(n, 1); sfx.clique(); break;
    case 'esvazia': E.panela = []; break;
    case 'receita': { const r = RECEITAS.find(q => q.id === x); E.panela = Object.entries(r.ing).flatMap(([id, k]) => Array(k).fill(id)); sfx.clique(); break; }
    case 'cozinha': cozinha(n); break;
    case 'paraCozinha': paraCozinha(); break;
    case 'sel': cestoSel = cestoSel === x ? null : x; sfx.clique(); break;
    case 'equipa': equipa(x); cestoSel = null; break;
    case 'tira': desequipa(x); sfx.equipa(); break;
    case 'vende': vende(x, n); if (!tem(x)) cestoSel = null; break;
    case 'vendeTipo': for (const id of Object.keys(E.inv)) if (ITENS[id] && ITENS[id].tipo === x) vende(id, qtd(id)); break;
    case 'compra': if (gasta(ITENS[x].compra * n)) { da(x, n); sfx.moeda(); } break;
    case 'compraVara': if (gasta(ITENS[x].compra)) { da(x); equipa(x); aviso(`Você comprou a ${ITENS[x].nome.toLowerCase()}!`); } break;
    case 'upBarco': {
      const u = UPGRADES_BARCO.find(q => q.id === x), nv = E.barcoUp[x] || 0;
      if (nv < u.precos.length && gasta(u.precos[nv])) { E.barcoUp[x] = nv + 1; sfx.martelo(); aviso(`${u.nome} melhorado: ${u.txt((nv + 1) * u.por)}`); }
      break;
    }
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
    else if (k === 'cozinha') { const S = E.cozinha; if (S.rec) f = S.prog / pratoDaPanela(S.ing).tempo; }
    else if (k === 'forja') { const S = E.forja; if (S.rec) f = S.prog / ESTACOES.forja.rec(S.rec).tempo; }
    el.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + '%';
  }
}

$('pFechar').addEventListener('click', fechaPainel);
$('painel').addEventListener('pointerdown', e => { if (e.target === $('painel')) fechaPainel(); });
document.querySelectorAll('#hud [data-p]').forEach(b => b.addEventListener('click', () => { initAudio(); abrePainel(b.dataset.p); }));
