const { sequelize } = require('../config/database');
const Sequelize = require('sequelize');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importando modelos
db.Usuario = require('./usuario')(sequelize, Sequelize);
db.Empresa = require('./empresa')(sequelize, Sequelize);
db.SolicitacaoJson = require('./solicitacaoJson')(sequelize, Sequelize);
db.Log = require('./log')(sequelize, Sequelize);
db.TemplateJson = require('./templateJson')(sequelize, Sequelize);

// Definindo associações
db.Empresa.hasMany(db.Usuario, { foreignKey: 'empresa_id' });
db.Usuario.belongsTo(db.Empresa, { foreignKey: 'empresa_id' });

db.Usuario.hasMany(db.SolicitacaoJson, { foreignKey: 'usuario_id' });
db.SolicitacaoJson.belongsTo(db.Usuario, { foreignKey: 'usuario_id' });

db.Empresa.hasMany(db.SolicitacaoJson, { foreignKey: 'empresa_id' });
db.SolicitacaoJson.belongsTo(db.Empresa, { foreignKey: 'empresa_id' });

db.Usuario.hasMany(db.Log, { foreignKey: 'usuario_id' });
db.Log.belongsTo(db.Usuario, { foreignKey: 'usuario_id' });

db.Empresa.hasMany(db.Log, { foreignKey: 'empresa_id' });
db.Log.belongsTo(db.Empresa, { foreignKey: 'empresa_id' });

module.exports = db;