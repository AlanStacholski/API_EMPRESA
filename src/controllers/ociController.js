//Controlador para interação com Oracle Cloud Infrastructure
const { SolicitacaoJson, TemplateJson, Usuario, Empresa } = require('../models');
const { registrarLog } = require('../services/logService');
const { enviarSolicitacaoOCI } = require('../services/ociService');
const { validarTemplate } = require('../utils/validation');

// Listar templates JSON disponíveis
exports.listarTemplates = async (req, res) => {
  try {
    const templates = await TemplateJson.findAll({
      where: { ativo: 1 },
      attributes: ['id', 'nome', 'descricao', 'data_criacao', 'data_atualizacao']
    });
    return res.status(200).json({ sucesso: true, templates });
  } catch (error) {
    console.error('Erro ao listar templates JSON:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao listar templates JSON' });
  }
};

// Obter detalhes de um template
exports.obterTemplatePorId = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await TemplateJson.findByPk(id);
    if (!template) {
      return res.status(404).json({ sucesso: false, mensagem: 'Template não encontrado' });
    }
    return res.status(200).json({ sucesso: true, template });
  } catch (error) {
    console.error('Erro ao buscar template JSON:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao buscar template JSON' });
  }
};

// Criar ou atualizar template JSON (apenas admin)
exports.gerenciarTemplate = async (req, res) => {
  try {
    // Apenas admin pode gerenciar templates
    if (req.usuario.papel !== 'admin') {
      return res.status(403).json({ sucesso: false, mensagem: 'Permissão negada para gerenciar templates JSON' });
    }
    
    const { id } = req.params;
    const { nome, descricao, template, ativo } = req.body;
    
    // Validar o formato do template
    if (!validarTemplate(template)) {
      return res.status(400).json({ sucesso: false, mensagem: 'Formato de template JSON inválido' });
    }
    
    let templateJson;
    
    if (id) {
      // Atualizar template existente
      templateJson = await TemplateJson.findByPk(id);
      
      if (!templateJson) {
        return res.status(404).json({ sucesso: false, mensagem: 'Template não encontrado para atualização' });
      }
      
      await templateJson.update({
        nome,
        descricao,
        template,
        ativo: ativo !== undefined ? ativo : templateJson.ativo,
        data_atualizacao: new Date()
      });
      
      await registrarLog('template_atualizado', req.usuario.id, { template_id: id });
      return res.status(200).json({ sucesso: true, mensagem: 'Template atualizado com sucesso', template: templateJson });
    } else {
      // Criar novo template
      templateJson = await TemplateJson.create({
        nome,
        descricao,
        template,
        ativo: ativo !== undefined ? ativo : true,
        data_criacao: new Date(),
        data_atualizacao: new Date()
      });
      
      await registrarLog('template_criado', req.usuario.id, { template_id: templateJson.id });
      return res.status(201).json({ sucesso: true, mensagem: 'Template criado com sucesso', template: templateJson });
    }
  } catch (error) {
    console.error('Erro ao gerenciar template JSON:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao gerenciar template JSON' });
  }
};

// Excluir template (apenas admin)
exports.excluirTemplate = async (req, res) => {
  try {
    // Apenas admin pode excluir templates
    if (req.usuario.papel !== 'admin') {
      return res.status(403).json({ sucesso: false, mensagem: 'Permissão negada para excluir templates JSON' });
    }
    
    const { id } = req.params;
    const template = await TemplateJson.findByPk(id);
    
    if (!template) {
      return res.status(404).json({ sucesso: false, mensagem: 'Template não encontrado' });
    }
    
    // Verificar se há solicitações utilizando este template
    const solicitacoesAtivas = await SolicitacaoJson.count({
      where: { template_id: id, status: ['pendente', 'em_processamento'] }
    });
    
    if (solicitacoesAtivas > 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Não é possível excluir um template que possui solicitações ativas'
      });
    }
    
    // Soft delete - apenas marcar como inativo
    await template.update({ ativo: false });
    await registrarLog('template_desativado', req.usuario.id, { template_id: id });
    
    return res.status(200).json({ sucesso: true, mensagem: 'Template desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir template JSON:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao excluir template JSON' });
  }
};

