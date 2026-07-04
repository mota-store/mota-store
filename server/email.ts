import nodemailer from 'nodemailer';

const SMTP_USER = 'arthurmotapaiva@gmail.com';
const SMTP_PASS = 'aklpfhmohnfdzhkg';
const APP_URL = 'https://mota-store.onrender.com';

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

const baseStyles = {
  bodyBg: '#0a0a0a',
  cardBg: '#111111',
  accentColor: '#3b82f6',
  textColor: '#ffffff',
  mutedTextColor: '#94a3b8',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

export async function sendWelcomeEmail(email: string, firstName: string) {
  console.log(`[Email Action] Boas-vindas -> ${email}`);
  const transporter = createTransporter();
  
  const html = `
    <div style="background: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; padding: 40px; font-family: ${baseStyles.fontFamily};">
      <h1 style="color: ${baseStyles.accentColor};">Bem-vindo, ${firstName}!</h1>
      <p>Sua conta na Mota Store está pronta. Explore nossos serviços premium.</p>
      <a href="${APP_URL}" style="display: inline-block; padding: 15px 30px; background: ${baseStyles.accentColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">IR PARA A LOJA</a>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: email,
      subject: 'Bem-vindo à Mota Store! 🎉',
      html,
    });
    console.log(`[Email Success] Boas-vindas enviado para ${email}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Falha ao enviar boas-vindas: ${error.message}`);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  console.log(`[Email Action] Redefinição -> ${email}`);
  const transporter = createTransporter();
  const resetLink = `${APP_URL}/reset-password?token=${token}`;

  const html = `
    <div style="background: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; padding: 40px; font-family: ${baseStyles.fontFamily};">
      <h1 style="color: ${baseStyles.accentColor};">Redefinir Senha</h1>
      <p>Olá ${firstName}, clique no link abaixo para criar uma nova senha:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 15px 30px; background: ${baseStyles.accentColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">REDEFINIR SENHA</a>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: email,
      subject: 'Redefinição de Senha — Mota Store',
      html,
    });
    console.log(`[Email Success] Redefinição enviada para ${email}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Falha ao enviar redefinição: ${error.message}`);
    throw error;
  }
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  console.log(`[Email Action] Código (${code}) -> ${email}`);
  const transporter = createTransporter();

  const html = `
    <div style="background: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; padding: 40px; font-family: ${baseStyles.fontFamily};">
      <h1 style="color: ${baseStyles.accentColor};">Seu Código: ${code}</h1>
      <p>Olá ${firstName}, use o código acima para verificar sua identidade na Mota Store.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: email,
      subject: `${code} é seu código de verificação`,
      html,
    });
    console.log(`[Email Success] Código enviado para ${email}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Falha ao enviar código: ${error.message}`);
    throw error;
  }
}
