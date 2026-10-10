// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(cors());                          // Permite pedidos do frontend
app.use(express.json());                  // Lê JSON no body dos pedidos
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROTA DE SAÚDE (para verificar se está a funcionar)
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    sucesso: true,
    mensagem: '✅ API Synthia está a funcionar!',
    versao: '1.0.0',
    hora: new Date().toLocaleString('pt-BR')
  });
});

// ============================================================
// TODAS AS ROTAS DA API
// ============================================================
app.use('/api', routes);

// ============================================================
// ROTA NÃO ENCONTRADA (404)
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota não encontrada: ${req.method} ${req.path}`
  });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║      🚀 API SYNTHIA - PLATAFORMA          ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Servidor a correr em: http://localhost:${PORT}`);
  console.log(`✅ Teste de saúde:       http://localhost:${PORT}/health`);
  console.log('');
  console.log('📚 Endpoints disponíveis:');
  console.log('   POST  /api/auth/registrar');
  console.log('   POST  /api/auth/login');
  console.log('   GET   /api/cursos');
  console.log('   POST  /api/matriculas');
  console.log('   GET   /api/progresso/dashboard');
  console.log('');
});
