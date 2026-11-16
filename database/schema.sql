-- =====================================================================
-- Açaí da Jessy: esquema PostgreSQL (14 ou superior)
-- Uso:  psql -U postgres -d BancoAcaidaJessy -f database/schema.sql
-- =====================================================================
BEGIN;

CREATE TYPE papel_usuario   AS ENUM ('cliente', 'admin');
CREATE TYPE tipo_entrega    AS ENUM ('entrega', 'retirada');
CREATE TYPE forma_pagamento AS ENUM ('pix', 'dinheiro');
CREATE TYPE status_pedido   AS ENUM ('aguardando', 'confirmado', 'preparo', 'entrega', 'concluido', 'recusado');

CREATE TABLE usuarios (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  telefone   TEXT,
  senha_hash TEXT NOT NULL,                       -- bcrypt/argon2, nunca a senha pura
  papel      papel_usuario NOT NULL DEFAULT 'cliente',
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enderecos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rotulo      TEXT NOT NULL,
  rua         TEXT NOT NULL,
  numero      TEXT NOT NULL,
  bairro      TEXT NOT NULL,
  complemento TEXT
);

CREATE TABLE categorias (
  id    SERIAL PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  nome  TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE produtos (
  id           SERIAL PRIMARY KEY,
  categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  descricao    TEXT NOT NULL DEFAULT '',
  foto_url     TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  popular      BOOLEAN NOT NULL DEFAULT false,
  estoque      INT NOT NULL DEFAULT 0 CHECK (estoque >= 0)
);

CREATE TABLE produto_tamanhos (
  id               SERIAL PRIMARY KEY,
  produto_id       INT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL DEFAULT '',        -- '' = produto sem tamanho
  preco            NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  max_complementos INT NOT NULL DEFAULT 3
);

CREATE TABLE adicionais (
  id      SERIAL PRIMARY KEY,
  nome    TEXT NOT NULL,
  preco   NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  estoque INT NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  ativo   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE complementos (
  id    SERIAL PRIMARY KEY,
  nome  TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE bairros (
  id    SERIAL PRIMARY KEY,
  nome  TEXT NOT NULL UNIQUE,
  taxa  NUMERIC(10,2) NOT NULL CHECK (taxa >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE loja (                                 -- uma única linha
  id        SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome      TEXT NOT NULL,
  cidade    TEXT NOT NULL,
  endereco  TEXT,
  whatsapp  TEXT NOT NULL,                          -- só dígitos, com 55
  instagram TEXT,
  abre      TIME NOT NULL,
  fecha     TIME NOT NULL,
  aberta    BOOLEAN NOT NULL DEFAULT true,
  lat       NUMERIC(9,6),
  lng       NUMERIC(9,6),
  historia  TEXT
);

CREATE TABLE pedidos (
  id           SERIAL PRIMARY KEY,
  usuario_id   INT REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  telefone     TEXT NOT NULL,
  tipo         tipo_entrega NOT NULL,
  bairro_id    INT REFERENCES bairros(id) ON DELETE SET NULL,
  bairro_nome  TEXT,                                -- cópia: o histórico não muda se o bairro for editado
  endereco     TEXT,
  forma        forma_pagamento NOT NULL,
  troco        NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal     NUMERIC(10,2) NOT NULL,
  taxa         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total        NUMERIC(10,2) NOT NULL,
  obs          TEXT,
  status       status_pedido NOT NULL DEFAULT 'aguardando',
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedidos_status ON pedidos (status, criado_em DESC);
CREATE INDEX idx_pedidos_usuario ON pedidos (usuario_id);

CREATE TABLE pedido_itens (
  id          SERIAL PRIMARY KEY,
  pedido_id   INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id  INT REFERENCES produtos(id) ON DELETE SET NULL,
  nome        TEXT NOT NULL,
  tamanho     TEXT NOT NULL DEFAULT '',
  adicionais  TEXT[] NOT NULL DEFAULT '{}',
  complementos TEXT[] NOT NULL DEFAULT '{}',
  qtd         INT NOT NULL CHECK (qtd > 0),
  preco_unit  NUMERIC(10,2) NOT NULL
);

CREATE TABLE pedido_historico (
  id        SERIAL PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  status    status_pedido NOT NULL,
  em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE avaliacoes (
  id         SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  pedido_id  INT REFERENCES pedidos(id) ON DELETE SET NULL,
  nome       TEXT NOT NULL,
  nota       SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  texto      TEXT NOT NULL,
  visivel    BOOLEAN NOT NULL DEFAULT true,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faq (
  id       SERIAL PRIMARY KEY,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  ordem    INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- Dados iniciais (iguais aos de js/data.js)
-- ---------------------------------------------------------------------
INSERT INTO loja (nome, cidade, whatsapp, instagram, abre, fecha, aberta, lat, lng, historia) VALUES
  ('Açaí da Jessy', 'São Leopoldo, RS', '5551999225507', 'acai_da_jessy', '14:00', '22:00', true, -29.7604, -51.1472,
   'Conte aqui a história da Jessy.');

INSERT INTO categorias (slug, nome) VALUES ('acai', 'Açaí'), ('bebidas', 'Bebidas');

INSERT INTO produtos (categoria_id, nome, descricao, popular, estoque)
  VALUES ((SELECT id FROM categorias WHERE slug = 'acai'), 'Açaí', 'Açaí cremoso com acompanhamentos à sua escolha.', true, 60);

INSERT INTO produto_tamanhos (produto_id, nome, preco, max_complementos) VALUES
  (1, '300 ml', 14.00, 2), (1, '500 ml', 20.00, 3), (1, '700 ml', 25.00, 3);

INSERT INTO adicionais (nome, preco, estoque) VALUES ('Leite condensado', 3.00, 30), ('Morango', 3.00, 0);
INSERT INTO complementos (nome) VALUES ('Granola'), ('Banana'), ('Paçoca'), ('Leite em pó');
INSERT INTO bairros (nome, taxa) VALUES ('Centro', 10.00), ('Campina', 7.00), ('Esteio', 35.00);

INSERT INTO faq (pergunta, resposta, ordem) VALUES
  ('Quais formas de pagamento vocês aceitam?', 'Dinheiro (com troco) e Pix.', 1),
  ('Posso retirar o pedido na loja?', 'Pode. No carrinho, escolha "Retirada" e não pagamos taxa de entrega.', 2),
  ('Como funciona a taxa de entrega?', 'A taxa depende do bairro. Ela aparece no carrinho antes de você finalizar.', 3),
  ('Como acompanho meu pedido?', 'Entre na sua conta e abra "Meus pedidos".', 4);

-- Administrador inicial: gere o hash com bcrypt no backend e troque abaixo. NÃO use senha pura.
-- INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES ('Administrador', 'admin@acaidajessy.com', '<hash-bcrypt>', 'admin');

COMMIT;
