// middleware/error.js - Middleware de tratamento de erros

const logger = require('../utils/logger');

/**
 * Middleware central para tratamento de erros
 */
function errorMiddleware(err, req, res, next) {
  // Registrar erro no log
  logger.error('Erro não tratado:', err);

  // Determinar código e mensagem de erro apropriados
  let statusCode = 500;
  let errorMessage = 'Erro interno do servidor';
  let errorDetails = null;

  // Tratamento específico para erros conhecidos
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Não autorizado';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorMessage = 'Acesso negado';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = 'Recurso não encontrado';
  } else if (err.code === 'ORA-00001') {
    // Violação de chave única (Oracle)
    statusCode = 409;
    errorMessage = 'Conflito: registro duplicado';
  } else if (err.code && err.code.startsWith('ORA-')) {
    // Outros erros específicos do Oracle
    statusCode = 400;
    errorMessage = 'Erro no banco de dados';
    errorDetails = err.message;
  }

  // Em ambiente de desenvolvimento, incluir detalhes do erro
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && !errorDetails) {
    errorDetails = {
      message: err.message,
      stack: err.stack
    };
  }

  // Enviar resposta de erro
  res.status(statusCode).json({
    status: 'error',
    message: errorMessage,
    details: errorDetails
  });
}

/**
 * Classe personalizada para erro "Não encontrado"
 */
class NotFoundError extends Error {
  constructor(message = 'Recurso não encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Classe personalizada para erro "Não autorizado"
 */
class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Classe personalizada para erro "Proibido"
 */
class ForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Classe personalizada para erro de validação
 */
class ValidationError extends Error {
  constructor(message = 'Erro de validação') {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = {
  errorMiddleware,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError
};