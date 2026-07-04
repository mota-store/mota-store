import { google } from 'googleapis';

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
 * Configuração do cliente OAuth2 do Google
 */
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Função para codificar o assunto em UTF-8 Base64 para evitar erros de caracteres estranhos
 */
function encodeSubject(subject: string) {
  return `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

/**
 * Gera um Message-ID único com timestamp e valor aleatório
 */
function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `<${timestamp}-${random}@mota-store.onrender.com>`;
}

/**
 * Formata a data atual no padrão RFC 2822 para o cabeçalho Date
 */
function formatDateHeader(): string {
  const date = new Date();
  return date.toUTCString();
}

/**
 * Função para codificar o e-mail no formato exigido pela API do Gmail (Base64URL)
 * Melhorada com cabeçalhos MIME completos para evitar SPAM e erros de encoding.
 * Inclui: Reply-To, X-Mailer, Message-ID, Date, e versão text/plain enriquecida.
 */
function createRawMessage(options: { to: string; subject: string; html: string }) {
  const utf8Subject = encodeSubject(options.subject);
  const boundary = "__MOTA_STORE_BOUNDARY__";
  const messageId = generateMessageId();
  const dateHeader = formatDateHeader();

  // Texto plano enriquecido para o part text/plain — ajuda filtros anti-spam
  const subjectText = options.subject.replace(/\ud83c[\udf00-\udfff]|\ud83d[\udc00-\ude4f\ude80-\udeff]|[\u2600-\u2B55]/g, '').trim();
  const plainText = `Olá!\n\n` +
    `Você está recebendo este e-mail da MOTA STORE.\n` +
    `Assunto: ${subjectText}\n\n` +
    `Este e-mail contém informações importantes da sua conta. ` +
    `Para visualizar o conteúdo completo, por favor, use um leitor de e-mail compatível com HTML.\n\n` +
    `Se você não solicitou este e-mail, por favor, ignore esta mensagem.\n\n` +
    `--\n` +
    `MOTA STORE\n` +
    `Site: ${APP_URL}\n` +
    `WhatsApp Suporte: +55 91 8488-6473\n` +
    `© 2026 MOTA STORE. Todos os direitos reservados.`;

  const str = [
    `MIME-Version: 1.0\n`,
    `To: ${options.to}\n`,
    `From: "MOTA STORE" <${SMTP_USER}>\n`,
    `Reply-To: ${SMTP_USER}\n`,
    `Subject: ${utf8Subject}\n`,
    `Date: ${dateHeader}\n`,
    `Message-ID: ${messageId}\n`,
    `X-Mailer: MOTA STORE Mailer v1.0\n`,
    `Content-Type: multipart/alternative; boundary="${boundary}"\n\n`,
    `--${boundary}\n`,
    `Content-Type: text/plain; charset="UTF-8"\n`,
    `Content-Transfer-Encoding: quoted-printable\n\n`,
    `${plainText}\n\n`,
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

/**
 * Função principal de envio via GMAIL HTTP API.
 * Ignora completamente protocolos SMTP e bloqueios de porta do Render.
 */
async function sendMailViaAPI(options: { to: string; subject: string; html: string }) {
  console.log(`[Email Action] - Iniciando envio via GMAIL HTTP API para ${options.to}`);
  
  try {
    const raw = createRawMessage(options);
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });

    console.log(`[Email Success] - Enviado com sucesso via API! ID: ${res.data.id}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Fatal] - Falha crítica no envio via GMAIL API: ${error.message}`);
    throw error;
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

  return sendMailViaAPI({ to: email, subject: 'Bem-vindo à MOTA STORE! 🎉', html });
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

  return sendMailViaAPI({ to: email, subject: 'Redefinição de Senha — MOTA STORE', html });
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

  return sendMailViaAPI({ to: email, subject: `${code} é seu código de verificação — MOTA STORE`, html });
}
