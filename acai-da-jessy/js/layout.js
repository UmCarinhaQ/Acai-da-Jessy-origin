'use strict';
/* =========================================================================
   LAYOUT: estrutura que envolve as telas (topo, menu inferior, rodapé,
   menu lateral do administrador). Cada tela só devolve o HTML do miolo.
   ========================================================================= */
const ICONE_MENU = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h16M3 11h16M3 16h16"/></svg>';

const Layout = {
  logo(px = 40) { return `<span class="logo" style="--s:${px}px"><img src="assets/img/logo.jpg" alt="Logo Açaí da Jessy"></span>`; },
  foto(p, alt) { return p.foto ? `<img class="foto" src="${esc(p.foto)}" alt="${esc(alt || p.nome)}" loading="lazy">` : '<span class="ph" aria-hidden="true"><i></i></span>'; },

  mostrar(tipo, html, ativo = '', manter = false) {
    const app = $('#app');
    if (tipo === 'solo') app.innerHTML = `<main class="solo" id="conteudo">${html}</main>`;
    else if (tipo === 'admin') app.innerHTML = this.admin(html, ativo);
    else app.innerHTML = this.cliente(html, ativo);
    if (!manter) scrollTo(0, 0);
    this.updateBadge();
  },
  updateBadge() { const n = Cart.count(); $$('[data-badge]').forEach(b => { b.textContent = n; b.hidden = !n; }); },

  cliente(html, ativo) {
    const u = Auth.user(), L = Loja.dados();
    const link = (h, t, k) => `<a href="#/${h}" class="${ativo === k ? 'on' : ''}">${t}</a>`;
    const inf = [['', 'Início', 'inicio'], ['cardapio', 'Cardápio', 'cardapio'], ['carrinho', 'Carrinho', 'carrinho'], ['conta/pedidos', 'Pedidos', 'pedidos'], ['conta', 'Perfil', 'perfil']]
      .map(([h, t, k]) => `<a href="#/${h}" class="${ativo === k ? 'on' : ''}">${t}${k === 'carrinho' ? '<span class="badge-n" data-badge hidden>0</span>' : ''}</a>`).join('');
    return `<a class="pular" href="#conteudo">Ir para o conteúdo</a>
    <header class="topo"><div class="wrap topo-in">
      <a class="marca" href="#/" aria-label="Início">${this.logo(40)}<span>${esc(L.nome)}</span></a>
      <nav class="menu-desk" aria-label="Principal">${link('', 'Início', 'inicio')}${link('cardapio', 'Cardápio', 'cardapio')}${link('contato', 'Contato', 'contato')}${link('conta/pedidos', 'Meus pedidos', 'pedidos')}</nav>
      <div class="row">
        <a class="btn out sm carrinho-btn desk-only" href="#/carrinho">Carrinho<span class="badge-n" data-badge hidden>0</span></a>
        ${u ? `<a class="btn sm desk-only" href="#/${u.papel === 'admin' ? 'admin' : 'conta'}">${esc(u.nome.split(' ')[0])}</a>` : '<a class="btn sm desk-only" href="#/login">Entrar</a>'}
        <button class="icone-btn mob-only" data-act="menu-mobile" aria-label="Abrir menu">${ICONE_MENU}</button>
      </div></div></header>
    <main class="pagina wrap" id="conteudo">${html}</main>
    <footer class="rodape"><div class="wrap col">
      <strong>${esc(L.nome)}</strong>
      <p>${esc(L.cidade)}. Atendemos das ${hh(L.abre)} às ${hh(L.fecha)}.</p>
      <p>WhatsApp: <a href="https://wa.me/${esc(L.whatsapp)}" target="_blank" rel="noopener">${esc(L.whatsappExibir)}</a>. Instagram: <a href="https://instagram.com/${esc(L.instagram)}" target="_blank" rel="noopener">@${esc(L.instagram)}</a></p>
      <p><a href="#/admin">Área do administrador</a></p></div></footer>
    <nav class="nav-inf" aria-label="Navegação principal">${inf}</nav>`;
  },

  admin(html, ativo) {
    const L = Loja.dados(), u = Auth.user(), aguard = Pedidos.todos().filter(p => p.status === 'aguardando').length;
    const itens = [['', 'Painel', 'painel'], ['pedidos', 'Pedidos', 'pedidos'], ['produtos', 'Produtos', 'produtos'], ['categorias', 'Categorias', 'categorias'], ['estoque', 'Estoque', 'estoque'],
      ['clientes', 'Clientes', 'clientes'], ['avaliacoes', 'Avaliações', 'avaliacoes'], ['financeiro', 'Financeiro', 'financeiro'], ['entregas', 'Entregas', 'entregas']];
    const href = h => '#/admin' + (h ? '/' + h : '');
    const lado = itens.map(([h, t, k]) => `<a href="${href(h)}" class="${ativo === k ? 'on' : ''}">${t}${k === 'pedidos' && aguard ? `<span class="badge">${aguard}</span>` : ''}</a>`).join('');
    const inf = itens.filter(i => ['painel', 'pedidos', 'produtos', 'entregas'].includes(i[2]))
      .map(([h, t, k]) => `<a href="${href(h)}" class="${ativo === k ? 'on' : ''}">${t}${k === 'pedidos' && aguard ? `<span class="badge-n">${aguard}</span>` : ''}</a>`).join('');
    const toggle = `<label class="row"><input type="checkbox" data-change="loja-aberta" ${L.aberta ? 'checked' : ''}> Loja aberta</label>`;
    return `<div class="adm-app">
      <aside class="adm-lado" aria-label="Menu do administrador">
        <a class="marca" href="#/admin">${this.logo(40)}<span>${esc(L.nome)}</span></a><span class="sel-admin">Admin</span>${lado}
        <div class="rodape-lado col">${toggle}<span>${esc(u ? u.nome : '')}</span><div class="row"><a class="btn out sm" href="#/">Ver o site</a><button class="btn out sm" data-act="sair">Sair</button></div></div>
      </aside>
      <div class="adm-corpo">
        <header class="adm-topo"><a class="marca" href="#/admin" style="color:#fff">${this.logo(32)}<span>${esc(L.nome)}</span><span class="sel-admin">Admin</span></a>${toggle}</header>
        <main class="adm-main" id="conteudo">${html}</main>
      </div>
      <nav class="nav-inf adm-nav" aria-label="Navegação do administrador">${inf}<button data-act="menu-admin">Mais</button></nav>
    </div>`;
  }
};

