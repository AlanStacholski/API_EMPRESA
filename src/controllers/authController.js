// controllers/authController.js - Controlador para autenticação

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/database');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');
const { validateLogin, validateRegister } = require('../middleware/validation');
const emailService = require('../services/emailService');

/**
 * Login de usuário
 */
/**
 * Registrar novo usuário
 */
async function register(req, res, next) {
  try {
    // Validar entrada
    const { error } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const { firstName, lastName, email, password, companyId } = req.body;

    // Verificar se o email já está em uso
    const existingUser = await db.execute(
      'SELECT email FROM users WHERE email = :email',
      { email }
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Este email já está em uso' 
      });
    }

    // Verificar se a empresa existe
    const companyResult = await db.execute(
      'SELECT company_id FROM companies WHERE company_id = :companyId',
      { companyId }
    );

    if (companyResult.rows.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Empresa não encontrada' 
      });
    }

    // Gerar salt e hash da senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Obter ID do papel de operador (padrão para novos usuários)
    const roleResult = await db.execute(
      "SELECT role_id FROM roles WHERE name = 'OPERATOR'",
      {}
    );
    const operatorRoleId = roleResult.rows[0].role_id;

    // Inserir novo usuário
    const newUserResult = await db.execute(
      `INSERT INTO users (
        first_name, last_name, email, password_hash, password_salt, 
        company_id, role_id, status
      ) VALUES (
        :firstName, :lastName, :email, :passwordHash, :salt, 
        :companyId, :roleId, 'PENDING'
      ) RETURNING user_id`,
      { 
        firstName, 
        lastName, 
        email, 
        passwordHash, 
        salt, 
        companyId, 
        roleId: operatorRoleId
      }
    );

    const userId = newUserResult.rows[0].user_id;

    // Registrar log de auditoria
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (NULL, 'REGISTER', 'USER', :userId, :details, :ipAddress, :userAgent)`,
      { 
        userId,
        details: JSON.stringify({ 
          email, 
          firstName, 
          lastName, 
          companyId,
          status: 'PENDING'
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );

    // Notificar administradores sobre o novo registro
    await notifyAdminsAboutNewUser(userId, firstName, lastName, email, companyId);

    res.status(201).json({
      status: 'success',
      message: 'Usuário registrado com sucesso. Aguardando aprovação do administrador.',
      data: {
        userId,
        email,
        status: 'PENDING'
      }
    });
  } catch (error) {
    logger.error('Erro no registro:', error);
    next(error);
  }
}

// Exportar os métodos do controlador
module.exports = {
  register,
  login,
  approveUser,
  refreshToken
};

/**
 * Aprovar usuário pendente (somente admin)
 */
async function approveUser(req, res, next) {
  try {
    const { userId } = req.params;
    
    // Verificar se o usuário existe e está pendente
    const userResult = await db.execute(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.company_id, u.status,
              c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.company_id
       WHERE u.user_id = :userId`,
      { userId }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Usuário não encontrado' 
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'PENDING') {
      return res.status(400).json({ 
        status: 'error', 
        message: `O usuário já está ${user.status === 'ACTIVE' ? 'ativo' : 'inativo'}` 
      });
    }

    // Atualizar status do usuário para ACTIVE
    await db.execute(
      `UPDATE users SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = :userId`,
      { userId }
    );

    // Registrar log de auditoria
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (:adminId, 'APPROVE', 'USER', :userId, :details, :ipAddress, :userAgent)`,
      { 
        adminId: req.user.id,
        userId,
        details: JSON.stringify({ 
          email: user.email, 
          status: 'ACTIVE' 
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );

    // Enviar email de notificação para o usuário
    await emailService.sendUserApprovalNotification(
      user.email,
      user.first_name,
      user.company_name
    );

    res.status(200).json({
      status: 'success',
      message: 'Usuário aprovado com sucesso',
      data: {
        userId: user.user_id,
        email: user.email,
        status: 'ACTIVE'
      }
    });
  } catch (error) {
    logger.error('Erro na aprovação de usuário:', error);
    next(error);
  }
}

/**
 * Gerar novo token de acesso usando refresh token
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Refresh token é obrigatório' 
      });
    }

    // Verificar refresh token
    const decoded = authConfig.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Refresh token inválido ou expirado' 
      });
    }

    // Buscar informações do usuário
    const result = await db.execute(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, 
              u.company_id, u.role_id, u.status, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = :userId AND u.status = 'ACTIVE'`,
      { userId: decoded.id }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Usuário não encontrado ou inativo' 
      });
    }

    const user = result.rows[0];

    // Gerar novo access token
    const accessToken = authConfig.generateAccessToken(user);

    // Responder com novo access token
    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        expiresIn: authConfig.ACCESS_TOKEN_EXPIRY
      }
    });
  } catch (error) {
    logger.error('Erro no refresh token:', error);
    next(error);
  }
}

/**
 * Função auxiliar para notificar administradores sobre um novo usuário
 */
async function notifyAdminsAboutNewUser(userId, firstName, lastName, email, companyId) {
  try {
    // Buscar administradores
    const adminsResult = await db.execute(
      `SELECT u.email, u.first_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.name = 'ADMIN' AND u.status = 'ACTIVE'`,
      {}
    );

    if (adminsResult.rows.length === 0) {
      logger.warn('Nenhum administrador encontrado para notificar sobre novo usuário');
      return;
    }

    // Buscar detalhes da empresa
    const companyResult = await db.execute(
      'SELECT name FROM companies WHERE company_id = :companyId',
      { companyId }
    );

    const companyName = companyResult.rows[0]?.name || 'Desconhecida';

    // Enviar email para cada administrador
    for (const admin of adminsResult.rows) {
      await emailService.sendNewUserNotification(
        admin.email,
        admin.first_name,
        {
          id: userId,
          name: `${firstName} ${lastName}`,
          email,
          companyName
        }
      );
    }
  } catch (error) {
    logger.error('Erro ao notificar administradores:', error);
    // Não interromper o fluxo em caso de falha no envio de emails
  }
}

/**
 * Login de usuário
 */
async function login(req, res, next) {
  try {
    // Validar entrada
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const { email, password } = req.body;

    // Buscar usuário pelo email
    const result = await db.execute(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.password_hash, u.password_salt, 
              u.company_id, u.role_id, u.status, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = :email`,
      { email }
    );

    // Verificar se o usuário existe
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar se o usuário está ativo
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Conta não está ativa. Por favor, contate o administrador.' 
      });
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await db.execute(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = :userId`,
      { userId: user.user_id }
    );

    // Registrar log de auditoria
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (:userId, 'LOGIN', 'USER', :userId, :details, :ipAddress, :userAgent)`,
      { 
        userId: user.user_id,
        details: JSON.stringify({ email: user.email }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );

    // Gerar tokens
    const accessToken = authConfig.generateAccessToken(user);
    const refreshToken = authConfig.generateRefreshToken(user.user_id);

    // Responder com tokens
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.user_id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role_name,
          companyId: user.company_id
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: authConfig.ACCESS_TOKEN_EXPIRY
        }
      }
    });
  } catch (error) {
    logger.error('Erro no login:', error);
    next(error);
  }
}