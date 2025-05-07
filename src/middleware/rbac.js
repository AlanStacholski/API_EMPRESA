// Middleware para verificar permissões baseadas em papel
exports.checkRole = (roles) => {
    return (req, res, next) => {
      if (!req.usuario) {
        return res.status(401).json({ 
          sucesso: false, 
          mensagem: 'Usuário não autenticado' 
        });
      }
  
      if (roles.includes(req.usuario.papel)) {
        return next();
      }
  
      return res.status(403).json({ 
        sucesso: false, 
        mensagem: 'Acesso negado: permissão insuficiente' 
      });
    };
  };
  