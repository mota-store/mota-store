import { google } from 'googleapis';

// Configurações via variáveis de ambiente (configuradas no Render)
const GMAIL_USER = process.env.GMAIL_USER || 'arthurmotapaiva@gmail.com';
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '1067935514097-gogg5cvuka13k514q2sju3ma0bak0ikr.apps.googleusercontent.com';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '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';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const APP_URL = process.env.APP_URL || 'https://mota-store.shop';

console.log(`[Email] Iniciando Gmail API OAuth2 para: ${GMAIL_USER}`);

// Configuração do OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const DARK_TEMPLATE = (content: string) => `
  <div style="background-color: #09090b; color: #fafafa; font-family: sans-serif; padding: 40px 20px; margin: 0; width: 100%;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">
      <div style="padding: 30px; text-align: center; border-bottom: 1px solid #27272a;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">
          MOTA STORE
        </h1>
      </div>
      <div style="padding: 30px;">
        ${content}
      </div>
      <div style="padding: 20px; background-color: #09090b; text-align: center; border-top: 1px solid #27272a;">
        <p style="margin: 0; font-size: 11px; color: #71717a; text-transform: uppercase;">
          &copy; 2026 Mota Store • Todos os direitos reservados
        </p>
      </div>
    </div>
  </div>
`;

/**
 * Função interna para criar e codificar o e-mail no formato exigido pela Gmail API (base64url)
 */
function createRawMessage(options: { to: string; subject: string; html: string; text: string }) {
  const boundary = 'foo_bar_baz';
  const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
  
  const messageParts = [
    `From: "Mota Store" <${GMAIL_USER}>`,
    `To: ${options.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(options.text).toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(options.html).toString('base64'),
    '',
    `--${boundary}--`
  ];

  const message = messageParts.join('\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
  if (!GMAIL_REFRESH_TOKEN) {
    console.error("[Email] Erro: GMAIL_REFRESH_TOKEN não configurado no ambiente.");
    return false;
  }

  console.log(`[Email] Disparando e-mail via Gmail API para: ${options.to}`);

  try {
    const raw = createRawMessage(options);
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });

    console.log(`[Email] ENVIADO! ID: ${response.data.id}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] ERRO na Gmail API: ${error.message}`);
    if (error.response && error.response.data) {
      console.error(`[Email] Detalhes do erro:`, JSON.stringify(error.response.data));
    }
    return false;
  }
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  const subject = `Bem-vindo à Mota Store!`;
  const text = `Olá, ${firstName}.\n\nSua conta na Mota Store foi criada com sucesso. Agora você tem acesso aos melhores serviços de streaming com preços exclusivos.\n\nAcesse agora: ${APP_URL}\n\nAtenciosamente,\nEquipe Mota Store`;
  
  const html = DARK_TEMPLATE(`
    <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #ffffff; text-align: center;">BEM-VINDO!</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 20px;">
      Olá, <strong>${firstName}</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 30px;">
      Sua conta na <strong>Mota Store</strong> foi criada com sucesso. Agora você tem acesso aos melhores serviços de streaming com preços exclusivos.
    </p>
    <div style="text-align: center;">
      <a href="${APP_URL}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Acessar Loja</a>
    </div>
  `);

  return sendMail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const subject = `Recuperação de senha - Mota Store`;
  const text = `Olá, ${firstName}.\n\nRecebemos um pedido para redefinir sua senha. Use o link abaixo para criar uma nova senha:\n\n${resetLink}\n\nSe você não solicitou essa alteração, ignore este e-mail por segurança.\n\nAtenciosamente,\nEquipe Mota Store`;

  const html = DARK_TEMPLATE(`
    <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #ffffff; text-align: center;">RECUPERAÇÃO DE SENHA</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 20px;">
      Olá, <strong>${firstName}</strong>. Recebemos um pedido para trocar sua senha.
    </p>
    <p style="font-size: 14px; color: #ef4444; margin-bottom: 30px; text-align: center;">Se você não solicitou essa alteração, ignore este e-mail por segurança.</p>
    <div style="text-align: center;">
      <a href="${resetLink}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Redefinir Senha</a>
    </div>
  `);

  return sendMail({ to: email, subject, html, text });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const subject = `Código de verificação: ${code}`;
  const text = `Olá, ${firstName}.\n\nSeu código de verificação é: ${code}\n\nEste código é válido por 10 minutos.\n\nAtenciosamente,\nEquipe Mota Store`;

  const html = DARK_TEMPLATE(`
    <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #ffffff; text-align: center;">CÓDIGO DE ACESSO</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 30px; text-align: center;">
      Olá, <strong>${firstName}</strong>. Use o código abaixo para validar sua ação:
    </p>
    <div style="background-color: #09090b; border: 1px dashed #27272a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${code}</span>
    </div>
    <p style="text-align: center; font-size: 12px; color: #71717a;">Válido por 10 minutos</p>
  `);

  return sendMail({ to: email, subject, html, text });
}
