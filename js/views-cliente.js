'use strict';
/* =========================================================================
   TELAS DO CLIENTE: home, cardápio, produto, carrinho, checkout, contato,
   erros e estados vazios.
   ========================================================================= */

/* ---------- componentes pequenos ---------- */
Views.vazio = (t, d = '', href = '', cta = '') => `<div class="vazio"><div class="vazio-ic" aria-hidden="true"><i></i></div><h2>${esc(t)}</h2>${d ? `<p class="suave">${esc(d)}</p>` : ''}${cta ? `<a class="btn" href="${href}">${esc(cta)}</a>` : ''}</div>`;
Views.carregando = () => '<div class="col" aria-busy="true" aria-label="Carregando"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>';
Views.naoEncontrado = () => `<div class="vazio"><h1>404</h1><h2>Página não encontrada</h2><p class="suave">O endereço não existe ou foi movido.</p><a class="btn" href="#/">Voltar ao início</a></div>`;
Views.acessoNegado = () => `<div class="vazio"><h1>Acesso negado</h1><p class="suave">Esta área é só para administradores. Entre com uma conta de administrador para continuar.</p><div class="row quebra"><a class="btn out" href="#/">Voltar ao site</a><button class="btn" data-act="sair">Sair e trocar de conta</button></div></div>`;
Views.cartaoAval = a => `<article class="card col"><div class="row between"><strong>${esc(a.nome)}</strong><span class="estrela" aria-label="Nota ${a.nota} de 5">${UI.stars(a.nota)}</span></div><p class="suave">${esc(a.texto)}</p><p class="peq suave">${fmtData(a.em)}</p></article>`;
Views.mapa = L => { const d = 0.012; return `<iframe class="mapa" title="Mapa com a localização da loja" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${(L.lng - d * 1.6).toFixed(5)}%2C${(L.lat - d).toFixed(5)}%2C${(L.lng + d * 1.6).toFixed(5)}%2C${(L.lat + d).toFixed(5)}&layer=mapnik&marker=${L.lat}%2C${L.lng}"></iframe>`; };

/* ---------- cardápio: lista, busca e filtros ---------- */
const Menu = {
  estado: { q: '', cat: 'todas', ord: 'pop', disp: false },
  itens() {
    const out = [];
    DB.get('produtos', []).filter(p => p.ativo).forEach(p => (p.tamanhos && p.tamanhos.length ? p.tamanhos : [{ nome: '', preco: p.preco || 0 }])
      .forEach((t, i) => out.push({ p, i, nome: (p.nome + ' ' + t.nome).trim(), preco: Number(t.preco), desc: p.descricao, esgotado: p.estoque <= 0 })));
    return out;
  },
  filtrar() {
    const { q, cat, ord, disp } = this.estado, n = q.trim().toLowerCase(); let l = this.itens();
    if (n) l = l.filter(x => (x.nome + ' ' + x.desc).toLowerCase().includes(n));
    if (cat !== 'todas') l = l.filter(x => x.p.categoria === cat);
    if (disp) l = l.filter(x => !x.esgotado);
    if (ord === 'menor') l.sort((a, b) => a.preco - b.preco);
    if (ord === 'maior') l.sort((a, b) => b.preco - a.preco);
    return l;
  },
  cartao(x) {
    const url = `#/produto/${x.p.id}?t=${x.i}`;
    return `<article class="card item"><a class="mini" href="${url}" aria-label="Ver ${esc(x.nome)}">${Layout.foto(x.p, x.nome)}</a>
      <div class="grow"><a class="neg" href="${url}">${esc(x.nome)}</a><p class="suave peq">${esc(x.desc)}</p><p class="preco">${R$(x.preco)}</p></div>
      ${x.esgotado ? '<span class="badge b-erro">Esgotado</span>' : `<button class="add" data-act="add-rapido" data-id="${x.p.id}" data-t="${x.i}" aria-label="Adicionar ${esc(x.nome)} ao carrinho">+</button>`}</article>`;
  },
  chips() {
    const cats = DB.get('categorias', []).filter(c => c.ativa), e = this.estado;
    return [{ id: 'todas', nome: 'Todos' }, ...cats].map(c => `<button class="chip ${e.cat === c.id ? 'on' : ''}" data-act="menu-cat" data-id="${esc(c.id)}">${esc(c.nome)}</button>`).join('');
  },
  lista() { const l = this.filtrar(); return l.length ? l.map(this.cartao).join('') : Views.vazio('Nenhum item encontrado', 'Tente outra palavra ou volte para "Todos".'); },
  atualizar() { $('#menu-lista').innerHTML = this.lista(); $('#chips').innerHTML = this.chips(); $('#menu-cont').textContent = this.filtrar().length + ' itens'; }
};
Actions['menu-busca'] = el => { Menu.estado.q = el.value; Menu.atualizar(); };
Actions['menu-cat'] = el => { Menu.estado.cat = el.dataset.id; Menu.atualizar(); };
Actions['menu-ord'] = el => { Menu.estado.ord = el.value; Menu.atualizar(); };
Actions['menu-disp'] = el => { Menu.estado.disp = el.checked; Menu.atualizar(); };
Actions['add-rapido'] = el => {
  const p = DB.get('produtos', []).find(x => x.id === Number(el.dataset.id)), t = p.tamanhos[Number(el.dataset.t)];
  Cart.add({ produtoId: p.id, nome: `${p.nome} ${t.nome}`.trim(), tamanho: t.nome, adicionais: [], adicionaisIds: [], complementos: [], qtd: 1, unit: Number(t.preco) });
  UI.toast(`${p.nome} ${t.nome} adicionado ao carrinho.`);
};

