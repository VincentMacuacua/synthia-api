// src/controllers/pagamentosController.js
const pool = require('../config/database');

// POST /api/pagamentos - Registar pagamento
const registarPagamento = async (req, res) => {
  const { curso_id, valor, metodo } = req.body;
  const usuario_id = req.usuario.id;

  if (!curso_id || !valor || !metodo) {
    return res.status(400).json({ sucesso: false, mensagem: 'curso_id, valor e metodo são obrigatórios.' });
  }

  try {
    const resultado = await pool.query(
      'INSERT INTO pagamentos (usuario_id, curso_id, valor, metodo, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [usuario_id, curso_id, valor, metodo, 'pendente']
    );

    res.status(201).json({
      sucesso: true,
      mensagem: 'Pagamento registado! Aguarda confirmação.',
      dados: resultado.rows[0]
    });

  } catch (err) {
    console.error('Erro ao registar pagamento:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/pagamentos/meus - Ver meus pagamentos
const meusPagamentos = async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const resultado = await pool.query(
      `SELECT p.*, c.titulo as curso_titulo
       FROM pagamentos p
       JOIN cursos c ON p.curso_id = c.id
       WHERE p.usuario_id = $1
       ORDER BY p.data_pagamento DESC`,
      [usuario_id]
    );

    res.json({ sucesso: true, dados: resultado.rows });

  } catch (err) {
    console.error('Erro ao buscar pagamentos:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// PUT /api/pagamentos/:id/confirmar - Confirmar pagamento (apenas admin)
const confirmarPagamento = async (req, res) => {
  const { id } = req.params;

  try {
    const pagamento = await pool.query(
      'UPDATE pagamentos SET status = $1, data_pagamento = NOW() WHERE id = $2 RETURNING *',
      ['confirmado', id]
    );

    if (pagamento.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado.' });
    }

    const { usuario_id, curso_id } = pagamento.rows[0];

    // Auto-matricular após pagamento confirmado
    const jaMatriculado = await pool.query(
      'SELECT id FROM matriculas WHERE usuario_id = $1 AND curso_id = $2',
      [usuario_id, curso_id]
    );

    if (jaMatriculado.rows.length === 0) {
      await pool.query(
        'INSERT INTO matriculas (usuario_id, curso_id) VALUES ($1, $2)',
        [usuario_id, curso_id]
      );
    }

    res.json({ sucesso: true, mensagem: 'Pagamento confirmado e aluno matriculado!', dados: pagamento.rows[0] });

  } catch (err) {
    console.error('Erro ao confirmar pagamento:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/pagamentos/todos - Ver todos pagamentos (apenas admin)
const todosPagamentos = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT p.*, u.nome as usuario_nome, u.email as usuario_email, c.titulo as curso_titulo
       FROM pagamentos p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN cursos c ON p.curso_id = c.id
       ORDER BY p.data_pagamento DESC`
    );

    res.json({ sucesso: true, dados: resultado.rows });

  } catch (err) {
    console.error('Erro ao buscar pagamentos:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

module.exports = { registarPagamento, meusPagamentos, confirmarPagamento, todosPagamentos };
