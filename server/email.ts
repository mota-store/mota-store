import { google } from 'googleapis';

const GMAIL_USER = process.env.GMAIL_USER || 'arthurmotapaiva@gmail.com';
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '1067935514097-gogg5cvuka13k514q2sju3ma0bak0ikr.apps.googleusercontent.com';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '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';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const APP_URL = process.env.APP_URL || 'https://mota-store.shop';

const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// URL da imagem enviada pelo usuário (Banner da Mota Store)
const BANNER_IMAGE_URL = 'https://mota-store.shop/assets/email-banner.png'; // Link direto para o ativo no servidor

/**
 * Função interna para criar e codificar o e-mail de forma simplificada
 */
function createRawMessage(options: { to: string; subject: string; html: string; text: string }) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
  const messageParts = [
    `From: Mota Store <${GMAIL_USER}>`,
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

// TEMPLATE PRETO E BRANCO ULTRA SIMPLIFICADO (Evita SPAM)
const SIMPLE_LAYOUT = (content: string) => `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #000; line-height: 1.6; border: 1px solid #eee;">
    <div style="text-align: center; background-color: #000; padding: 0;">
      <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663834506553/vfWiydKLpDxDtSjZ.png" alt="Mota Store" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto;">
    </div>
    <div style="padding: 30px; background-color: #fff;">
      ${content}
    </div>
    <div style="padding: 20px; font-size: 11px; color: #666; text-align: center; background-color: #fafafa; border-top: 1px solid #eee;">
      <strong>MOTA STORE - MELHOR PREÇO DO MERCADO</strong><br>
      Este é um e-mail automático. Por favor, não responda.<br>
      Acesse nossa loja: <a href="${APP_URL}" style="color: #000; font-weight: bold;">${APP_URL.replace('https://', '')}</a>
    </div>
  </div>
`;

export async function sendWelcomeEmail(email: string, firstName: string) {
  const subject = `Bem-vindo à Mota Store!`;
  const html = SIMPLE_LAYOUT(`
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 0;">Olá, ${firstName}!</h1>
    <p>Sua conta na <strong>Mota Store</strong> foi criada com sucesso.</p>
    <p>Estamos felizes em ter você conosco. Acesse nossa loja para conferir as melhores ofertas e produtos de alta qualidade.</p>
    <div style="margin-top: 30px; text-align: center;">
      <a href="${APP_URL}" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; text-transform: uppercase; font-size: 14px;">Acessar Loja</a>
    </div>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const subject = `${code} é o seu código de verificação`;
  const html = SIMPLE_LAYOUT(`
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 0;">Código de Verificação</h1>
    <p>Olá, ${firstName}. Use o código abaixo para completar sua ação na Mota Store:</p>
    <div style="background: #000; color: #fff; padding: 25px; text-align: center; font-size: 36px; font-weight: 900; letter-spacing: 10px; margin: 25px 0; border-radius: 8px;">
      ${code}
    </div>
    <p style="font-size: 13px; color: #666; text-align: center;">Este código expira em 10 minutos por motivos de segurança.</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const subject = `Recuperação de senha - Mota Store`;
  const html = SIMPLE_LAYOUT(`
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 0;">Recuperar Senha</h1>
    <p>Olá, ${firstName}. Recebemos um pedido para redefinir sua senha na Mota Store.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; text-transform: uppercase; font-size: 14px;">Redefinir Minha Senha</a>
    </div>
    <p style="font-size: 12px; color: #666;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}

export async function sendAccountDeletionEmail(email: string, firstName: string) {
  const subject = `Conta Excluída com Sucesso - Mota Store`;
  const html = SIMPLE_LAYOUT(`
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 0;">Conta Excluída</h1>
    <p>Olá, ${firstName}. Conforme solicitado, sua conta na <strong>Mota Store</strong> foi excluída.</p>
    <p>Todos os seus dados pessoais foram removidos de nossa base ativa. Lamentamos sua partida, mas saiba que você será sempre bem-vindo caso decida voltar.</p>
    <p>Agradecemos pelo tempo que esteve conosco!</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}

export async function sendBanEmail(email: string, firstName: string, reason: string) {
  const subject = `Sua conta foi suspensa - Mota Store`;
  const html = SIMPLE_LAYOUT(`
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; color: #ff0000; margin-top: 0;">Conta Suspensa</h1>
    <p>Olá, ${firstName}.</p>
    <p>Informamos que sua conta na <strong>Mota Store</strong> foi suspensa permanentemente por violação de nossas políticas.</p>
    <div style="background: #f8f8f8; border-left: 4px solid #ff0000; padding: 15px; margin: 20px 0;">
      <strong>Motivo:</strong> ${reason}
    </div>
    <p>Devido a esta suspensão, você não poderá mais realizar compras ou acessar sua conta utilizando este e-mail ou método de login.</p>
    <p>Caso acredite que isso seja um erro, entre em contato com nosso suporte.</p>
  `);
  return sendMail({ to: email, subject, html, text: "" });
}
