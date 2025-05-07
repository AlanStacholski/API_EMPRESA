const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Usuario, Empresa } = require('../models');
const { registrarLog } = require('../utils/logger');

// Middleware para verificar token de autenticação
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        sucesso: false, 
        mensagem: 'Token de autenticação não fornecido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findOne({
      where: { id: decoded.id, status: 'ativo' },
      include: [{ model: Empresa, attributes: ['nome', 'status'] }]
    });

    if (!usuario || usuario.Empresa.status !== 'ativo') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado ou inativo'
      });
    }

    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresa: {
        id: usuario.empresa_id,
        nome: usuario.Empresa.nome
      }
    };

    next();
  } catch (error) {
    console.error('Erro na verificação de token:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token expirado'
      });
    }

    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token inválido'
    });
  }
};

// Registro de novo usuário
exports.registro = async (req, res) => {
  try {
    const { nome, email, senha, empresa_id } = req.body;

    if (!nome || !email || !senha || !empresa_id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Todos os campos são obrigatórios'
      });
    }

    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email já cadastrado'
      });
    }

    const empresa = await Empresa.findByPk(empresa_id);
    if (!empresa || empresa.status !== 'ativo') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Empresa não encontrada ou inativa'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senha, salt);

    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha: senhaCriptografada,
      papel: 'operador',
      status: 'pendente',
      empresa_id
    });

    await registrarLog({
      acao: 'registro',
      descricao: `Novo usuário registrado: ${nome} (${email})`,
      empresa_id,
      ip: req.ip,
      status_code: 201
    });

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário registrado com sucesso. Aguardando aprovação administrativa.',
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        status: novoUsuario.status
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro no servidor ao processar registro'
    });
  }
};

// Renovação de token
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Token é obrigatório'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findOne({
      where: {
        id: decoded.id,
        status: 'ativo'
      },
      include: [{ model: Empresa, attributes: ['nome', 'status'] }]
    });

    if (!usuario || usuario.Empresa.status !== 'ativo') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado ou inativo'
      });
    }

    const novoToken = jwt.sign(
      {
        id: usuario.id,
        papel: usuario.papel,
        empresa_id: usuario.empresa_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      sucesso: true,
      token: novoToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token expirado, faça login novamente'
      });
    }

    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token inválido'
    });
  }
};
