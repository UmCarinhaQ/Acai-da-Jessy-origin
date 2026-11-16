
import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (erro) => {
  console.error('Erro inesperado no PostgreSQL:', erro);
});
