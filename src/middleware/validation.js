// middleware/validation.js - Middleware de validação

const Joi = require('joi');

/**
 * Esquema de validação para login
 */
function validateLogin(data) {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.empty': 'O email é obrigatório',
      'string.email': 'O email deve ser válido',
      'any.required': 'O email é obrigatório'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'A senha é obrigatória',
      'any.required': 'A senha é obrigatória'
    })
  });

  return schema.validate(data);
}

/**
 * Esquema de validação para registro de usuário
 */
function validateRegister(data) {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.empty': 'O nome é obrigatório',
      'string.min': 'O nome deve ter pelo menos {#limit} caracteres',
      'string.max': 'O nome deve ter no máximo {#limit} caracteres',
      'any.required': 'O nome é obrigatório'
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.empty': 'O sobrenome é obrigatório',
      'string.min': 'O sobrenome deve ter pelo menos {#limit} caracteres',
      'string.max': 'O sobrenome deve ter no máximo {#limit} caracteres',
      'any.required': 'O sobrenome é obrigatório'
    }),
    email: Joi.string().email().required().messages({
      'string.empty': 'O email é obrigatório',
      'string.email': 'O email deve ser válido',
      'any.required': 'O email é obrigatório'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')).required().messages({
      'string.empty': 'A senha é obrigatória',
      'string.min': 'A senha deve ter pelo menos {#limit} caracteres',
      'string.pattern.base': 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
      'any.required': 'A senha é obrigatória'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'string.empty': 'A confirmação de senha é obrigatória',
      'any.only': 'As senhas não coincidem',
      'any.required': 'A confirmação de senha é obrigatória'
    }),
    companyId: Joi.number().integer().positive().required().messages({
      'number.base': 'O ID da empresa deve ser um número',
      'number.integer': 'O ID da empresa deve ser um número inteiro',
      'number.positive': 'O ID da empresa deve ser positivo',
      'any.required': 'O ID da empresa é obrigatório'
    })
  });

  return schema.validate(data);
}

/**
 * Esquema de validação para criação/atualização de empresa
 */
function validateCompany(data) {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.empty': 'O nome da empresa é obrigatório',
      'string.min': 'O nome da empresa deve ter pelo menos {#limit} caracteres',
      'string.max': 'O nome da empresa deve ter no máximo {#limit} caracteres',
      'any.required': 'O nome da empresa é obrigatório'
    }),
    cnpj: Joi.string().pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).required().messages({
      'string.empty': 'O CNPJ é obrigatório',
      'string.pattern.base': 'O CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX',
      'any.required': 'O CNPJ é obrigatório'
    }),
    address: Joi.string().max(255).allow('').optional(),
    city: Joi.string().max(100).allow('').optional(),
    state: Joi.string().length(2).allow('').optional(),
    postalCode: Joi.string().max(10).allow('').optional(),
    phone: Joi.string().max(20).allow('').optional(),
    email: Joi.string().email().allow('').optional().messages({
      'string.email': 'O email deve ser válido'
    }),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE')
  });

  return schema.validate(data);
}

/**
 * Esquema de validação para refresh token
 */
function validateRefreshToken(data) {
  const schema = Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'O refresh token é obrigatório',
      'any.required': 'O refresh token é obrigatório'
    })
  });

  return schema.validate(data);
}

/**
 * Esquema de validação para solicitação OCI
 */
function validateOciRequest(data) {
  const schema = Joi.object({
    requestType: Joi.string().required().messages({
      'string.empty': 'O tipo de solicitação é obrigatório',
      'any.required': 'O tipo de solicitação é obrigatório'
    }),
    requestData: Joi.object().required().messages({
      'object.base': 'Os dados da solicitação devem ser um objeto JSON válido',
      'any.required': 'Os dados da solicitação são obrigatórios'
    })
  });

  return schema.validate(data);
}

/**
 * Middleware de validação genérica
 * @param {Function} validationSchema - Função de validação a ser usada
 */
function validate(validationSchema) {
  return (req, res, next) => {
    const { error } = validationSchema(req.body);
    
    if (error) {
      return res.status(400).json({ 
        status: 'error', 
        message: error.details[0].message
      });
    }
    
    next();
  };
}

module.exports = {
  validateLogin,
  validateRegister,
  validateCompany,
  validateRefreshToken,
  validateOciRequest,
  validate
};