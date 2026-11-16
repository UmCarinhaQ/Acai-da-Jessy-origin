'use strict';
/* =========================================================================
   PAINEL ADMINISTRATIVO: painel, pedidos, produtos, categorias, estoque,
   clientes, avaliações, financeiro e entregas (bairros, taxas e mapa).
   Só abre para usuários com papel "admin" (veja Router.add em main.js).
   ========================================================================= */
const Adm = {
  tit: (t, extra = '') => `<div class="row between quebra adm-tit"><h1>${esc(t)}</h1>${extra}</div>`,
  badge: p => `<span class="badge b-${STATUS[p.status].cls}">${esc(nomeStatus(p, p.status))}</span>`,
  hoje: ts => new Date(ts).toDateString() === new Date().toDateString(),
  validos: () => Pedidos.todos().filter(p => p.status !== 'recusado'),
  kpi: (t, v, cls = '') => `<div class="kpi ${cls}"><p>${t}</p><p>${v}</p></div>`,
  slug: s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  linha: p => `<div class="lin"><div><p class="neg">${num4(p.id)} ${esc(p.clienteNome)}</p><p class="peq suave">${esc(p.entrega.tipo === 'entrega' ? p.entrega.bairro : 'Retirada')}, ${R$(p.total)}, ${esc(FORMAS[p.pagamento.forma])}</p></div>${Adm.badge(p)}</div>`
};

/* ---------- painel ---------- */
Views.adminPainel = () => {
  const todos = Pedidos.todos().sort((a, b) => b.criadoEm - a.criadoEm), hoje = todos.filter(p => Adm.hoje(p.criadoEm) && p.status !== 'recusado');
  const fat = hoje.reduce((s, p) => s + p.total, 0), ag = todos.filter(p => p.status === 'aguardando').length;
  return Adm.tit('Painel', `<span class="suave peq">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>`) +
    `<div class="kpis">${Adm.kpi('Pedidos hoje', hoje.length)}${Adm.kpi('Faturamento hoje', R$(fat))}${Adm.kpi('Ticket médio', R$(hoje.length ? fat / hoje.length : 0))}${Adm.kpi('Aguardando confirmação', ag, ag ? 'alerta-k' : '')}</div>` +
    (ag ? `<div class="card row between quebra" style="border-color:var(--roxo);margin-bottom:16px"><p class="neg">${ag} ${ag === 1 ? 'pedido espera' : 'pedidos esperam'} confirmação</p><a class="btn sm" href="#/admin/pedidos?s=aguardando">Ver pedidos</a></div>` : '') +
    `<section class="card"><h2 style="margin-bottom:8px">Pedidos recentes</h2>${todos.length ? todos.slice(0, 5).map(Adm.linha).join('') : Views.vazio('Nenhum pedido ainda', 'Quando um cliente pedir, ele aparece aqui.')}</section>`;
};

