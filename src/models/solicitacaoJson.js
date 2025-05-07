module.exports = (sequelize, DataTypes) => {
    const SolicitacaoJson = sequelize.define('SolicitacaoJson', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      conteudo: {
        type: DataTypes.TEXT('long'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('enviado', 'processado', 'erro'),
        defaultValue: 'enviado'
      },
      mensagem_erro: {
        type: DataTypes.STRING(4000),
        allowNull: true
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      data_criacao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      data_atualizacao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'solicitacoes_json',
      timestamps: false,
      hooks: {
        beforeUpdate: (solicitacao) => {
          solicitacao.data_atualizacao = new Date();
        }
      }
    });
  
    return SolicitacaoJson;
  };