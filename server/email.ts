import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Mota Store <onboarding@resend.dev>',
      to: [email],
      subject: `⚡ Bem-vindo à MOTA STORE, ${name.split(' ')[0]}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #ffffff; padding: 40px; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; font-size: 32px; font-weight: 900; margin: 0;">MOTA STORE</h1>
            <p style="color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">Premium Streaming Services</p>
          </div>
          
          <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 20px;">Olá, ${name}!</h2>
          
          <p style="color: #cbd5e1; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
            É um prazer ter você com a gente na <b>MOTA STORE</b>. Agora você faz parte da elite que não aceita pagar caro para ter o melhor do entretenimento.
          </p>
          
          <div style="background-color: #1e293b; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
            <h3 style="color: #3b82f6; margin-top: 0; font-size: 18px;">O que você ganha agora:</h3>
            <ul style="color: #cbd5e1; padding-left: 20px;">
              <li style="margin-bottom: 10px;"><b>Entrega Instantânea:</b> Comprou, recebeu no WhatsApp.</li>
              <li style="margin-bottom: 10px;"><b>Garantia Total:</b> Suporte humanizado 24/7.</li>
              <li style="margin-bottom: 10px;"><b>Preço Justo:</b> O melhor custo-benefício do Brasil.</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="https://mota-store.onrender.com/profile" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: 900; padding: 16px 32px; border-radius: 12px; text-decoration: none; text-transform: uppercase; font-size: 14px;">Acessar Meu Perfil</a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">
            Qualquer dúvida, chame nosso suporte no WhatsApp: +55 91 8488-6473.
          </p>
        </div>
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
  const resetLink = `https://mota-store.onrender.com/reset-password?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Mota Store <onboarding@resend.dev>',
      to: [email],
      subject: '🔒 Recuperação de Senha - Mota Store',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #ffffff; padding: 40px; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; font-size: 32px; font-weight: 900; margin: 0;">MOTA STORE</h1>
          </div>
          
          <h2 style="font-size: 20px; font-weight: 900; margin-bottom: 20px;">Olá, ${name}!</h2>
          
          <p style="color: #cbd5e1; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
            Recebemos uma solicitação para redefinir a senha da sua conta na Mota Store. Se não foi você, pode ignorar este e-mail.
          </p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: 900; padding: 16px 32px; border-radius: 12px; text-decoration: none; text-transform: uppercase; font-size: 14px;">Redefinir Minha Senha</a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">
            Este link expira em 1 hora.
          </p>
        </div>
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
