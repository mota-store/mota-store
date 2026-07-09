import { google } from 'googleapis';

const SMTP_USER = 'arthurmotapaiva@gmail.com';
const CLIENT_ID = '1067935514097-gogg5cvuka13k514q2sju3ma0bak0ikr.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//04CuXpN3UYnKpCgYIARAAGAQSNwF-L9IrmwyxlF_wSJhepkvW9MxjZ39qK1-_S-tEGPX7x6cTUsgKrduwnCk8lood4l6bNgBJHYA';
const APP_URL = 'https://mota-store.onrender.com';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function encodeSubject(subject: string) {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `<${timestamp}-${random}@mota-store.onrender.com>`;
}

function formatDateHeader(): string {
  return new Date().toUTCString();
}

function createRawMessage(options: { to: string; subject: string; html: string; plainText: string }) {
  const utf8Subject = encodeSubject(options.subject);
  const boundary = '__MOTA_STORE_BOUNDARY__';
  const messageId = generateMessageId();
  const dateHeader = formatDateHeader();

  const str = [
    `MIME-Version: 1.0\n`,
    `To: ${options.to}\n`,
    `From: "Mota Store" <${SMTP_USER}>\n`,
    `Reply-To: ${SMTP_USER}\n`,
    `Subject: ${utf8Subject}\n`,
    `Date: ${dateHeader}\n`,
    `Message-ID: ${messageId}\n`,
    `X-Mailer: Mota Store Mailer v3.0\n`,
    `List-Unsubscribe: <mailto:${SMTP_USER}?subject=unsubscribe>, <${APP_URL}>\n`,
    `Content-Type: multipart/alternative; boundary="${boundary}"\n\n`,
    `--${boundary}\n`,
    `Content-Type: text/plain; charset="UTF-8"\n`,
    `Content-Transfer-Encoding: quoted-printable\n\n`,
    `${options.plainText}\n\n`,
    `--${boundary}\n`,
    `Content-Type: text/html; charset="UTF-8"\n`,
    `Content-Transfer-Encoding: base64\n\n`,
    Buffer.from(options.html).toString('base64'),
    `\n--${boundary}--`,
  ].join('');

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendMailViaAPI(options: { to: string; subject: string; html: string; plainText: string }) {
  console.log(`[Email] Enviando para ${options.to} - Assunto: ${options.subject}`);
  try {
    const raw = createRawMessage(options);
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    console.log(`[Email] Enviado com sucesso. ID: ${res.data.id}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Falha no envio: ${error.message}`);
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  const subject = `Bem-vindo a Mota Store!`;

  const plainText = `Ola, ${firstName}. Sua conta na Mota Store foi criada com sucesso. Seja bem-vindo!`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #1e40af;">Bem-vindo!</h2>
      <p>Ola, ${firstName}.</p>
      <p>Sua conta na <b>Mota Store</b> foi criada com sucesso. Estamos felizes em ter voce conosco.</p>
      <p>Sua conta ja esta ativa e pronta para uso.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">Equipe Mota Store</p>
    </div>
  `;

  return sendMailViaAPI({ to: email, subject, html, plainText });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const subject = `Recuperacao de senha - Mota Store`;

  const plainText = `Ola, ${firstName}. Use o link para redefinir sua senha: ${resetLink}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e40af;">Recuperacao de Senha</h2>
      <p>Ola, ${firstName}. Recebemos um pedido para trocar sua senha.</p>
      <p>Clique no botao abaixo para criar uma nova senha:</p>
      <p><a href="${resetLink}" style="background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Trocar Senha</a></p>
      <p style="font-size: 12px; color: #999;">Se voce nao pediu isso, ignore este e-mail.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">Equipe Mota Store</p>
    </div>
  `;

  return sendMailViaAPI({ to: email, subject, html, plainText });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const subject = `Codigo de verificacao: ${code}`;

  const plainText = `Ola, ${firstName}. Seu codigo e: ${code}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
      <h2 style="color: #1e40af;">Codigo de Verificacao</h2>
      <p>Ola, ${firstName}. Use o codigo abaixo:</p>
      <div style="background: #f4f4f5; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e40af; border-radius: 10px; margin: 20px 0;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #999;">Valido por 10 minutos.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">Equipe Mota Store</p>
    </div>
  `;

  return sendMailViaAPI({ to: email, subject, html, plainText });
}
