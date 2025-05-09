// controllers/companyController.js - Controlador para empresas

const db = require('../config/database');
const logger = require('../utils/logger');
const { validateCompany } = require('../middleware/validation');
const { NotFoundError } = require('../middleware/error');

/**
 * Obter todas as empresas
 */
async function getAllCompanies(req, res, next) {
  try {
    // Filtragem por status (se fornecido)
    const status = req.query.status ? req.query.status.toUpperCase() : null;
    
    let query = `
      SELECT company_id, name, cnpj, address, city, state, postal_code, 
             phone, email, status, created_at, updated_at 
      FROM companies
    `;
    
    const params = {};
    
    if (status) {
      query += ' WHERE status = :status';
      params.status = status;
    }
    
    // Ordenação
    query += ' ORDER BY name ASC';
    
    const result = await db.execute(query, params);
    
    res.status(200).json({
      status: 'success',
      data: {
        companies: result.rows
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar empresas:', error);
    next(error);
  }
}

/**
 * Obter empresa por ID
 */
async function getCompanyById(req, res, next) {
  try {
    const { companyId } = req.params;
    
    const result = await db.execute(
      `SELECT company_id, name, cnpj, address, city, state, postal_code, 
              phone, email, status, created_at, updated_at 
       FROM companies 
       WHERE company_id = :companyId`,
      { companyId }
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Empresa não encontrada');
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        company: result.rows[0]
      }
    });
  } catch (error) {
    logger.error(`Erro ao buscar empresa ${req.params.companyId}:`, error);
    next(error);
  }
}

/**
 * Criar nova empresa
 */
async function createCompany(req, res, next) {
  try {
    // Validar entrada
    const { error } = validateCompany(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }
    
    const { name, cnpj, address, city, state, postalCode, phone, email, status } = req.body;
    
    // Verificar se CNPJ já existe
    const existingCompany = await db.execute(
      'SELECT cnpj FROM companies WHERE cnpj = :cnpj',
      { cnpj }
    );
    
    if (existingCompany.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'CNPJ já está em uso por outra empresa'
      });
    }
    
    // Inserir nova empresa
    const result = await db.execute(
      `INSERT INTO companies (
        name, cnpj, address, city, state, postal_code, phone, email, status
      ) VALUES (
        :name, :cnpj, :address, :city, :state, :postalCode, :phone, :email, :status
      ) RETURNING company_id`,
      { 
        name, 
        cnpj, 
        address: address || null, 
        city: city || null, 
        state: state || null, 
        postalCode: postalCode || null, 
        phone: phone || null, 
        email: email || null, 
        status: status || 'ACTIVE'
      }
    );
    
    const companyId = result.rows[0].company_id;
    
    // Registrar log de auditoria
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (:userId, 'CREATE', 'COMPANY', :companyId, :details, :ipAddress, :userAgent)`,
      { 
        userId: req.user.id,
        companyId,
        details: JSON.stringify({ 
          name, 
          cnpj,
          status: status || 'ACTIVE'
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'Empresa criada com sucesso',
      data: {
        companyId,
        name,
        cnpj
      }
    });
  } catch (error) {
    logger.error('Erro ao criar empresa:', error);
    next(error);
  }
}

/**
 * Atualizar empresa existente
 */
async function updateCompany(req, res, next) {
  try {
    const { companyId } = req.params;
    
    // Validar entrada
    const { error } = validateCompany(req.body);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }
    
    // Verificar se a empresa existe
    const companyResult = await db.execute(
      'SELECT company_id FROM companies WHERE company_id = :companyId',
      { companyId }
    );
    
    if (companyResult.rows.length === 0) {
      throw new NotFoundError('Empresa não encontrada');
    }
    
    const { name, cnpj, address, city, state, postalCode, phone, email, status } = req.body;
    
    // Verificar se CNPJ já existe em outra empresa
    const existingCompany = await db.execute(
      'SELECT company_id FROM companies WHERE cnpj = :cnpj AND company_id != :companyId',
      { cnpj, companyId }
    );
    
    if (existingCompany.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'CNPJ já está em uso por outra empresa'
      });
    }
    
    // Atualizar empresa
    await db.execute(
      `UPDATE companies SET 
        name = :name, 
        cnpj = :cnpj, 
        address = :address, 
        city = :city, 
        state = :state, 
        postal_code = :postalCode, 
        phone = :phone, 
        email = :email, 
        status = :status
      WHERE company_id = :companyId`,
      { 
        companyId,
        name, 
        cnpj, 
        address: address || null, 
        city: city || null, 
        state: state || null, 
        postalCode: postalCode || null, 
        phone: phone || null, 
        email: email || null, 
        status
      }
    );
    
    // Registrar log de auditoria
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (:userId, 'UPDATE', 'COMPANY', :companyId, :details, :ipAddress, :userAgent)`,
      { 
        userId: req.user.id,
        companyId,
        details: JSON.stringify({ 
          name, 
          cnpj,
          status
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Empresa atualizada com sucesso',
      data: {
        companyId,
        name,
        cnpj,
        status
      }
    });
  } catch (error) {
    logger.error(`Erro ao atualizar empresa ${req.params.companyId}:`, error);
    next(error);
  }
}

/**
 * Desativar empresa
 */
async function deactivateCompany(req, res, next) {
  try {
    const { companyId } = req.params;
    
    // Verificar se a empresa existe
    const companyResult = await db.execute(
      'SELECT company_id, name, status FROM companies WHERE company_id = :companyId',
      { companyId }
    );
    
    if (companyResult.rows.length === 0) {
      throw new NotFoundError('Empresa não encontrada');
    }
    
    const company = companyResult.rows[0];
    
    if (company.status === 'INACTIVE') {
      return res.status(400).json({
        status: 'error',
        message: 'Empresa já está inativa'
      });
    }
    
    // Atualizar status da empresa
    await db.execute(
      `UPDATE companies 
       SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP 
       WHERE company_id = :companyId`,
      { companyId }
    );
    
    // Registrar log de auditoria
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
       VALUES (:userId, 'DEACTIVATE', 'COMPANY', :companyId, :details, :ipAddress, :userAgent)`,
      { 
        userId: req.user.id,
        companyId,
        details: JSON.stringify({ 
          name: company.name,
          status: 'INACTIVE'
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Empresa desativada com sucesso',
      data: {
        companyId,
        status: 'INACTIVE'
      }
    });
  } catch (error) {
    logger.error(`Erro ao desativar empresa ${req.params.companyId}:`, error);
    next(error);
  }
}

/**
 * Listar usuários de uma empresa
 */
async function getCompanyUsers(req, res, next) {
  try {
    const { companyId } = req.params;
    
    // Verificar se a empresa existe
    const companyResult = await db.execute(
      'SELECT company_id FROM companies WHERE company_id = :companyId',
      { companyId }
    );
    
    if (companyResult.rows.length === 0) {
      throw new NotFoundError('Empresa não encontrada');
    }
    
    // Buscar usuários da empresa
    const usersResult = await db.execute(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.status, 
              u.created_at, u.last_login, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.company_id = :companyId
       ORDER BY u.last_name, u.first_name`,
      { companyId }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        users: usersResult.rows
      }
    });
  } catch (error) {
    logger.error(`Erro ao buscar usuários da empresa ${req.params.companyId}:`, error);
    next(error);
  }
}

module.exports = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deactivateCompany,
  getCompanyUsers
};