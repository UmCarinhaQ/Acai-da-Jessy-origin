'use strict';
/* =========================================================================
   DADOS DE EXEMPLO — usados só na primeira abertura (depois ficam no
   localStorage do navegador). Edite os textos, preços e fotos aqui.
   Quando houver backend, estes dados passam a vir do PostgreSQL.
   ========================================================================= */
const _t = Date.now(), _min = 60000;
const _fluxo = ['aguardando', 'confirmado', 'preparo', 'entrega', 'concluido'];
const _it = (produtoId, nome, tamanho, adicionais, complementos, unit, qtd = 1) =>
  ({ produtoId, nome, tamanho, adicionais, adicionaisIds: [], complementos, unit, qtd });

function _pedido(id, cli, nome, itens, tipo, bairro, taxa, forma, troco, status, minAtras) {
  const subtotal = itens.reduce((s, i) => s + i.unit * i.qtd, 0);
  const criado = _t - minAtras * _min;
  return {
    id, clienteId: cli, clienteNome: nome, telefone: '(51) 99999-0000', itens,
    entrega: { tipo, bairro, endereco: tipo === 'entrega' ? 'Rua Exemplo, 123' : '' },
    pagamento: { forma, troco }, subtotal, taxa, total: subtotal + taxa, obs: '',
    status, criadoEm: criado,
    historico: _fluxo.slice(0, _fluxo.indexOf(status) + 1).map((s, i) => ({ status: s, em: criado + i * 5 * _min }))
  };
}
const _nomes = [[2, 'Marina S.'], [3, 'Carlos E.'], [4, 'Ana P.'], [5, 'Lucas R.']];
// pedidos antigos (para o gráfico do financeiro): [dias atrás, valor, forma]
const _antigos = [[1, 45, 'pix'], [1, 28, 'dinheiro'], [2, 40, 'pix'], [2, 20, 'pix'], [3, 50, 'pix'], [3, 23, 'dinheiro'],
  [4, 25, 'pix'], [5, 45, 'pix'], [5, 14, 'dinheiro'], [6, 40, 'pix'], [6, 28, 'pix']]
  .map(([d, v, f], i) => _pedido(100 + i, _nomes[i % 4][0], _nomes[i % 4][1], [_it(1, 'Açaí', '', [], [], v)], 'retirada', '', 0, f, 0, 'concluido', d * 1440 + 120));

