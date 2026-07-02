# MOTA STORE - Status do Projeto

## Credenciais e Configurações
- **Banco de Dados (TiDB):** `mysql://3RvvX2vLXvzEDqG.root:TIUcO1NCxhFGdDfD@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}`
- **E-mail (Resend):** `re_gV9N4FqA_7VUMWRFJVfEABVTeYHk3mwjX` (Remetente: `onboarding@resend.dev`)
- **Suporte (WhatsApp):** `+55 91 8488-6473`
- **GitHub:** `https://github.com/mota-store/mota-store.git` (Token: `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`)

## Problemas Identificados e Ações
1. **Visual:** O usuário deseja um efeito "transparente fosco" (`backdrop-blur`) em toda a tela de Login/Cadastro.
   - *Ação:* Aplicado `backdrop-blur-xl` e `bg-background/60` no overlay do fundo.
2. **Carrinho:** Itens não eram removidos permanentemente.
   - *Ação:* Implementada rota `removeItem` no trpc e função `removeFromCart` no `db.ts`.
3. **QR Code PIX:** Falha na geração.
   - *Suspeita:* Conversão de valores (centavos vs reais) ou credenciais Efí.
4. **E-mail:** Não disparava no login via Google.
   - *Ação:* Adicionado `sendWelcomeEmail` no callback do Google OAuth.
