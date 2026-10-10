// src/controllers/subscricoesController.js
// Adiciona este ficheiro ao teu syntia-api/src/controllers/

const pool = require('../config/database');

// POST /api/subscricoes - Registar pedido de subscrição
const registar = async (req, res) => {
  const { metodo, valor, referencia } = req.body;
  const usuario_id = req.usuario.id;

  if (!metodo || !valor) {
    return res.status(400).json({ sucesso: false, mensagem: 'Método e valor são obrigatórios.' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO pagamentos (usuario_id, curso_id, valor, metodo, status)
       VALUES ($1, NULL, $2, $3, 'pendente') RETURNING *`,
      [usuario_id, valor, `${metodo}|subscricao|${referencia || ''}`]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: 'Pedido de subscrição registado! Aguarda confirmação do administrador.',
      dados: resultado.rows[0]
    });

  } catch (err) {
    console.error('Erro ao registar subscrição:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/subscricoes/minha - Ver se tem subscrição ativa
const minha = async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    // Verifica se tem pagamento confirmado de subscrição
    const resultado = await pool.query(
      `SELECT * FROM pagamentos 
       WHERE usuario_id = $1 
       AND metodo LIKE '%subscricao%' 
       AND status = 'confirmado'
       ORDER BY data_pagamento DESC 
       LIMIT 1`,
      [usuario_id]
    );

    const temSubscricao = resultado.rows.length > 0;

    // Se tem pagamento confirmado, verifica se ainda é válido (30 dias)
    let ativa = false;
    if (temSubscricao) {
      const pagamento = resultado.rows[0];
      const dataConfirmacao = new Date(pagamento.data_pagamento);
      const agora = new Date();
      const diasPassados = (agora - dataConfirmacao) / (1000 * 60 * 60 * 24);
      ativa = diasPassados <= 30;
    }

    res.json({
      sucesso: true,
      dados: { ativa, pagamento: resultado.rows[0] || null }
    });

  } catch (err) {
    console.error('Erro ao verificar subscrição:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// PUT /api/subscricoes/:id/confirmar - Admin confirma pagamento
const confirmar = async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `UPDATE pagamentos 
       SET status = 'confirmado', data_pagamento = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Pagamento não encontrado.' });
    }

    res.json({
      sucesso: true,
      mensagem: '✅ Subscrição confirmada! Aluno tem acesso premium por 30 dias.',
      dados: resultado.rows[0]
    });

  } catch (err) {
    console.error('Erro ao confirmar:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/subscricoes/pendentes - Admin vê pagamentos pendentes
const pendentes = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT p.*, u.nome, u.email
       FROM pagamentos p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.metodo LIKE '%subscricao%' AND p.status = 'pendente'
       ORDER BY p.data_pagamento DESC`
    );

    res.json({ sucesso: true, dados: resultado.rows });

  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

module.exports = { registar, minha, confirmar, pendentes };
