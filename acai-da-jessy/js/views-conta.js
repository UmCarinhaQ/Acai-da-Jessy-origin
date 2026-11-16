'use strict';
/* =========================================================================
   LOGIN, CADASTRO, RECUPERAR SENHA, ÁREA DO CLIENTE E ACOMPANHAMENTO
   ========================================================================= */
const voltarOu = padrao => { const v = sessionStorage.getItem('acai:voltar'); sessionStorage.removeItem('acai:voltar'); Router.ir(v ? v.slice(1) : padrao); };
const cabecalhoAuth = titulo => `<a class="marca" href="#/" style="align-self:center;flex-direction:column;gap:8px">${Layout.logo(72)}<span>Açaí da Jessy</span></a><h1 style="font-size:1.4rem;text-align:center">${titulo}</h1>`;

Views.login = () => `<div class="card col">${cabecalhoAuth('Entrar')}
  <form class="col" data-form="login" novalidate>
    <label class="campo">E-mail<input name="email" type="email" required autocomplete="email"></label>
    <label class="campo">Senha<input name="senha" type="password" required autocomplete="current-password"></label>
    <p class="erro-txt" id="login-erro" role="alert" hidden></p><button class="btn bloco">Entrar</button></form>
  <div class="row between peq"><a class="roxo neg" href="#/recuperar">Esqueci a senha</a><a class="roxo neg" href="#/cadastro">Criar conta</a></div>
  <p class="demo"><strong>Demonstração</strong> (apague este aviso antes de publicar)<br>Administrador: admin@acaidajessy.com, senha admin123<br>Cliente: marina@email.com, senha 123456</p>
  <a class="peq suave" href="#/" style="text-align:center">Voltar ao site</a></div>`;
Forms.login = d => {
  if (!Auth.login(d.email, d.senha)) return erro('#login-erro', 'E-mail ou senha incorretos. Confira os dados e tente de novo.');
  voltarOu(Auth.isAdmin() ? '/admin' : '/conta');
};

Views.cadastro = () => `<div class="card col">${cabecalhoAuth('Criar conta')}
  <form class="col" data-form="cadastro" novalidate>
    <label class="campo">Nome<input name="nome" required autocomplete="name"></label>
    <label class="campo">E-mail<input name="email" type="email" required autocomplete="email"></label>
    <label class="campo">Telefone com DDD<input name="telefone" type="tel" autocomplete="tel" placeholder="(51) 99999-9999"></label>
    <label class="campo">Senha (mínimo 6 caracteres)<input name="senha" type="password" required minlength="6" autocomplete="new-password"></label>
    <label class="campo">Repita a senha<input name="confirmar" type="password" required autocomplete="new-password"></label>
    <p class="erro-txt" id="cad-erro" role="alert" hidden></p><button class="btn bloco">Criar minha conta</button></form>
  <p class="peq" style="text-align:center">Já tem conta? <a class="roxo neg" href="#/login">Entrar</a></p></div>`;
Forms.cadastro = d => {
  if (d.nome.trim().length < 2) return erro('#cad-erro', 'Informe seu nome.');
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return erro('#cad-erro', 'Informe um e-mail válido.');
  if (d.senha.length < 6) return erro('#cad-erro', 'A senha precisa ter pelo menos 6 caracteres.');
  if (d.senha !== d.confirmar) return erro('#cad-erro', 'As senhas não são iguais.');
  const m = Auth.register(d); if (m) return erro('#cad-erro', m);
  UI.toast('Conta criada. Bem-vindo!'); voltarOu('/conta');
};

Views.recuperar = () => `<div class="card col">${cabecalhoAuth('Recuperar senha')}
  <form class="col" data-form="recuperar" novalidate><p class="suave">Informe o e-mail da sua conta. Enviaremos as instruções para criar uma nova senha.</p>
    <label class="campo">E-mail<input name="email" type="email" required autocomplete="email"></label><button class="btn bloco">Enviar instruções</button></form>
  <div id="rec-ok" class="col" hidden><div class="alerta ok">Se este e-mail estiver cadastrado, você receberá as instruções em instantes.</div>
    <p class="demo">Demonstração: nenhum e-mail é enviado de verdade. Com o backend, envie um link com token que expira.</p></div>
  <a class="roxo neg peq" href="#/login" style="text-align:center">Voltar para o login</a></div>`;
Forms.recuperar = (d, f) => { f.hidden = true; $('#rec-ok').hidden = false; };

