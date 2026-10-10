// src/controllers/cursosController.js
const pool = require('../config/database');

// GET /api/cursos - Listar todos os cursos ativos
const listarCursos = async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, titulo, descricao, categoria, preco, data_criacao FROM cursos WHERE ativo = TRUE ORDER BY categoria, titulo'
    );

    res.json({ sucesso: true, dados: resultado.rows });

  } catch (err) {
    console.error('Erro ao listar cursos:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/cursos/:id - Ver detalhe de um curso com módulos e aulas
const verCurso = async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar curso
    const curso = await pool.query('SELECT * FROM cursos WHERE id = $1 AND ativo = TRUE', [id]);
    if (curso.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Curso não encontrado.' });
    }

    // Buscar módulos
    const modulos = await pool.query(
      'SELECT * FROM modulos WHERE curso_id = $1 ORDER BY ordem', [id]
    );

    // Buscar aulas de cada módulo
    for (const modulo of modulos.rows) {
      const aulas = await pool.query(
        'SELECT id, titulo, video_url, ordem FROM aulas WHERE modulo_id = $1 ORDER BY ordem',
        [modulo.id]
      );
      modulo.aulas = aulas.rows;
    }

    res.json({
      sucesso: true,
      dados: { ...curso.rows[0], modulos: modulos.rows }
    });

  } catch (err) {
    console.error('Erro ao ver curso:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// POST /api/cursos - Criar curso (apenas admin)
const criarCurso = async (req, res) => {
  const { titulo, descricao, categoria, preco } = req.body;

  if (!titulo || !categoria) {
    return res.status(400).json({ sucesso: false, mensagem: 'Título e categoria são obrigatórios.' });
  }

  try {
    const resultado = await pool.query(
      'INSERT INTO cursos (titulo, descricao, categoria, preco) VALUES ($1, $2, $3, $4) RETURNING *',
      [titulo, descricao, categoria, preco || 0]
    );

    res.status(201).json({ sucesso: true, mensagem: 'Curso criado!', dados: resultado.rows[0] });

  } catch (err) {
    console.error('Erro ao criar curso:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// PUT /api/cursos/:id - Atualizar curso (apenas admin)
const atualizarCurso = async (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, categoria, preco, ativo } = req.body;

  try {
    const resultado = await pool.query(
      `UPDATE cursos SET 
        titulo = COALESCE($1, titulo),
        descricao = COALESCE($2, descricao),
        categoria = COALESCE($3, categoria),
        preco = COALESCE($4, preco),
        ativo = COALESCE($5, ativo)
       WHERE id = $6 RETURNING *`,
      [titulo, descricao, categoria, preco, ativo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Curso não encontrado.' });
    }

    res.json({ sucesso: true, mensagem: 'Curso atualizado!', dados: resultado.rows[0] });

  } catch (err) {
    console.error('Erro ao atualizar curso:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

module.exports = { listarCursos, verCurso, criarCurso, atualizarCurso };
