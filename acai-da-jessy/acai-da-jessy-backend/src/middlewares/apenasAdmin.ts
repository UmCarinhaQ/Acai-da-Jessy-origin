import { Request, Response, NextFunction } from "express";
export function apenasAdmin(req: Request, res: Response, next: NextFunction) {
 if (req.usuario?.papel !== "admin") return res.status(403).json({ erro: "Acesso restrito ao administrador." });
 next();
}