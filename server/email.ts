import { google } from 'googleapis';

const GMAIL_USER = process.env.GMAIL_USER || 'arthurmotapaiva@gmail.com';
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '1067935514097-gogg5cvuka13k514q2sju3ma0bak0ikr.apps.googleusercontent.com';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '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';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const APP_URL = process.env.APP_URL || 'https://mota-store.shop';

const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Função interna para criar e codificar o e-mail de forma simplificada
 */
function createRawMessage(options: { to: string; subject: string; html: string; text: string }) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
  const messageParts = [
    `From: "Mota Store" <${GMAIL_USER}>`,
    `To: ${options.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(options.html).toString('base64'),
  ];

  const message = messageParts.join('\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
  if (!GMAIL_REFRESH_TOKEN) return false;
  try {
    const raw = createRawMessage(options);
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return true;
  } catch (error: any) {
    console.error(`[Email] ERRO: ${error.message}`);
    return false;
  }
}

// TEMPLATE ULTRA SIMPLIFICADO (Evita SPAM)
const SIMPLE_LAYOUT = (content: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
    <div style="padding: 20px; border-bottom: 2px solid #eee;">
      <h2 style="margin: 0; color: #10b981;">MOTA STORE</h2>
    </div>
    <div style="padding: 20px;">
      ${content}
    </div>
    <div style="padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee;">
      Este é um e-mail automático da Mota Store. Por favor, não responda.
    </div>
  </div>
`;

export async function sendWelcomeEmail(email: string, firstName: string) {
  const subject = `Bem-vindo à Mota Store!`;
  const html = SIMPLE_LAYOUT(`
    <p>Olá, <strong>${firstName}</strong>!</p>
    <p>Sua conta na Mota Store foi criada com sucesso.</p>
    <p>Acesse nossa loja para conferir as melhores ofertas: <a href="${APP_URL}">${APP_URL}</a></p>
    <p>Seja muito bem-vindo!</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const subject = `${code} é o seu código de verificação`;
  const html = SIMPLE_LAYOUT(`
    <p>Olá, <strong>${firstName}</strong>.</p>
    <p>Seu código de verificação é:</p>
    <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981; border-radius: 8px;">
      ${code}
    </div>
    <p>Este código expira em 10 minutos.</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const subject = `Recuperação de senha - Mota Store`;
  const html = SIMPLE_LAYOUT(`
    <p>Olá, <strong>${firstName}</strong>.</p>
    <p>Recebemos um pedido para redefinir sua senha.</p>
    <p>Clique no link abaixo para criar uma nova senha:</p>
    <p><a href="${resetLink}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir minha senha</a></p>
    <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}
