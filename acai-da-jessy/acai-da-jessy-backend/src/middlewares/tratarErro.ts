import { Request, Response, NextFunction } from "express";
export function tratarErro(err: unknown, _req: Request, res: Response, _next: NextFunction) {
 console.error(err);
 res.status(500).json({ erro: "Erro interno do servidor." });
}