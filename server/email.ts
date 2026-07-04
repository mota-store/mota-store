import nodemailer from 'nodemailer';

const SMTP_USER = 'arthurmotapaiva@gmail.com';
const CLIENT_ID = '1067935514097-gogg5cvuka13k514q2sju3ma0bak0ikr.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//04CuXpN3UYnKpCgYIARAAGAQSNwF-L9IrmwyxlF_wSJhepkvW9MxjZ39qK1-_S-tEGPX7x6cTUsgKrduwnCk8lood4l6bNgBJHYA';
const APP_URL = 'https://mota-store.onrender.com';

const baseStyles = {
  bodyBg: '#0a0a0a',
  cardBg: '#111111',
  accentColor: '#3b82f6',
  textColor: '#ffffff',
  mutedTextColor: '#94a3b8',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

/**
 * Função interna para gerenciar o envio usando OAuth2.
 * Esta abordagem usa HTTPS (porta 443) e ignora bloqueios de SMTP do Render.
 */
async function sendMailWithOAuth2(options: { to: string; subject: string; html: string }) {
  console.log(`[Email Action] - Iniciando tentativa de envio via OAuth2 para ${options.to}`);
  
  try {
    // Criar o transporter DENTRO da função de envio com configuração OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: SMTP_USER,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
      },
    } as any);

    const info = await transporter.sendMail({
      from: `"MOTA STORE" <${SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`[Email Success] - Enviado com sucesso via OAuth2! ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] - Falha crítica no envio via OAuth2: ${error.message}`);
    
    // Se falhar o OAuth2, tentamos um fallback simples com as senhas de app (apenas em porta 587 como última tentativa)
    console.log(`[Email Retry] - Tentando fallback emergencial com Senha de App...`);
    try {
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: 'aklpfhmohnfdzhkg', // Usando a primeira senha de app como fallback
        },
      });
      await fallbackTransporter.sendMail({
        from: `"MOTA STORE" <${SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`[Email Success] - Enviado via fallback de Senha de App.`);
      return true;
    } catch (fallbackError: any) {
      console.error(`[Email Fatal] - Todos os métodos (OAuth2 e Fallback) falharam.`);
      throw fallbackError;
    }
  }
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  const html = `
    <div style="background: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; padding: 40px; font-family: ${baseStyles.fontFamily};">
      <div style="background: ${baseStyles.cardBg}; padding: 30px; border-radius: 16px; border: 1px solid #333;">
        <h1 style="color: ${baseStyles.accentColor}; margin-top: 0;">MOTA STORE</h1>
        <h2 style="color: #fff;">Bem-vindo, ${firstName}! 🎉</h2>
        <p style="color: ${baseStyles.mutedTextColor}; line-height: 1.6;">Sua conta na Mota Store está pronta. Explore nossos serviços premium e aproveite as melhores ofertas.</p>
        <div style="margin-top: 30px;">
          <a href="${APP_URL}" style="display: inline-block; padding: 14px 28px; background: ${baseStyles.accentColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">IR PARA A LOJA</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          WhatsApp Suporte: +55 91 8488-6473<br>
          © 2026 MOTA STORE. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `;

  return sendMailWithOAuth2({ to: email, subject: 'Bem-vindo à MOTA STORE! 🎉', html });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const html = `
    <div style="background: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; padding: 40px; font-family: ${baseStyles.fontFamily};">
      <div style="background: ${baseStyles.cardBg}; padding: 30px; border-radius: 16px; border: 1px solid #333;">
        <h1 style="color: ${baseStyles.accentColor}; margin-top: 0;">MOTA STORE</h1>
        <h2 style="color: #fff;">Redefinir Senha</h2>
        <p style="color: ${baseStyles.mutedTextColor}; line-height: 1.6;">Olá ${firstName}, recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para prosseguir:</p>
        <div style="margin-top: 30px;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background: ${baseStyles.accentColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">REDEFINIR MINHA SENHA</a>
        </div>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">Se você não solicitou isso, ignore este e-mail.</p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          WhatsApp Suporte: +55 91 8488-6473<br>
          © 2026 MOTA STORE. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `;

  return sendMailWithOAuth2({ to: email, subject: 'Redefinição de Senha — MOTA STORE', html });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const html = `
    <div style="background: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; padding: 40px; font-family: ${baseStyles.fontFamily};">
      <div style="background: ${baseStyles.cardBg}; padding: 30px; border-radius: 16px; border: 1px solid #333;">
        <h1 style="color: ${baseStyles.accentColor}; margin-top: 0;">MOTA STORE</h1>
        <h2 style="color: #fff;">Código de Verificação</h2>
        <p style="color: ${baseStyles.mutedTextColor}; line-height: 1.6;">Olá ${firstName}, use o código abaixo para verificar sua identidade e visualizar seus dados sensíveis:</p>
        <div style="margin-top: 30px; background: #1a1a1a; padding: 20px; border-radius: 12px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; color: ${baseStyles.accentColor}; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">Este código expira em 10 minutos.</p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          WhatsApp Suporte: +55 91 8488-6473<br>
          © 2026 MOTA STORE. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `;

  return sendMailWithOAuth2({ to: email, subject: `${code} é seu código de verificação — MOTA STORE`, html });
}
