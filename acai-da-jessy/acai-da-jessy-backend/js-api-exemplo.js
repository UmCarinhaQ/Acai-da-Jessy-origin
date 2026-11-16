// Coloque este arquivo em js/api.js. O frontend e a API devem estar na mesma origem
// em produção ou use a URL correta do backend durante o desenvolvimento.
const API_URL = "http://localhost:3000/api";
const Api = {
  async request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.erro || "Falha na comunicação com o servidor.");
    return data;
  },
  cardapio() { return this.request("/cardapio"); },
  login(email, senha) { return this.request("/auth/login", { method:"POST", body:JSON.stringify({email,senha}) }); },
  cadastro(dados) { return this.request("/auth/cadastro", { method:"POST", body:JSON.stringify(dados) }); },
  logout() { return this.request("/auth/logout", { method:"POST" }); },
  usuarioAtual() { return this.request("/auth/me"); },
  criarPedido(dados) { return this.request("/pedidos", { method:"POST", body:JSON.stringify(dados) }); },
  pedido(id) { return this.request(`/pedidos/${id}`); },
  meusPedidos() { return this.request("/conta/pedidos"); }
};