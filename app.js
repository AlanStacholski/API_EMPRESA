const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Importar middleware de tratamento de erros
const errorMiddleware = require('./middleware/error');
const logger = require('./utils/logger');

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const ociRoutes = require('./routes/oci');

// Carregar variáveis de ambiente
require('dotenv').config();

// Inicializar a aplicação Express
const app = express();

// Carregar documentação Swagger
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));

// Configurar middleware
app.use(helmet()); // Segurança básica de cabeçalhos HTTP
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression()); // Compressão para melhorar performance
app.use(express.json({ limit: '10mb' })); // Limitar tamanho do body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: logger.stream })); // Logging de requisições

// Limitar requisições para prevenir ataques de força bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limitar cada IP a 100 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições deste IP, por favor tente novamente após 15 minutos'
});
app.use('/api/', limiter);

// Rotas de API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/oci', ociRoutes);

// Documentação da API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rota de verificação de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros deve ser o último
app.use(errorMiddleware);

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Recurso não encontrado',
    path: req.originalUrl
  });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Documentação da API disponível em http://localhost:${PORT}/api-docs`);
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição não tratada:', reason);
});

module.exports = app;