/* ---------- pedidos ---------- */
const ROT = { confirmado: 'Confirmar pedido', preparo: 'Iniciar preparo', concluido: 'Marcar como concluído' };
Adm.card = p => {
  const prox = Pedidos.proximo(p), rot = prox === 'entrega' ? (p.entrega.tipo === 'retirada' ? 'Pronto para retirada' : 'Saiu para entrega') : ROT[prox];
  return `<article class="card ped-card"><div class="row between"><p class="neg">${num4(p.id)} ${esc(p.clienteNome)}</p>${Adm.badge(p)}</div>
    <p class="suave peq">${fmtDataHora(p.criadoEm)}. ${p.entrega.tipo === 'entrega' ? 'Entrega em ' + esc(p.entrega.bairro) : 'Retirada na loja'}.</p>
    <p class="peq">${p.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(', ')}</p>
    <p class="peq"><span class="neg">${R$(p.total)}</span>. Pagamento: ${esc(FORMAS[p.pagamento.forma])}${p.pagamento.troco ? `, troco para ${R$(p.pagamento.troco)}` : ''}.</p>
    <div class="acoes" style="justify-content:flex-start"><button class="btn out sm" data-act="ped-ver" data-id="${p.id}">Detalhes</button>
      ${p.status === 'aguardando' ? `<button class="btn perigo sm" data-act="ped-recusar" data-id="${p.id}">Recusar</button>` : ''}
      ${prox ? `<button class="btn sm" data-act="ped-avancar" data-id="${p.id}">${rot}</button>` : ''}</div></article>`;
};
Views.adminPedidos = (_, q) => {
  const s = q.s || 'todos', todos = Pedidos.todos().sort((a, b) => b.criadoEm - a.criadoEm), l = s === 'todos' ? todos : todos.filter(p => p.status === s);
  const chips = [['todos', 'Todos'], ...Object.entries(STATUS).map(([k, v]) => [k, v.nome])].map(([k, t]) => `<a class="chip ${s === k ? 'on' : ''}" href="#/admin/pedidos?s=${k}">${esc(t)} ${k === 'todos' ? todos.length : todos.filter(p => p.status === k).length}</a>`).join('');
  return Adm.tit('Pedidos') + `<div class="chips" style="margin-bottom:16px">${chips}</div><div class="grid">${l.length ? l.map(Adm.card).join('') : Views.vazio('Nenhum pedido neste filtro', 'Escolha outro status acima.')}</div>`;
};
Actions['ped-avancar'] = el => {
  const p = Pedidos.achar(el.dataset.id), prox = p && Pedidos.proximo(p); if (!prox) return;
  Pedidos.mudar(p.id, prox); UI.toast(`Pedido ${num4(p.id)}: ${nomeStatus(p, prox).toLowerCase()}.`); Router.render(true);
};
Actions['ped-recusar'] = el => UI.confirm(`Recusar o pedido ${num4(el.dataset.id)}?`, () => { Pedidos.mudar(el.dataset.id, 'recusado'); UI.toast('Pedido recusado e estoque devolvido.'); Router.render(true); }, 'Recusar pedido');
Actions['ped-ver'] = el => {
  const p = Pedidos.achar(el.dataset.id), fone = soDigitos(p.telefone);
  UI.modal(`<h2>Pedido ${num4(p.id)}</h2>${Adm.badge(p)}
    ${p.itens.map(i => `<div><div class="lin-r row between"><span class="neg">${i.qtd}x ${esc(i.nome)}</span><span>${R$(i.unit * i.qtd)}</span></div>${extrasHtml(i)}</div>`).join('')}
    <p>Subtotal ${R$(p.subtotal)}. Taxa ${R$(p.taxa)}. <span class="neg">Total ${R$(p.total)}</span></p>
    <p class="peq"><span class="neg">Cliente:</span> ${esc(p.clienteNome)}, ${esc(p.telefone)}</p>
    <p class="peq"><span class="neg">${p.entrega.tipo === 'entrega' ? 'Entrega:' : 'Retirada na loja'}</span> ${esc(p.entrega.endereco)} ${esc(p.entrega.bairro)}</p>
    <p class="peq"><span class="neg">Pagamento:</span> ${esc(FORMAS[p.pagamento.forma])}${p.pagamento.troco ? `, troco para ${R$(p.pagamento.troco)}` : ''}</p>
    ${p.obs ? `<p class="peq"><span class="neg">Observações:</span> ${esc(p.obs)}</p>` : ''}
    <div class="peq suave">${p.historico.map(h => `<p>${fmtDataHora(h.em)}: ${esc(nomeStatus(p, h.status))}</p>`).join('')}</div>
    ${fone.length >= 10 ? `<a class="btn out" target="_blank" rel="noopener" href="https://wa.me/55${fone}">Chamar o cliente no WhatsApp</a>` : ''}`, 'Detalhes do pedido');
};

