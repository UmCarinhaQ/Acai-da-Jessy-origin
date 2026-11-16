import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { autenticar } from "../middlewares/autenticar";
const router = Router();
const schema = z.object({
 cliente_nome: z.string().min(2), telefone: z.string().min(8),
 tipo: z.enum(["entrega","retirada"]), bairro_id: z.number().int().positive().optional(),
 endereco: z.string().optional(), forma: z.enum(["pix","dinheiro"]),
 troco: z.number().nonnegative().optional(), obs: z.string().max(500).optional(),
 itens: z.array(z.object({
  produto_id: z.number().int().positive(), tamanho_id: z.number().int().positive(),
  qtd: z.number().int().min(1).max(30), adicionais: z.array(z.number().int().positive()).default([]),
  complementos: z.array(z.number().int().positive()).default([])
 })).min(1)
});
router.post("/", autenticar, async (req, res, next) => {
 const client = await pool.connect();
 try {
  const d = schema.parse(req.body);
  await client.query("BEGIN");
  let subtotal = 0;
  const itensSalvos: any[] = [];
  for (const item of d.itens) {
   const pr = await client.query(
    `SELECT p.id,p.nome,p.estoque,p.ativo,t.nome tamanho,t.preco,t.max_complementos
     FROM produtos p JOIN produto_tamanhos t ON t.produto_id=p.id
     WHERE p.id=$1 AND t.id=$2 FOR UPDATE OF p`, [item.produto_id,item.tamanho_id]);
   if (!pr.rowCount || !pr.rows[0].ativo) throw new Error("Produto ou tamanho indisponível.");
   const p = pr.rows[0];
   if (p.estoque < item.qtd) throw new Error(`Estoque insuficiente para ${p.nome}.`);
   if (item.complementos.length > p.max_complementos) throw new Error(`Limite de complementos excedido para ${p.nome}.`);
   const ad = item.adicionais.length ? await client.query(
    "SELECT id,nome,preco,estoque FROM adicionais WHERE id=ANY($1::int[]) AND ativo=true FOR UPDATE", [item.adicionais]) : { rows: [] };
   if (ad.rows.length !== new Set(item.adicionais).size) throw new Error("Adicional inválido.");
   for (const a of ad.rows) if (a.estoque < item.qtd) throw new Error(`Estoque insuficiente para ${a.nome}.`);
   const co = item.complementos.length ? await client.query(
    "SELECT id,nome FROM complementos WHERE id=ANY($1::int[]) AND ativo=true", [item.complementos]) : { rows: [] };
   if (co.rows.length !== new Set(item.complementos).size) throw new Error("Complemento inválido.");
   const adicionalTotal = ad.rows.reduce((s: number,a: any) => s + Number(a.preco),0);
   const unit = Number(p.preco) + adicionalTotal;
   subtotal += unit * item.qtd;
   itensSalvos.push({ ...item, nome:p.nome, tamanho:p.tamanho, unit, adicionais:ad.rows, complementos:co.rows });
   await client.query("UPDATE produtos SET estoque=estoque-$1 WHERE id=$2",[item.qtd,p.id]);
   for (const a of ad.rows) await client.query("UPDATE adicionais SET estoque=estoque-$1 WHERE id=$2",[item.qtd,a.id]);
  }
  let taxa = 0, bairroNome: string | null = null;
  if (d.tipo === "entrega") {
   if (!d.bairro_id || !d.endereco) throw new Error("Informe bairro e endereço para entrega.");
   const b = await client.query("SELECT nome,taxa FROM bairros WHERE id=$1 AND ativo=true",[d.bairro_id]);
   if (!b.rowCount) throw new Error("Bairro de entrega inválido.");
   bairroNome=b.rows[0].nome; taxa=Number(b.rows[0].taxa);
  }
  const total = subtotal + taxa;
  if (d.forma === "dinheiro" && (d.troco || 0) > 0 && (d.troco || 0) < total)
   throw new Error("O valor para troco precisa ser igual ou maior que o total.");
  const pedido = await client.query(
   `INSERT INTO pedidos(usuario_id,cliente_nome,telefone,tipo,bairro_id,bairro_nome,endereco,forma,troco,subtotal,taxa,total,obs)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
   [req.usuario!.id,d.cliente_nome,d.telefone,d.tipo,d.bairro_id||null,bairroNome,d.endereco||null,d.forma,d.troco||0,subtotal,taxa,total,d.obs||null]);
  for (const i of itensSalvos) {
   await client.query(
    `INSERT INTO pedido_itens(pedido_id,produto_id,nome,tamanho,adicionais,complementos,qtd,preco_unit)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [pedido.rows[0].id,i.produto_id,i.nome,i.tamanho,i.adicionais.map((a:any)=>a.nome),i.complementos.map((c:any)=>c.nome),i.qtd,i.unit]);
  }
  await client.query("INSERT INTO pedido_historico(pedido_id,status) VALUES($1,'aguardando')",[pedido.rows[0].id]);
  await client.query("COMMIT");
  res.status(201).json({ pedido: pedido.rows[0] });
 } catch(e: any) {
  await client.query("ROLLBACK");
  if (e instanceof z.ZodError) return res.status(400).json({ erro:"Dados inválidos.", detalhes:e.errors });
  res.status(400).json({ erro:e.message || "Não foi possível criar pedido." });
 } finally { client.release(); }
});
router.get("/:id", autenticar, async (req,res,next) => {
 try {
  const r=await pool.query("SELECT * FROM pedidos WHERE id=$1 AND (usuario_id=$2 OR $3='admin')",[Number(req.params.id),req.usuario!.id,req.usuario!.papel]);
  if(!r.rowCount) return res.status(404).json({erro:"Pedido não encontrado."});
  const itens=await pool.query("SELECT * FROM pedido_itens WHERE pedido_id=$1",[r.rows[0].id]);
  const historico=await pool.query("SELECT status,em FROM pedido_historico WHERE pedido_id=$1 ORDER BY em",[r.rows[0].id]);
  res.json({pedido:r.rows[0],itens:itens.rows,historico:historico.rows});
 } catch(e){next(e);}
});
export default router;