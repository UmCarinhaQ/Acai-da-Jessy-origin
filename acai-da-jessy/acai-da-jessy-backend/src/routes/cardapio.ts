import { Router } from "express";
import { pool } from "../db/pool";
const router = Router();
router.get("/", async (_req, res, next) => {
 try {
  const [categorias, produtos, adicionais, complementos, bairros, loja, faq] = await Promise.all([
   pool.query("SELECT * FROM categorias WHERE ativa=true ORDER BY id"),
   pool.query(`SELECT p.*, c.nome AS categoria, COALESCE(json_agg(json_build_object('id',t.id,'nome',t.nome,'preco',t.preco,'max_complementos',t.max_complementos)) FILTER (WHERE t.id IS NOT NULL),'[]') AS tamanhos
    FROM produtos p LEFT JOIN categorias c ON c.id=p.categoria_id LEFT JOIN produto_tamanhos t ON t.produto_id=p.id
    WHERE p.ativo=true GROUP BY p.id,c.nome ORDER BY p.id`),
   pool.query("SELECT id,nome,preco,estoque FROM adicionais WHERE ativo=true ORDER BY nome"),
   pool.query("SELECT id,nome FROM complementos WHERE ativo=true ORDER BY nome"),
   pool.query("SELECT id,nome,taxa FROM bairros WHERE ativo=true ORDER BY nome"),
   pool.query("SELECT * FROM loja WHERE id=1"),
   pool.query("SELECT pergunta,resposta FROM faq ORDER BY ordem")
  ]);
  res.json({ categorias: categorias.rows, produtos: produtos.rows, adicionais: adicionais.rows,
   complementos: complementos.rows, bairros: bairros.rows, loja: loja.rows[0] || null, faq: faq.rows });
 } catch(e) { next(e); }
});
export default router;