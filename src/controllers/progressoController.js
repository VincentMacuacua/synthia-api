// src/controllers/progressoController.js
const pool = require('../config/database');

// POST /api/progresso/marcar
// Aceita:
//   { lesson_key: 'python-1', language_id: 'python' }  ← frontend (lições estáticas)
//   { aula_id: 42 }                                      ← futuro (aulas no DB)
const marcarConcluida = async (req, res) => {
  const { aula_id, lesson_key, language_id } = req.body;
  const usuario_id = req.usuario.id;

  if (!lesson_key && !aula_id) {
    return res.status(400).json({ sucesso: false, mensagem: 'lesson_key ou aula_id são obrigatórios.' });
  }

  try {
    if (lesson_key) {
      // ── Modo frontend (lesson_key string) ──────────────────
      const existe = await pool.query(
        'SELECT id FROM progresso WHERE usuario_id = $1 AND lesson_key = $2',
        [usuario_id, lesson_key]
      );

      if (existe.rows.length > 0) {
        await pool.query(
          'UPDATE progresso SET concluido = TRUE, data_conclusao = NOW() WHERE usuario_id = $1 AND lesson_key = $2',
          [usuario_id, lesson_key]
        );
      } else {
        await pool.query(
          'INSERT INTO progresso (usuario_id, lesson_key, language_id, concluido, data_conclusao) VALUES ($1, $2, $3, TRUE, NOW())',
          [usuario_id, lesson_key, language_id || null]
        );
      }
    } else {
      // ── Modo DB (aula_id inteiro, FK real) ─────────────────
      const existe = await pool.query(
        'SELECT id FROM progresso WHERE usuario_id = $1 AND aula_id = $2',
        [usuario_id, aula_id]
      );

      if (existe.rows.length > 0) {
        await pool.query(
          'UPDATE progresso SET concluido = TRUE, data_conclusao = NOW() WHERE usuario_id = $1 AND aula_id = $2',
          [usuario_id, aula_id]
        );
      } else {
        await pool.query(
          'INSERT INTO progresso (usuario_id, aula_id, concluido, data_conclusao) VALUES ($1, $2, TRUE, NOW())',
          [usuario_id, aula_id]
        );
      }
    }

    res.json({ sucesso: true, mensagem: 'Aula marcada como concluída!' });

  } catch (err) {
    console.error('Erro ao marcar aula:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/progresso/linguagem/:language_id - Progresso numa linguagem (lições do frontend)
const progressoLinguagem = async (req, res) => {
  const { language_id } = req.params;
  const usuario_id = req.usuario.id;

  try {
    const resultado = await pool.query(
      `SELECT lesson_key, concluido, data_conclusao
       FROM progresso
       WHERE usuario_id = $1 AND language_id = $2 AND concluido = TRUE`,
      [usuario_id, language_id]
    );

    const lessonsConcluidas = resultado.rows.map(r => r.lesson_key);

    res.json({
      sucesso: true,
      dados: {
        language_id,
        lessons_concluidas: lessonsConcluidas,
        total_concluidas: lessonsConcluidas.length,
      }
    });

  } catch (err) {
    console.error('Erro ao buscar progresso da linguagem:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/progresso/curso/:curso_id - Progresso num curso (aulas do DB)
const progressoCurso = async (req, res) => {
  const { curso_id } = req.params;
  const usuario_id = req.usuario.id;

  try {
    const resultado = await pool.query(
      `SELECT
        a.id as aula_id,
        a.titulo as aula_titulo,
        mo.titulo as modulo_titulo,
        mo.ordem as modulo_ordem,
        a.ordem as aula_ordem,
        COALESCE(p.concluido, FALSE) as concluido,
        p.data_conclusao
       FROM aulas a
       JOIN modulos mo ON a.modulo_id = mo.id
       LEFT JOIN progresso p ON p.aula_id = a.id AND p.usuario_id = $1
       WHERE mo.curso_id = $2
       ORDER BY mo.ordem, a.ordem`,
      [usuario_id, curso_id]
    );

    const totalAulas = resultado.rows.length;
    const aulasConcluidas = resultado.rows.filter(r => r.concluido).length;
    const percentagem = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

    res.json({
      sucesso: true,
      dados: { percentagem, total_aulas: totalAulas, aulas_concluidas: aulasConcluidas, aulas: resultado.rows }
    });

  } catch (err) {
    console.error('Erro ao buscar progresso:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// GET /api/progresso/dashboard
const dashboard = async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const [cursosRes, aulasRes, languagesRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM matriculas WHERE usuario_id = $1 AND status = $2', [usuario_id, 'ativo']),
      pool.query('SELECT COUNT(*) as total FROM progresso WHERE usuario_id = $1 AND concluido = TRUE', [usuario_id]),
      pool.query(
        `SELECT language_id, COUNT(*) as concluidas
         FROM progresso
         WHERE usuario_id = $1 AND concluido = TRUE AND language_id IS NOT NULL
         GROUP BY language_id
         ORDER BY concluidas DESC`,
        [usuario_id]
      ),
    ]);

    res.json({
      sucesso: true,
      dados: {
        cursos_matriculados: parseInt(cursosRes.rows[0].total),
        aulas_concluidas: parseInt(aulasRes.rows[0].total),
        por_linguagem: languagesRes.rows,
      }
    });

  } catch (err) {
    console.error('Erro ao buscar dashboard:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

module.exports = { marcarConcluida, progressoLinguagem, progressoCurso, dashboard };
