import { Router } from "express";
import { pool } from "../db/pool";
import { autenticar } from "../middlewares/autenticar";
import { apenasAdmin } from "../middlewares/apenasAdmin";
import { z } from "zod";
const router=Router();
router.use(autenticar,apenasAdmin);
router.get("/pedidos",async(_req,res,next)=>{try{
 const r=await pool.query("SELECT * FROM pedidos ORDER BY criado_em DESC LIMIT 200");
 res.json({pedidos:r.rows});
}catch(e){next(e);}});
router.patch("/pedidos/:id/status",async(req,res,next)=>{const c=await pool.connect();try{
 const status=z.enum(["aguardando","confirmado","preparo","entrega","concluido","recusado"]).parse(req.body.status);
 await c.query("BEGIN");
 const r=await c.query("UPDATE pedidos SET status=$1 WHERE id=$2 RETURNING *",[status,Number(req.params.id)]);
 if(!r.rowCount){await c.query("ROLLBACK");return res.status(404).json({erro:"Pedido não encontrado."});}
 await c.query("INSERT INTO pedido_historico(pedido_id,status) VALUES($1,$2)",[r.rows[0].id,status]);
 await c.query("COMMIT");res.json({pedido:r.rows[0]});
}catch(e){await c.query("ROLLBACK");next(e);}finally{c.release();}});
router.get("/produtos",async(_req,res,next)=>{try{const r=await pool.query("SELECT * FROM produtos ORDER BY id");res.json({produtos:r.rows});}catch(e){next(e);}});
router.post("/produtos",async(req,res,next)=>{try{
 const d=z.object({categoria_id:z.number().int().positive().nullable().optional(),nome:z.string().min(1),descricao:z.string().optional(),foto_url:z.string().url().nullable().optional(),estoque:z.number().int().min(0).default(0),popular:z.boolean().default(false)}).parse(req.body);
 const r=await pool.query("INSERT INTO produtos(categoria_id,nome,descricao,foto_url,estoque,popular) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[d.categoria_id??null,d.nome,d.descricao||"",d.foto_url??null,d.estoque,d.popular]);
 res.status(201).json({produto:r.rows[0]});
}catch(e){next(e);}});
router.put("/produtos/:id",async(req,res,next)=>{try{
 const d=z.object({categoria_id:z.number().int().positive().nullable(),nome:z.string().min(1),descricao:z.string(),foto_url:z.string().url().nullable(),ativo:z.boolean(),popular:z.boolean(),estoque:z.number().int().min(0)}).parse(req.body);
 const r=await pool.query("UPDATE produtos SET categoria_id=$1,nome=$2,descricao=$3,foto_url=$4,ativo=$5,popular=$6,estoque=$7 WHERE id=$8 RETURNING *",[d.categoria_id,d.nome,d.descricao,d.foto_url,d.ativo,d.popular,d.estoque,Number(req.params.id)]);
 if(!r.rowCount)return res.status(404).json({erro:"Produto não encontrado."});res.json({produto:r.rows[0]});
}catch(e){next(e);}});
router.delete("/produtos/:id",async(req,res,next)=>{try{const r=await pool.query("UPDATE produtos SET ativo=false WHERE id=$1 RETURNING id",[Number(req.params.id)]);if(!r.rowCount)return res.status(404).json({erro:"Produto não encontrado."});res.json({mensagem:"Produto desativado."});}catch(e){next(e);}});
router.get("/financeiro",async(_req,res,next)=>{try{
 const r=await pool.query(`SELECT COUNT(*)::int AS quantidade,COALESCE(SUM(total),0)::numeric(12,2) AS faturamento
 FROM pedidos WHERE status='concluido' AND criado_em >= date_trunc('month',now())`);
 res.json({mes:r.rows[0]});
}catch(e){next(e);}});
router.get("/clientes",async(_req,res,next)=>{try{const r=await pool.query("SELECT id,nome,email,telefone,criado_em FROM usuarios WHERE papel='cliente' ORDER BY criado_em DESC");res.json({clientes:r.rows});}catch(e){next(e);}});
router.get("/avaliacoes",async(_req,res,next)=>{try{const r=await pool.query("SELECT * FROM avaliacoes ORDER BY criado_em DESC");res.json({avaliacoes:r.rows});}catch(e){next(e);}});
router.patch("/avaliacoes/:id",async(req,res,next)=>{try{const visivel=z.boolean().parse(req.body.visivel);const r=await pool.query("UPDATE avaliacoes SET visivel=$1 WHERE id=$2 RETURNING *",[visivel,Number(req.params.id)]);if(!r.rowCount)return res.status(404).json({erro:"Avaliação não encontrada."});res.json({avaliacao:r.rows[0]});}catch(e){next(e);}});
export default router;