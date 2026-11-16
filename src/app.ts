
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

export default app;
