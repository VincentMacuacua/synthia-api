// src/routes/index.js
const { registar, minha, confirmar, pendentes } = require('../controllers/subscricoesController');
const express = require('express');
const router = express.Router();

const { autenticar, soAdmin } = require('../middleware/auth');

const { registrar, login, perfil, recuperarSenha, redefinirSenha, googleLogin } = require('../controllers/authController');
const { listarCursos, verCurso, criarCurso, atualizarCurso } = require('../controllers/cursosController');
const { matricular, meusCursos, cancelarMatricula } = require('../controllers/matriculasController');
const { marcarConcluida, progressoLinguagem, progressoCurso, dashboard } = require('../controllers/progressoController');
const { registarPagamento, meusPagamentos, confirmarPagamento, todosPagamentos } = require('../controllers/pagamentosController');
const { executarCodigo } = require('../controllers/executarController');

// ============================================================
// 🔐 AUTENTICAÇÃO
// ============================================================
router.post('/auth/registrar', registrar);
router.post('/auth/login', login);
router.get('/auth/perfil', autenticar, perfil);
router.post('/auth/recuperar-senha', recuperarSenha);
router.post('/auth/redefinir-senha', redefinirSenha);
router.post('/auth/google', googleLogin);

// ============================================================
// 📚 CURSOS
// ============================================================
router.get('/cursos', listarCursos);                              // Público
router.get('/cursos/:id', verCurso);                              // Público
router.post('/cursos', autenticar, soAdmin, criarCurso);          // Apenas admin
router.put('/cursos/:id', autenticar, soAdmin, atualizarCurso);   // Apenas admin

// ============================================================
// 🎓 MATRÍCULAS
// ============================================================
router.post('/matriculas', autenticar, matricular);
router.get('/matriculas/meus-cursos', autenticar, meusCursos);
router.delete('/matriculas/:id', autenticar, cancelarMatricula);

// ============================================================
// 📊 PROGRESSO
// ============================================================
router.post('/progresso/marcar', autenticar, marcarConcluida);
router.get('/progresso/linguagem/:language_id', autenticar, progressoLinguagem);
router.get('/progresso/curso/:curso_id', autenticar, progressoCurso);
router.get('/progresso/dashboard', autenticar, dashboard);

// ============================================================
// 💳 PAGAMENTOS
// ============================================================
router.post('/pagamentos', autenticar, registarPagamento);
router.get('/pagamentos/meus', autenticar, meusPagamentos);
router.get('/pagamentos/todos', autenticar, soAdmin, todosPagamentos);
router.put('/pagamentos/:id/confirmar', autenticar, soAdmin, confirmarPagamento);

// ============================================================
// ⚙️ EXECUÇÃO DE CÓDIGO
// ============================================================
router.post('/executar', executarCodigo);

module.exports = router;
router.post('/subscricoes', autenticar, registar);
router.get('/subscricoes/minha', autenticar, minha);
router.get('/subscricoes/pendentes', autenticar, soAdmin, pendentes);
router.put('/subscricoes/:id/confirmar', autenticar, soAdmin, confirmar);