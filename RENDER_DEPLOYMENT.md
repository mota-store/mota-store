# 🚀 Deploy no Render - MOTA STORE

## 📋 Pré-requisitos

- Conta no Render (render.com)
- Credenciais da Efí (Gerencianet)
- Certificado digital `.p12` da Efí
- Banco de dados TiDB Cloud configurado

---

## 🔐 Passo 1: Preparar o Certificado em Base64

O Render não permite upload de arquivos de certificado diretamente. Precisamos converter para Base64.

### No seu computador (ou sandbox):

```bash
# Se você tiver o arquivo .p12
openssl pkcs12 -in producao-458195-MOTA-BOT.p12 -nocerts -out key.pem -nodes
openssl pkcs12 -in producao-458195-MOTA-BOT.p12 -nokeys -out cert.pem

# Converter para Base64
cat cert.pem | base64 -w 0 > cert.base64
cat key.pem | base64 -w 0 > key.base64

# Exibir os valores (copiar para o Render)
cat cert.base64
cat key.base64
```

**Resultado:** Você terá duas strings longas em Base64. Guarde-as!

---

## 🎛️ Passo 2: Configurar Variáveis no Painel Render

1. **Acesse seu projeto no Render**
2. Vá para **Settings** → **Environment**
3. Adicione as seguintes variáveis:

| Variável | Valor | Exemplo |
|----------|-------|---------|
| `DATABASE_URL` | URL do TiDB | `mysql://user:pass@host:4000/db?ssl=...` |
| `JWT_SECRET` | Chave secreta | `sua-chave-super-secreta-aqui` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth ID | `xxx.apps.googleusercontent.com` |
| `VITE_GOOGLE_REDIRECT_URI` | URL de callback | `https://seu-app.render.com/auth/callback` |
| `EFI_CLIENT_ID` | De Efí | `Client_Id_0d707feaf817f5d2448c60cbf5b19d3b` |
| `EFI_CLIENT_SECRET` | De Efí | `Client_Secret_0d541f063591a737192f13db` |
| `EFI_ACCOUNT` | Número da conta | `seu-numero-de-conta` |
| `EFI_PIX_KEY` | Chave PIX | `1cdd3ef6-6778-4818-bee4-d6036d824de4` |
| `EFI_CERT_BASE64` | Certificado em Base64 | `MIIDXTCCAkWgAwIBAgIJAK...` (string longa) |
| `EFI_KEY_BASE64` | Chave em Base64 | `MIIEvQIBADANBgkqhkiG9w0...` (string longa) |
| `NODE_ENV` | Ambiente | `production` |

### ⚠️ Importante:

- **Não use quebras de linha** nos valores Base64. Devem ser strings contínuas.
- **Copie exatamente** do comando `base64` sem espaços extras.
- As credenciais da Efí você já tem.

---

## 📄 Passo 3: Verificar render.yaml

Seu `render.yaml` já deve estar configurado. Se não estiver, crie na raiz do projeto:

```yaml
services:
  - type: web
    name: mota-store
    env: node
    plan: starter
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: DATABASE_URL
        scope: build,runtime
      - key: JWT_SECRET
        scope: runtime
      - key: EFI_CLIENT_ID
        scope: runtime
      - key: EFI_CLIENT_SECRET
        scope: runtime
      - key: EFI_ACCOUNT
        scope: runtime
      - key: EFI_PIX_KEY
        scope: runtime
      - key: EFI_CERT_BASE64
        scope: runtime
      - key: EFI_KEY_BASE64
        scope: runtime
      - key: NODE_ENV
        value: production
```

---

## 🔄 Passo 4: Deploy

### Opção A: Via GitHub (Recomendado)

1. Faça push do código para GitHub
2. No Render, conecte seu repositório
3. Cada push automáticamente faz deploy

### Opção B: Manual

```bash
# No seu computador
git add .
git commit -m "feat: prepare for render deployment"
git push origin main

# Render detecta automaticamente
```

---

## ✅ Passo 5: Verificar Deploy

1. **Acesse seu app:** `https://seu-app.render.com`
2. **Verifique os logs:** Settings → Logs
3. **Procure por:**
   - ✅ `✅ Token Efí obtido com sucesso` → Credenciais OK
   - ✅ `✅ Certificado carregado de Base64` → Certificado OK
   - ❌ `⚠️ Credenciais da Efí não configuradas` → Falta variável

---

## 🧪 Teste o Fluxo Completo

1. Acesse `https://seu-app.render.com`
2. Faça login/cadastro
3. Adicione um produto ao carrinho
4. Vá para checkout
5. Preencha dados
6. Clique em "GERAR PIX AGORA"
7. **Deve aparecer:**
   - QR Code real da Efí
   - Código "copia e cola" do PIX
   - Contador de 30 minutos

---

## 🐛 Troubleshooting

### Erro: "Falha na autenticação com Efí"

**Causa:** Credenciais incorretas ou certificado não carregado

**Solução:**
- Verifique `EFI_CLIENT_ID` e `EFI_CLIENT_SECRET`
- Verifique se `EFI_CERT_BASE64` e `EFI_KEY_BASE64` foram copiados **sem quebras de linha**

### Erro: "Falha ao gerar PIX"

**Causa:** Chave PIX incorreta ou conta não ativa

**Solução:**
- Verifique `EFI_PIX_KEY` (deve ser um UUID)
- Verifique `EFI_ACCOUNT` (número da conta)
- Teste na sandbox da Efí primeiro

### Erro: "Certificado inválido"

**Causa:** Base64 corrompido ou incompleto

**Solução:**
```bash
# Regenere o Base64
cat cert.pem | base64 -w 0 > cert.base64

# Verifique o tamanho (deve ser grande)
wc -c cert.base64

# Copie novamente no Render
```

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Via Render CLI (se instalado)
render logs --service mota-store

# Ou via painel: Settings → Logs
```

### Métricas

- **CPU:** Deve estar < 50% em repouso
- **Memória:** Deve estar < 200MB
- **Requisições:** Monitore via Google Analytics ou Sentry

---

## 🔒 Segurança

- ✅ Certificado em Base64 (não em arquivo)
- ✅ Variáveis de ambiente (não no código)
- ✅ HTTPS automático (Render fornece)
- ✅ Banco de dados em TiDB Cloud (seguro)

---

## 📞 Suporte

- **Render Docs:** https://render.com/docs
- **Efí Docs:** https://dev.efipay.com.br/docs/api-pix
- **Suporte Mota:** https://wa.me/5591984886473

---

## ✨ Checklist Final

- [ ] Certificado convertido para Base64
- [ ] Todas as variáveis adicionadas no Render
- [ ] `render.yaml` atualizado
- [ ] Código commitado e pushado
- [ ] Deploy iniciado no Render
- [ ] Logs mostram "✅ Token Efí obtido"
- [ ] Fluxo de PIX testado com sucesso
- [ ] Pagamento recebido na conta Efí

---

**Status:** ✅ Pronto para produção
**Última atualização:** 2026-07-02
