// src/middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware: verifica se o utilizador está autenticado
const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Acesso negado. Token não fornecido.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token inválido ou expirado.'
    });
  }
};

// Middleware: verifica se é admin
const soAdmin = (req, res, next) => {
  if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({
      sucesso: false,
      mensagem: 'Acesso negado. Apenas administradores.'
    });
  }
  next();
};

module.exports = { autenticar, soAdmin };
