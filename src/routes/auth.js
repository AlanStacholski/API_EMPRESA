// routes/auth.js - Rotas de autenticação

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validate, validateLogin, validateRegister, validateRefreshToken } = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário
 * @access  Público
 */
router.post('/register', validate(validateRegister), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuário
 * @access  Público
 */
router.post('/login', validate(validateLogin), authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Gerar novo token de acesso usando refresh token
 * @access  Público
 */
router.post('/refresh', validate(validateRefreshToken), authController.refreshToken);

/**
 * @route   POST /api/auth/approve/:userId
 * @desc    Aprovar usuário pendente
 * @access  Privado/Admin
 */
router.post(
  '/approve/:userId',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  authController.approveUser
);

module.exports = router;