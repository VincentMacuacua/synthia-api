// src/controllers/matriculasController.js
const pool = require('../config/database');

// POST /api/matriculas - Matricular num curso
const matricular = async (req, res) => {
  const { curso_id } = req.body;
  const usuario_id = req.usuario.id;

  if (!curso_id) {
    return res.status(400).json({ sucesso: false, mensagem: 'curso_id é obrigatório.' });
  }

  try {
    // Verificar se curso existe
    const curso = await pool.query('SELECT id, titulo FROM cursos WHERE id = $1 AND ativo = TRUE', [curso_id]);
    if (curso.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Curso não encontrado.' });
    }

    // Verificar se já está matriculado
    const jaMatriculado = await pool.query(
      'SELECT id FROM matriculas WHERE usuario_id = $1 AND curso_id = $2',
      [usuario_id, curso_id]
    );
    if (jaMatriculado.rows.length > 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Já estás matriculado neste curso.' });
    }

    // Criar matrícula
    const resultado = await pool.query(
      'INSERT INTO matriculas (usuario_id, curso_id) VALUES ($1, $2) RETURNING *',
      [usuario_id, curso_id]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: `Matriculado no curso "${curso.rows[0].titulo}" com sucesso!`,
      dados: resultado.rows[0]
    });

  } catch (err) {
    console.error('Erro ao matricular:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/matriculas/meus-cursos - Cursos do utilizador
const meusCursos = async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const resultado = await pool.query(
      `SELECT 
        m.id as matricula_id,
        m.data_matricula,
        m.status,
        c.id as curso_id,
        c.titulo,
        c.descricao,
        c.categoria,
        (
          SELECT COUNT(*) FROM aulas a 
          JOIN modulos mo ON a.modulo_id = mo.id 
          WHERE mo.curso_id = c.id
        ) as total_aulas,
        (
          SELECT COUNT(*) FROM progresso p 
          WHERE p.usuario_id = m.usuario_id AND p.aula_id IN (
            SELECT a.id FROM aulas a JOIN modulos mo ON a.modulo_id = mo.id WHERE mo.curso_id = c.id
          ) AND p.concluido = TRUE
        ) as aulas_concluidas
       FROM matriculas m
       JOIN cursos c ON m.curso_id = c.id
       WHERE m.usuario_id = $1 AND m.status = 'ativo'
       ORDER BY m.data_matricula DESC`,
      [usuario_id]
    );

    res.json({ sucesso: true, dados: resultado.rows });

  } catch (err) {
    console.error('Erro ao buscar cursos:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// DELETE /api/matriculas/:id - Cancelar matrícula
const cancelarMatricula = async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario.id;

  try {
    const resultado = await pool.query(
      'UPDATE matriculas SET status = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *',
      ['cancelado', id, usuario_id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Matrícula não encontrada.' });
    }

    res.json({ sucesso: true, mensagem: 'Matrícula cancelada.' });

  } catch (err) {
    console.error('Erro ao cancelar matrícula:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

module.exports = { matricular, meusCursos, cancelarMatricula };
