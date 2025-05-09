// middleware/auth.js - Middleware de autenticação

const authConfig = require('../config/auth');
const logger = require('../utils/logger');

/**
 * Middleware para verificar se o usuário está autenticado
 */
function authenticate(req, res, next) {
  try {
    // Verificar se há token no cabeçalho Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token de autenticação não fornecido' 
      });
    }

    // Extrair token
    const token = authHeader.split(' ')[1];

    // Verificar e decodificar token
    const decoded = authConfig.verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token inválido ou expirado' 
      });
    }

    // Adicionar usuário ao objeto de requisição
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('Erro na autenticação:', error);
    return res.status(401).json({ 
      status: 'error', 
      message: 'Falha na autenticação' 
    });
  }
}

/**
 * Middleware para verificar as permissões baseadas no papel do usuário
 * @param {string[]} requiredRoles - Papéis permitidos para acessar o recurso
 */
function authorize(requiredRoles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Não autenticado' 
        });
      }

      // Se não há roles específicas requeridas, apenas verifica a autenticação
      if (requiredRoles.length === 0) {
        return next();
      }

      const { role } = req.user;

      // Verificar se o papel do usuário está na lista de papéis permitidos
      if (!requiredRoles.includes(role)) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Acesso negado: permissões insuficientes' 
        });
      }

      next();
    } catch (error) {
      logger.error('Erro na autorização:', error);
      return res.status(403).json({ 
        status: 'error', 
        message: 'Falha na autorização' 
      });
    }
  };
}

/**
 * Middleware para verificar permissões específicas
 * @param {string} permission - Permissão específica requerida
 */
function checkPermission(permission) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Não autenticado' 
        });
      }

      const { permissions } = req.user;

      // Se o usuário é admin, tem todas as permissões
      if (req.user.role === 'ADMIN' || permissions.all === true) {
        return next();
      }

      // Verificar permissão específica (formato: "entity:action", ex: "users:create")
      const [entity, action] = permission.split(':');
      
      if (!permissions[entity] || !permissions[entity][action]) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Acesso negado: permissão específica requerida' 
        });
      }

      next();
    } catch (error) {
      logger.error('Erro na verificação de permissão:', error);
      return res.status(403).json({ 
        status: 'error', 
        message: 'Falha na verificação de permissão' 
      });
    }
  };
}

/**
 * Middleware para verificar se o usuário pertence à empresa
 * Útil para garantir que um usuário só acesse dados de sua própria empresa
 */
function checkCompanyAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Não autenticado' 
      });
    }

    // Admins podem acessar qualquer empresa
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Verificar se o ID da empresa na requisição (params, query ou body) corresponde à empresa do usuário
    const requestCompanyId = parseInt(
      req.params.companyId || req.query.companyId || req.body.companyId || '0'
    );
    
    if (requestCompanyId && requestCompanyId !== req.user.companyId) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Acesso negado: você só pode acessar dados de sua própria empresa' 
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na verificação de acesso à empresa:', error);
    return res.status(403).json({ 
      status: 'error', 
      message: 'Falha na verificação de acesso à empresa' 
    });
  }
}

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  checkCompanyAccess
};