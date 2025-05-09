// routes/companies.js - Rotas de empresas

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/auth');
const { validate, validateCompany } = require('../middleware/validation');

/**
 * @route   GET /api/companies
 * @desc    Obter todas as empresas
 * @access  Privado/Admin
 */
router.get(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  companyController.getAllCompanies
);

/**
 * @route   GET /api/companies/:companyId
 * @desc    Obter empresa por ID
 * @access  Privado/Admin/Gerente da empresa/Membro da empresa
 */
router.get(
  '/:companyId',
  authMiddleware.authenticate,
  authMiddleware.checkCompanyAccess,
  companyController.getCompanyById
);

/**
 * @route   POST /api/companies
 * @desc    Criar nova empresa
 * @access  Privado/Admin
 */
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  validate(validateCompany),
  companyController.createCompany
);

/**
 * @route   PUT /api/companies/:companyId
 * @desc    Atualizar empresa existente
 * @access  Privado/Admin/Gerente da empresa
 */
router.put(
  '/:companyId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'MANAGER']),
  authMiddleware.checkCompanyAccess,
  validate(validateCompany),
  companyController.updateCompany
);

/**
 * @route   PUT /api/companies/:companyId/deactivate
 * @desc    Desativar empresa
 * @access  Privado/Admin
 */
router.put(
  '/:companyId/deactivate',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  companyController.deactivateCompany
);

/**
 * @route   GET /api/companies/:companyId/users
 * @desc    Listar usuários de uma empresa
 * @access  Privado/Admin/Gerente da empresa
 */
router.get(
  '/:companyId/users',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'MANAGER']),
  authMiddleware.checkCompanyAccess,
  companyController.getCompanyUsers
);

module.exports = router;