Views.cardapio = () => {
  const e = Menu.estado;
  return `<h1>Cardápio</h1><div class="col" style="margin-top:16px">
    <label class="campo"><span class="sr">Buscar no cardápio</span><input type="search" value="${esc(e.q)}" placeholder="Buscar açaí, tamanho ou descrição" data-input="menu-busca"></label>
    <div class="chips" id="chips">${Menu.chips()}</div>
    <div class="row between quebra">
      <label class="row peq suave">Ordenar por <select data-change="menu-ord" style="width:auto;min-height:40px"><option value="pop" ${e.ord === 'pop' ? 'selected' : ''}>Mais pedidos</option><option value="menor" ${e.ord === 'menor' ? 'selected' : ''}>Menor preço</option><option value="maior" ${e.ord === 'maior' ? 'selected' : ''}>Maior preço</option></select></label>
      <label class="row peq"><input type="checkbox" data-change="menu-disp" ${e.disp ? 'checked' : ''}> Só disponíveis</label>
    </div>
    <p class="peq suave" id="menu-cont">${Menu.filtrar().length} itens</p>
    <div class="grid" id="menu-lista">${Menu.lista()}</div></div>`;
};

/* ---------- home ---------- */
Views.home = () => {
  const L = Loja.dados(), pop = Menu.itens().filter(x => x.p.popular).slice(0, 3), av = DB.get('avaliacoes', []).filter(a => a.visivel).slice(0, 2);
  return `<section class="hero"><div class="col">
      <span class="badge ${L.aberta ? 'b-ok' : 'b-erro'}" style="align-self:flex-start">${L.aberta ? `Aberto agora, das ${hh(L.abre)} às ${hh(L.fecha)}` : 'Fechado no momento'}</span>
      <h1>Açaí cremoso, feito com carinho.</h1>
      <p class="suave">Monte o seu do jeito que gosta e acompanhe o pedido até a porta de casa, em ${esc(L.cidade)}.</p>
      <div class="row quebra"><a class="btn" href="#/cardapio">Faça seu pedido</a><a class="btn out" href="#/contato">Como chegar</a></div></div>
    <div class="hero-logo"><img src="assets/img/logo.jpg" alt="Logo Açaí da Jessy com um copo de açaí"></div></section>
    ${L.promocao && L.promocao.ativa ? `<section class="promo"><p class="peq neg">${esc(L.promocao.titulo)}</p><p class="promo-t">${esc(L.promocao.texto)}</p><p class="peq">${esc(L.promocao.obs)}</p></section>` : ''}
    <section class="secao"><div class="row between"><h2>Mais pedidos</h2><a class="roxo neg peq" href="#/cardapio">Ver cardápio completo</a></div>
      <div class="grid g3">${pop.map(Menu.cartao).join('') || Views.vazio('Cardápio em breve', 'Estamos preparando as novidades.')}</div></section>
    <section class="secao"><h2>Nossa história</h2><p class="suave" style="max-width:68ch">${esc(L.historia)}</p></section>
    ${av.length ? `<section class="secao"><div class="row between"><h2>O que dizem os clientes</h2><a class="roxo neg peq" href="#/contato">Ver todas</a></div><div class="grid">${av.map(Views.cartaoAval).join('')}</div></section>` : ''}`;
};

