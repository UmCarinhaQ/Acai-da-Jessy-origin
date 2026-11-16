
'use strict';

/* =========================================================================
   ROTAS E INICIALIZAÇÃO
   ========================================================================= */

DB.init();

// Site do cliente
Router.add('/', Views.home, { nav: 'inicio' });

Router.add('/cardapio', Views.cardapio, {
  nav: 'cardapio',
  titulo: 'Cardápio',
  skeleton: true
});

Router.add('/produto/:id', Views.produto, {
  nav: 'cardapio',
  titulo: 'Produto'
});

Router.add('/carrinho', Views.carrinho, {
  nav: 'carrinho',
  titulo: 'Carrinho'
});

Router.add('/checkout', Views.checkout, {
  nav: 'carrinho',
  titulo: 'Finalizar pedido',
  papel: 'cliente'
});

Router.add('/contato', Views.contato, {
  nav: 'contato',
  titulo: 'Contato'
});

// Acesso
Router.add('/login', Views.login, {
  layout: 'solo',
  titulo: 'Entrar'
});

Router.add('/cadastro', Views.cadastro, {
  layout: 'solo',
  titulo: 'Criar conta'
});

Router.add('/recuperar', Views.recuperar, {
  layout: 'solo',
  titulo: 'Recuperar senha'
});

// Área do cliente
Router.add('/conta', Views.conta, {
  nav: 'perfil',
  titulo: 'Minha conta',
  papel: 'cliente'
});

Router.add('/conta/:aba', Views.conta, {
  nav: p => p.aba === 'pedidos' ? 'pedidos' : 'perfil',
  titulo: 'Minha conta',
  papel: 'cliente'
});

Router.add('/pedido/:id', Views.pedido, {
  nav: 'pedidos',
  titulo: 'Acompanhar pedido',
  papel: 'cliente',

  depois: ({ id }) => {
    let ultimo = (Pedidos.achar(id) || {}).status;

    const t = setInterval(() => {
      const p = Pedidos.achar(id);

      if (p && p.status !== ultimo) {
        ultimo = p.status;
        Router.render(true);
      }
    }, 4000);

    Router.saida.push(() => clearInterval(t));
  }
});

// Painel administrativo
const adm = (rota, fn, nav, extra = {}) => {
  Router.add('/admin' + rota, fn, {
    layout: 'admin',
    papel: 'admin',
    nav,
    titulo: 'Admin',
    ...extra
  });
};

adm('', Views.adminPainel, 'painel', { skeleton: true });
adm('/pedidos', Views.adminPedidos, 'pedidos', { skeleton: true });
adm('/produtos', Views.adminProdutos, 'produtos');
adm('/categorias', Views.adminCategorias, 'categorias');
adm('/estoque', Views.adminEstoque, 'estoque');
adm('/clientes', Views.adminClientes, 'clientes');
adm('/avaliacoes', Views.adminAvaliacoes, 'avaliacoes');
adm('/financeiro', Views.adminFinanceiro, 'financeiro');
adm('/entregas', Views.adminEntregas, 'entregas');

// Inicialização do site
async function iniciarSite() {
  console.log('Iniciando site...');

  try {
    const produtos = await carregarProdutosAPI();

    if (produtos) {
      console.log('Produtos carregados do PostgreSQL:', produtos);
    } else {
      console.warn('Não foi possível carregar os produtos da API.');
    }
  } catch (erro) {
    console.error('Erro na inicialização:', erro);
  }

  Router.start();
}

iniciarSite();
