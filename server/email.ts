import nodemailer from 'nodemailer';

// Configurações via variáveis de ambiente (configuradas no Render)
const SMTP_USER = process.env.SMTP_USER || 'arthurmotapaiva@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'igyb oeko dgpy lrvv'; // Senha de App do Gmail
const APP_URL = process.env.APP_URL || 'https://mota-store.shop';

console.log(`[Email] Iniciando transportador SMTP para: ${SMTP_USER}`);

// Configuração do Transportador Nodemailer com Pool e Rate Limiting para evitar SPAM
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 5, // Aumentado para permitir mais envios simultâneos
  rateDelta: 10000, // Reduzido para 10 segundos
  rateLimit: 10,    // Aumentado para 10 e-mails por janela
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

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

async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
  if (!SMTP_PASS) {
    console.error("[Email] Erro: SMTP_PASS não configurado no ambiente.");
    return false;
  }

  // Timeout de 10 segundos para o envio de e-mail não travar a aplicação
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('SMTP Timeout (10s)')), 10000)
  );

  try {
    const mailPromise = transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: "arthurmotapaiva@gmail.com",
      headers: {
        "X-Mailer": "Mota Store Mailer",
        "X-Priority": "3",
        "Importance": "Normal",
        "List-Unsubscribe": "<mailto:arthurmotapaiva@gmail.com>"
      }
    });

    const info = await Promise.race([mailPromise, timeoutPromise]) as any;
    console.log(`[Email] Enviado com sucesso! MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Falha no envio para ${options.to}: ${error.message}`);
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
