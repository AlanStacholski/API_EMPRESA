// services/ociService.js - Serviço de integração com Oracle Cloud Infrastructure

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
require('dotenv').config();

// Configurações da OCI
const ociConfig = {
  baseUrl: process.env.OCI_BASE_URL,
  tenancyId: process.env.OCI_TENANCY_ID,
  userId: process.env.OCI_USER_ID,
  fingerprint: process.env.OCI_FINGERPRINT,
  privateKey: process.env.OCI_PRIVATE_KEY,
  region: process.env.OCI_REGION || 'sa-saopaulo-1',
  compartmentId: process.env.OCI_COMPARTMENT_ID
};

/**
 * Validar JSON da solicitação com base no tipo
 * @param {string} requestType - Tipo de solicitação
 * @param {Object} requestData - Dados da solicitação
 * @throws {Error} Se a validação falhar
 */
function validateRequestJson(requestType, requestData) {
  // Verificações básicas
  if (!requestData) {
    throw new Error('Dados da solicitação são obrigatórios');
  }

  // Validações específicas por tipo de solicitação
  switch (requestType) {
    case 'CREATE_USER':
      validateCreateUserRequest(requestData);
      break;
      
    case 'UPDATE_USER':
      validateUpdateUserRequest(requestData);
      break;
      
    case 'CREATE_GROUP':
      validateCreateGroupRequest(requestData);
      break;
      
    case 'ADD_USER_TO_GROUP':
      validateAddUserToGroupRequest(requestData);
      break;
      
    case 'CREATE_POLICY':
      validateCreatePolicyRequest(requestData);
      break;
      
    default:
      throw new Error(`Tipo de solicitação '${requestType}' não suportado`);
  }
}

/**
 * Validar solicitação de criação de usuário
 */
function validateCreateUserRequest(data) {
  const requiredFields = ['name', 'description', 'email'];
  validateRequiredFields(data, requiredFields);

  // Validações adicionais
  if (data.email && !isValidEmail(data.email)) {
    throw new Error('Email inválido');
  }
}

/**
 * Validar solicitação de atualização de usuário
 */
function validateUpdateUserRequest(data) {
  const requiredFields = ['userId'];
  validateRequiredFields(data, requiredFields);

  // Validações adicionais
  if (data.email && !isValidEmail(data.email)) {
    throw new Error('Email inválido');
  }
}

/**
 * Validar solicitação de criação de grupo
 */
function validateCreateGroupRequest(data) {
  const requiredFields = ['name', 'description'];
  validateRequiredFields(data, requiredFields);
}

/**
 * Validar solicitação de adição de usuário a grupo
 */
function validateAddUserToGroupRequest(data) {
  const requiredFields = ['userId', 'groupId'];
  validateRequiredFields(data, requiredFields);
}

/**
 * Validar solicitação de criação de política
 */
function validateCreatePolicyRequest(data) {
  const requiredFields = ['name', 'description', 'statements'];
  validateRequiredFields(data, requiredFields);

  // Validar statements
  if (!Array.isArray(data.statements) || data.statements.length === 0) {
    throw new Error("O campo 'statements' deve ser um array não vazio");
  }
}

/**
 * Validar campos obrigatórios genéricos
 */
function validateRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
  }
}

/**
 * Verificar se um email é válido
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Enviar requisição para a API da OCI
 * @param {string} requestType - Tipo de solicitação
 * @param {Object} requestData - Dados da solicitação
 * @returns {Promise<Object>} - Resposta da API
 */
