# 🔧 Configuração da Integração Efí (Gerencianet)

## Credenciais Recebidas

```env
EFI_CLIENT_ID=Client_Id_0d707feaf817f5d2448c60cbf5b19d3b
EFI_CLIENT_SECRET=Client_Secret_0d541f063591a737192f13db
EFI_PIX_KEY=1cdd3ef6-6778-4818-bee4-d6036d824de4
EFI_CERTIFICATE=producao-458195-MOTA-BOT.p12
```

## 📋 Passos para Configuração

### 1. Adicionar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha com as credenciais:

```bash
cp .env.example .env
```

Edite o `.env` com:

```env
EFI_CLIENT_ID=Client_Id_0d707feaf817f5d2448c60cbf5b19d3b
EFI_CLIENT_SECRET=Client_Secret_0d541f063591a737192f13db
EFI_ACCOUNT=seu-numero-de-conta
EFI_PIX_KEY=1cdd3ef6-6778-4818-bee4-d6036d824de4
EFI_CERT_PATH=/path/to/producao-458195-MOTA-BOT.p12
EFI_KEY_PATH=/path/to/key.pem
```

### 2. Certificado Digital

O certificado `.p12` (PKCS#12) precisa ser convertido para PEM:

```bash
# Extrair a chave privada
openssl pkcs12 -in producao-458195-MOTA-BOT.p12 -nocerts -out key.pem -nodes

# Extrair o certificado
openssl pkcs12 -in producao-458195-MOTA-BOT.p12 -nokeys -out cert.pem
```

Coloque os arquivos em um diretório seguro (ex: `/etc/mota-store/certs/`) e configure os caminhos no `.env`.

### 3. Testar a Integração

```bash
# Iniciar o servidor
pnpm dev

# Fazer um pedido de teste
# O PIX será gerado automaticamente no checkout
```

## 🔄 Fluxo de Pagamento

1. **Usuário clica em "Adquirir"** → Vai para checkout
2. **Preenche dados** → Nome, Email, WhatsApp
3. **Clica em "Gerar PIX Agora"** → Cria pedido no banco
4. **API Efí gera PIX** → QR Code + Código "copia e cola"
5. **Usuário paga via PIX** → Banco confirma
6. **Webhook/Polling atualiza status** → Pedido marcado como "completed"
7. **Usuário redirecionado** → Página de confirmação com acesso

## 📊 Endpoints Utilizados

### Criar PIX
```
POST /v2/cob/{txid}
```

### Gerar QR Code
```
GET /v2/loc/{locId}/qrcode
```

### Verificar Status
```
GET /v2/cob/{txid}
```

### Listar Transações
```
GET /v2/gn/transacoes
```

## 🔐 Segurança

- ✅ Credenciais armazenadas em `.env` (não commitado)
- ✅ Certificado SSL/TLS com Efí
- ✅ Token OAuth2 com expiração automática
- ✅ Validação de assinatura em webhooks (implementar)

## 🚀 Deploy no Render

Adicione as variáveis de ambiente no Render:

```
Environment Variables:
- EFI_CLIENT_ID=...
- EFI_CLIENT_SECRET=...
- EFI_ACCOUNT=...
- EFI_PIX_KEY=...
- EFI_CERT_PATH=/etc/certs/cert.pem
- EFI_KEY_PATH=/etc/certs/key.pem
```

Ou use o `render.yaml` para automatizar.

## 📞 Suporte

- **Documentação Efí:** https://dev.efipay.com.br/docs/api-pix
- **Status da API:** https://status.efipay.com.br
- **Suporte Mota Store:** https://wa.me/5591984886473

---

**Status:** ✅ Integração pronta para produção
**Última atualização:** 2026-07-02
