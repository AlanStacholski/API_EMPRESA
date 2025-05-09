// config/auth.js - Configuração de autenticação JWT

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

// Chaves secretas para o JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-muito-segura';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sua-chave-secreta-refresh-token';

// Tempo de expiração dos tokens
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';       // 1 hora
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';    // 7 dias

// Gerar token de acesso
function generateAccessToken(user) {
  // Remover informações sensíveis e incluir apenas o necessário
  const payload = {
    id: user.user_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role_name,
    companyId: user.company_id,
    permissions: user.permissions
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// Gerar token de refresh
function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

// Verificar token de acesso
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Erro ao verificar token de acesso:', error.message);
    return null;
  }
}

// Verificar token de refresh
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    logger.error('Erro ao verificar token de refresh:', error.message);
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};