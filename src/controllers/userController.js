const bcrypt = require('bcrypt');
const { Usuario, Empresa } = require('../models');
const { registrarLog } = require('../services/logService');

// Listar todos os usuários com filtros
exports.listarUsuarios = async (req, res) => {
  try {
    const { status, empresa_id, papel, busca } = req.query;
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;
    const offset = (pagina - 1) * limite;
    
    // Construir condições de filtro
    const where = {};
    
    // Filtrar por status se fornecido
    if (status) {
      where.status = status;
    }
    
    // Filtrar por empresa_id se fornecido ou restringir à empresa do usuário atual, exceto para admin
    if (req.usuario.papel === 'admin') {
      if (empresa_id) {
        where.empresa_id = empresa_id;
      }
    } else {
      // Usuários não-admin só podem ver usuários da própria empresa
      where.empresa_id = req.usuario.empresa_id;
    }
    
    // Filtrar por papel se fornecido
    if (papel) {
      where.papel = papel;
    }
    
    // Busca por nome ou email
    if (busca) {
      where[Sequelize.Op.or] = [
        { nome: { [Sequelize.Op.like]: `%${busca}%` } },
        { email: { [Sequelize.Op.like]: `%${busca}%` } }
      ];
    }
    
    // Buscar usuários com paginação
    const { count, rows } = await Usuario.findAndCountAll({
      where,
      include: [{ model: Empresa, attributes: ['nome'] }],
      attributes: ['id', 'nome', 'email', 'papel', 'status', 'empresa_id', 'data_criacao'],
      offset,
      limit: limite,
      order: [['data_criacao', 'DESC']]
    });
    
    return res.status(200).json({
      sucesso: true,
      total: count,
      pagina,
      limite,
      totalPaginas: Math.ceil(count / limite),
      usuarios: rows
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao listar usuários' 
    });
  }
};

// Obter usuário por ID
exports.obterUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar usuário
    const usuario = await Usuario.findByPk(id, {
      include: [{ model: Empresa, attributes: ['nome', 'cnpj', 'status'] }],
      attributes: { exclude: ['senha'] }
    });
    
    if (!usuario) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Usuário não encontrado' 
      });
    }
    
    // Verificar permissão (apenas admins ou usuários da mesma empresa)
    if (req.usuario.papel !== 'admin' && req.usuario.empresa_id !== usuario.empresa_id) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Permissão negada para acessar este usuário' 
      });
    }
    
    return res.status(200).json({
      sucesso: true,
      usuario
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao buscar usuário' 
    });
  }
};

// Atualizar usuário
exports.atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, papel, status, empresa_id } = req.body;
    
    // Buscar usuário
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Usuário não encontrado' 
      });
    }
    
    // Verificar permissões
    if (req.usuario.papel !== 'admin') {
      // Gerentes só podem atualizar usuários da própria empresa
      if (req.usuario.papel === 'gerente' && usuario.empresa_id !== req.usuario.empresa_id) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para atualizar este usuário' 
        });
      }
      
      // Operadores só podem atualizar o próprio perfil
      if (req.usuario.papel === 'operador' && parseInt(id) !== req.usuario.id) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para atualizar este usuário' 
        });
      }
      
      // Usuários não-admin não podem mudar papel ou empresa
      if (papel || empresa_id) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para alterar papel ou empresa' 
        });
      }
      
      // Usuários não-admin não podem mudar status
      if (status && req.usuario.papel !== 'gerente') {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para alterar status' 
        });
      }
    }
    
    // Se vai alterar empresa, verificar se ela existe
    if (empresa_id && empresa_id !== usuario.empresa_id) {
      const empresaExiste = await Empresa.findByPk(empresa_id);
      if (!empresaExiste || empresaExiste.status !== 'ativo') {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: 'Empresa não encontrada ou inativa' 
        });
      }
    }
    
    // Atualizar dados
    await usuario.update({
      nome: nome || usuario.nome,
      email: email || usuario.email,
      papel: papel || usuario.papel,
      status: status || usuario.status,
      empresa_id: empresa_id || usuario.empresa_id
    });
    
    // Registrar log
    await registrarLog({
      acao: 'atualizar_usuario',
      descricao: `Usuário atualizado: ${usuario.nome} (ID: ${usuario.id})`,
      usuario_id: req.usuario.id,
      empresa_id: req.usuario.empresa_id,
      ip: req.ip,
      status_code: 200
    });
    
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Usuário atualizado com sucesso',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        status: usuario.status,
        empresa_id: usuario.empresa_id
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao atualizar usuário' 
    });
  }
};

// Aprovar ou rejeitar registro de usuário
exports.mudarStatusUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motivo } = req.body;
    
    if (!['ativo', 'inativo'].includes(status)) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Status inválido. Use "ativo" ou "inativo".' 
      });
    }
    
    // Buscar usuário
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Usuário não encontrado' 
      });
    }
    
    // Verificar permissões
    if (req.usuario.papel === 'admin') {
      // Admin pode aprovar/rejeitar qualquer usuário
    } else if (req.usuario.papel === 'gerente') {
      // Gerente só pode aprovar/rejeitar usuários da própria empresa
      if (usuario.empresa_id !== req.usuario.empresa_id) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para aprovar/rejeitar este usuário' 
        });
      }
    } else {
      // Operadores não podem aprovar/rejeitar
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Permissão negada para aprovar/rejeitar usuários' 
      });
    }
    
    // Atualizar status
    await usuario.update({ status });
    
    // Definir mensagem baseada na ação
    const mensagem = status === 'ativo' 
      ? 'Usuário aprovado com sucesso' 
      : 'Usuário rejeitado/desativado com sucesso';
    
    // Registrar log
    await registrarLog({
      acao: `mudar_status_usuario_${status}`,
      descricao: `${mensagem}: ${usuario.nome} (ID: ${usuario.id})${motivo ? ` - Motivo: ${motivo}` : ''}`,
      usuario_id: req.usuario.id,
      empresa_id: req.usuario.empresa_id,
      ip: req.ip,
      status_code: 200
    });
    
    return res.status(200).json({
      sucesso: true,
      mensagem,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        status: usuario.status
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar usuário:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao aprovar/rejeitar usuário' 
    });
  }
};

// Alterar senha do usuário
exports.alterarSenha = async (req, res) => {
  try {
    const { id } = req.params;
    const { senha_atual, nova_senha } = req.body;
    
    // Verificar se é o próprio usuário alterando a senha
    if (parseInt(id) !== req.usuario.id) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Você só pode alterar sua própria senha' 
      });
    }
    
    // Buscar usuário
    const usuario = await Usuario.findByPk(id);
    
    // Verificar senha atual
    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ 
        sucesso: false, 
        mensagem: 'Senha atual incorreta' 
      });
    }
    
    // Criptografar nova senha
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(nova_senha, salt);
    
    // Atualizar senha
    await usuario.update({ senha: senhaCriptografada });
    
    // Registrar log
    await registrarLog({
      acao: 'alterar_senha',
      descricao: 'Senha alterada com sucesso',
      usuario_id: req.usuario.id,
      empresa_id: req.usuario.empresa_id,
      ip: req.ip,
      status_code: 200
    });
    
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao alterar senha' 
    });
  }
};