import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as https from "https";
import forge from "node-forge";

/**
 * Integração com API de PIX da Efí (Gerencianet)
 * Documentação: https://dev.efipay.com.br/docs/api-pix
 * 
 * Suporta três modos de certificado:
 * 1. P12 Base64: EFI_CERT_P12_BASE64 (Arquivo .p12 completo em base64) - RECOMENDADO
 * 2. PEM Base64: EFI_CERT_BASE64 e EFI_KEY_BASE64 (Cert e Key separados em PEM base64)
 * 3. Arquivo: EFI_CERT_PATH e EFI_KEY_PATH (Desenvolvimento local)
 */

interface PixResponse {
  pixCode: string;
  qrCodeBase64: string;
  txid: string;
  expiresIn: number;
}

interface PixStatusResponse {
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  amount?: number;
  paidAt?: string;
}

class EfiPaymentService {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private account: string;
  private pixKey: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.EFI_CLIENT_ID || "";
    this.clientSecret = process.env.EFI_CLIENT_SECRET || "";
    this.account = process.env.EFI_ACCOUNT || "";
    this.pixKey = process.env.EFI_PIX_KEY || "";

    // Validar credenciais básicas
    if (!this.clientId || !this.clientSecret || !this.pixKey) {
      console.warn("⚠️ Credenciais da Efí não configuradas completamente (ID, Secret ou Chave PIX)");
    }

    // Configurar httpsAgent com certificado
    const httpsAgent = this.setupHttpsAgent();

