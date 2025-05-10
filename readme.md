# API de Gerenciamento de Empresas para OCI

API para gerenciamento de empresas, usuários e interações com a Oracle Cloud Infrastructure (OCI).

## 📋 Visão Geral

Esta API possibilita o registro de empresas e usuários com diferentes níveis de acesso e permite gerar solicitações JSON para a Oracle Cloud Infrastructure. O sistema implementa controle de acesso baseado em papéis (RBAC) e gerencia as requisições para a OCI de forma segura.

## 🛠️ Stack Tecnológica

- **Backend:** Node.js com Express.js
- **Banco de Dados:** Oracle Autonomous Database
- **Autenticação:** JWT (JSON Web Tokens)
- **Documentação:** Swagger/OpenAPI
- **Validação de Dados:** Joi/Yup
- **Segurança:** HTTPS, CORS, Helmet
- **Integração com OCI:** Oracle Cloud SDK para Node.js

## 📁 Estrutura do Projeto

```
API_EMPRESA/
├── src/
│   ├── config/                 # Configurações do sistema
│   ├── controllers/            # Controladores de rotas
│   ├── middleware/             # Middlewares
│   ├── models/                 # Modelos de dados
│   ├── routes/                 # Rotas da API
│   ├── services/               # Serviços de negócio
│   ├── utils/                  # Utilitários
│   └── app.js                  # Configuração principal da aplicação
├── database/                   # Scripts SQL
├── tests/                      # Testes
├── docs/                       # Documentação
├── .env.example                # Exemplo de variáveis de ambiente
├── package.json                # Dependências e scripts
└── README.md                   # Documentação básica
```

## 📊 Modelos de Dados

### Usuário
- ID (PK)
- Nome
- Email (único)
- Senha (hash)
- Empresa ID (FK)
- Papel/Função ID (FK)
- Status (ativo, pendente, inativo)
- Data de Criação/Atualização

### Empresa
- ID (PK)
- Nome
- CNPJ (único)
- Endereço
- Telefone
- Email de Contato
- Status (ativo, inativo)
- Data de Criação/Atualização

### Papel/Função
- ID (PK)
- Nome (Admin, Gerente, Operador)
- Descrição
- Permissões (JSON)

### Solicitação OCI
- ID (PK)
- Usuário ID (FK)
- Empresa ID (FK)
- Tipo de Solicitação
- Dados JSON
- Status (pendente, enviado, erro)
- Resposta JSON
- Data de Criação/Atualização

## 🔄 Fluxos Principais

### Autenticação e Registro de Usuários
1. Registro do usuário com informações básicas e empresa
2. Aprovação pelo administrador
3. Notificação por email ao usuário
4. Autenticação via JWT com expiração e refresh tokens

### Gerenciamento de Empresas
1. Criação de empresas por administradores
2. Gerenciamento de usuários por gerentes dentro da empresa
3. Associação de cada usuário a uma empresa
4. Múltiplos usuários por empresa com diferentes papéis

### Interação com OCI
1. Geração de JSONs para API da OCI por operadores
2. Validação de dados antes do envio
3. Logs e armazenamento de requisições
4. Monitoramento e atualização de status

### Painel de Controle
- Interface adaptativa baseada no papel do usuário
- Visualizações específicas para Administradores, Gerentes e Operadores

## 🔒 Segurança

- HTTPS
- Senhas com hash e salt (bcrypt)
- JWTs com expiração
- CORS configurado para origens confiáveis
- Controle de acesso baseado em papel (RBAC)
- Validação e sanitização de dados
- Limite de taxa para prevenção de ataques
- Auditoria de ações sensíveis

## 🔌 Integração com OCI

- Autenticação segura com a API da OCI
- Validação de formato JSON
- Logs de tentativas e resultados
- Tratamento de erros e reenvios automáticos

## 🚀 Como Iniciar

1. Clone o repositório
   ```bash
   git clone https://github.com/seu-usuario/api-empresa-oci.git
   cd api-empresa-oci
   ```

2. Instale as dependências
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

4. Configure o banco de dados
   ```bash
   # Execute os scripts em database/
   ```

5. Inicie o servidor
   ```bash
   npm start
   ```

6. Acesse a documentação da API
   ```
   http://localhost:3000/api-docs
   ```

## 📝 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

## 📧 Contato

Para dúvidas ou sugestões, entre em contato pelo email: [seu-email@exemplo.com]