/* ---------- detalhes do produto ---------- */
Views.produto = ({ id }, q) => {
  const p = DB.get('produtos', []).find(x => x.id === Number(id) && x.ativo); if (!p) return Views.naoEncontrado();
  const ti = Math.min(Number(q.t) || 0, p.tamanhos.length - 1), t0 = p.tamanhos[ti];
  const ads = DB.get('adicionais', []).filter(a => a.ativo), cps = DB.get('complementos', []).filter(c => c.ativo);
  return `<a class="btn out sm" href="#/cardapio">Voltar ao cardápio</a>
  <div class="layout2" style="margin-top:16px"><div class="prod-foto">${Layout.foto(p)}</div>
  <form class="col" data-form="add-carrinho" data-change="prod-calc" novalidate>
    <input type="hidden" name="produtoId" value="${p.id}">
    <div><h1>${esc(p.nome)}</h1><p class="suave">${esc(p.descricao)}</p></div>
    <fieldset class="col"><legend>Tamanho</legend>${p.tamanhos.map((t, i) => `<label class="opcao"><span><input type="radio" name="t" value="${i}" ${i === ti ? 'checked' : ''}> ${esc(t.nome)}</span><span class="preco">${R$(t.preco)}</span></label>`).join('')}</fieldset>
    ${ads.length ? `<fieldset class="col"><legend>Adicionais</legend>${ads.map(a => `<label class="opcao"><span><input type="checkbox" name="ad" value="${esc(a.id)}" ${a.estoque <= 0 ? 'disabled' : ''}> ${esc(a.nome)}${a.estoque <= 0 ? ' (esgotado)' : ''}</span><span class="preco">+ ${R$(a.preco)}</span></label>`).join('')}</fieldset>` : ''}
    ${cps.length ? `<fieldset class="col"><legend>Complementos, até <span id="max-cp">${t0.acomp ?? 3}</span> sem custo</legend>${cps.map(c => `<label class="opcao"><span><input type="checkbox" name="cp" value="${esc(c.nome)}"> ${esc(c.nome)}</span></label>`).join('')}</fieldset>` : ''}
    <div class="barra-fixa">
      <div class="stepper"><button type="button" data-act="prod-qtd" data-d="-1" aria-label="Diminuir quantidade">−</button><output id="qtd-out">1</output><input type="hidden" name="qtd" value="1"><button type="button" data-act="prod-qtd" data-d="1" aria-label="Aumentar quantidade">+</button></div>
      ${p.estoque <= 0 ? '<span class="badge b-erro">Esgotado</span>' : `<button class="btn grow">Adicionar ao carrinho, <span id="prod-total">${R$(t0.preco)}</span></button>`}
    </div></form></div>`;
};
Actions['prod-calc'] = (form, e) => {
  const p = DB.get('produtos', []).find(x => x.id === Number(form.elements.produtoId.value)); if (!p) return;
  const t = p.tamanhos[Number(form.elements.t.value)], max = t.acomp ?? 3;
  if (e && e.target && e.target.name === 'cp' && $$('[name=cp]:checked', form).length > max) { e.target.checked = false; UI.toast(`Este tamanho leva até ${max} complementos.`, 'erro'); }
  const ads = DB.get('adicionais', []), extra = $$('[name=ad]:checked', form).reduce((s, c) => s + Number((ads.find(a => a.id === c.value) || {}).preco || 0), 0);
  $('#prod-total').textContent = R$((Number(t.preco) + extra) * Number(form.elements.qtd.value));
  const m = $('#max-cp'); if (m) m.textContent = max;
};
Actions['prod-qtd'] = el => {
  const f = el.closest('form'), q = Math.min(20, Math.max(1, Number(f.elements.qtd.value) + Number(el.dataset.d)));
  f.elements.qtd.value = q; $('#qtd-out').textContent = q; Actions['prod-calc'](f);
};
Forms['add-carrinho'] = (d, f, fd) => {
  const p = DB.get('produtos', []).find(x => x.id === Number(d.produtoId)), t = p.tamanhos[Number(d.t)], max = t.acomp ?? 3;
  const ads = DB.get('adicionais', []).filter(a => fd.getAll('ad').includes(a.id)), cps = fd.getAll('cp'), qtd = Number(d.qtd) || 1;
  if (cps.length > max) return UI.toast(`Escolha até ${max} complementos para este tamanho.`, 'erro');
  if (p.estoque < qtd) return UI.toast('Não temos estoque suficiente deste produto.', 'erro');
  Cart.add({ produtoId: p.id, nome: `${p.nome} ${t.nome}`.trim(), tamanho: t.nome, adicionais: ads.map(a => a.nome), adicionaisIds: ads.map(a => a.id), complementos: cps, qtd, unit: Number(t.preco) + ads.reduce((s, a) => s + Number(a.preco), 0) });
  UI.modal(`<h2>Adicionado ao carrinho</h2><p class="suave">${esc(p.nome)} ${esc(t.nome)} já está no seu carrinho.</p><div class="row quebra"><a class="btn out grow" href="#/cardapio">Continuar escolhendo</a><a class="btn grow" href="#/carrinho">Ver carrinho</a></div>`, 'Adicionado ao carrinho');
};