/* ---------- área do cliente ---------- */
const Conta = {
  perfil: u => `<form class="card col" data-form="perfil" novalidate><h2>Meus dados</h2>
    <label class="campo">Nome<input name="nome" required value="${esc(u.nome)}"></label>
    <label class="campo">Telefone<input name="telefone" type="tel" value="${esc(u.telefone)}"></label>
    <label class="campo">E-mail<input value="${esc(u.email)}" disabled></label>
    <label class="campo">Nova senha (deixe em branco para manter)<input name="senha" type="password" minlength="6" autocomplete="new-password"></label>
    <p class="erro-txt" id="perfil-erro" role="alert" hidden></p>
    <div class="row quebra"><button class="btn">Salvar alterações</button><button type="button" class="btn out" data-act="sair">Sair da conta</button></div></form>`,
  enderecos: u => `<section class="col"><div class="row between"><h2>Meus endereços</h2><button class="btn sm" data-act="end-novo">Adicionar endereço</button></div>
    ${(u.enderecos || []).length ? u.enderecos.map(a => `<article class="card row between"><div><p class="neg">${esc(a.rotulo)}</p><p class="suave peq">${esc(a.rua)}, ${esc(a.numero)}${a.complemento ? ', ' + esc(a.complemento) : ''}. Bairro ${esc(a.bairro)}.</p></div><button class="chip" data-act="end-rem" data-id="${a.id}">Remover</button></article>`).join('')
      : Views.vazio('Nenhum endereço salvo', 'Salve um endereço para agilizar os próximos pedidos.')}</section>`,
  pedidos: u => {
    const l = Pedidos.todos().filter(p => p.clienteId === u.id).sort((a, b) => b.criadoEm - a.criadoEm), avs = DB.get('avaliacoes', []);
    return `<section class="col"><h2>Meus pedidos</h2>${l.length ? l.map(p => `<article class="card col"><div class="row between"><p class="neg">Pedido ${num4(p.id)}</p><span class="badge b-${STATUS[p.status].cls}">${esc(nomeStatus(p, p.status))}</span></div>
      <p class="suave peq">${fmtDataHora(p.criadoEm)}. ${p.itens.reduce((s, i) => s + i.qtd, 0)} itens, total ${R$(p.total)}.</p>
      <div class="row quebra"><a class="btn out sm" href="#/pedido/${p.id}">Acompanhar</a>${p.status === 'concluido' && !avs.some(a => a.pedidoId === p.id) ? `<button class="btn sm" data-act="avaliar" data-pedido="${p.id}">Avaliar</button>` : ''}</div></article>`).join('')
      : Views.vazio('Você ainda não fez pedidos', 'Que tal começar pelo cardápio?', '#/cardapio', 'Ver cardápio')}</section>`;
  },
  avaliacoes: u => { const l = DB.get('avaliacoes', []).filter(a => a.clienteId === u.id); return `<section class="col"><h2>Minhas avaliações</h2>${l.length ? l.map(Views.cartaoAval).join('') : Views.vazio('Nenhuma avaliação ainda', 'Depois de receber um pedido, conte como foi.')}</section>`; }
};
Views.conta = ({ aba = 'perfil' }) => {
  if (!Conta[aba]) return Views.naoEncontrado();
  const u = Auth.user(), tabs = [['perfil', 'Perfil'], ['enderecos', 'Endereços'], ['pedidos', 'Pedidos'], ['avaliacoes', 'Avaliações']];
  return `<h1>Olá, ${esc(u.nome.split(' ')[0])}</h1><div class="chips" style="margin:16px 0">${tabs.map(([k, t]) => `<a class="chip ${aba === k ? 'on' : ''}" href="#/conta${k === 'perfil' ? '' : '/' + k}">${t}</a>`).join('')}</div>
    <div style="max-width:640px">${Conta[aba](u)}</div>`;
};
Forms.perfil = d => {
  const u = Auth.user(); if (d.nome.trim().length < 2) return erro('#perfil-erro', 'Informe seu nome.');
  if (d.senha && d.senha.length < 6) return erro('#perfil-erro', 'A nova senha precisa ter pelo menos 6 caracteres.');
  u.nome = d.nome.trim(); u.telefone = d.telefone.trim(); if (d.senha) u.senha = d.senha;
  Auth.salvarUsuario(u); UI.toast('Dados atualizados.'); Router.render(true);
};
Actions['end-novo'] = () => UI.modal(`<h2>Novo endereço</h2><form class="col" data-form="endereco" novalidate>
  <label class="campo">Nome do endereço<input name="rotulo" required placeholder="Casa, trabalho..."></label>
  <div class="grid2"><label class="campo">Rua<input name="rua" required></label><label class="campo">Número<input name="numero" required></label></div>
  <label class="campo">Bairro<select name="bairro">${DB.get('bairros', []).filter(b => b.ativo).map(b => `<option>${esc(b.nome)}</option>`).join('')}</select></label>
  <label class="campo">Complemento<input name="complemento"></label><p class="erro-txt" id="end-erro" role="alert" hidden></p><button class="btn">Salvar endereço</button></form>`, 'Novo endereço');
