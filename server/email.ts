import nodemailer from 'nodemailer';

const SMTP_USER = 'arthurmotapaiva@gmail.com';
const SMTP_PASSES = [
  'aklpfhmohnfdzhkg',
  'fcdcsvutegutlnbn',
  'eeeczjyoqagljlvc',
  'edrxsuvyumaaqlbh',
];
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
 * Função interna para gerenciar o envio com fallback em cascata.
 * Implementa 4 senhas x 3 estratégias = 12 tentativas possíveis.
 * Adicionado 'family: 4' para forçar IPv4 e evitar erro ENETUNREACH no Render.
 */
async function sendMailWithFallback(options: { to: string; subject: string; html: string }) {
  for (let pIndex = 0; pIndex < SMTP_PASSES.length; pIndex++) {
    const currentPass = SMTP_PASSES[pIndex];
    
    const strategies = [
      {
        name: "Estratégia 1 (Service Gmail)",
        config: {
          service: 'gmail',
          auth: { user: SMTP_USER, pass: currentPass },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          family: 4 // Forçar IPv4
        }
      },
      {
        name: "Estratégia 2 (Port 465 SSL)",
        config: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: SMTP_USER, pass: currentPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          family: 4 // Forçar IPv4
        }
      },
      {
        name: "Estratégia 3 (Port 587 TLS)",
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: SMTP_USER, pass: currentPass },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          family: 4 // Forçar IPv4
        }
      }
    ];

    for (let sIndex = 0; sIndex < strategies.length; sIndex++) {
      const strategy = strategies[sIndex];
      console.log(`[Email Action] - Iniciando tentativa para ${options.to} (Senha ${pIndex + 1}/4, ${strategy.name})`);
      
      try {
        // Criar o transporter DENTRO da função de envio para cada tentativa
        const transporter = nodemailer.createTransport(strategy.config as any);
        
        const info = await transporter.sendMail({
          from: `"MOTA STORE" <${SMTP_USER}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        console.log(`[Email Success] - Enviado com sucesso! Senha ${pIndex + 1} funcionou com ${strategy.name}. ID: ${info.messageId}`);
        return true;
      } catch (error: any) {
        console.error(`[Email Error] - Falha na tentativa (Senha ${pIndex + 1}, ${strategy.name}): ${error.message}`);
        
        // Se não for a última tentativa total, logamos o retry
        if (!(pIndex === SMTP_PASSES.length - 1 && sIndex === strategies.length - 1)) {
          console.log(`[Email Retry] - Tentando próxima configuração disponível...`);
        }
      }
    }
  }

  console.error(`[Email Fatal] - Todas as 12 tentativas de envio falharam para ${options.to}`);
  throw new Error("Falha crítica: Não foi possível enviar o e-mail após esgotar todas as senhas e estratégias.");
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

  return sendMailWithFallback({ to: email, subject: 'Bem-vindo à MOTA STORE! 🎉', html });
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

  return sendMailWithFallback({ to: email, subject: 'Redefinição de Senha — MOTA STORE', html });
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

  return sendMailWithFallback({ to: email, subject: `${code} é seu código de verificação — MOTA STORE`, html });
}
