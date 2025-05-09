// config/database.js - Configuração da conexão com o Oracle Database

const oracledb = require('oracledb');
const logger = require('../utils/logger');

// Carregar variáveis de ambiente
require('dotenv').config();

// Configurar oracledb para autocommit
oracledb.autoCommit = true;

// Definir um pool de conexões
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
  poolMin: 10,
  poolMax: 50,
  poolIncrement: 5
};

// Inicializar o pool de conexões
async function initialize() {
  try {
    // Criar um pool de conexões que será mantido durante o ciclo de vida da aplicação
    await oracledb.createPool(dbConfig);
    logger.info('Pool de conexões com o banco de dados Oracle inicializado com sucesso');
  } catch (error) {
    logger.error('Erro ao inicializar o pool de conexões Oracle:', error);
    throw error;
  }
}

// Obter uma conexão do pool
async function getConnection() {
  try {
    return await oracledb.getConnection();
  } catch (error) {
    logger.error('Erro ao obter conexão do pool:', error);
    throw error;
  }
}

// Executar uma consulta SQL
async function execute(sql, binds = [], options = {}) {
  let connection;
  try {
    connection = await getConnection();
    
    // Configurar opções padrão se não fornecidas
    const defaultOptions = {
      outFormat: oracledb.OUT_FORMAT_OBJECT, // Retornar resultados como objetos
      autoCommit: true                      // Commit automático
    };
    
    const queryOptions = { ...defaultOptions, ...options };
    
    // Executar a consulta
    const result = await connection.execute(sql, binds, queryOptions);
    return result;
  } catch (error) {
    logger.error('Erro ao executar consulta SQL:', error);
    throw error;
  } finally {
    // Sempre liberar a conexão de volta para o pool
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        logger.error('Erro ao fechar conexão:', error);
      }
    }
  }
}

// Fechar o pool de conexões
async function close() {
  try {
    await oracledb.getPool().close(10); // Tempo limite em segundos para esperar conexões abertas
    logger.info('Pool de conexões Oracle fechado com sucesso');
  } catch (error) {
    logger.error('Erro ao fechar o pool de conexões Oracle:', error);
    throw error;
  }
}

// Wrapper para transações
async function executeTransaction(callback) {
  let connection;
  try {
    connection = await getConnection();
    
    // Desativar autocommit para início da transação
    await connection.execute('SET TRANSACTION READ WRITE');
    
    // Executar o callback com a conexão
    const result = await callback(connection);
    
    // Commit da transação
    await connection.commit();
    
    return result;
  } catch (error) {
    // Rollback em caso de erro
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        logger.error('Erro ao realizar rollback:', rollbackError);
      }
    }
    logger.error('Erro na transação:', error);
    throw error;
  } finally {
    // Liberar a conexão de volta para o pool
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        logger.error('Erro ao fechar conexão após transação:', error);
      }
    }
  }
}

module.exports = {
  initialize,
  execute,
  close,
  executeTransaction
};