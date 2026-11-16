'use strict';
/* =========================================================================
   NÚCLEO: utilidades, "banco" (localStorage), carrinho, login, pedidos,
   roteador por hash (#/rota) e eventos globais (data-act / data-form).
   ========================================================================= */

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const R$ = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtHora = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtData = t => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const fmtDataHora = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const num4 = n => '#' + String(n).padStart(4, '0');
const hh = t => String(t).replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
const soDigitos = s => String(s || '').replace(/\D/g, '');
const erro = (sel, msg) => { const el = $(sel); if (el) { el.textContent = msg; el.hidden = false; } };

const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro' };
const FLUXO = ['aguardando', 'confirmado', 'preparo', 'entrega', 'concluido'];
const STATUS = {
  aguardando: { nome: 'Aguardando confirmação', cls: 'warn' },
  confirmado: { nome: 'Confirmado', cls: 'info' },
  preparo: { nome: 'Em preparação', cls: 'roxo' },
  entrega: { nome: 'Saiu para entrega', cls: 'azul' },
  concluido: { nome: 'Concluído', cls: 'ok' },
  recusado: { nome: 'Recusado', cls: 'erro' }
};
const nomeStatus = (p, s) => (s === 'entrega' && p.entrega.tipo === 'retirada') ? 'Pronto para retirada' : STATUS[s].nome;

/* ---------- "banco de dados" no navegador ---------- */
const DB = {
  get(k, padrao = null) { try { const v = localStorage.getItem('acai:' + k); return v === null ? padrao : JSON.parse(v); } catch { return padrao; } },
  set(k, v) { try { localStorage.setItem('acai:' + k, JSON.stringify(v)); } catch { UI.toast('Sem espaço no navegador. Use fotos menores.', 'erro'); } },
  init() { if (!this.get('seed')) { Object.keys(SEED).forEach(k => this.set(k, SEED[k])); this.set('seed', 1); } },
  reset() { Object.keys(localStorage).filter(k => k.startsWith('acai:')).forEach(k => localStorage.removeItem(k)); this.init(); },
  nextId(arr) { return arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1; }
};

const Loja = { dados: () => DB.get('loja') };

/* ---------- integração com PostgreSQL ---------- */
const API = {
  base: 'http://localhost:3000/api',

  async getProdutos() {
    const resposta = await fetch(`${this.base}/produtos`);

    if (!resposta.ok) {
      throw new Error('Não foi possível carregar os produtos.');
    }

    return await resposta.json();
  }
};

async function carregarProdutosAPI() {
  try {
    const produtosAPI = await API.getProdutos();

    const produtos = produtosAPI.map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      foto: p.foto_url || '',
      popular: p.popular,
      estoque: p.estoque,
      categoria: p.categoria,
      tamanhos: p.tamanhos.map(t => ({
        id: t.id,
        nome: t.nome,
        preco: Number(t.preco),
        maxComplementos: t.max_complementos
      }))
    }));

    DB.set('produtos', produtos);

    console.log('Produtos carregados do PostgreSQL:', produtos);
    return produtos;
  } catch (erro) {
    console.error('Erro ao carregar produtos:', erro);
    return null;
  }
}


/* ---------- entrega x retirada (escolha guardada entre carrinho e checkout) ---------- */
const Entrega = {
  get() {
    const e = DB.get('entrega') || {}, bs = DB.get('bairros', []).filter(b => b.ativo);
    const bairro = bs.find(b => b.id === e.bairroId) || bs[0];
    return { tipo: e.tipo || 'entrega', bairroId: bairro ? bairro.id : null, bairro };
  },
  set(p) { DB.set('entrega', { ...(DB.get('entrega') || {}), ...p }); },
  taxa() { const e = this.get(); return e.tipo === 'entrega' && e.bairro ? Number(e.bairro.taxa) : 0; }
};

/* ---------- carrinho ---------- */
const Cart = {
  items: () => DB.get('carrinho', []),
  save(i) { DB.set('carrinho', i); Layout.updateBadge(); },
  add(it) {
    const i = this.items(), key = JSON.stringify([it.produtoId, it.tamanho, it.adicionaisIds, it.complementos]);
    const ex = i.find(x => x.key === key);
    if (ex) ex.qtd = Math.min(20, ex.qtd + it.qtd); else i.push({ ...it, key });
    this.save(i);
  },
  setQty(idx, q) { const i = this.items(); if (q < 1) i.splice(idx, 1); else i[idx].qtd = Math.min(q, 20); this.save(i); },
  clear() { this.save([]); },
  count: () => Cart.items().reduce((s, x) => s + x.qtd, 0),
  subtotal: () => Cart.items().reduce((s, x) => s + x.unit * x.qtd, 0)
};