/* ---------- carrinho ---------- */
const extrasTxt = i => [...i.adicionais.map(a => '+ ' + a), ...i.complementos].join(', ');
Views.carrinho = () => {
  const its = Cart.items();
  if (!its.length) return '<h1>Carrinho</h1>' + Views.vazio('Seu carrinho está vazio', 'Escolha seu açaí no cardápio.', '#/cardapio', 'Ver cardápio');
  const e = Entrega.get(), bs = DB.get('bairros', []).filter(b => b.ativo), sub = Cart.subtotal(), taxa = Entrega.taxa();
  return `<h1>Carrinho</h1><div class="layout2" style="margin-top:16px">
    <div class="col">${its.map((i, idx) => `<article class="card item"><div class="grow"><p class="neg">${esc(i.nome)}</p>${extrasTxt(i) ? `<p class="suave peq">${esc(extrasTxt(i))}</p>` : ''}<p class="preco">${R$(i.unit * i.qtd)}</p></div>
      <div class="col" style="align-items:flex-end"><div class="stepper"><button data-act="cart-qtd" data-i="${idx}" data-d="-1" aria-label="Diminuir quantidade de ${esc(i.nome)}">−</button><output>${i.qtd}</output><button data-act="cart-qtd" data-i="${idx}" data-d="1" aria-label="Aumentar quantidade de ${esc(i.nome)}">+</button></div><button class="chip" data-act="cart-rem" data-i="${idx}">Remover</button></div></article>`).join('')}</div>
    <aside class="card col resumo"><h2>Resumo</h2>
      <div class="grid2" data-change="ent-set"><label class="opcao"><span>Entrega</span><input type="radio" name="tipo" value="entrega" ${e.tipo === 'entrega' ? 'checked' : ''}></label><label class="opcao"><span>Retirada</span><input type="radio" name="tipo" value="retirada" ${e.tipo === 'retirada' ? 'checked' : ''}></label>
        <label class="campo" style="grid-column:1/-1" ${e.tipo !== 'entrega' ? 'hidden' : ''}>Bairro de entrega<select name="bairro">${bs.map(b => `<option value="${b.id}" ${b.id === e.bairroId ? 'selected' : ''}>${esc(b.nome)}, ${R$(b.taxa)}</option>`).join('')}</select></label></div>
      ${e.tipo === 'entrega' && !bs.length ? '<p class="erro-txt">Não há bairros de entrega cadastrados. Escolha retirada ou fale com a loja.</p>' : ''}
      <div class="lin-r"><span>Subtotal</span><span>${R$(sub)}</span></div>
      <div class="lin-r"><span>Taxa de entrega</span><span>${e.tipo === 'entrega' ? R$(taxa) : 'Grátis'}</span></div>
      <div class="lin-r total"><span>Total</span><span>${R$(sub + taxa)}</span></div>
      <a class="btn bloco" href="#/checkout">Ir para o checkout</a></aside></div>`;
};
Actions['cart-qtd'] = el => { const i = Number(el.dataset.i), it = Cart.items()[i]; if (it) { Cart.setQty(i, it.qtd + Number(el.dataset.d)); Router.render(true); } };
Actions['cart-rem'] = el => { Cart.setQty(Number(el.dataset.i), 0); Router.render(true); UI.toast('Item removido.'); };
Actions['ent-set'] = el => { const b = $('[name=bairro]', el); Entrega.set({ tipo: $('[name=tipo]:checked', el).value, bairroId: b && b.value ? Number(b.value) : null }); Router.render(true); };

