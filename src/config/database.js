// config/database.js - Configuração do banco de dados Oracle
const { Sequelize } = require('sequelize');
const winston = require('winston');

// Configurações de conexão com Oracle
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'oracle',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      connectString: process.env.DB_TNS_NAME,
      ssl: process.env.DB_SSL === 'true',
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: false,
      charset: 'utf8',
      dialectOptions: {
        collate: 'utf8_general_ci'
      }
    }
  }
);

// Função para testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco de dados estabelecida com sucesso.');
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