async function sendRequest(requestType, requestData) {
  try {
    // Definir endpoint e método com base no tipo de solicitação
    const { endpoint, method, transformRequest } = getRequestConfig(requestType, requestData);
    
    // Transformar dados da solicitação se necessário
    const transformedData = transformRequest ? transformRequest(requestData) : requestData;
    
    // Gerar cabeçalhos de autenticação
    const headers = generateAuthHeaders(method, endpoint, transformedData);
    
    // Configurar requisição
    const config = {
      method,
      url: `${ociConfig.baseUrl}${endpoint}`,
      headers,
      data: method !== 'GET' ? transformedData : undefined
    };
    
    logger.info(`Enviando requisição ${requestType} para OCI: ${endpoint}`);
    
    // Enviar requisição
    const response = await axios(config);
    
    logger.info(`Resposta recebida da OCI: ${response.status}`);
    
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    logger.error(`Erro ao enviar requisição ${requestType} para OCI:`, error);
    
    // Extrair detalhes do erro da resposta
    let errorMessage = 'Erro na comunicação com OCI';
    let errorDetails = null;
    
    if (error.response) {
      errorMessage = `Erro na resposta da OCI: ${error.response.status}`;
      errorDetails = error.response.data;
    } else if (error.request) {
      errorMessage = 'Sem resposta da OCI';
    } else {
      errorMessage = `Erro de configuração: ${error.message}`;
    }
    
    throw new Error(JSON.stringify({
      message: errorMessage,
      details: errorDetails
    }));
  }
}

/**
 * Obter configuração da requisição com base no tipo
 */
function getRequestConfig(requestType, requestData) {
  switch (requestType) {
    case 'CREATE_USER':
      return {
        endpoint: `/20160918/users`,
        method: 'POST',
        transformRequest: (data) => ({
          compartmentId: ociConfig.compartmentId,
          name: data.name,
          description: data.description,
          email: data.email,
          freeformTags: data.tags || {}
        })
      };
      
    case 'UPDATE_USER':
      return {
        endpoint: `/20160918/users/${requestData.userId}`,
        method: 'PUT',
        transformRequest: (data) => {
          const transformed = { description: data.description };
          if (data.email) transformed.email = data.email;
          return transformed;
        }
      };
      
    case 'CREATE_GROUP':
      return {
        endpoint: `/20160918/groups`,
        method: 'POST',
        transformRequest: (data) => ({
          compartmentId: ociConfig.compartmentId,
          name: data.name,
          description: data.description,
          freeformTags: data.tags || {}
        })
      };
      
    case 'ADD_USER_TO_GROUP':
      return {
        endpoint: `/20160918/userGroupMemberships`,
        method: 'POST',
        transformRequest: (data) => ({
          compartmentId: ociConfig.compartmentId,
          userId: data.userId,
          groupId: data.groupId
        })
      };
      
    case 'CREATE_POLICY':
      return {
        endpoint: `/20160918/policies`,
        method: 'POST',
        transformRequest: (data) => ({
          compartmentId: ociConfig.compartmentId,
          name: data.name,
          description: data.description,
          statements: data.statements,
          freeformTags: data.tags || {}
        })
      };
      
    default:
      throw new Error(`Tipo de solicitação '${requestType}' não suportado`);
  }
}

/**
 * Gerar cabeçalhos de autenticação para OCI
 */
function generateAuthHeaders(method, path, body) {
  const bodyString = body && method !== 'GET' ? JSON.stringify(body) : '';
  const date = new Date().toUTCString();
  const contentLength = bodyString ? bodyString.length.toString() : '0';
  
  // Cabeçalhos para assinatura
  const headers = {
    'date': date,
    'host': new URL(ociConfig.baseUrl).host,
    'content-type': 'application/json',
    'content-length': contentLength,
    'x-content-sha256': crypto.createHash('sha256').update(bodyString || '').digest('base64')
  };
  
  // String para assinar
  const signatureString = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${headers.host}`,
    `date: ${headers.date}`,
    `content-type: ${headers['content-type']}`,
    `content-length: ${headers['content-length']}`,
    `x-content-sha256: ${headers['x-content-sha256']}`
  ].join('\n');
  
  // Criar assinatura
  const signature = crypto.createSign('RSA-SHA256')
    .update(signatureString)
    .sign(ociConfig.privateKey, 'base64');
  
  // Retornar cabeçalhos com Authorization
  return {
    ...headers,
    'Authorization': `Signature version="1",keyId="${ociConfig.tenancyId}/${ociConfig.userId}/${ociConfig.fingerprint}",algorithm="rsa-sha256",headers="(request-target) host date content-type content-length x-content-sha256",signature="${signature}"`
  };
}

module.exports = {
  validateRequestJson,
  sendRequest
};