    this.client = axios.create({
      baseURL: "https://api-pix.gerencianet.com.br",
      httpsAgent: httpsAgent,
      timeout: 15000,
    });
  }

  /**
   * Configura o agente HTTPS com base nas variáveis de ambiente disponíveis
   */
  private setupHttpsAgent(): https.Agent | undefined {
    // 1. Prioridade: Arquivo .p12 completo em Base64 (Solução para OpenSSL 3.0 / Node 22)
    if (process.env.EFI_CERT_P12_BASE64) {
      try {
        console.log("🛠️ Tentando carregar certificado .p12 de EFI_CERT_P12_BASE64...");
        const p12Buffer = Buffer.from(process.env.EFI_CERT_P12_BASE64, "base64");
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
        const p12Password = process.env.EFI_P12_PASSWORD || "";
        
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);
        
        // Extrair chave privada
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const bag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
        if (!bag || !bag.key) {
          throw new Error("Chave privada não encontrada no arquivo .p12");
        }
        const privateKeyPem = forge.pki.privateKeyToPem(bag.key);
        
        // Extrair certificado
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = certBags[forge.pki.oids.certBag]?.[0];
        if (!certBag || !certBag.cert) {
          throw new Error("Certificado não encontrado no arquivo .p12");
        }
        const certPem = forge.pki.certificateToPem(certBag.cert);

        console.log("✅ Certificado .p12 decodificado com sucesso via node-forge");
        
        return new https.Agent({
          cert: certPem,
          key: privateKeyPem,
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        });
      } catch (error: any) {
        console.error("❌ Erro ao processar EFI_CERT_P12_BASE64:", error.message);
      }
    }

    // 2. Fallback: Certificado e Chave separados em Base64 (PEM)
    if (process.env.EFI_CERT_BASE64 && process.env.EFI_KEY_BASE64) {
      try {
        console.log("🛠️ Carregando certificados PEM de EFI_CERT_BASE64 e EFI_KEY_BASE64...");
        const certBuffer = Buffer.from(process.env.EFI_CERT_BASE64, "base64");
        const keyBuffer = Buffer.from(process.env.EFI_KEY_BASE64, "base64");
        
        return new https.Agent({
          cert: certBuffer,
          key: keyBuffer,
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        });
      } catch (error: any) {
        console.error("❌ Erro ao decodificar certificados PEM Base64:", error.message);
      }
    }

    // 3. Fallback: Arquivos locais
    if (process.env.EFI_CERT_PATH && process.env.EFI_KEY_PATH) {
      try {
        if (fs.existsSync(process.env.EFI_CERT_PATH) && fs.existsSync(process.env.EFI_KEY_PATH)) {
          console.log("🛠️ Carregando certificados de arquivos locais...");
          return new https.Agent({
            cert: fs.readFileSync(process.env.EFI_CERT_PATH),
            key: fs.readFileSync(process.env.EFI_KEY_PATH),
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
          });
        }
      } catch (error: any) {
        console.error("❌ Erro ao carregar certificados de arquivo:", error.message);
      }
    }

    console.warn("⚠️ Nenhum certificado de autenticação Efí foi configurado corretamente.");
    return undefined;
  }

  /**
   * Obter token de acesso OAuth2
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      
      const response = await this.client.post(
        "/oauth/token",
        { grant_type: "client_credentials" },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
      
      console.log("✅ Token Efí obtido com sucesso");
      return this.accessToken || "";
    } catch (error: any) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error("❌ Erro ao obter token Efí:", errorMsg);
      
      if (error.message.includes("unsupported")) {
        console.error("💡 Dica: O erro 'unsupported' geralmente indica que o Node.js não suporta o formato do certificado. Use EFI_CERT_P12_BASE64 para conversão automática.");
      }
      
      throw new Error(`Falha na autenticação com Efí: ${error.message}`);
    }
  }

  /**
   * Criar PIX para um pedido
   */
  async createPix(amount: number, orderId: number, description: string = ""): Promise<PixResponse> {
    try {
      const token = await this.getAccessToken();
      const txid = `MOTA${orderId}${Date.now().toString().slice(-4)}`;

      const payload = {
        calendario: {
          expiracao: 1800,
        },
        devedor: {
          cpf: "00000000000",
          nome: "Cliente Mota Store",
        },
        valor: {
          original: (amount / 100).toFixed(2),
        },
        chave: this.pixKey,
        solicitacaoPagador: description || `MOTA STORE - Pedido #${orderId}`,
      };

      const response = await this.client.post(
        `/v2/cob/${txid}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const qrCodeResponse = await this.client.get(
        `/v2/loc/${response.data.loc.id}/qrcode`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(`✅ PIX criado para Pedido #${orderId}: ${txid}`);

      return {
        pixCode: response.data.brCode || response.data.qrcode || "",
        qrCodeBase64: qrCodeResponse.data.qrcode || qrCodeResponse.data.url || "",
        txid: txid,
        expiresIn: 1800,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error("❌ Erro ao criar PIX:", errorMsg);
      throw new Error("Falha ao gerar PIX");
    }
  }

  /**
   * Verificar status do PIX
   */
  async checkPixStatus(txid: string): Promise<PixStatusResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/v2/cob/${txid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const status = response.data.status === "CONCLUIDA" ? "COMPLETED" : "PENDING";
      
      return {
        status: status as any,
        amount: parseFloat(response.data.valor?.original || 0),
        paidAt: response.data.dataPagamento,
      };
    } catch (error: any) {
      console.error("❌ Erro ao verificar status PIX:", error.response?.data || error.message);
      return { status: "PENDING" };
    }
  }

  /**
   * Listar transações de um período
   */
  async listTransactions(beginDate: string, endDate: string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/v2/gn/transacoes`,
        {
          params: {
            inicio: beginDate,
            fim: endDate,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.transacoes || [];
    } catch (error: any) {
      console.error("❌ Erro ao listar transações:", error.response?.data || error.message);
      return [];
    }
  }
}

export const efiPayment = new EfiPaymentService();

export async function createPixPayment(amount: number, orderId: number): Promise<PixResponse> {
  return efiPayment.createPix(amount, orderId, `MOTA STORE - Pedido #${orderId}`);
}

export async function checkPixPaymentStatus(txid: string): Promise<PixStatusResponse> {
  return efiPayment.checkPixStatus(txid);
}

export async function getTransactions(beginDate: string, endDate: string): Promise<any[]> {
  return efiPayment.listTransactions(beginDate, endDate);
}
