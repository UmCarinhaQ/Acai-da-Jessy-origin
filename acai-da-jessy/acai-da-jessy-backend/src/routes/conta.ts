import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { autenticar } from "../middlewares/autenticar";
const router=Router();
router.use(autenticar);
router.get("/",async(req,res,next)=>{try{
 const r=await pool.query("SELECT id,nome,email,telefone,criado_em FROM usuarios WHERE id=$1",[req.usuario!.id]);
 res.json({usuario:r.rows[0]});
}catch(e){next(e);}});
router.put("/",async(req,res,next)=>{try{
 const d=z.object({nome:z.string().min(2),telefone:z.string().max(30).optional()}).parse(req.body);
 const r=await pool.query("UPDATE usuarios SET nome=$1,telefone=$2 WHERE id=$3 RETURNING id,nome,email,telefone",[d.nome,d.telefone||null,req.usuario!.id]);
 res.json({usuario:r.rows[0]});
}catch(e){next(e);}});
router.get("/pedidos",async(req,res,next)=>{try{
 const r=await pool.query("SELECT * FROM pedidos WHERE usuario_id=$1 ORDER BY criado_em DESC",[req.usuario!.id]);
 res.json({pedidos:r.rows});
}catch(e){next(e);}});
router.get("/enderecos",async(req,res,next)=>{try{
 const r=await pool.query("SELECT * FROM enderecos WHERE usuario_id=$1 ORDER BY id DESC",[req.usuario!.id]);
 res.json({enderecos:r.rows});
}catch(e){next(e);}});
router.post("/enderecos",async(req,res,next)=>{try{
 const d=z.object({rotulo:z.string().min(1),rua:z.string().min(1),numero:z.string().min(1),bairro:z.string().min(1),complemento:z.string().optional()}).parse(req.body);
 const r=await pool.query("INSERT INTO enderecos(usuario_id,rotulo,rua,numero,bairro,complemento) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[req.usuario!.id,d.rotulo,d.rua,d.numero,d.bairro,d.complemento||null]);
 res.status(201).json({endereco:r.rows[0]});
}catch(e){next(e);}});
router.post("/avaliacoes",async(req,res,next)=>{try{
 const d=z.object({pedido_id:z.number().int().positive().optional(),nota:z.number().int().min(1).max(5),texto:z.string().min(3).max(1000)}).parse(req.body);
 const r=await pool.query("INSERT INTO avaliacoes(usuario_id,pedido_id,nome,nota,texto) VALUES($1,$2,$3,$4,$5) RETURNING *",[req.usuario!.id,d.pedido_id||null,req.usuario!.nome,d.nota,d.texto]);
 res.status(201).json({avaliacao:r.rows[0]});
}catch(e){next(e);}});
export default router;