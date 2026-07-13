import nodemailer from 'nodemailer';

// Configurações via variáveis de ambiente (configuradas no Render)
const SMTP_USER = process.env.SMTP_USER || 'arthurmotapaiva@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS; // Senha de App do Gmail
const APP_URL = process.env.APP_URL || 'https://mota-store.shop';

console.log(`[Email] Iniciando transportador SMTP para: ${SMTP_USER}`);

// Configuração do Transportador Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

const DARK_TEMPLATE = (content: string) => `
  <div style="background-color: #09090b; color: #fafafa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px; margin: 0; width: 100%;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 24px; overflow: hidden; border: 1px solid #27272a; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
      <div style="padding: 40px; text-align: center; border-bottom: 1px solid #27272a;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">
          MOTA<span style="color: #10b981;">STORE</span>
        </h1>
      </div>
      <div style="padding: 40px;">
        ${content}
      </div>
      <div style="padding: 20px 40px; background-color: #09090b; text-align: center; border-top: 1px solid #27272a;">
        <p style="margin: 0; font-size: 12px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
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

  try {
    const info = await transporter.sendMail({
      from: `"Mota Store" <${SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[Email] Enviado com sucesso! MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Falha no envio para ${options.to}: ${error.message}`);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  const subject = `Bem-vindo à Mota Store!`;
  const text = `Olá, ${firstName}. Sua conta na Mota Store foi criada com sucesso.`;
  
  const html = DARK_TEMPLATE(`
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; padding: 15px; background-color: rgba(16, 185, 129, 0.1); border-radius: 20px; margin-bottom: 20px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      </div>
      <h2 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #ffffff;">BEM-VINDO!</h2>
    </div>
    <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 20px;">
      Olá, <strong style="color: #ffffff;">${firstName}</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 30px;">
      Sua conta na <strong style="color: #10b981;">Mota Store</strong> foi criada com sucesso. Agora você tem acesso aos melhores serviços de streaming com preços exclusivos.
    </p>
    <div style="text-align: center;">
      <a href="${APP_URL}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 18px 35px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Acessar Loja Agora</a>
    </div>
  `);

  return sendMail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const subject = `Recuperação de senha - Mota Store`;
  const text = `Olá, ${firstName}. Use o link para redefinir sua senha: ${resetLink}`;

  const html = DARK_TEMPLATE(`
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #ffffff;">RECUPERAÇÃO DE SENHA</h2>
    </div>
    <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 20px;">
      Olá, <strong style="color: #ffffff;">${firstName}</strong>. Recebemos um pedido para trocar sua senha.
    </p>
    <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0; font-size: 14px; color: #ef4444; font-weight: 600;">Se você não solicitou essa alteração, ignore este e-mail por segurança.</p>
    </div>
    <div style="text-align: center;">
      <a href="${resetLink}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 35px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Redefinir Senha</a>
    </div>
  `);

  return sendMail({ to: email, subject, html, text });
}

export async function sendVerificationCodeEmail(email: string, firstName: string, code: string) {
  const subject = `Código de verificação: ${code}`;
  const text = `Olá, ${firstName}. Seu código é: ${code}`;

  const html = DARK_TEMPLATE(`
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #ffffff;">CÓDIGO DE ACESSO</h2>
    </div>
    <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 30px; text-align: center;">
      Olá, <strong style="color: #ffffff;">${firstName}</strong>. Use o código abaixo para validar sua ação:
    </p>
    <div style="background-color: #09090b; border: 2px dashed #27272a; border-radius: 20px; padding: 30px; text-align: center; margin-bottom: 30px;">
      <span style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #10b981; font-family: monospace;">${code}</span>
    </div>
    <p style="text-align: center; font-size: 12px; color: #71717a; font-weight: 600; text-transform: uppercase;">Válido por 10 minutos</p>
  `);

  return sendMail({ to: email, subject, html, text });
}