/* ---------- checkout ---------- */
Views.checkout = () => {
  const its = Cart.items(); if (!its.length) return Views.vazio('Nada para finalizar', 'Adicione itens ao carrinho primeiro.', '#/cardapio', 'Ver cardápio');
  const u = Auth.user(), L = Loja.dados(), e = Entrega.get(), bs = DB.get('bairros', []).filter(b => b.ativo), ends = u.enderecos || [], sub = Cart.subtotal(), taxa = Entrega.taxa();
  return `<h1>Finalizar pedido</h1>
  ${!L.aberta ? '<div class="alerta erro" style="margin-top:12px">A loja está fechada agora. Você pode enviar o pedido, mas ele só será confirmado quando abrirmos.</div>' : ''}
  <form class="layout2" style="margin-top:16px" data-form="checkout" data-change="chk-calc" novalidate>
  <div class="col">
    <section class="card col"><h2>Seus dados</h2><div class="grid2"><label class="campo">Nome<input name="nome" required value="${esc(u.nome)}" autocomplete="name"></label><label class="campo">Telefone com DDD<input name="telefone" type="tel" required value="${esc(u.telefone)}" autocomplete="tel" placeholder="(51) 99999-9999"></label></div></section>
    <section class="card col"><h2>Entrega ou retirada</h2>
      <div class="grid2"><label class="opcao"><span>Entrega</span><input type="radio" name="tipo" value="entrega" ${e.tipo === 'entrega' ? 'checked' : ''}></label><label class="opcao"><span>Retirada na loja</span><input type="radio" name="tipo" value="retirada" ${e.tipo === 'retirada' ? 'checked' : ''}></label></div>
      <div id="bloco-entrega" class="col" ${e.tipo !== 'entrega' ? 'hidden' : ''}>
        ${ends.length ? `<label class="campo">Endereço salvo<select name="salvo"><option value="">Usar um novo endereço</option>${ends.map(a => `<option value="${a.id}">${esc(a.rotulo)}: ${esc(a.rua)}, ${esc(a.numero)}</option>`).join('')}</select></label>` : ''}
        <label class="campo">Bairro<select name="bairro">${bs.map(b => `<option value="${b.id}" ${b.id === e.bairroId ? 'selected' : ''}>${esc(b.nome)}, ${R$(b.taxa)}</option>`).join('')}</select></label>
        <div class="grid2"><label class="campo">Rua<input name="rua" autocomplete="address-line1"></label><label class="campo">Número<input name="numero" inputmode="numeric"></label></div>
        <label class="campo">Complemento ou referência<input name="complemento"></label>
        <label class="opcao"><span>Salvar este endereço na minha conta</span><input type="checkbox" name="salvar"></label>
      </div>
      <p id="bloco-retirada" class="suave" ${e.tipo === 'entrega' ? 'hidden' : ''}>Retire na loja: ${esc(L.endereco)}</p></section>
    <section class="card col"><h2>Pagamento</h2>
      <div class="grid2"><label class="opcao"><span>Pix</span><input type="radio" name="pagamento" value="pix" checked></label><label class="opcao"><span>Dinheiro</span><input type="radio" name="pagamento" value="dinheiro"></label></div>
      <label class="campo" id="bloco-troco" hidden>Troco para quanto? (opcional)<input name="troco" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ex.: 50"></label></section>
    <label class="campo">Observações do pedido<textarea name="obs" maxlength="200" placeholder="Ex.: sem granola"></textarea></label>
  </div>
  <aside class="card col resumo"><h2>Seu pedido</h2>
    ${its.map(i => `<div class="lin-r"><span>${i.qtd}x ${esc(i.nome)}</span><span>${R$(i.unit * i.qtd)}</span></div>`).join('')}
    <div class="lin-r"><span>Subtotal</span><span>${R$(sub)}</span></div>
    <div class="lin-r"><span>Taxa de entrega</span><span id="chk-taxa">${e.tipo === 'entrega' ? R$(taxa) : 'Grátis'}</span></div>
    <div class="lin-r total"><span>Total</span><span id="chk-total">${R$(sub + taxa)}</span></div>
    <p class="erro-txt" id="chk-erro" role="alert" hidden></p>
    <button class="btn bloco">Confirmar pedido</button>
    <p class="peq suave">Ao confirmar, salvamos o pedido e abrimos o WhatsApp da loja com a mensagem pronta.</p></aside></form>`;
};
Actions['chk-calc'] = (form, e) => {
  const bs = DB.get('bairros', []);
  if (e && e.target.name === 'salvo') {
    const a = (Auth.user().enderecos || []).find(x => x.id === Number(e.target.value)), b0 = a && bs.find(x => x.nome === a.bairro);
    if (a) { form.elements.rua.value = a.rua; form.elements.numero.value = a.numero; form.elements.complemento.value = a.complemento || ''; if (b0) form.elements.bairro.value = b0.id; }
  }
  const tipo = $('[name=tipo]:checked', form).value, b = bs.find(x => x.id === Number(form.elements.bairro.value)), taxa = tipo === 'entrega' && b ? Number(b.taxa) : 0;
  $('#bloco-entrega').hidden = tipo !== 'entrega'; $('#bloco-retirada').hidden = tipo === 'entrega';
  $('#bloco-troco').hidden = $('[name=pagamento]:checked', form).value !== 'dinheiro';
  Entrega.set({ tipo, bairroId: b ? b.id : null });
  $('#chk-taxa').textContent = tipo === 'entrega' ? R$(taxa) : 'Grátis'; $('#chk-total').textContent = R$(Cart.subtotal() + taxa);
};
Forms.checkout = d => {
  const its = Cart.items(), u = Auth.user(), tipo = d.tipo, b = DB.get('bairros', []).find(x => x.id === Number(d.bairro)), falha = m => erro('#chk-erro', m);
  if (!its.length) return Router.ir('/carrinho');
  if (d.nome.trim().length < 2) return falha('Informe seu nome.');
  if (soDigitos(d.telefone).length < 10) return falha('Informe o telefone com DDD, por exemplo (51) 99999-9999.');
  if (tipo === 'entrega' && !(b && d.rua.trim() && d.numero.trim())) return falha('Preencha bairro, rua e número para a entrega.');
  const taxa = tipo === 'entrega' ? Number(b.taxa) : 0, subtotal = Cart.subtotal(), total = subtotal + taxa, troco = Number(d.troco) || 0;
  if (d.pagamento === 'dinheiro' && troco && troco < total) return falha(`O valor do troco precisa ser maior que o total de ${R$(total)}.`);
  const prods = DB.get('produtos', []);
  for (const i of its) { const p = prods.find(x => x.id === i.produtoId); if (!p || p.estoque < i.qtd) return falha(`"${i.nome}" não está disponível na quantidade pedida. Ajuste o carrinho.`); }
  const endereco = tipo === 'entrega' ? [d.rua.trim(), d.numero.trim()].join(', ') + (d.complemento ? ` (${d.complemento.trim()})` : '') : '';
  const p = Pedidos.criar({ clienteId: u.id, clienteNome: d.nome.trim(), telefone: d.telefone.trim(), itens: its.map(({ key, ...i }) => i),
    entrega: { tipo, bairro: tipo === 'entrega' ? b.nome : '', endereco }, pagamento: { forma: d.pagamento, troco: d.pagamento === 'dinheiro' ? troco : 0 }, subtotal, taxa, total, obs: (d.obs || '').trim() });
  if (d.salvar && tipo === 'entrega') {
    const ends = u.enderecos || []; u.enderecos = [...ends, { id: DB.nextId(ends), rotulo: 'Endereço ' + (ends.length + 1), rua: d.rua.trim(), numero: d.numero.trim(), bairro: b.nome, complemento: (d.complemento || '').trim() }]; Auth.salvarUsuario(u);
  }
  Cart.clear(); window.open(Pedidos.linkWhats(p), '_blank', 'noopener');
  Router.ir('/pedido/' + p.id + '?novo=1');
};

