import "express";
declare global {
 namespace Express {
  interface Request { usuario?: { id: number; papel: "cliente" | "admin"; nome: string; email: string }; }
 }
}
export {};