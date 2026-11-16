
import 'dotenv/config';
import app from './app.js';
import { pool } from './db/pool.js';

const PORT = Number(process.env.PORT) || 3000;

async function iniciarServidor() {
  try {
    await pool.query('SELECT 1');

    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log('Conexão com PostgreSQL estabelecida!');
    });
  } catch (erro) {
    console.error('Falha ao conectar ao PostgreSQL:', erro);
    await pool.end();
    process.exit(1);
  }
}

iniciarServidor();
