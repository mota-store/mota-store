import nodemailer from 'nodemailer';

// Credenciais fixas para garantir funcionamento no Render
const SMTP_USER = 'arthurmotapaiva@gmail.com';
const SMTP_PASS = 'aklpfhmohnfdzhkg';

// Configuração do Nodemailer - SMTP Genérico (Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // false para 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

console.log("[Email] Nodemailer configurado com credenciais fixas (Gmail)");

const APP_URL = process.env.APP_URL || 'https://mota-store.onrender.com';

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
          <tr>
            <td align="center" style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.mutedTextColor}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; padding-top: 5px;">
              Premium Streaming Services
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
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.mutedTextColor}; font-size: 12px; line-height: 18px;">
              &copy; 2026 MOTA STORE. Todos os direitos reservados.
              <br/>
              Suporte via WhatsApp: +55 91 8488-6473
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const renderButton = (text: string, href: string) => `
  <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px auto 0 auto;">
    <tr>
      <td align="center" style="border-radius: ${baseStyles.buttonBorderRadius}; background-color: ${baseStyles.accentColor}; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);">
        <a href="${href}" target="_blank" style="font-size: 15px; font-family: ${baseStyles.fontFamily}; color: ${baseStyles.textColor}; text-decoration: none; font-weight: 900; text-transform: uppercase; padding: 18px 36px; border-radius: ${baseStyles.buttonBorderRadius}; display: inline-block;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

export async function sendWelcomeEmail(email: string, firstName: string) {
  const emailHtml = `
    <body style="background-color: ${baseStyles.bodyBg}; margin: 0; padding: 0;">
      <center>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${baseStyles.bodyBg};">
          <tr>
            <td align="center" style="padding: 20px;">
              <table class="main" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${baseStyles.cardBg}; border-radius: ${baseStyles.cardBorderRadius};">
                <tr>
                  <td style="padding: 0px 20px;">
                    ${renderHeader()}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; font-family: ${baseStyles.fontFamily}; color: ${baseStyles.textColor};">
                    <h1 style="font-size: 32px; font-weight: 900; margin: 0 0 15px 0;">Bem-vindo, ${firstName}! 🚀</h1>
                    <p style="font-size: 16px; line-height: 24px; color: ${baseStyles.mutedTextColor}; margin: 0 0 30px 0;">
                      Sua conta foi criada com sucesso. Agora você tem acesso a Spotify, YouTube, Prime Video e muito mais por preços incríveis.
                    </p>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${baseStyles.bodyBg}; border: 1px solid ${baseStyles.borderColor}; border-radius: 16px; padding: 20px;">
                      <tr>
                        <td style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.accentColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; padding-bottom: 10px;">
                          O que você ganha agora:
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.textColor}; font-size: 16px; line-height: 28px;">
                          <ul>
                            <li style="margin-bottom: 8px;">🎵 Spotify Premium — Música sem anúncios</li>
                            <li style="margin-bottom: 8px;">🎬 YouTube Premium — Vídeos em segundo plano</li>
                            <li style="margin-bottom: 8px;">🎮 Xbox Game Pass — Centenas de jogos</li>
                            <li>🍿 Prime Video & Netflix — As melhores séries</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    ${renderButton('ACESSAR A LOJA', APP_URL)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0px 20px;">
                    ${renderFooter()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </center>
    </body>
  `;

  try {
    const info = await transporter.sendMail({
      from: SMTP_USER,
      to: email,
      subject: 'Bem-vindo à Mota Store! 🎉',
      html: emailHtml,
    });

    console.log('Welcome email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error: any) {
    console.error('Exception sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;

  const emailHtml = `
    <body style="background-color: ${baseStyles.bodyBg}; margin: 0; padding: 0;">
      <center>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${baseStyles.bodyBg};">
          <tr>
            <td align="center" style="padding: 20px;">
              <table class="main" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${baseStyles.cardBg}; border-radius: ${baseStyles.cardBorderRadius};">
                <tr>
                  <td style="padding: 0px 20px;">
                    ${renderHeader()}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; font-family: ${baseStyles.fontFamily}; color: ${baseStyles.textColor};">
                    <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 15px 0;">Redefinir sua senha</h1>
                    <p style="font-size: 16px; line-height: 24px; color: ${baseStyles.mutedTextColor}; margin: 0 0 30px 0;">
                      Olá, ${firstName}! Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. <strong style="color: ${baseStyles.textColor};">Este link expira em 1 hora.</strong>
                    </p>

                    ${renderButton('REDEFINIR MINHA SENHA', resetLink)}

                    <p style="font-size: 14px; line-height: 20px; color: ${baseStyles.mutedTextColor}; margin-top: 40px;">
                      Se você não solicitou a redefinição de senha, ignore este e-mail.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0px 20px;">
                    ${renderFooter()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </center>
    </body>
  `;

  try {
    const info = await transporter.sendMail({
      from: SMTP_USER,
      to: email,
      subject: 'Redefinição de senha — Mota Store',
      html: emailHtml,
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error: any) {
    console.error('Exception sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const emailHtml = `
    <body style="background-color: ${baseStyles.bodyBg}; margin: 0; padding: 0;">
      <center>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${baseStyles.bodyBg};">
          <tr>
            <td align="center" style="padding: 20px;">
              <table class="main" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${baseStyles.cardBg}; border-radius: ${baseStyles.cardBorderRadius};">
                <tr>
                  <td style="padding: 0px 20px;">
                    ${renderHeader()}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; font-family: ${baseStyles.fontFamily}; color: ${baseStyles.textColor};">
                    <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 15px 0;">Seu código de verificação</h1>
                    <p style="font-size: 16px; line-height: 24px; color: ${baseStyles.mutedTextColor}; margin: 0 0 30px 0;">
                      Olá, ${firstName}! Use o código abaixo para confirmar sua identidade e visualizar sua senha atual na Mota Store.
                    </p>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${baseStyles.bodyBg}; border: 2px dashed ${baseStyles.accentColor}; border-radius: 16px; padding: 30px; margin-top: 20px;">
                      <tr>
                        <td align="center" style="font-family: ${baseStyles.fontFamily}; color: ${baseStyles.accentColor}; font-size: 48px; font-weight: 900; letter-spacing: 10px;">
                          ${code}
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 14px; line-height: 20px; color: ${baseStyles.mutedTextColor}; margin-top: 40px;">
                      Este código é válido por 10 minutos. Se você não solicitou este código, ignore este e-mail.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0px 20px;">
                    ${renderFooter()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </center>
    </body>
  `;

  try {
    const info = await transporter.sendMail({
      from: SMTP_USER,
      to: email,
      subject: `${code} é seu código de verificação — Mota Store`,
      html: emailHtml,
    });

    console.log('Verification code email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error: any) {
    console.error('Exception sending verification code email:', error);
    return { success: false, error: error.message };
  }
}
