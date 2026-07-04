import nodemailer from 'nodemailer';

// Credenciais fixas para garantir funcionamento no Render
const SMTP_USER = 'arthurmotapaiva@gmail.com';
const SMTP_PASS = 'aklpfhmohnfdzhkg';

// Configuração do Nodemailer - SMTP Genérico (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

console.log("[Email System] Iniciando com credenciais fixas:", SMTP_USER);

const APP_URL = 'https://mota-store.onrender.com';

const baseStyles = {
  bodyBg: '#0a0a0a',
  cardBg: '#111111',
  accentColor: '#3b82f6',
  textColor: '#ffffff',
  mutedTextColor: '#94a3b8',
  borderColor: '#1e293b',
  cardBorderRadius: '24px',
  buttonBorderRadius: '14px',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const renderHeader = () => `
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.accentColor}; font-size: 28px; font-weight: 900; text-transform: uppercase; line-height: 1;">
              MOTA STORE
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const renderFooter = () => `
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.02); border-top: 1px solid ${baseStyles.borderColor}; margin-top: 40px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <p style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.mutedTextColor}; font-size: 12px;">
          &copy; 2026 MOTA STORE. Suporte WhatsApp: +55 91 8488-6473
        </p>
      </td>
    </tr>
  </table>
`;

export async function sendWelcomeEmail(email: string, firstName: string) {
  console.log(`[Email] Tentando enviar BOAS-VINDAS para: ${email}`);
  
  const emailHtml = `
    <body style="background-color: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; font-family: ${baseStyles.fontFamily};">
      <div style="max-width: 600px; margin: 0 auto; background: ${baseStyles.cardBg}; padding: 40px; border-radius: ${baseStyles.cardBorderRadius};">
        ${renderHeader()}
        <h1>Bem-vindo, ${firstName}! 🚀</h1>
        <p>Sua conta na Mota Store foi criada. Aproveite nossos serviços premium.</p>
        <a href="${APP_URL}" style="background: ${baseStyles.accentColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; margin-top: 20px;">ACESSAR LOJA</a>
        ${renderFooter()}
      </div>
    </body>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: email,
      subject: 'Bem-vindo à Mota Store! 🎉',
      html: emailHtml,
    });
    console.log('[Email Success] Welcome sent:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('[Email Error] Welcome failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  console.log(`[Email] Tentando enviar REDEFINIÇÃO para: ${email}`);
  const resetLink = `${APP_URL}/reset-password?token=${token}`;

  const emailHtml = `
    <body style="background-color: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; font-family: ${baseStyles.fontFamily};">
      <div style="max-width: 600px; margin: 0 auto; background: ${baseStyles.cardBg}; padding: 40px; border-radius: ${baseStyles.cardBorderRadius};">
        ${renderHeader()}
        <h1>Redefinir Senha</h1>
        <p>Olá ${firstName}, clique no botão abaixo para criar uma nova senha:</p>
        <a href="${resetLink}" style="background: ${baseStyles.accentColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; margin-top: 20px;">REDEFINIR SENHA</a>
        ${renderFooter()}
      </div>
    </body>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: email,
      subject: 'Redefinição de Senha — Mota Store',
      html: emailHtml,
    });
    console.log('[Email Success] Reset sent:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('[Email Error] Reset failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  console.log(`[Email] Tentando enviar CÓDIGO (${code}) para: ${email}`);
  
  const emailHtml = `
    <body style="background-color: ${baseStyles.bodyBg}; color: ${baseStyles.textColor}; font-family: ${baseStyles.fontFamily};">
      <div style="max-width: 600px; margin: 0 auto; background: ${baseStyles.cardBg}; padding: 40px; border-radius: ${baseStyles.cardBorderRadius};">
        ${renderHeader()}
        <h1>Seu Código: ${code}</h1>
        <p>Olá ${firstName}, use o código acima para verificar sua identidade.</p>
        ${renderFooter()}
      </div>
    </body>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: email,
      subject: `${code} é seu código de verificação`,
      html: emailHtml,
    });
    console.log('[Email Success] Code sent:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('[Email Error] Code failed:', error.message);
    return { success: false, error: error.message };
  }
}
