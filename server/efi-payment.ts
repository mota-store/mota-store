import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as path from "path";

/**
 * Integração com API de PIX da Efí (Gerencianet)
 * Documentação: https://dev.efipay.com.br/docs/api-pix
 * 
 * Suporta dois modos:
 * 1. Arquivo: EFI_CERT_PATH e EFI_KEY_PATH (desenvolvimento local)
 * 2. Base64: EFI_CERT_BASE64 e EFI_KEY_BASE64 (Render/produção)
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

    // Validar credenciais
    if (!this.clientId || !this.clientSecret || !this.pixKey) {
      console.warn("⚠️ Credenciais da Efí não configuradas completamente");
    }

    // Configurar axios com certificado
    let httpsAgent: any = undefined;
    
    // Tentar carregar certificado de Base64 (Render/produção)
    if (process.env.EFI_CERT_BASE64 && process.env.EFI_KEY_BASE64) {
      try {
        const certBuffer = Buffer.from(process.env.EFI_CERT_BASE64, "base64");
        const keyBuffer = Buffer.from(process.env.EFI_KEY_BASE64, "base64");
        httpsAgent = {
          cert: certBuffer,
          key: keyBuffer,
          rejectUnauthorized: false,
        };
        console.log("✅ Certificado carregado de Base64");
      } catch (error) {
        console.warn("⚠️ Erro ao decodificar certificado Base64:", error);
      }
    }
    // Tentar carregar certificado de arquivo (desenvolvimento local)
    else if (process.env.EFI_CERT_PATH && process.env.EFI_KEY_PATH) {
      try {
        if (fs.existsSync(process.env.EFI_CERT_PATH) && fs.existsSync(process.env.EFI_KEY_PATH)) {
          httpsAgent = {
            cert: fs.readFileSync(process.env.EFI_CERT_PATH),
            key: fs.readFileSync(process.env.EFI_KEY_PATH),
            rejectUnauthorized: false,
          };
          console.log("✅ Certificado carregado de arquivo");
        }
      } catch (error) {
        console.warn("⚠️ Erro ao carregar certificado de arquivo:", error);
      }
    }

    this.client = axios.create({
      baseURL: "https://api-pix.gerencianet.com.br",
      httpsAgent: httpsAgent,
      timeout: 10000,
    });
  }

  /**
   * Obter token de acesso OAuth2
   */
  private async getAccessToken(): Promise<string> {
    // Verificar se token ainda é válido
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
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min de margem
      
      console.log("✅ Token Efí obtido com sucesso");
      return this.accessToken || "";
    } catch (error: any) {
      console.error("❌ Erro ao obter token Efí:", error.response?.data || error.message);
      throw new Error("Falha na autenticação com Efí");
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
          expiracao: 1800, // 30 minutos
        },
        devedor: {
          cpf: "00000000000", // Será preenchido pelo cliente
          nome: "Cliente Mota Store",
        },
        valor: {
          original: amount.toFixed(2),
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

      // Gerar QR Code
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
      console.error("❌ Erro ao criar PIX:", error.response?.data || error.message);
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

// Exportar instância singleton
export const efiPayment = new EfiPaymentService();

/**
 * Funções públicas para uso nas rotas
 */
export async function createPixPayment(amount: number, orderId: number): Promise<PixResponse> {
  return efiPayment.createPix(amount, orderId, `MOTA STORE - Pedido #${orderId}`);
}

export async function checkPixPaymentStatus(txid: string): Promise<PixStatusResponse> {
  return efiPayment.checkPixStatus(txid);
}

export async function getTransactions(beginDate: string, endDate: string): Promise<any[]> {
  return efiPayment.listTransactions(beginDate, endDate);
}