// Enviar solicitação para OCI
exports.enviarSolicitacao = async (req, res) => {
  try {
    const { template_id } = req.params;
    const { parametros } = req.body;
    const usuario_id = req.usuario.id;
    
    // Verificar se o template existe e está ativo
    const template = await TemplateJson.findOne({
      where: { id: template_id, ativo: true }
    });
    
    if (!template) {
      return res.status(404).json({ sucesso: false, mensagem: 'Template não encontrado ou inativo' });
    }
    
    // Verificar empresa do usuário
    const usuario = await Usuario.findByPk(usuario_id, {
      include: [{ model: Empresa }]
    });
    
    if (!usuario || !usuario.Empresa || !usuario.Empresa.ativo) {
      return res.status(403).json({ sucesso: false, mensagem: 'Usuário não possui empresa ativa associada' });
    }
    
    // Criar a solicitação no banco
    const solicitacao = await SolicitacaoJson.create({
      usuario_id,
      empresa_id: usuario.Empresa.id,
      template_id,
      parametros,
      status: 'pendente',
      data_criacao: new Date(),
      data_atualizacao: new Date()
    });
    
    // Registrar log da solicitação
    await registrarLog('solicitacao_criada', usuario_id, { solicitacao_id: solicitacao.id });
    
    // Enviar para o serviço OCI
    try {
      const templateProcessado = JSON.parse(template.template);
      // Aplicar os parâmetros ao template
      const dadosProcessados = aplicarParametrosAoTemplate(templateProcessado, parametros);
      
      // Enviar para OCI de forma assíncrona
      enviarSolicitacaoOCI(solicitacao.id, dadosProcessados)
        .then(async (resultado) => {
          // Atualizar a solicitação com o resultado
          await solicitacao.update({
            status: 'concluido',
            resultado: JSON.stringify(resultado),
            data_atualizacao: new Date()
          });
          await registrarLog('solicitacao_concluida', usuario_id, { solicitacao_id: solicitacao.id });
        })
        .catch(async (erro) => {
          // Registrar falha
          await solicitacao.update({
            status: 'erro',
            resultado: JSON.stringify({ erro: erro.message }),
            data_atualizacao: new Date()
          });
          await registrarLog('solicitacao_erro', usuario_id, { solicitacao_id: solicitacao.id, erro: erro.message });
        });
      
      return res.status(202).json({
        sucesso: true,
        mensagem: 'Solicitação enviada com sucesso',
        solicitacao_id: solicitacao.id
      });
    } catch (error) {
      // Atualizar solicitação com erro de processamento
      await solicitacao.update({
        status: 'erro',
        resultado: JSON.stringify({ erro: 'Erro ao processar template' }),
        data_atualizacao: new Date()
      });
      
      await registrarLog('erro_processamento_template', usuario_id, {
        solicitacao_id: solicitacao.id,
        erro: error.message
      });
      
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Erro ao processar template',
        solicitacao_id: solicitacao.id
      });
    }
  } catch (error) {
    console.error('Erro ao enviar solicitação para OCI:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao processar solicitação' });
  }
};

// Verificar status de uma solicitação
exports.verificarStatusSolicitacao = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;
    
    // Buscar a solicitação
    const solicitacao = await SolicitacaoJson.findByPk(id, {
      include: [{ model: TemplateJson, attributes: ['nome', 'descricao'] }]
    });
    
    if (!solicitacao) {
      return res.status(404).json({ sucesso: false, mensagem: 'Solicitação não encontrada' });
    }
    
    // Verificar se o usuário tem acesso à solicitação (próprio usuário ou admin)
    if (solicitacao.usuario_id !== usuario_id && req.usuario.papel !== 'admin') {
      return res.status(403).json({ sucesso: false, mensagem: 'Permissão negada para acessar esta solicitação' });
    }
    
    return res.status(200).json({
      sucesso: true,
      solicitacao: {
        id: solicitacao.id,
        status: solicitacao.status,
        template: solicitacao.TemplateJson ? {
          id: solicitacao.template_id,
          nome: solicitacao.TemplateJson.nome,
          descricao: solicitacao.TemplateJson.descricao
        } : null,
        parametros: solicitacao.parametros,
        resultado: solicitacao.resultado,
        data_criacao: solicitacao.data_criacao,
        data_atualizacao: solicitacao.data_atualizacao
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status da solicitação:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao verificar status da solicitação' });
  }
};

// Listar solicitações do usuário
exports.listarSolicitacoes = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { status, limit = 10, offset = 0 } = req.query;
    
    // Construir filtro
    const filtro = { where: {} };
    
    // Se não for admin, mostrar apenas as próprias solicitações
    if (req.usuario.papel !== 'admin') {
      filtro.where.usuario_id = usuario_id;
    }
    
    // Filtrar por status se especificado
    if (status) {
      filtro.where.status = status;
    }
    
    // Paginação
    filtro.limit = parseInt(limit);
    filtro.offset = parseInt(offset);
    filtro.order = [['data_criacao', 'DESC']];
    
    // Incluir informações do template
    filtro.include = [
      { model: TemplateJson, attributes: ['nome', 'descricao'] },
      { model: Usuario, attributes: ['nome', 'email'] }
    ];
    
    // Buscar solicitações
    const { count, rows: solicitacoes } = await SolicitacaoJson.findAndCountAll(filtro);
    
    return res.status(200).json({
      sucesso: true,
      total: count,
      solicitacoes: solicitacoes.map(s => ({
        id: s.id,
        status: s.status,
        template: s.TemplateJson ? {
          id: s.template_id,
          nome: s.TemplateJson.nome,
          descricao: s.TemplateJson.descricao
        } : null,
        usuario: s.Usuario ? {
          id: s.usuario_id,
          nome: s.Usuario.nome,
          email: s.Usuario.email
        } : null,
        data_criacao: s.data_criacao,
        data_atualizacao: s.data_atualizacao
      }))
    });
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao listar solicitações' });
  }
};

// Função auxiliar para aplicar parâmetros ao template
function aplicarParametrosAoTemplate(template, parametros) {
  // Clone o template para não modificar o original
  const templateProcessado = JSON.parse(JSON.stringify(template));
  
  // Função recursiva para percorrer o template e substituir os parâmetros
  function processarObjeto(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Se o valor é uma string
      if (typeof obj[key] === 'string') {
        // Procurar por placeholders no formato ${nome_parametro}
        obj[key] = obj[key].replace(/\${([^}]+)}/g, (match, param) => {
          return parametros[param] !== undefined ? parametros[param] : match;
        });
      }
      // Se o valor é um objeto ou array, processar recursivamente
      else if (obj[key] !== null && typeof obj[key] === 'object') {
        processarObjeto(obj[key]);
      }
    });
  }
  
  processarObjeto(templateProcessado);
  return templateProcessado;
}

module.exports = exports;