
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './db/pool.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500'
  })
);

app.use(express.json({ limit: '100kb' }));

// Verificar conexão com o banco
app.get('/api/health', async (_req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT current_database() AS banco'
    );

    res.json({
      status: 'ok',
      mensagem: 'API conectada ao PostgreSQL!',
      banco: resultado.rows[0].banco
    });
  } catch (erro) {
    console.error('Erro ao verificar o banco:', erro);

    res.status(500).json({
      status: 'erro',
      mensagem: 'Não foi possível conectar ao banco de dados.'
    });
  }
});

// Buscar produtos e seus tamanhos
app.get('/api/produtos', async (_req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        p.id,
        p.nome,
        p.descricao,
        p.foto_url,
        p.popular,
        p.estoque,
        c.nome AS categoria,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pt.id,
              'nome', pt.nome,
              'preco', pt.preco,
              'max_complementos', pt.max_complementos
            )
          ) FILTER (WHERE pt.id IS NOT NULL),
          '[]'
        ) AS tamanhos
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN produto_tamanhos pt ON pt.produto_id = p.id
      WHERE p.ativo = true
      GROUP BY p.id, c.nome
      ORDER BY p.id
    `);

    res.json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao buscar produtos:', erro);

    res.status(500).json({
      mensagem: 'Erro ao buscar produtos.'
    });
  }
});

export default app;