/* ---------- produtos, adicionais e complementos ---------- */
Views.adminProdutos = () => {
  const ps = DB.get('produtos', []), ads = DB.get('adicionais', []), cps = DB.get('complementos', []), cats = DB.get('categorias', []);
  const sec = (t, btn, corpo) => `<section class="card" style="margin-bottom:16px"><div class="row between quebra"><h2>${t}</h2>${btn}</div>${corpo}</section>`;
  return Adm.tit('Produtos') +
    sec('Produtos', '<button class="btn sm" data-act="prod-novo">Novo produto</button>', ps.length ? ps.map(p => `<div class="lin"><div class="row grow"><div class="mini" style="width:56px;height:56px">${Layout.foto(p)}</div><div><p class="neg">${esc(p.nome)}</p><p class="peq suave">${esc((cats.find(c => c.id === p.categoria) || {}).nome || 'Sem categoria')}. ${p.tamanhos.map(t => esc((t.nome || 'Único') + ' ' + R$(t.preco))).join(', ')}</p><span class="badge ${p.ativo ? 'b-ok' : 'b-erro'}">${p.ativo ? 'No cardápio' : 'Oculto'}</span></div></div>
      <div class="acoes"><button class="btn out sm" data-act="prod-edit" data-id="${p.id}">Editar</button><button class="btn perigo sm" data-act="prod-del" data-id="${p.id}">Excluir</button></div></div>`).join('') : Views.vazio('Nenhum produto cadastrado', 'Crie o primeiro produto do cardápio.')) +
    sec('Adicionais', '<button class="btn sm" data-act="ad-novo">Novo adicional</button>', ads.length ? ads.map(a => `<div class="lin"><div><p class="neg">${esc(a.nome)}</p><p class="peq suave">${R$(a.preco)}, ${a.estoque} em estoque. ${a.ativo ? 'Ativo' : 'Oculto'}</p></div><div class="acoes"><button class="btn out sm" data-act="ad-edit" data-id="${esc(a.id)}">Editar</button><button class="btn perigo sm" data-act="ad-del" data-id="${esc(a.id)}">Excluir</button></div></div>`).join('') : '<p class="suave">Nenhum adicional.</p>') +
    sec('Complementos (sem custo)', '<button class="btn sm" data-act="cp-novo">Novo complemento</button>', cps.length ? cps.map(c => `<div class="lin"><p class="neg">${esc(c.nome)}</p><button class="btn perigo sm" data-act="cp-del" data-id="${esc(c.id)}">Excluir</button></div>`).join('') : '<p class="suave">Nenhum complemento.</p>');
};
Adm.formProduto = id => {
  const cats = DB.get('categorias', []), p = id ? DB.get('produtos', []).find(x => x.id === id) : { nome: '', descricao: '', categoria: (cats[0] || {}).id, tamanhos: [], estoque: 20, ativo: true, popular: false, foto: '' };
  UI.modal(`<h2>${id ? 'Editar' : 'Novo'} produto</h2><form class="col" data-form="produto" novalidate>
    <input type="hidden" name="id" value="${id || ''}"><input type="hidden" name="foto" id="foto-val" value="${esc(p.foto)}">
    <label class="campo">Nome<input name="nome" required value="${esc(p.nome)}"></label>
    <label class="campo">Descrição<textarea name="descricao">${esc(p.descricao)}</textarea></label>
    <label class="campo">Categoria<select name="categoria">${cats.map(c => `<option value="${esc(c.id)}" ${c.id === p.categoria ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
    <label class="campo">Tamanhos e preços, um por linha, assim: 500 ml = 20 (produto sem tamanho: Único = 8)<textarea name="tamanhos" required>${esc(p.tamanhos.map(t => `${t.nome || 'Único'} = ${t.preco}`).join('\n'))}</textarea></label>
    <label class="campo">Estoque (unidades)<input name="estoque" type="number" min="0" value="${p.estoque}"></label>
    <div class="row"><div class="foto-prev" id="foto-prev">${Layout.foto(p)}</div><label class="campo grow">Foto do produto<input type="file" accept="image/*" data-change="foto-arq"></label></div>
    <label class="opcao"><span>Mostrar no cardápio</span><input type="checkbox" name="ativo" ${p.ativo ? 'checked' : ''}></label>
    <label class="opcao"><span>Destacar em "Mais pedidos" na home</span><input type="checkbox" name="popular" ${p.popular ? 'checked' : ''}></label>
    <p class="erro-txt" id="prod-erro" role="alert" hidden></p><button class="btn">Salvar produto</button></form>`, 'Produto');
};
Actions['prod-novo'] = () => Adm.formProduto();
Actions['prod-edit'] = el => Adm.formProduto(Number(el.dataset.id));
Actions['foto-arq'] = el => { const f = el.files[0]; if (f) lerFoto(f, url => { $('#foto-val').value = url; $('#foto-prev').innerHTML = `<img class="foto" src="${url}" alt="Prévia da foto">`; }); };
Forms.produto = d => {
  const ps = DB.get('produtos', []), old = ps.find(x => x.id === Number(d.id));
  const tam = d.tamanhos.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => {
    const [n = '', v = ''] = l.split('='), nome = n.trim();
    return { nome: /^[uú]nico$/i.test(nome) ? '' : nome, preco: parseFloat(v.replace(',', '.')), acomp: old && old.tamanhos[i] ? (old.tamanhos[i].acomp ?? 3) : 3 };
  });
  if (d.nome.trim().length < 2) return erro('#prod-erro', 'Informe o nome do produto.');
  if (!tam.length || tam.some(t => !(t.preco >= 0))) return erro('#prod-erro', 'Escreva os tamanhos assim: 500 ml = 20 (um por linha).');
  const novo = { id: old ? old.id : DB.nextId(ps), nome: d.nome.trim(), descricao: d.descricao.trim(), categoria: d.categoria, tamanhos: tam, estoque: Math.max(0, Number(d.estoque) || 0), foto: d.foto || '', ativo: !!d.ativo, popular: !!d.popular };
  if (old) ps[ps.indexOf(old)] = novo; else ps.push(novo);
  DB.set('produtos', ps); UI.close(); UI.toast('Produto salvo.'); Router.render(true);
};
Actions['prod-del'] = el => { const p = DB.get('produtos', []).find(x => x.id === Number(el.dataset.id)); UI.confirm(`Excluir "${p.nome}" do cardápio?`, () => { DB.set('produtos', DB.get('produtos', []).filter(x => x.id !== p.id)); UI.toast('Produto excluído.'); Router.render(true); }, 'Excluir'); };

Adm.formAdicional = id => {
  const a = id ? DB.get('adicionais', []).find(x => x.id === id) : { nome: '', preco: '', estoque: 20, ativo: true };
  UI.modal(`<h2>${id ? 'Editar' : 'Novo'} adicional</h2><form class="col" data-form="adicional" novalidate><input type="hidden" name="id" value="${esc(id || '')}">
    <label class="campo">Nome<input name="nome" required value="${esc(a.nome)}"></label>
    <div class="grid2"><label class="campo">Preço (R$)<input name="preco" type="number" min="0" step="0.01" required value="${a.preco}"></label><label class="campo">Estoque<input name="estoque" type="number" min="0" value="${a.estoque}"></label></div>
    <label class="opcao"><span>Disponível para os clientes</span><input type="checkbox" name="ativo" ${a.ativo ? 'checked' : ''}></label><p class="erro-txt" id="ad-erro" role="alert" hidden></p><button class="btn">Salvar adicional</button></form>`, 'Adicional');
};
Actions['ad-novo'] = () => Adm.formAdicional(); Actions['ad-edit'] = el => Adm.formAdicional(el.dataset.id);
Forms.adicional = d => {
  const l = DB.get('adicionais', []), old = l.find(x => x.id === d.id), preco = parseFloat(d.preco);
  if (!d.nome.trim() || !(preco >= 0)) return erro('#ad-erro', 'Informe o nome e o preço.');
  const novo = { id: old ? old.id : 'a' + (Date.now().toString(36)), nome: d.nome.trim(), preco, estoque: Math.max(0, Number(d.estoque) || 0), ativo: !!d.ativo };
  if (old) l[l.indexOf(old)] = novo; else l.push(novo);
  DB.set('adicionais', l); UI.close(); UI.toast('Adicional salvo.'); Router.render(true);
};
Actions['ad-del'] = el => UI.confirm('Excluir este adicional?', () => { DB.set('adicionais', DB.get('adicionais', []).filter(x => x.id !== el.dataset.id)); UI.toast('Adicional excluído.'); Router.render(true); }, 'Excluir');
Actions['cp-novo'] = () => UI.modal('<h2>Novo complemento</h2><form class="col" data-form="complemento"><label class="campo">Nome<input name="nome" required></label><button class="btn">Salvar complemento</button></form>', 'Complemento');
Forms.complemento = d => { if (!d.nome.trim()) return; const l = DB.get('complementos', []); l.push({ id: 'c' + Date.now().toString(36), nome: d.nome.trim(), ativo: true }); DB.set('complementos', l); UI.close(); UI.toast('Complemento salvo.'); Router.render(true); };
Actions['cp-del'] = el => UI.confirm('Excluir este complemento?', () => { DB.set('complementos', DB.get('complementos', []).filter(x => x.id !== el.dataset.id)); UI.toast('Complemento excluído.'); Router.render(true); }, 'Excluir');

/* ---------- categorias ---------- */
Views.adminCategorias = () => {
  const cats = DB.get('categorias', []), ps = DB.get('produtos', []);
  return Adm.tit('Categorias', '<button class="btn sm" data-act="cat-novo">Nova categoria</button>') +
    `<section class="card">${cats.length ? cats.map(c => `<div class="lin"><div><p class="neg">${esc(c.nome)}</p><p class="peq suave">${ps.filter(p => p.categoria === c.id).length} produtos. ${c.ativa ? 'Visível no cardápio' : 'Oculta'}</p></div><div class="acoes"><button class="btn out sm" data-act="cat-edit" data-id="${esc(c.id)}">Editar</button><button class="btn perigo sm" data-act="cat-del" data-id="${esc(c.id)}">Excluir</button></div></div>`).join('') : Views.vazio('Nenhuma categoria', 'Crie categorias para organizar o cardápio.')}</section>`;
};
Actions['cat-novo'] = () => Actions['cat-edit']({ dataset: {} });
Actions['cat-edit'] = el => {
  const c = el.dataset.id ? DB.get('categorias', []).find(x => x.id === el.dataset.id) : { id: '', nome: '', ativa: true };
  UI.modal(`<h2>${c.id ? 'Editar' : 'Nova'} categoria</h2><form class="col" data-form="categoria"><input type="hidden" name="id" value="${esc(c.id)}"><label class="campo">Nome<input name="nome" required value="${esc(c.nome)}"></label>
    <label class="opcao"><span>Visível no cardápio</span><input type="checkbox" name="ativa" ${c.ativa ? 'checked' : ''}></label><button class="btn">Salvar categoria</button></form>`, 'Categoria');
};
Forms.categoria = d => {
  if (!d.nome.trim()) return; const l = DB.get('categorias', []), old = l.find(x => x.id === d.id);
  if (old) { old.nome = d.nome.trim(); old.ativa = !!d.ativa; } else { let id = Adm.slug(d.nome) || 'cat', n = 2; while (l.some(x => x.id === id)) id = Adm.slug(d.nome) + '-' + n++; l.push({ id, nome: d.nome.trim(), ativa: !!d.ativa }); }
  DB.set('categorias', l); UI.close(); UI.toast('Categoria salva.'); Router.render(true);
};
Actions['cat-del'] = el => {
  if (DB.get('produtos', []).some(p => p.categoria === el.dataset.id)) return UI.toast('Mova ou exclua os produtos desta categoria antes.', 'erro');
  UI.confirm('Excluir esta categoria?', () => { DB.set('categorias', DB.get('categorias', []).filter(x => x.id !== el.dataset.id)); UI.toast('Categoria excluída.'); Router.render(true); }, 'Excluir');
};

/* ---------- estoque ---------- */
Views.adminEstoque = () => {
  const linha = (nome, n, t, id) => { const [txt, cls] = Estoque.nivel(n); return `<div class="lin"><div><p class="neg">${esc(nome)}</p><span class="badge estb ${cls}">${txt}</span></div><label class="row peq suave">Quantidade <input class="est-in" type="number" min="0" value="${n}" data-change="est-set" data-t="${t}" data-id="${esc(id)}"></label></div>`; };
  return Adm.tit('Estoque') + `<p class="suave" style="margin-bottom:16px">Cada pedido dá baixa automática. Recusar um pedido devolve as unidades.</p>
    <section class="card" style="margin-bottom:16px"><h2>Produtos</h2>${DB.get('produtos', []).map(p => linha(p.nome, p.estoque, 'p', p.id)).join('') || '<p class="suave">Nenhum produto.</p>'}</section>
    <section class="card"><h2>Adicionais</h2>${DB.get('adicionais', []).map(a => linha(a.nome, a.estoque, 'a', a.id)).join('') || '<p class="suave">Nenhum adicional.</p>'}</section>`;
};
Actions['est-set'] = el => {
  const n = Math.max(0, Math.floor(Number(el.value) || 0)), k = el.dataset.t === 'p' ? 'produtos' : 'adicionais', l = DB.get(k, []), it = l.find(x => String(x.id) === el.dataset.id); if (!it) return;
  it.estoque = n; DB.set(k, l); el.value = n;
  const [t, c] = Estoque.nivel(n), b = el.closest('.lin').querySelector('.estb'); b.className = 'badge estb ' + c; b.textContent = t; UI.toast('Estoque atualizado.');
};

/* ---------- clientes ---------- */
Adm.clientes = (busca = '') => {
  const b = busca.trim().toLowerCase(), ps = Adm.validos();
  const l = DB.get('usuarios', []).filter(u => u.papel === 'cliente' && (u.nome + u.email).toLowerCase().includes(b));
  return l.length ? l.map(u => { const meus = ps.filter(p => p.clienteId === u.id); return `<div class="lin"><div><p class="neg">${esc(u.nome)}</p><p class="peq suave">${esc(u.email)}${u.telefone ? ', ' + esc(u.telefone) : ''}</p></div><div style="text-align:right"><p class="neg">${R$(meus.reduce((s, p) => s + p.total, 0))}</p><p class="peq suave">${meus.length} pedidos</p></div></div>`; }).join('') : Views.vazio('Nenhum cliente encontrado', 'Tente outro nome ou e-mail.');
};
Views.adminClientes = () => Adm.tit('Clientes') + `<label class="campo" style="margin-bottom:16px"><span class="sr">Buscar cliente</span><input type="search" placeholder="Buscar por nome ou e-mail" data-input="cli-busca"></label><section class="card" id="cli-lista">${Adm.clientes()}</section>`;
Actions['cli-busca'] = el => { $('#cli-lista').innerHTML = Adm.clientes(el.value); };

/* ---------- avaliações ---------- */
Views.adminAvaliacoes = () => {
  const l = DB.get('avaliacoes', []), media = l.length ? (l.reduce((s, a) => s + a.nota, 0) / l.length).toFixed(1).replace('.', ',') : '-';
  return Adm.tit('Avaliações') + `<div class="kpis">${Adm.kpi('Nota média', media)}${Adm.kpi('Total de avaliações', l.length)}${Adm.kpi('Visíveis no site', l.filter(a => a.visivel).length)}</div>
    <section class="card">${l.length ? l.map(a => `<div class="lin"><div><p class="neg">${esc(a.nome)} <span class="estrela">${UI.stars(a.nota)}</span></p><p class="peq">${esc(a.texto)}</p><p class="peq suave">${fmtData(a.em)}. ${a.visivel ? 'Visível no site' : 'Oculta'}</p></div>
      <div class="acoes"><button class="btn out sm" data-act="av-vis" data-id="${a.id}">${a.visivel ? 'Ocultar' : 'Mostrar'}</button><button class="btn perigo sm" data-act="av-del" data-id="${a.id}">Excluir</button></div></div>`).join('') : Views.vazio('Nenhuma avaliação', 'As avaliações dos clientes aparecem aqui.')}</section>`;
};
Actions['av-vis'] = el => { const l = DB.get('avaliacoes', []), a = l.find(x => x.id === Number(el.dataset.id)); a.visivel = !a.visivel; DB.set('avaliacoes', l); Router.render(true); };
Actions['av-del'] = el => UI.confirm('Excluir esta avaliação?', () => { DB.set('avaliacoes', DB.get('avaliacoes', []).filter(a => a.id !== Number(el.dataset.id))); UI.toast('Avaliação excluída.'); Router.render(true); }, 'Excluir');

/* ---------- financeiro ---------- */
Views.adminFinanceiro = () => {
  const val = Adm.validos(), conc = val.filter(p => p.status === 'concluido'), andamento = val.filter(p => p.status !== 'concluido');
  const soma = l => l.reduce((s, p) => s + p.total, 0);
  const dias = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); const ini = d.getTime(); return { rot: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), v: soma(val.filter(p => p.criadoEm >= ini && p.criadoEm < ini + 86400000)) }; });
  const max = Math.max(1, ...dias.map(d => d.v));
  return Adm.tit('Financeiro', '<button class="btn out sm" data-act="fin-csv">Exportar pedidos em CSV</button>') +
    `<div class="kpis">${Adm.kpi('Recebido (concluídos)', R$(soma(conc)))}${Adm.kpi('A receber (em andamento)', R$(soma(andamento)))}${Adm.kpi('Ticket médio', R$(conc.length ? soma(conc) / conc.length : 0))}${Adm.kpi('Pedidos recusados', Pedidos.todos().length - val.length)}</div>
    <section class="card" style="margin-bottom:16px"><h2>Pedidos dos últimos 7 dias, em reais</h2><div class="barras" role="img" aria-label="Faturamento por dia nos últimos 7 dias">${dias.map(d => `<div><span style="height:${Math.round(d.v / max * 100)}%" title="${R$(d.v)}"></span>${d.rot}</div>`).join('')}</div></section>
    <section class="card"><h2>Por forma de pagamento</h2>${Object.entries(FORMAS).map(([k, n]) => { const l = val.filter(p => p.pagamento.forma === k); return `<div class="lin"><span class="neg">${esc(n)}</span><span>${R$(soma(l))}, ${l.length} pedidos</span></div>`; }).join('')}</section>`;
};
Actions['fin-csv'] = () => baixarCSV('pedidos-acai-da-jessy.csv', [['Pedido', 'Data', 'Cliente', 'Tipo', 'Bairro', 'Pagamento', 'Status', 'Total'],
  ...Pedidos.todos().map(p => [num4(p.id), fmtDataHora(p.criadoEm), p.clienteNome, p.entrega.tipo, p.entrega.bairro, FORMAS[p.pagamento.forma], STATUS[p.status].nome, p.total.toFixed(2).replace('.', ',')])]);

/* ---------- entregas: bairros, taxas, loja e mapa ---------- */
Views.adminEntregas = () => {
  const bs = DB.get('bairros', []), L = Loja.dados();
  return Adm.tit('Entregas') + `<div class="layout2" style="align-items:start"><div class="col">
    <section class="card"><div class="row between quebra"><h2>Bairros e taxas</h2><button class="btn sm" data-act="bairro-novo">Novo bairro</button></div>
      ${bs.length ? bs.map(b => `<div class="lin"><div><p class="neg">${esc(b.nome)}</p><p class="peq suave">Taxa ${R$(b.taxa)}. ${b.ativo ? 'Atendido' : 'Pausado'}</p></div><div class="acoes"><button class="btn out sm" data-act="bairro-edit" data-id="${b.id}">Editar</button><button class="btn perigo sm" data-act="bairro-del" data-id="${b.id}">Excluir</button></div></div>`).join('') : Views.vazio('Nenhum bairro', 'Sem bairros, só é possível pedir com retirada.')}</section>
    <form class="card col" data-form="loja" novalidate><h2>Dados da loja</h2>
      <label class="campo">Endereço da loja<input name="endereco" value="${esc(L.endereco)}"></label>
      <div class="grid2"><label class="campo">Abre às<input name="abre" type="time" value="${esc(L.abre)}"></label><label class="campo">Fecha às<input name="fecha" type="time" value="${esc(L.fecha)}"></label></div>
      <label class="campo">WhatsApp com DDD<input name="whatsapp" value="${esc(L.whatsappExibir)}"></label>
      <div class="grid2"><label class="campo">Latitude do mapa<input name="lat" type="number" step="any" value="${L.lat}"></label><label class="campo">Longitude do mapa<input name="lng" type="number" step="any" value="${L.lng}"></label></div>
      <p class="peq suave">Para achar as coordenadas: abra o Google Maps, clique com o botão direito sobre a loja e copie os dois números.</p>
      <button class="btn">Salvar dados da loja</button></form></div>
    <div class="col">${Views.mapa(L)}<a class="btn out sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${L.lat},${L.lng}">Abrir no Google Maps</a></div></div>`;
};
Actions['bairro-novo'] = () => Actions['bairro-edit']({ dataset: {} });
Actions['bairro-edit'] = el => {
  const b = el.dataset.id ? DB.get('bairros', []).find(x => x.id === Number(el.dataset.id)) : { id: '', nome: '', taxa: '', ativo: true };
  UI.modal(`<h2>${b.id ? 'Editar' : 'Novo'} bairro</h2><form class="col" data-form="bairro" novalidate><input type="hidden" name="id" value="${b.id}">
    <label class="campo">Nome do bairro<input name="nome" required value="${esc(b.nome)}"></label><label class="campo">Taxa de entrega (R$)<input name="taxa" type="number" min="0" step="0.01" required value="${b.taxa}"></label>
    <label class="opcao"><span>Atendemos este bairro</span><input type="checkbox" name="ativo" ${b.ativo ? 'checked' : ''}></label><p class="erro-txt" id="bairro-erro" role="alert" hidden></p><button class="btn">Salvar bairro</button></form>`, 'Bairro');
};
Forms.bairro = d => {
  const l = DB.get('bairros', []), old = l.find(x => x.id === Number(d.id)), taxa = parseFloat(d.taxa);
  if (!d.nome.trim() || !(taxa >= 0)) return erro('#bairro-erro', 'Informe o nome do bairro e a taxa.');
  const novo = { id: old ? old.id : DB.nextId(l), nome: d.nome.trim(), taxa, ativo: !!d.ativo };
  if (old) l[l.indexOf(old)] = novo; else l.push(novo);
  DB.set('bairros', l); UI.close(); UI.toast('Bairro salvo.'); Router.render(true);
};
Actions['bairro-del'] = el => UI.confirm('Excluir este bairro?', () => { DB.set('bairros', DB.get('bairros', []).filter(x => x.id !== Number(el.dataset.id))); UI.toast('Bairro excluído.'); Router.render(true); }, 'Excluir');
Forms.loja = d => {
  const L = Loja.dados(), fone = soDigitos(d.whatsapp);
  if (fone.length < 10) return UI.toast('Informe o WhatsApp com DDD.', 'erro');
  Object.assign(L, { endereco: d.endereco.trim(), abre: d.abre || L.abre, fecha: d.fecha || L.fecha, whatsappExibir: d.whatsapp.trim(), whatsapp: fone.startsWith('55') ? fone : '55' + fone, lat: Number(d.lat) || L.lat, lng: Number(d.lng) || L.lng });
  DB.set('loja', L); UI.toast('Dados da loja salvos.'); Router.render(true);
};
