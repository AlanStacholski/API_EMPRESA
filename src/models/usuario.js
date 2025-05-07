module.exports = (sequelize, DataTypes) => {
    const Usuario = sequelize.define('Usuario', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nome: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      senha: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      papel: {
        type: DataTypes.ENUM('admin', 'gerente', 'operador'),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pendente', 'ativo', 'inativo'),
        defaultValue: 'pendente'
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
      tableName: 'usuarios',
      timestamps: false,
      hooks: {
        beforeUpdate: (usuario) => {
          usuario.data_atualizacao = new Date();
        }
      }
    });
  
    return Usuario;
  };