Forms.endereco = d => {
  if (!d.rotulo.trim() || !d.rua.trim() || !d.numero.trim()) return erro('#end-erro', 'Preencha o nome, a rua e o número.');
  const u = Auth.user(), ends = u.enderecos || []; u.enderecos = [...ends, { id: DB.nextId(ends), rotulo: d.rotulo.trim(), rua: d.rua.trim(), numero: d.numero.trim(), bairro: d.bairro || '', complemento: d.complemento.trim() }];
  Auth.salvarUsuario(u); UI.close(); UI.toast('Endereço salvo.'); Router.render(true);
};
Actions['end-rem'] = el => UI.confirm('Remover este endereço?', () => {
  const u = Auth.user(); u.enderecos = (u.enderecos || []).filter(a => a.id !== Number(el.dataset.id)); Auth.salvarUsuario(u); UI.toast('Endereço removido.'); Router.render(true);
}, 'Remover');

/* ---------- acompanhamento do pedido ---------- */
Views.pedido = ({ id }, q) => {
  const p = Pedidos.achar(id), u = Auth.user(); if (!p) return Views.naoEncontrado();
  if (p.clienteId !== u.id && u.papel !== 'admin') return Views.acessoNegado();
  const L = Loja.dados(), idx = FLUXO.indexOf(p.status), rec = p.status === 'recusado';
  const passo = s => {
    const i = FLUXO.indexOf(s), h = p.historico.find(x => x.status === s);
    const cls = rec || i < idx || (i === idx && s === 'concluido') ? 'feito' : i === idx ? 'atual' : '';
    return `<div class="linha ${cls}"><div class="pt"><span class="bola"></span><span class="fio"></span></div><div><p class="t">${esc(nomeStatus(p, s))}</p><p class="peq suave">${h ? fmtHora(h.em) : 'Em breve'}</p></div></div>`;
  };
  return `<h1>Pedido ${num4(p.id)}</h1>
  ${q.novo ? '<div class="alerta ok" style="margin-top:12px">Pedido registrado! Abrimos o WhatsApp da loja com a mensagem pronta. Se ele não abriu, use o botão "Enviar no WhatsApp" abaixo.</div>' : ''}
  <div class="layout2" style="margin-top:16px"><div class="col">
    ${rec ? '<div class="alerta erro">Este pedido foi recusado pela loja. Fale com a gente pelo WhatsApp para saber o motivo.</div>' : `<div class="status-topo"><p class="peq neg">Status atual</p><p style="font-size:1.35rem;font-weight:800">${esc(nomeStatus(p, p.status))}</p><p class="peq">Pedido feito às ${fmtHora(p.criadoEm)}</p></div>`}
    <section class="card" style="padding-bottom:0">${(rec ? ['aguardando'] : FLUXO).map(passo).join('')}</section></div>
  <aside class="card col resumo"><h2>Resumo</h2>
    ${p.itens.map(i => `<div><div class="lin-r"><span>${i.qtd}x ${esc(i.nome)}</span><span>${R$(i.unit * i.qtd)}</span></div>${extrasHtml(i)}</div>`).join('')}
    <div class="lin-r"><span>Taxa de entrega</span><span>${p.entrega.tipo === 'entrega' ? R$(p.taxa) : 'Grátis'}</span></div>
    <div class="lin-r total"><span>Total</span><span>${R$(p.total)}</span></div>
    <p class="peq suave">${p.entrega.tipo === 'entrega' ? `Entrega em ${esc(p.entrega.endereco)}, bairro ${esc(p.entrega.bairro)}.` : 'Retirada na loja.'} Pagamento: ${esc(FORMAS[p.pagamento.forma])}${p.pagamento.troco ? `, troco para ${R$(p.pagamento.troco)}` : ''}.</p>
    <a class="btn out bloco" target="_blank" rel="noopener" href="${esc(Pedidos.linkWhats(p))}">Enviar no WhatsApp</a>
    <a class="btn out bloco" href="${u.papel === 'admin' ? '#/admin/pedidos' : '#/conta/pedidos'}">Voltar aos pedidos</a></aside></div>`;
};
