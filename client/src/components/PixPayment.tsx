import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Copy, CheckCircle2, Clock, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PixPaymentProps {
  qrCodeBase64?: string;
  pixCode?: string;
  expiresIn?: number; // em segundos
  onPaymentConfirmed?: () => void;
}

export function PixPayment({ 
  qrCodeBase64, 
  pixCode = "00020126360014br.gov.bcb.pix0114+55919848864735204000053039865802BR5910MOTA STORE6009SAO PAULO62070503***6304E2B9", 
  expiresIn = 1800,
  onPaymentConfirmed 
}: PixPaymentProps) {
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Polling para verificar se o pagamento foi confirmado
  useEffect(() => {
    // Passo 7.1: Copiar automaticamente ao gerar
    if (pixCode && !copied) {
      copyPixCode();
    }
    const pollInterval = setInterval(async () => {
      setIsChecking(true);
      try {
        // Aqui você pode adicionar uma chamada à API para verificar o status do pagamento
      } catch (err) {
        console.error("Erro ao verificar pagamento:", err);
      } finally {
        setIsChecking(false);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(pollInterval);
  }, [onPaymentConfirmed, pixCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQrCodeSrc = () => {
    if (!qrCodeBase64) return null;

    if (qrCodeBase64.startsWith("http://") || qrCodeBase64.startsWith("https://")) {
      return qrCodeBase64;
    }

    if (qrCodeBase64.startsWith("data:")) {
      return qrCodeBase64;
    }

    return `data:image/png;base64,${qrCodeBase64}`;
  };

  const copyPixCode = async () => {
    if (!pixCode || pixCode.trim() === "") {
      toast.error("Código PIX não está disponível");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pixCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = pixCode;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!success) {
          throw new Error('document.execCommand("copy") retornou false');
        }
      }
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar código");
      console.error("Falha ao copiar:", err);
    }
  };

  const openBankApp = (appName: string, deepLink: string) => {
    const url = deepLink.replace("CODIGO_PIX", encodeURIComponent(pixCode || ""));
    
    // Passo 7.2: Tentar abrir app sem redirecionar para Play Store
    // Usamos um iframe ou redirecionamento direto controlado
    const start = Date.now();
    window.location.href = url;
    
    setTimeout(() => {
      // Se demorou muito para voltar ou o foco mudou, o app provavelmente abriu
      if (Date.now() - start < 1500) {
        toast.info(`Se o app ${appName} não abriu, use o código copiado para colar manualmente.`);
      }
    }, 1000);
  };

  const qrCodeSrc = getQrCodeSrc();

  return (
    <Card className="p-6 bg-card/50 border-border/50 backdrop-blur-sm max-w-md mx-auto">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Pagamento via PIX</h3>
          <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o código abaixo</p>
          {isChecking && (
            <div className="flex items-center justify-center gap-1 text-xs text-accent animate-pulse">
              <RefreshCw className="w-3 h-3" />
              <span>Verificando pagamento...</span>
            </div>
          )}
        </div>

        {/* QR Code Placeholder/Real */}
        <div className="relative group">
          <div className="w-64 h-64 bg-white p-4 rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
            {qrCodeSrc ? (
              <img
                src={qrCodeSrc}
                alt="QR Code PIX"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error("Erro ao carregar QR Code:", (e.target as HTMLImageElement).src);
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <QrCode className="w-20 h-20 mb-2 opacity-20" />
                <span className="text-xs font-mono opacity-40">QR CODE GERADO PELA API</span>
              </div>
            )}
          </div>
          {timeLeft > 0 && (
            <div className="absolute -top-3 -right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              <Clock className="w-3 h-3" />
              {formatTime(timeLeft)}
            </div>
          )}
          {timeLeft <= 0 && (
            <div className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              Expirado
            </div>
          )}
        </div>

        {/* Atalhos de Bancos */}
        <div className="w-full space-y-3">
          <p className="text-xs text-muted-foreground text-center">Abrir no seu banco</p>
          <div className="flex justify-center gap-3">
            {/* Nubank */}
            <button
              onClick={() => openBankApp("Nubank", "nubank://nu/pix/copia-e-cola?code=CODIGO_PIX")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#820AD1]/30 bg-[#820AD1]/5 hover:bg-[#820AD1]/20 transition-colors w-20"
            >
              <img src="/assets/banks/nubank.png" alt="Nubank" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-[10px] font-medium text-foreground">Nubank</span>
            </button>

            {/* Inter */}
            <button
              onClick={() => openBankApp("Inter", "inter://pix?code=CODIGO_PIX")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/20 transition-colors w-20"
            >
              <img src="/assets/banks/inter.png" alt="Inter" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-[10px] font-medium text-foreground">Inter</span>
            </button>

            {/* Itaú */}
            <button
              onClick={() => openBankApp("Itaú", "itau-empresas://pix/copia-e-cola?code=CODIGO_PIX")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#EC7000]/30 bg-[#EC7000]/5 hover:bg-[#EC7000]/20 transition-colors w-20"
            >
              <img src="/assets/banks/itau.png" alt="Itaú" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-[10px] font-medium text-foreground">Itaú</span>
            </button>

            {/* Bradesco */}
            <button
              onClick={() => openBankApp("Bradesco", "bradesco://pix?code=CODIGO_PIX")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#cc092f]/30 bg-[#cc092f]/5 hover:bg-[#cc092f]/20 transition-colors w-20"
            >
              <img src="/assets/banks/bradesco.png" alt="Bradesco" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-[10px] font-medium text-foreground">Bradesco</span>
            </button>
          </div>
        </div>

        {/* Copia e Cola */}
        <div className="w-full space-y-3">
          <div className="relative">
            <div className="w-full bg-muted/50 p-3 rounded-lg text-[10px] font-mono break-all border border-border text-left pr-10 max-h-24 overflow-y-auto">
              {pixCode}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-8 w-8 hover:bg-accent/20"
              onClick={copyPixCode}
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            className="w-full bg-accent hover:bg-accent/90 font-bold py-6 shadow-lg shadow-accent/20"
            onClick={copyPixCode}
          >
            {copied ? "Código Copiado!" : "Copiar Código PIX"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>1. Abra o app do seu banco</p>
          <p>2. Escolha pagar via PIX (QR Code ou Copia e Cola)</p>
          <p>3. O pagamento é aprovado instantaneamente</p>
        </div>
      </div>
    </Card>
  );
}