/* ---------- contato, localização, perguntas e avaliações ---------- */
Views.contato = () => {
  const L = Loja.dados(), av = DB.get('avaliacoes', []).filter(a => a.visivel), faq = DB.get('faq', []);
  const media = av.length ? (av.reduce((s, a) => s + a.nota, 0) / av.length).toFixed(1).replace('.', ',') : '';
  return `<h1>Contato e localização</h1>
  <div class="layout2" style="margin-top:16px"><div class="col">
    <section class="card col"><h2>Fale com a gente</h2>
      <p><span class="neg">Horário:</span> ${hh(L.abre)} às ${hh(L.fecha)}.</p><p><span class="neg">Endereço:</span> ${esc(L.endereco)}, ${esc(L.cidade)}.</p>
      <div class="row quebra"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(L.whatsapp)}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}">Chamar no WhatsApp</a><a class="btn out" target="_blank" rel="noopener" href="https://instagram.com/${esc(L.instagram)}">@${esc(L.instagram)}</a></div></section>
    <section class="col"><h2>Perguntas frequentes</h2>${faq.map(f => `<details class="faq"><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('')}</section>
  </div><div class="col">${Views.mapa(L)}<a class="btn out sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${L.lat},${L.lng}">Abrir no Google Maps</a></div></div>
  <section class="secao"><div class="row between quebra"><h2>Avaliações${media ? ` <span class="estrela">${media} de 5</span>` : ''}</h2><button class="btn out sm" data-act="avaliar">Deixar avaliação</button></div>
    <div class="grid g3">${av.length ? av.map(Views.cartaoAval).join('') : Views.vazio('Ainda sem avaliações', 'Seja a primeira pessoa a avaliar.')}</div></section>`;
};
Actions.avaliar = el => {
  if (!Auth.user()) { sessionStorage.setItem('acai:voltar', location.hash); return Router.ir('/login'); }
  UI.modal(`<h2>Deixe sua avaliação</h2><form class="col" data-form="avaliar"><input type="hidden" name="pedidoId" value="${esc(el.dataset.pedido || 0)}">
    <label class="campo">Nota<select name="nota"><option value="5">5 estrelas, excelente</option><option value="4">4 estrelas, muito bom</option><option value="3">3 estrelas, bom</option><option value="2">2 estrelas, regular</option><option value="1">1 estrela, ruim</option></select></label>
    <label class="campo">Comentário<textarea name="texto" required maxlength="300" placeholder="Conte como foi o seu pedido"></textarea></label><button class="btn">Enviar avaliação</button></form>`, 'Avaliação');
};
Forms.avaliar = d => {
  const l = DB.get('avaliacoes', []), u = Auth.user();
  l.unshift({ id: DB.nextId(l), nome: u.nome, nota: Number(d.nota), texto: d.texto.trim(), em: Date.now(), visivel: true, pedidoId: Number(d.pedidoId) || 0, clienteId: u.id });
  DB.set('avaliacoes', l); UI.close(); UI.toast('Obrigado pela sua avaliação!'); Router.render(true);
};
