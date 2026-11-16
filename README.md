# Açaí da Jessy: site de pedidos e painel administrativo

Site completo feito só com **HTML, CSS e JavaScript** (sem instalar nada). Funciona como demonstração
no próprio navegador: os dados ficam no `localStorage`. Está organizado para, depois, ganhar um
backend (Node + Express) e o banco PostgreSQL (veja `docs/ARQUITETURA.md` e `database/schema.sql`).

## Como abrir

- **Mais simples:** dê dois cliques em `index.html`.
- **Recomendado (VS Code):** instale a extensão *Live Server* e clique em "Go Live".
- **Pelo terminal (PowerShell), dentro da pasta do projeto:**
  ```powershell
  npx serve .
  ```
  ou, se tiver Python: `python -m http.server 5500` e abra http://localhost:5500

As fontes e o mapa carregam da internet. Sem conexão, o site funciona com fonte padrão e sem mapa.

## Acessos de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador (painel em `#/admin`) | admin@acaidajessy.com | admin123 |
| Cliente | marina@email.com | 123456 |

Remova o aviso de demonstração da tela de login (`js/views-conta.js`, classe `demo`) antes de publicar.

## Estrutura de pastas

```
acai-da-jessy/
├── index.html              Página única; carrega CSS e scripts
├── css/
│   ├── style.css           Identidade visual, cliente, componentes, responsivo (mobile-first)
│   └── admin.css           Painel administrativo (menu lateral no PC, barra inferior no celular)
├── js/
│   ├── data.js             Dados de exemplo: loja, produtos, preços, bairros, FAQ, avaliações, pedidos
│   ├── core.js             Utilidades, "banco" (localStorage), carrinho, login, pedidos, roteador, eventos
│   ├── layout.js           Topo, menus, rodapé, menu lateral do admin
│   ├── views-cliente.js    Home, cardápio, produto, carrinho, checkout, contato, erros, estados vazios
│   ├── views-conta.js      Login, cadastro, recuperar senha, área do cliente, acompanhamento do pedido
│   ├── views-admin.js      Painel, pedidos, produtos, categorias, estoque, clientes, avaliações, financeiro, entregas
│   └── main.js             Lista de rotas e inicialização
├── assets/img/
│   ├── logo.jpg            Logo da marca
│   └── produtos/           Coloque aqui as fotos dos produtos
├── database/schema.sql     Banco PostgreSQL pronto para a próxima etapa
└── docs/ARQUITETURA.md     Plano do backend, rotas da API e checklist de produção
```

## Telas (rotas)

| Rota | Tela |
|---|---|
| `#/` | Home: marca, promoção, mais pedidos, história, avaliações |
| `#/cardapio` | Busca, categorias, ordenação, só disponíveis |
| `#/produto/1?t=1` | Tamanhos, adicionais, complementos, quantidade |
| `#/carrinho` | Quantidades, entrega ou retirada, bairro, taxa, total |
| `#/checkout` | Endereço, pagamento (Pix ou dinheiro com troco), confirmação e WhatsApp |
| `#/login`, `#/cadastro`, `#/recuperar` | Acesso |
| `#/conta`, `#/conta/enderecos`, `#/conta/pedidos`, `#/conta/avaliacoes` | Área do cliente |
| `#/pedido/129` | Acompanhamento em 5 etapas (atualiza sozinho) |
| `#/contato` | Horários, WhatsApp, mapa, perguntas frequentes, avaliações |
| `#/admin` e `#/admin/pedidos, produtos, categorias, estoque, clientes, avaliacoes, financeiro, entregas` | Painel (só administrador) |
| qualquer outra | 404. Cliente tentando abrir `#/admin` vê "Acesso negado" |

## Como personalizar

- **Textos, preços, bairros, horário, WhatsApp, promoção, história:** `js/data.js`.
  Os dados de exemplo só são gravados na primeira abertura. Depois de editar `data.js`, abra o console do
  navegador (F12) e rode `DB.reset()` para recarregar tudo. Ou use o painel admin, que edita sem mexer em código.
- **Fotos dos produtos:** no painel, em Produtos, use "Editar" e escolha a foto (ela é reduzida automaticamente).
  Ou salve o arquivo em `assets/img/produtos/` e informe `foto: 'assets/img/produtos/acai-500.jpg'` em `data.js`.
- **Cores:** variáveis no começo de `css/style.css` (`--roxo`, `--creme` e outras).
- **Endereço e mapa da loja:** painel, em Entregas.
- **Nova página:** veja o comentário no topo de `js/main.js`.

## Como o pedido funciona hoje

1. O cliente monta o pedido, faz login e confirma no checkout.
2. O pedido é gravado com status "Aguardando confirmação", o estoque dá baixa e abre o WhatsApp da loja
   com a mensagem pronta.
3. No painel, a loja confirma, prepara, envia e conclui. O cliente vê a mudança na tela de acompanhamento.

## O que é demonstração e precisa mudar para produção

| Hoje (demo) | Em produção |
|---|---|
| Dados no `localStorage` de cada navegador | PostgreSQL, acessado por API |
| Senhas em texto no navegador | Hash (bcrypt/argon2) no servidor |
| "Login" de admin só esconde telas | Servidor valida o papel em cada rota da API |
| Preços e totais calculados no navegador | Servidor recalcula tudo e valida estoque |
| Recuperar senha não envia e-mail | E-mail com link de token que expira |

Detalhes e checklist completo em `docs/ARQUITETURA.md`.
