// src/controllers/authController.js
const pool     = require('../config/database');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto   = require('crypto');

// ── Tokens de reset em memória (expira em 1h) ────────────────
const resetTokens = new Map();

// ── Transporter de email (singleton) ────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP não configurado correctamente:', error.message);
  } else {
    console.log('✅ SMTP Gmail pronto para enviar emails');
  }
});

// ── Gerar token JWT ──────────────────────────────────────────
const gerarToken = (usuario) => {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, tipo: usuario.tipo },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ── POST /api/auth/registrar ─────────────────────────────────
const registrar = async (req, res) => {
  const { nome, email, senha, tipo } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Este email já está registado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const resultado = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo, data_criacao',
      [nome, email, senhaHash, tipo || 'aluno']
    );

    const usuario = resultado.rows[0];
    const token = gerarToken(usuario);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Conta criada com sucesso!',
      dados: { token, usuario }
    });

  } catch (err) {
    console.error('Erro ao registar:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────
const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Email e senha são obrigatórios.' });
  }

  try {
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha incorretos.' });
    }

    const usuario = resultado.rows[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha incorretos.' });
    }

    const token = gerarToken(usuario);

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
      dados: {
        token,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
      }
    });

  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// ── GET /api/auth/perfil ─────────────────────────────────────
const perfil = async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nome, email, tipo, data_criacao FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Utilizador não encontrado.' });
    }

    res.json({ sucesso: true, dados: resultado.rows[0] });

  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// ── POST /api/auth/recuperar-senha ───────────────────────────
// Gera token e envia email com link de reset
const recuperarSenha = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ sucesso: false, mensagem: 'Email é obrigatório.' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, nome FROM usuarios WHERE email = $1', [email]
    );

    // Responde sempre com sucesso para não revelar se o email existe
    if (resultado.rows.length === 0) {
      return res.json({ sucesso: true, mensagem: 'Se este email estiver registado, receberás um link em breve.' });
    }

    const usuario = resultado.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    // Guarda token com expiração de 1 hora
    resetTokens.set(token, {
      userId: usuario.id,
      email,
      expiry: Date.now() + 60 * 60 * 1000,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink   = `${frontendUrl}/?started=true&reset_token=${token}`;

    await transporter.sendMail({
      from:    `"Synthia Platform" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Recuperação de senha — Synthia',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#fff;padding:40px;border-radius:12px;border:1px solid #21262d">
          <h1 style="color:#22d3ee;margin:0 0 4px">SYNTHIA</h1>
          <p style="color:#6b7280;font-size:11px;letter-spacing:3px;margin:0 0 32px">NEURAL TEACHING PLATFORM</p>
          <h2 style="margin:0 0 16px">Recuperação de Senha</h2>
          <p>Olá, <strong>${usuario.nome}</strong>!</p>
          <p style="color:#9ca3af">Recebemos um pedido para redefinir a senha da tua conta Synthia.</p>
          <p style="color:#9ca3af">Clica no botão abaixo para definir uma nova senha. O link expira em <strong style="color:#fff">1 hora</strong>.</p>
          <a href="${resetLink}"
             style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(to right,#0891b2,#2563eb);color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;letter-spacing:2px;font-size:14px">
            REDEFINIR SENHA
          </a>
          <p style="color:#4b5563;font-size:12px;margin-top:24px;border-top:1px solid #21262d;padding-top:16px">
            Se não pediste isto, podes ignorar este email com segurança.
          </p>
        </div>
      `,
    });

    res.json({ sucesso: true, mensagem: 'Link de recuperação enviado. Verifica o teu email.' });

  } catch (err) {
    console.error('❌ Erro ao recuperar senha:', err.message);
    console.error('   Código:', err.code);
    console.error('   EMAIL_USER:', process.env.EMAIL_USER);
    console.error('   EMAIL_PASS definido:', !!process.env.EMAIL_PASS);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao enviar email: ' + err.message });
  }
};

// ── POST /api/auth/redefinir-senha ───────────────────────────
// Valida token e define nova senha
const redefinirSenha = async (req, res) => {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Token e nova senha são obrigatórios.' });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ sucesso: false, mensagem: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const data = resetTokens.get(token);

  if (!data) {
    return res.status(400).json({ sucesso: false, mensagem: 'Link inválido ou já utilizado.' });
  }
  if (Date.now() > data.expiry) {
    resetTokens.delete(token);
    return res.status(400).json({ sucesso: false, mensagem: 'Este link expirou. Pede um novo.' });
  }

  try {
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senhaHash, data.userId]);
    resetTokens.delete(token);

    // Login automático após redefinição
    const resultado = await pool.query(
      'SELECT id, nome, email, tipo FROM usuarios WHERE id = $1', [data.userId]
    );
    const usuario   = resultado.rows[0];
    const jwtToken  = gerarToken(usuario);

    res.json({
      sucesso:   true,
      mensagem:  'Senha redefinida com sucesso!',
      dados:     { token: jwtToken, usuario },
    });

  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
};

// ── POST /api/auth/google ────────────────────────────────────
// Verifica ID token do Google e faz login / registo automático
const googleLogin = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ sucesso: false, mensagem: 'Token Google é obrigatório.' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ sucesso: false, mensagem: 'Login com Google não configurado no servidor.' });
  }

  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken:  token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload  = ticket.getPayload();
    const { email, name } = payload;

    // Verifica se o utilizador já existe
    let resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    let usuario;
    if (resultado.rows.length === 0) {
      // Registo automático via Google — senha aleatória (nunca usada directamente)
      const senhaHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const novo = await pool.query(
        'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
        [name, email, senhaHash, 'aluno']
      );
      usuario = novo.rows[0];
    } else {
      usuario = resultado.rows[0];
    }

    const jwtToken = gerarToken(usuario);

    res.json({
      sucesso:  true,
      mensagem: 'Login com Google realizado com sucesso!',
      dados: {
        token: jwtToken,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
      },
    });

  } catch (err) {
    console.error('Erro no login Google:', err);
    res.status(401).json({ sucesso: false, mensagem: 'Token Google inválido ou expirado.' });
  }
};

module.exports = { registrar, login, perfil, recuperarSenha, redefinirSenha, googleLogin };
