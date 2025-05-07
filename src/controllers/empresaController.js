const { Empresa, Usuario } = require('../models');
const { registrarLog } = require('../services/logService');

// Listar todas as empresas
exports.listarEmpresas = async (req, res) => {
  try {
    const { status, busca } = req.query;
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;
    const offset = (pagina - 1) * limite;
    
    // Construir condições de filtro
    const where = {};
    
    // Filtrar por status se fornecido
    if (status) {
      where.status = status;
    }
    
    // Busca por nome ou cnpj
    if (busca) {
      where[Sequelize.Op.or] = [
        { nome: { [Sequelize.Op.like]: `%${busca}%` } },
        { cnpj: { [Sequelize.Op.like]: `%${busca}%` } }
      ];
    }
    
    // Buscar empresas com paginação
    const { count, rows } = await Empresa.findAndCountAll({
      where,
      attributes: ['id', 'nome', 'cnpj', 'email', 'telefone', 'status', 'data_criacao'],
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
      empresas: rows
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao listar empresas' 
    });
  }
};

// Obter empresa por ID
exports.obterEmpresaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar empresa
    const empresa = await Empresa.findByPk(id);
    
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    // Para usuários não-admin, verificar se é da mesma empresa
    if (req.usuario.papel !== 'admin' && req.usuario.empresa_id !== parseInt(id)) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Permissão negada para acessar esta empresa' 
      });
    }
    
    return res.status(200).json({
      sucesso: true,
      empresa
    });
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao buscar empresa' 
    });
  }
};

// Criar nova empresa
exports.criarEmpresa = async (req, res) => {
  try {
    // Apenas admin pode criar empresas
    if (req.usuario.papel !== 'admin') {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Permissão negada para criar empresas' 
      });
    }
    
    const { nome, cnpj, endereco, telefone, email } = req.body;
    
    // Validação básica
    if (!nome || !cnpj) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'Nome e CNPJ são obrigatórios' 
      });
    }
    
    // Verificar se CNPJ já existe
    const empresaExistente = await Empresa.findOne({ where: { cnpj } });
    if (empresaExistente) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: 'CNPJ já cadastrado' 
      });
    }
    
    // Criar empresa
    const novaEmpresa = await Empresa.create({
      nome,
      cnpj,
      endereco,
      telefone,
      email,
      status: 'ativo'
    });
    
    // Registrar log
    await registrarLog({
      acao: 'criar_empresa',
      descricao: `Empresa criada: ${nome} (CNPJ: ${cnpj})`,
      usuario_id: req.usuario.id,
      empresa_id: req.usuario.empresa_id,
      ip: req.ip,
      status_code: 201
    });
    
    return res.status(201).json({
      sucesso: true,
      mensagem: 'Empresa criada com sucesso',
      empresa: novaEmpresa
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao criar empresa' 
    });
  }
};

// Atualizar empresa
exports.atualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, endereco, telefone, email, status } = req.body;
    
    // Buscar empresa
    const empresa = await Empresa.findByPk(id);
    
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    // Verificar permissões
    if (req.usuario.papel !== 'admin') {
      // Gerentes só podem atualizar a própria empresa
      if (req.usuario.papel === 'gerente' && parseInt(id) !== req.usuario.empresa_id) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para atualizar esta empresa' 
        });
      }
      
      // Operadores não podem atualizar empresas
      if (req.usuario.papel === 'operador') {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para atualizar empresas' 
        });
      }
      
      // Não-admin não podem alterar status
      if (status && status !== empresa.status) {
        return res.status(403).json({ 
          sucesso: false, 
          mensagem: 'Permissão negada para alterar status da empresa' 
        });
      }
    }
    
    // Atualizar dados
    await empresa.update({
      nome: nome || empresa.nome,
      endereco: endereco || empresa.endereco,
      telefone: telefone || empresa.telefone,
      email: email || empresa.email,
      status: status || empresa.status
    });
    
    // Registrar log
    await registrarLog({
      acao: 'atualizar_empresa',
      descricao: `Empresa atualizada: ${empresa.nome} (ID: ${empresa.id})`,
      usuario_id: req.usuario.id,
      empresa_id: req.usuario.empresa_id,
      ip: req.ip,
      status_code: 200
    });
    
    return res.status(200).json({
      sucesso: true,
      mensagem: 'Empresa atualizada com sucesso',
      empresa
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao atualizar empresa' 
    });
  }
};

// Listar usuários de uma empresa
exports.listarUsuariosDaEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, papel } = req.query;
    
    // Buscar empresa
    const empresa = await Empresa.findByPk(id);
    
    if (!empresa) {
      return res.status(404).json({ 
        sucesso: false, 
        mensagem: 'Empresa não encontrada' 
      });
    }
    
    // Verificar permissões
    if (req.usuario.papel !== 'admin' && req.usuario.empresa_id !== parseInt(id)) {
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Permissão negada para acessar usuários desta empresa' 
      });
    }
    
    // Construir condições de filtro
    const where = { empresa_id: id };
    
    // Filtrar por status se fornecido
    if (status) {
      where.status = status;
    }
    
    // Filtrar por papel se fornecido
    if (papel) {
      where.papel = papel;
    }
    
    // Buscar usuários
    const usuarios = await Usuario.findAll({
      where,
      attributes: ['id', 'nome', 'email', 'papel', 'status', 'data_criacao'],
      order: [['data_criacao', 'DESC']]
    });
    
    return res.status(200).json({
      sucesso: true,
      total: usuarios.length,
      empresa: {
        id: empresa.id,
        nome: empresa.nome
      },
      usuarios
    });
  } catch (error) {
    console.error('Erro ao listar usuários da empresa:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro no servidor ao listar usuários da empresa' 
    });
  }
};