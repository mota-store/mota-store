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
    `X-Mailer: Mota Store Mailer v2.0\n`,
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
  const subject = `Sua conta na Mota Store foi criada`;

  const plainText = `Ola, ${firstName}!

Sua conta na Mota Store foi criada com sucesso.

Agora voce pode acessar a loja, adicionar produtos ao carrinho e aproveitar os melhores servicos digitais.

Acesse sua conta em: ${APP_URL}

Se precisar de ajuda, entre em contato pelo WhatsApp: +55 91 8488-6473

Atenciosamente,
Equipe Mota Store
${APP_URL}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo a Mota Store</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#1e40af;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">MOTA STORE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px 0;color:#1e293b;font-size:20px;font-weight:600;">Ola, ${firstName}!</h2>
              <p style="margin:0 0 16px 0;color:#475569;font-size:15px;line-height:1.7;">Sua conta foi criada com sucesso. Estamos felizes em ter voce por aqui.</p>
              <p style="margin:0 0 32px 0;color:#475569;font-size:15px;line-height:1.7;">Acesse a loja para explorar nossos produtos e servicos digitais.</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e40af;border-radius:6px;">
                    <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">Acessar a Loja</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Suporte via WhatsApp: +55 91 8488-6473<br>Este e-mail foi enviado para ${email} porque voce criou uma conta na Mota Store.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMailViaAPI({ to: email, subject, html, plainText });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const subject = `Redefinicao de senha - Mota Store`;

  const plainText = `Ola, ${firstName}.

Recebemos uma solicitacao para redefinir a senha da sua conta na Mota Store.

Para criar uma nova senha, acesse o link abaixo:
${resetLink}

Este link expira em 1 hora.

Se voce nao solicitou a redefinicao de senha, ignore este e-mail. Sua senha permanece a mesma.

Atenciosamente,
Equipe Mota Store
${APP_URL}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinicao de Senha</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#1e40af;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">MOTA STORE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px 0;color:#1e293b;font-size:20px;font-weight:600;">Redefinicao de senha</h2>
              <p style="margin:0 0 16px 0;color:#475569;font-size:15px;line-height:1.7;">Ola, ${firstName}. Recebemos uma solicitacao para redefinir a senha da sua conta.</p>
              <p style="margin:0 0 32px 0;color:#475569;font-size:15px;line-height:1.7;">Clique no botao abaixo para criar uma nova senha. Este link e valido por 1 hora.</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e40af;border-radius:6px;">
                    <a href="${resetLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">Redefinir Senha</a>
                  </td>
                </tr>
              </table>
              <p style="margin:32px 0 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">Se voce nao solicitou a redefinicao de senha, ignore este e-mail. Sua senha nao sera alterada.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Suporte via WhatsApp: +55 91 8488-6473<br>Este e-mail foi enviado para ${email} a pedido do titular da conta.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMailViaAPI({ to: email, subject, html, plainText });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const subject = `Seu codigo de verificacao: ${code}`;

  const plainText = `Ola, ${firstName}.

Seu codigo de verificacao da Mota Store e:

${code}

Este codigo e valido por 10 minutos.

Se voce nao solicitou este codigo, ignore este e-mail.

Atenciosamente,
Equipe Mota Store
${APP_URL}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codigo de Verificacao</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#1e40af;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">MOTA STORE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <h2 style="margin:0 0 16px 0;color:#1e293b;font-size:20px;font-weight:600;">Codigo de verificacao</h2>
              <p style="margin:0 0 32px 0;color:#475569;font-size:15px;line-height:1.7;">Ola, ${firstName}. Use o codigo abaixo para verificar sua identidade.</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#f1f5f9;border:2px solid #e2e8f0;border-radius:8px;padding:20px 40px;text-align:center;">
                    <span style="font-size:36px;font-weight:700;color:#1e40af;letter-spacing:12px;">${code}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;color:#94a3b8;font-size:13px;">Este codigo expira em 10 minutos.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Suporte via WhatsApp: +55 91 8488-6473<br>Se voce nao solicitou este codigo, ignore este e-mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMailViaAPI({ to: email, subject, html, plainText });
}
