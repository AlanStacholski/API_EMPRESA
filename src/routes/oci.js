// routes/oci.js - Rotas de integração com OCI

const express = require('express');
const router = express.Router();
const ociController = require('../controllers/ociController');
const authMiddleware = require('../middleware/auth');
const { validate, validateOciRequest } = require('../middleware/validation');

/**
 * @route   POST /api/oci/requests
 * @desc    Criar nova solicitação OCI
 * @access  Privado/Todos os usuários
 */
router.post(
  '/requests',
  authMiddleware.authenticate,
  validate(validateOciRequest),
  ociController.createOciRequest
);

/**
 * @route   GET /api/oci/requests
 * @desc    Obter todas as solicitações OCI (filtradas por papel)
 * @access  Privado/Todos os usuários
 */
router.get(
  '/requests',
  authMiddleware.authenticate,
  ociController.getOciRequests
);

/**
 * @route   GET /api/oci/requests/:requestId
 * @desc    Obter detalhes de uma solicitação OCI
 * @access  Privado/Admin/Gerente da empresa/Dono da solicitação
 */
router.get(
  '/requests/:requestId',
  authMiddleware.authenticate,
  ociController.getOciRequestById
);

/**
 * @route   POST /api/oci/requests/:requestId/reprocess
 * @desc    Reprocessar uma solicitação OCI que falhou
 * @access  Privado/Admin/Gerente da empresa/Dono da solicitação
 */
router.post(
  '/requests/:requestId/reprocess',
  authMiddleware.authenticate,
  ociController.reprocessOciRequest
);

/**
 * @route   POST /api/oci/requests/:requestId/cancel
 * @desc    Cancelar uma solicitação OCI pendente
 * @access  Privado/Admin/Gerente da empresa/Dono da solicitação
 */
router.post(
  '/requests/:requestId/cancel',
  authMiddleware.authenticate,
  ociController.cancelOciRequest
);

module.exports = router;