const SEED = {
  loja: {
    nome: 'Açaí da Jessy', cidade: 'São Leopoldo, RS',
    whatsapp: '5551999225507', whatsappExibir: '(51) 99922-5507', instagram: 'acai_da_jessy',
    endereco: 'Informe o endereço da loja em Painel > Entregas',
    abre: '14:00', fecha: '22:00', aberta: true,
    lat: -29.7604, lng: -51.1472,
    historia: 'Conte aqui, em duas ou três frases, como a Jessy começou o negócio. Edite este texto em js/data.js.',
    promocao: { ativa: true, titulo: 'Promoção de reinauguração', texto: 'Açaí de 500 ml por R$ 14,99', obs: 'No dinheiro ou Pix' }
  },
  categorias: [{ id: 'acai', nome: 'Açaí', ativa: true }, { id: 'bebidas', nome: 'Bebidas', ativa: true }],
  produtos: [{
    id: 1, categoria: 'acai', nome: 'Açaí', descricao: 'Açaí cremoso com acompanhamentos à sua escolha.',
    foto: '', ativo: true, popular: true, estoque: 60,
    tamanhos: [{ nome: '300 ml', preco: 14, acomp: 2 }, { nome: '500 ml', preco: 20, acomp: 3 }, { nome: '700 ml', preco: 25, acomp: 3 }]
  }],
  adicionais: [
    { id: 'a1', nome: 'Leite condensado', preco: 3, estoque: 30, ativo: true },
    { id: 'a2', nome: 'Morango', preco: 3, estoque: 0, ativo: true }
  ],
  complementos: [
    { id: 'c1', nome: 'Granola', ativo: true }, { id: 'c2', nome: 'Banana', ativo: true },
    { id: 'c3', nome: 'Paçoca', ativo: true }, { id: 'c4', nome: 'Leite em pó', ativo: true }
  ],
  bairros: [
    { id: 1, nome: 'Centro', taxa: 10, ativo: true },
    { id: 2, nome: 'Campina', taxa: 7, ativo: true },
    { id: 3, nome: 'Esteio', taxa: 35, ativo: true }
  ],
  faq: [
    { p: 'Quais formas de pagamento vocês aceitam?', r: 'Dinheiro (com troco) e Pix.' },
    { p: 'Posso retirar o pedido na loja?', r: 'Pode. No carrinho, escolha "Retirada" e não pagamos taxa de entrega.' },
    { p: 'Como funciona a taxa de entrega?', r: 'A taxa depende do bairro. Ela aparece no carrinho antes de você finalizar.' },
    { p: 'Como acompanho meu pedido?', r: 'Entre na sua conta e abra "Meus pedidos". O status muda conforme preparamos e enviamos.' }
  ],
  avaliacoes: [
    { id: 1, nome: 'Marina S.', nota: 5, texto: 'Açaí cremoso e a entrega chegou rapidinho.', em: _t - 2 * 86400000, visivel: true, pedidoId: 0 },
    { id: 2, nome: 'Carlos E.', nota: 5, texto: 'Ótimo custo-benefício, voltarei a pedir.', em: _t - 4 * 86400000, visivel: true, pedidoId: 0 },
    { id: 3, nome: 'Ana P.', nota: 4, texto: 'Muito bom! Só gostaria de mais opções de adicionais.', em: _t - 6 * 86400000, visivel: true, pedidoId: 0 }
  ],
  // DEMONSTRAÇÃO: senhas em texto puro só existem aqui. No backend use bcrypt/argon2.
  usuarios: [
    { id: 1, nome: 'Administrador', email: 'admin@acaidajessy.com', telefone: '', senha: 'admin123', papel: 'admin', enderecos: [] },
    { id: 2, nome: 'Marina S.', email: 'marina@email.com', telefone: '(51) 99999-0001', senha: '123456', papel: 'cliente',
      enderecos: [{ id: 1, rotulo: 'Casa', rua: 'Rua Exemplo', numero: '123', bairro: 'Centro', complemento: 'Apto 2' }] },
    { id: 3, nome: 'Carlos E.', email: 'carlos@email.com', telefone: '(51) 99999-0002', senha: '123456', papel: 'cliente', enderecos: [] },
    { id: 4, nome: 'Ana P.', email: 'ana@email.com', telefone: '(51) 99999-0003', senha: '123456', papel: 'cliente', enderecos: [] },
    { id: 5, nome: 'Lucas R.', email: 'lucas@email.com', telefone: '(51) 99999-0004', senha: '123456', papel: 'cliente', enderecos: [] }
  ],
  pedidos: [
    _pedido(125, 5, 'Lucas R.', [_it(1, 'Açaí 700 ml', '700 ml', [], ['Granola'], 25)], 'entrega', 'Esteio', 35, 'pix', 0, 'entrega', 70),
    _pedido(126, 4, 'Ana P.', [_it(1, 'Açaí 500 ml', '500 ml', [], ['Banana', 'Paçoca'], 20)], 'retirada', '', 0, 'pix', 0, 'concluido', 50),
    _pedido(127, 3, 'Carlos E.', [_it(1, 'Açaí 500 ml', '500 ml', [], ['Granola'], 20)], 'entrega', 'Campina', 7, 'dinheiro', 50, 'aguardando', 12),
    _pedido(128, 2, 'Marina S.', [_it(1, 'Açaí 500 ml', '500 ml', ['Leite condensado'], ['Granola', 'Banana'], 23),
      _it(1, 'Açaí 700 ml', '700 ml', [], ['Paçoca', 'Banana', 'Granola'], 25)], 'entrega', 'Centro', 10, 'pix', 0, 'preparo', 25),
    ..._antigos
  ]
};
