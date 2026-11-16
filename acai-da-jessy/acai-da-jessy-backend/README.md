# Açaí da Jessy - Backend

Backend inicial com Node.js, Express, TypeScript e PostgreSQL.

## 1. Requisitos
- Node.js 20 ou superior
- PostgreSQL 14 ou superior
- Banco `BancoAcaidaJessy`

## 2. Criar o banco (PowerShell)
Na pasta raiz do projeto:
```powershell
psql -U postgres -c 'CREATE DATABASE "BancoAcaidaJessy";'
psql -U postgres -d BancoAcaidaJessy -f database/schema.sql
```
Se o banco já existir, não execute o `CREATE DATABASE` novamente. O schema fornecido cria tipos e tabelas, portanto deve ser executado apenas uma vez em um banco vazio.

## 3. Configurar backend
```powershell
cd backend
npm install
Copy-Item .env.example .env
```
Edite `.env`: informe a senha real do PostgreSQL e crie um JWT_SECRET aleatório com pelo menos 32 caracteres.

## 4. Criar administrador
Gere o hash bcrypt:
```powershell
node -e "require('bcrypt').hash('SuaSenhaForteAqui', 12).then(console.log)"
```
Copie o hash e execute no banco:
```sql
INSERT INTO usuarios(nome,email,senha_hash,papel)
VALUES ('Administrador','admin@acaidajessy.com','COLE_O_HASH_AQUI','admin');
```
Não use a senha de demonstração em produção.

## 5. Iniciar
```powershell
npm run dev
```
Teste `http://localhost:3000/api/health`.

## Rotas incluídas
- POST `/api/auth/cadastro`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/me`
- POST `/api/auth/recuperar` (placeholder HTTP 501; requer provedor de e-mail)
- GET `/api/cardapio`
- POST `/api/pedidos`
- GET `/api/pedidos/:id`
- GET/PUT `/api/conta`
- GET `/api/conta/pedidos`
- GET/POST `/api/conta/enderecos`
- POST `/api/conta/avaliacoes`
- GET `/api/admin/pedidos`
- PATCH `/api/admin/pedidos/:id/status`
- GET/POST/PUT/DELETE `/api/admin/produtos`
- GET `/api/admin/financeiro`
- GET `/api/admin/clientes`
- GET/PATCH `/api/admin/avaliacoes`

## Observações importantes
1. O backend não substitui automaticamente o frontend. As telas precisam chamar `js/api.js` e aguardar as respostas.
2. O checkout deve enviar `itens` com `produto_id`, `tamanho_id`, `qtd`, `adicionais` (IDs) e `complementos` (IDs). O servidor recalcula os preços.
3. Cookie `httpOnly` funciona com `credentials: 'include'`. Em produção, frontend e API devem usar HTTPS e configuração CORS/origem apropriada.
4. O status de pedido e o estoque são atualizados em transação na criação. A regra comercial de quando repor estoque em pedidos recusados/cancelados ainda deve ser definida.
5. Para produção, adicionar CSRF para autenticação por cookie, logs, testes automatizados, recuperação real de senha, upload validado de imagens e CRUD completo das tabelas auxiliares.
6. Nunca publique `.env` ou credenciais no Git.
