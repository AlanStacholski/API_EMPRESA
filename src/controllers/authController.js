const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Usuario, Empresa } = require('../models');
const { registrarLog } = require('../services/logService');

// Login de usuário
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário pelo email
    const usuario = await Usuario.findOne({
      where: { email },
      include: [{ model: Empresa, attributes: ['nome', 'status'] }]
    });

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais inválidas'
      });
    }

    // Verificar status do usuário
    if (usuario.status !== 'ativo') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Conta pendente de aprovação ou inativa'
      });
    }

    // Verificar status da empresa
    if (!usuario.Empresa || usuario.Empresa.status !== 'ativo') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Empresa inativa ou não encontrada'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais inválidas'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario.id, papel: usuario.papel, empresa_id: usuario.empresa_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Registrar log de login
    await registrarLog({
      acao: 'login',
      descricao: 'Login bem-sucedido',
      usuario_id: usuario.id,
      empresa_id: usuario.empresa_id,
      ip: req.ip,
      status_code: 200
    });

    // Resposta
    return res.status(200).json({
      sucesso: true,
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        empresa: {
          id: usuario.empresa_id,
          nome: usuario.Empresa.nome
        }
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);

    await registrarLog({
      acao: 'login_falhou',
      descricao: `Erro no login: ${error.message}`,
      ip: req.ip,
      status_code: 500
    });

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro no servidor ao processar login'
    });
  }
};