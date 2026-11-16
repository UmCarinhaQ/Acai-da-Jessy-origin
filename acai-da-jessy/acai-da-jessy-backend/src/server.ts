import dotenv from "dotenv";
dotenv.config();
import app from "./app";
import { pool } from "./db/pool";
const port=Number(process.env.PORT)||3000;
async function start(){
 if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
 await pool.query("SELECT 1");
 app.listen(port,()=>console.log(`Açaí da Jessy API em http://localhost:${port}`));
}
start().catch(err=>{console.error("Falha ao iniciar:",err);process.exit(1);});