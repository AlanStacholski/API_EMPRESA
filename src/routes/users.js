// routes/users.js - Rotas de usuários

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Obter todos os usuários (admin) ou usuários da empresa (gerente)
 * @access  Privado/Admin/Gerente
 */
router.get(
  '/',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN', 'MANAGER']),
  userController.getUsers
);

/**
 * @route   GET /api/users/:userId
 * @desc    Obter usuário por ID
 * @access  Privado/Admin/Gerente/Próprio usuário
 */
router.get(
  '/:userId',
  authMiddleware.authenticate,
  userController.getUserById
);

/**
 * @route   PUT /api/users/:userId
 * @desc    Atualizar usuário
 * @access  Privado/Admin/Gerente/Próprio usuário
 */
router.put(
  '/:userId',
  authMiddleware.authenticate,
  userController.updateUser
);

/**
 * @route   PUT /api/users/:userId/role
 * @desc    Atualizar papel/função do usuário
 * @access  Privado/Admin
 */
router.put(
  '/:userId/role',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  userController.updateUserRole
);

/**
 * @route   GET /api/users/pending
 * @desc    Obter usuários pendentes
 * @access  Privado/Admin
 */
router.get(
  '/status/pending',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  userController.getPendingUsers
);

/**
 * @route   PUT /api/users/:userId/status
 * @desc    Atualizar status do usuário (ativar/desativar)
 * @access  Privado/Admin
 */
router.put(
  '/:userId/status',
  authMiddleware.authenticate,
  authMiddleware.authorize(['ADMIN']),
  userController.updateUserStatus
);

/**
 * @route   GET /api/users/profile
 * @desc    Obter perfil do usuário logado
 * @access  Privado
 */
router.get(
  '/profile/me',
  authMiddleware.authenticate,
  userController.getUserProfile
);

/**
 * @route   PUT /api/users/password
 * @desc    Alterar senha do usuário logado
 * @access  Privado
 */
router.put(
  '/profile/password',
  authMiddleware.authenticate,
  userController.changePassword
);

module.exports = router;