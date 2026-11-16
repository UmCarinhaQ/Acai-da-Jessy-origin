import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";

export async function autenticar(req: Request, res: Response, next: NextFunction) {
 try {
  const token = req.cookies?.sessao;
  if (!token) return res.status(401).json({ erro: "Faça login para continuar." });
  const segredo = process.env.JWT_SECRET;
  if (!segredo) throw new Error("JWT_SECRET não configurado.");
  const payload = jwt.verify(token, segredo) as { id: number };
  const resultado = await pool.query(
   "SELECT id, nome, email, papel FROM usuarios WHERE id = $1", [payload.id]
  );
  if (!resultado.rowCount) return res.status(401).json({ erro: "Sessão inválida." });
  req.usuario = resultado.rows[0];
  next();
 } catch {
  return res.status(401).json({ erro: "Sessão inválida ou expirada." });
 }
}