/* ---------- login (DEMONSTRAÇÃO — no backend use sessão/JWT e senha com hash) ---------- */
const Auth = {
  user() { const id = DB.get('sessao'); return id ? DB.get('usuarios', []).find(u => u.id === id) || null : null; },
  isAdmin() { const u = this.user(); return !!u && u.papel === 'admin'; },
  login(email, senha) {
    const u = DB.get('usuarios', []).find(x => x.email === String(email).trim().toLowerCase() && x.senha === senha);
    if (!u) return false; DB.set('sessao', u.id); return true;
  },
  register({ nome, email, telefone, senha }) {
    const us = DB.get('usuarios', []); email = String(email).trim().toLowerCase();
    if (us.some(u => u.email === email)) return 'Este e-mail já está cadastrado.';
    const u = { id: DB.nextId(us), nome: nome.trim(), email, telefone, senha, papel: 'cliente', enderecos: [] };
    us.push(u); DB.set('usuarios', us); DB.set('sessao', u.id); return null;
  },
  salvarUsuario(u) { const us = DB.get('usuarios', []); us[us.findIndex(x => x.id === u.id)] = u; DB.set('usuarios', us); },
  logout() { DB.set('sessao', null); }
};

/* ---------- estoque e pedidos ---------- */
const Estoque = {
  // sinal -1 dá baixa (novo pedido); +1 devolve (pedido recusado)
  baixa(itens, sinal) {
    const ps = DB.get('produtos', []), ads = DB.get('adicionais', []);
    itens.forEach(i => {
      const p = ps.find(x => x.id === i.produtoId); if (p) p.estoque = Math.max(0, p.estoque + sinal * i.qtd);
      (i.adicionaisIds || []).forEach(id => { const a = ads.find(x => x.id === id); if (a) a.estoque = Math.max(0, a.estoque + sinal * i.qtd); });
    });
    DB.set('produtos', ps); DB.set('adicionais', ads);
  },
  nivel: n => n <= 0 ? ['Esgotado', 'b-erro'] : n <= 10 ? ['Estoque baixo', 'b-warn'] : ['Em estoque', 'b-ok']
};

const Pedidos = {
  todos: () => DB.get('pedidos', []),
  achar: id => Pedidos.todos().find(p => p.id === Number(id)),
  salvar(p) { const l = Pedidos.todos(), i = l.findIndex(x => x.id === p.id); if (i >= 0) l[i] = p; else l.push(p); DB.set('pedidos', l); },
  proximo(p) { const i = FLUXO.indexOf(p.status); return i >= 0 && i < FLUXO.length - 1 ? FLUXO[i + 1] : null; },
  mudar(id, status) {
    const p = Pedidos.achar(id); if (!p) return;
    if (status === 'recusado') Estoque.baixa(p.itens, +1);
    p.status = status; p.historico.push({ status, em: Date.now() }); Pedidos.salvar(p);
  },
  criar(dados) {
    const id = Math.max(100, ...Pedidos.todos().map(p => p.id)) + 1, agora = Date.now();
    const p = { id, ...dados, status: 'aguardando', criadoEm: agora, historico: [{ status: 'aguardando', em: agora }] };
    Estoque.baixa(p.itens, -1); Pedidos.salvar(p); return p;
  },
  linkWhats(p) {
    const L = Loja.dados();
    const itens = p.itens.map(i => {
      const ex = [...i.adicionais.map(a => '+ ' + a), ...i.complementos];
      return `${i.qtd}x ${i.nome}${ex.length ? ' (' + ex.join(', ') + ')' : ''} - ${R$(i.unit * i.qtd)}`;
    }).join('\n');
    const linhas = [`*Novo pedido ${num4(p.id)} - ${L.nome}*`, '', itens, '', `Subtotal: ${R$(p.subtotal)}`];
    if (p.entrega.tipo === 'entrega') linhas.push(`Taxa de entrega (${p.entrega.bairro}): ${R$(p.taxa)}`);
    linhas.push(`*Total: ${R$(p.total)}*`, '',
      p.entrega.tipo === 'entrega' ? `Entrega: ${p.entrega.endereco}, ${p.entrega.bairro}` : 'Retirada na loja',
      `Pagamento: ${FORMAS[p.pagamento.forma]}${p.pagamento.troco ? ' (troco para ' + R$(p.pagamento.troco) + ')' : ''}`);
    if (p.obs) linhas.push(`Obs.: ${p.obs}`);
    linhas.push(`Cliente: ${p.clienteNome} - ${p.telefone}`);
    return `https://wa.me/${L.whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`;
  }
};

