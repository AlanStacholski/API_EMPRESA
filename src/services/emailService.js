// services/emailService.js - Serviço de email para notificações

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Remetente padrão
const defaultSender = process.env.EMAIL_FROM || 'noreply@apiempresa.com';

/**
 * Função genérica para envio de emails
 * @param {string} to - Destinatário
 * @param {string} subject - Assunto
 * @param {string} text - Conteúdo em texto plano
 * @param {string} html - Conteúdo em HTML
 */
async function sendEmail(to, subject, text, html) {
  try {
    const mailOptions = {
      from: defaultSender,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email enviado para ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Erro ao enviar email:', error);
    throw error;
  }
}

/**
 * Enviar notificação aos administradores sobre novo usuário
 * @param {string} adminEmail - Email do administrador
 * @param {string} adminName - Nome do administrador
 * @param {Object} user - Dados do novo usuário
 */
async function sendNewUserNotification(adminEmail, adminName, user) {
  const subject = 'Novo usuário aguardando aprovação';
  
  const text = `
    Olá ${adminName},

    Um novo usuário está aguardando sua aprovação:

    Nome: ${user.name}
    Email: ${user.email}
    Empresa: ${user.companyName}

    Por favor, acesse o painel administrativo para aprovar ou rejeitar este usuário.
    
    Atenciosamente,
    Equipe API Empresa
  `;

  const html = `
    <h2>Novo usuário aguardando aprovação</h2>
    <p>Olá <strong>${adminName}</strong>,</p>
    <p>Um novo usuário está aguardando sua aprovação:</p>
    <ul>
      <li><strong>Nome:</strong> ${user.name}</li>
      <li><strong>Email:</strong> ${user.email}</li>
      <li><strong>Empresa:</strong> ${user.companyName}</li>
    </ul>
    <p>Por favor, acesse o <a href="${process.env.APP_URL}/admin/users">painel administrativo</a> para aprovar ou rejeitar este usuário.</p>
    <br>
    <p>Atenciosamente,<br>Equipe API Empresa</p>
  `;

  return sendEmail(adminEmail, subject, text, html);
}

/**
 * Enviar notificação ao usuário sobre a aprovação de sua conta
 * @param {string} userEmail - Email do usuário
 * @param {string} userName - Nome do usuário
 * @param {string} companyName - Nome da empresa
 */
async function sendUserApprovalNotification(userEmail, userName, companyName) {
  const subject = 'Sua conta foi aprovada';
  
  const text = `
    Olá ${userName},

    Temos o prazer de informar que sua conta foi aprovada!

    Você agora pode acessar a plataforma API Empresa como membro da empresa ${companyName}.
    
    Acesse: ${process.env.APP_URL}/login
    
    Atenciosamente,
    Equipe API Empresa
  `;

  const html = `
    <h2>Sua conta foi aprovada!</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Temos o prazer de informar que sua conta foi aprovada!</p>
    <p>Você agora pode acessar a plataforma API Empresa como membro da empresa <strong>${companyName}</strong>.</p>
    <p><a href="${process.env.APP_URL}/login">Clique aqui para fazer login</a></p>
    <br>
    <p>Atenciosamente,<br>Equipe API Empresa</p>
  `;

  return sendEmail(userEmail, subject, text, html);
}

/**
 * Enviar notificação sobre nova solicitação OCI
 * @param {string} userEmail - Email do usuário
 * @param {string} userName - Nome do usuário
 * @param {Object} request - Dados da solicitação
 */
async function sendOciRequestNotification(userEmail, userName, request) {
  const subject = `Solicitação OCI ${request.id} - ${request.status}`;
  
  const text = `
    Olá ${userName},

    Sua solicitação OCI foi ${request.status === 'COMPLETED' ? 'processada com sucesso' : 'enviada e está em processamento'}.

    ID da Solicitação: ${request.id}
    Tipo: ${request.type}
    Status: ${request.status}
    Data: ${new Date(request.createdAt).toLocaleString()}

    Você pode acompanhar o status desta solicitação em sua área de usuário.
    
    Atenciosamente,
    Equipe API Empresa
  `;

  const html = `
    <h2>Solicitação OCI ${request.status === 'COMPLETED' ? 'Processada' : 'Enviada'}</h2>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Sua solicitação OCI foi ${request.status === 'COMPLETED' ? 'processada com sucesso' : 'enviada e está em processamento'}.</p>
    <ul>
      <li><strong>ID da Solicitação:</strong> ${request.id}</li>
      <li><strong>Tipo:</strong> ${request.type}</li>
      <li><strong>Status:</strong> ${request.status}</li>
      <li><strong>Data:</strong> ${new Date(request.createdAt).toLocaleString()}</li>
    </ul>
    <p>Você pode <a href="${process.env.APP_URL}/dashboard/requests/${request.id}">acompanhar o status desta solicitação</a> em sua área de usuário.</p>
    <br>
    <p>Atenciosamente,<br>Equipe API Empresa</p>
  `;

  return sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendEmail,
  sendNewUserNotification,
  sendUserApprovalNotification,
  sendOciRequestNotification
};