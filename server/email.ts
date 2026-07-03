import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.APP_URL || 'https://mota-store.onrender.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const THEME = {
  background: '#0a0a0a',
  cardBg: '#111111',
  accent: '#3b82f6', // Azul vibrante do projeto
  text: '#ffffff',
  textMuted: '#94a3b8',
  border: '#1e293b'
};

const commonStyles = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: ${THEME.background};
  color: ${THEME.text};
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
`;

export async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not defined. Skipping welcome email.');
    return { success: false, error: 'API Key missing' };
  }

  const firstName = name.split(' ')[0];

  try {
    const { data, error } = await resend.emails.send({
      from: `Mota Store <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Bem-vindo à Mota Store! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bem-vindo à Mota Store</title>
          </head>
          <body style="${commonStyles}">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${THEME.background}; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${THEME.cardBg}; border: 1px solid ${THEME.border}; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="color: ${THEME.accent}; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px; text-transform: uppercase;">MOTA STORE</h1>
                        <p style="color: ${THEME.textMuted}; font-size: 12px; font-weight: 700; margin: 5px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Premium Streaming Services</p>
                      </td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                      <td style="padding: 20px 40px; text-align: center;">
                        <h2 style="font-size: 32px; font-weight: 900; margin: 0; line-height: 1.2;">Bem-vindo, ${firstName}! 🚀</h2>
                        <p style="color: ${THEME.textMuted}; font-size: 16px; margin: 15px 0 0 0; line-height: 1.5;">
                          Sua conta foi criada com sucesso. Agora você tem acesso a Spotify, YouTube, Prime Video e muito mais por preços incríveis.
                        </p>
                      </td>
                    </tr>

                    <!-- Benefits -->
                    <tr>
                      <td style="padding: 20px 40px;">
                        <div style="background-color: ${THEME.background}; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 25px;">
                          <p style="margin: 0 0 15px 0; font-weight: 700; color: ${THEME.accent}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">O que você ganha agora:</p>
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-bottom: 12px; font-size: 15px; color: ${THEME.text};">🎵 <b>Spotify Premium</b> - Música sem anúncios</td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px; font-size: 15px; color: ${THEME.text};">🎬 <b>YouTube Premium</b> - Vídeos em segundo plano</td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px; font-size: 15px; color: ${THEME.text};">🎮 <b>Xbox Game Pass</b> - Centenas de jogos</td>
                            </tr>
                            <tr>
                              <td style="font-size: 15px; color: ${THEME.text};">🍿 <b>Prime Video & Netflix</b> - As melhores séries</td>
                            </tr>
                          </table>
                        </div>
                      </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                      <td style="padding: 30px 40px 40px 40px; text-align: center;">
                        <a href="${APP_URL}" style="display: inline-block; background-color: ${THEME.accent}; color: #ffffff; font-weight: 900; padding: 18px 36px; border-radius: 14px; text-decoration: none; text-transform: uppercase; font-size: 15px; letter-spacing: 1px; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);">ACESSAR A LOJA</a>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: rgba(255,255,255,0.02); border-top: 1px solid ${THEME.border}; text-align: center;">
                        <p style="color: ${THEME.textMuted}; font-size: 12px; margin: 0;">
                          © 2026 MOTA STORE. Todos os direitos reservados.<br>
                          Qualquer dúvida, chame nosso suporte no WhatsApp.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Error sending welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[Email] Unexpected error:', err);
    return { success: false, error: err };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not defined. Skipping reset email.');
    return { success: false, error: 'API Key missing' };
  }

  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const firstName = name.split(' ')[0];

  try {
    const { data, error } = await resend.emails.send({
      from: `Mota Store <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Redefinição de senha — Mota Store',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir Senha - Mota Store</title>
          </head>
          <body style="${commonStyles}">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${THEME.background}; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${THEME.cardBg}; border: 1px solid ${THEME.border}; border-radius: 24px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="color: ${THEME.accent}; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px; text-transform: uppercase;">MOTA STORE</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 20px 40px; text-align: center;">
                        <h2 style="font-size: 24px; font-weight: 900; margin: 0;">Redefinir sua senha</h2>
                        <p style="color: ${THEME.textMuted}; font-size: 16px; margin: 20px 0; line-height: 1.6;">
                          Olá, ${firstName}! Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. <b>Este link expira em 1 hora.</b>
                        </p>
                      </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                      <td style="padding: 10px 40px 30px 40px; text-align: center;">
                        <a href="${resetLink}" style="display: inline-block; background-color: ${THEME.accent}; color: #ffffff; font-weight: 900; padding: 18px 36px; border-radius: 14px; text-decoration: none; text-transform: uppercase; font-size: 15px; letter-spacing: 1px;">REDEFINIR MINHA SENHA</a>
                      </td>
                    </tr>

                    <!-- Notice -->
                    <tr>
                      <td style="padding: 0 40px 30px 40px; text-align: center;">
                        <p style="color: ${THEME.textMuted}; font-size: 13px; margin: 0;">
                          Se você não solicitou a redefinição de senha, ignore este e-mail.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: rgba(255,255,255,0.02); border-top: 1px solid ${THEME.border}; text-align: center;">
                        <p style="color: ${THEME.textMuted}; font-size: 12px; margin: 0;">
                          © 2026 MOTA STORE. Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Email] Error sending reset email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[Email] Unexpected error:', err);
    return { success: false, error: err };
  }
}