/* ---------- interface: toast, modal, estrelas ---------- */
const UI = {
  toast(msg, tipo = 'ok') {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.className = 'show ' + tipo;
    clearTimeout(this._t); this._t = setTimeout(() => { t.className = ''; }, 3200);
  },
  modal(html, titulo = '') {
    $('#modal-root').innerHTML = `<div class="overlay" data-act="fechar-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><button class="x" data-act="fechar-modal" aria-label="Fechar">×</button>${html}</div></div>`;
    const f = $('#modal-root .modal input:not([type=hidden]), #modal-root .modal select, #modal-root .modal textarea'); if (f && f.focus) f.focus();
  },
  close() { const m = $('#modal-root'); if (m) m.innerHTML = ''; },
  confirm(msg, aoConfirmar, rotulo = 'Confirmar') {
    this.modal(`<h2>${esc(msg)}</h2><div class="row end"><button class="btn out" data-act="fechar-modal">Cancelar</button><button class="btn" id="confirma-sim">${esc(rotulo)}</button></div>`, 'Confirmação');
    $('#confirma-sim').onclick = () => { this.close(); aoConfirmar(); };
  },
  stars: n => '★'.repeat(n) + '☆'.repeat(5 - n)
};

/* ---------- eventos globais: <… data-act="x"> chama Actions.x ; <form data-form="y"> chama Forms.y ---------- */
const Views = {}, Actions = {}, Forms = {};
Actions['fechar-modal'] = () => UI.close();
Actions.sair = () => { Auth.logout(); UI.close(); Router.ir('/'); UI.toast('Você saiu da conta.'); };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.classList.contains('overlay') && e.target !== el) return; // clique dentro do modal não fecha
  const fn = Actions[el.dataset.act]; if (fn) { if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); const fd = new FormData(f);
  if (Forms[f.dataset.form]) Forms[f.dataset.form](Object.fromEntries(fd), f, fd);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && Actions[el.dataset.change]) Actions[el.dataset.change](el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && Actions[el.dataset.input]) Actions[el.dataset.input](el, e); });

/* ---------- roteador por hash ---------- */
const Router = {
  rotas: [], saida: [], _tok: 0,
  add(padrao, fn, o = {}) {
    const chaves = [], re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, k) => { chaves.push(k); return '([^/]+)'; }) + '/?$');
    this.rotas.push({ re, chaves, fn, o });
  },
  ir(p) { if (location.hash === '#' + p) this.render(); else location.hash = '#' + p; },
  atual() { const [path, qs = ''] = (location.hash.slice(1) || '/').split('?'); return { path, q: Object.fromEntries(new URLSearchParams(qs)) }; },
  render(manter = false) {
    this.saida.forEach(f => f()); this.saida = []; UI.close();
    const { path, q } = this.atual(), tok = ++this._tok;
    for (const r of this.rotas) {
      const m = path.match(r.re); if (!m) continue;
      const params = Object.fromEntries(r.chaves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const u = Auth.user();
      if (r.o.papel && !u) { sessionStorage.setItem('acai:voltar', location.hash); return this.ir('/login'); }
      if (r.o.papel === 'admin' && u.papel !== 'admin') return Layout.mostrar('cliente', Views.acessoNegado());
      const nav = typeof r.o.nav === 'function' ? r.o.nav(params, q) : r.o.nav, lay = r.o.layout || 'cliente';
      const pintar = () => {
        if (tok !== this._tok) return;
        let html;
        try { html = r.fn(params, q); } catch (err) { console.error(err); html = Views.vazio('Algo deu errado', 'Recarregue a página. Se continuar, avise a loja.', '#/', 'Voltar ao início'); }
        Layout.mostrar(lay, html, nav, manter);
        document.title = (r.o.titulo ? r.o.titulo + ' — ' : '') + 'Açaí da Jessy';
        if (r.o.depois) r.o.depois(params, q);
      };
      if (r.o.skeleton && !manter) { Layout.mostrar(lay, Views.carregando(), nav); setTimeout(pintar, 350); } else pintar();
      return;
    }
    Layout.mostrar('cliente', Views.naoEncontrado());
  },
  start() { addEventListener('hashchange', () => this.render()); this.render(); }
};

/* ---------- ferramentas: exportar CSV e redimensionar foto enviada ---------- */
function baixarCSV(nome, linhas) {
  const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = nome; a.click(); URL.revokeObjectURL(a.href);
}
function lerFoto(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.8));
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
