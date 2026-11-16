import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool";
import { autenticar } from "../middlewares/autenticar";
const router = Router();
const cadastroSchema = z.object({
 nome: z.string().min(2).max(100), email: z.string().email(),
 telefone: z.string().max(30).optional(), senha: z.string().min(6).max(100)
});
const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(1) });
function criarCookie(res: any, id: number) {
 const secret = process.env.JWT_SECRET;
 if (!secret || secret.length < 32) throw new Error("Configure JWT_SECRET com pelo menos 32 caracteres.");
 const token = jwt.sign({ id }, secret, { expiresIn: "7d" });
 res.cookie("sessao", token, {
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/"
 });
}
router.post("/cadastro", async (req, res, next) => {
 try {
  const dados = cadastroSchema.parse(req.body);
  const hash = await bcrypt.hash(dados.senha, 12);
  const r = await pool.query(
   "INSERT INTO usuarios(nome,email,telefone,senha_hash) VALUES($1,$2,$3,$4) RETURNING id,nome,email,papel",
   [dados.nome, dados.email.toLowerCase(), dados.telefone || null, hash]
  );
  criarCookie(res, r.rows[0].id);
  res.status(201).json({ usuario: r.rows[0] });
 } catch (e: any) {
  if (e?.code === "23505") return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
  next(e);
 }
});
router.post("/login", async (req, res, next) => {
 try {
  const dados = loginSchema.parse(req.body);
  const r = await pool.query("SELECT * FROM usuarios WHERE email=$1", [dados.email.toLowerCase()]);
  if (!r.rowCount || !(await bcrypt.compare(dados.senha, r.rows[0].senha_hash)))
   return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  criarCookie(res, r.rows[0].id);
  const { id, nome, email, papel } = r.rows[0];
  res.json({ usuario: { id, nome, email, papel } });
 } catch (e) { next(e); }
});
router.post("/logout", (_req, res) => {
 res.clearCookie("sessao", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
 res.json({ mensagem: "Logout realizado." });
});
router.get("/me", autenticar, (req, res) => res.json({ usuario: req.usuario }));
router.post("/recuperar", (_req, res) => {
 res.status(501).json({ erro: "Recuperação por e-mail ainda precisa de serviço de envio configurado." });
});
export default router;