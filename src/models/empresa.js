module.exports = (sequelize, DataTypes) => {
    const Empresa = sequelize.define('Empresa', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nome: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      cnpj: {
        type: DataTypes.STRING(18),
        allowNull: false,
        unique: true,
        validate: {
          is: /^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/
        }
      },
      endereco: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      telefone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      status: {
        type: DataTypes.ENUM('ativo', 'inativo'),
        defaultValue: 'ativo'
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
      tableName: 'empresas',
      timestamps: false,
      hooks: {
        beforeUpdate: (empresa) => {
          empresa.data_atualizacao = new Date();
        }
      }
    });
  
    return Empresa;
  };