Actions['menu-mobile'] = () => {
  const u = Auth.user();
  UI.modal(`<h2>Menu</h2><nav class="col menu-mob"><a href="#/">Início</a><a href="#/cardapio">Cardápio</a><a href="#/contato">Contato e perguntas</a>
    ${u ? `<a href="#/conta">Minha conta</a>${u.papel === 'admin' ? '<a href="#/admin">Painel administrativo</a>' : ''}<button class="btn out" data-act="sair">Sair</button>` : '<a class="btn" href="#/login">Entrar ou criar conta</a>'}</nav>`, 'Menu');
};
Actions['menu-admin'] = () => UI.modal(`<h2>Mais opções</h2><nav class="col menu-mob"><a href="#/admin/categorias">Categorias</a><a href="#/admin/estoque">Estoque</a><a href="#/admin/clientes">Clientes</a><a href="#/admin/avaliacoes">Avaliações</a><a href="#/admin/financeiro">Financeiro</a><a href="#/">Ver o site</a><button class="btn out" data-act="sair">Sair</button></nav>`, 'Mais opções');
Actions['loja-aberta'] = el => {
  const L = Loja.dados(); L.aberta = el.checked; DB.set('loja', L);
  $$('[data-change="loja-aberta"]').forEach(c => { c.checked = el.checked; });
  UI.toast(L.aberta ? 'Loja aberta para pedidos.' : 'Loja fechada. Os clientes verão um aviso.');
};
