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
    const pollInterval = setInterval(async () => {
      setIsChecking(true);
      try {
        // Aqui você pode adicionar uma chamada à API para verificar o status do pagamento
        // Por enquanto, apenas simulamos a verificação
        // const response = await fetch(`/api/payments/check-pix-status`);
        // if (response.ok) {
        //   const data = await response.json();
        //   if (data.confirmed) {
        //     onPaymentConfirmed?.();
        //   }
        // }
      } catch (err) {
        console.error("Erro ao verificar pagamento:", err);
      } finally {
        setIsChecking(false);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(pollInterval);
  }, [onPaymentConfirmed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQrCodeSrc = () => {
    if (!qrCodeBase64) return null;

    // Se começa com http:// ou https://, é uma URL
    if (qrCodeBase64.startsWith("http://") || qrCodeBase64.startsWith("https://")) {
      console.log("QR Code é URL:", qrCodeBase64.substring(0, 50));
      return qrCodeBase64;
    }

    // Se já começa com data:, é um data URI
    if (qrCodeBase64.startsWith("data:")) {
      console.log("QR Code é data URI");
      return qrCodeBase64;
    }

    // Se for base64 puro, adiciona o prefixo
    console.log("QR Code é base64 puro");
    return `data:image/png;base64,${qrCodeBase64}`;
  };

  const copyPixCode = async () => {
    console.log("Tentando copiar pixCode:", pixCode ? pixCode.substring(0, 50) : "VAZIO");

    if (!pixCode || pixCode.trim() === "") {
      toast.error("Código PIX não está disponível");
      console.error("pixCode está vazio ou undefined");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        console.log("Usando navigator.clipboard");
        await navigator.clipboard.writeText(pixCode);
      } else {
        console.log("Usando fallback com textarea");
        // Fallback para navegadores sem suporte ou contextos não seguros
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

  const openBankApp = (deepLink: string, playStoreUrl: string, appStoreUrl: string) => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const fallbackUrl = isIOS ? appStoreUrl : playStoreUrl;
    
    // Tenta abrir o deep link
    window.location.href = deepLink;
    
    // Se após 1.5s o usuário ainda estiver na página, redireciona para a loja
    setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 1500);
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
              onClick={() => openBankApp(
                "nubank://",
                "https://play.google.com/store/apps/details?id=com.nu.production",
                "https://apps.apple.com/br/app/nubank/id814456780"
              )}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#820AD1]/30 bg-[#820AD1]/5 hover:bg-[#820AD1]/20 transition-colors w-20"
            >
              <svg viewBox="0 0 40 40" className="w-8 h-8">
                <circle cx="20" cy="20" r="20" fill="#820AD1"/>
                <text x="20" y="26" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">N</text>
              </svg>
              <span className="text-[10px] font-medium text-foreground">Nubank</span>
            </button>

            {/* Inter */}
            <button
              onClick={() => openBankApp(
                "bancointer://",
                "https://play.google.com/store/apps/details?id=br.com.intermedium",
                "https://apps.apple.com/br/app/inter-conta-cartao-e-pix/id839711154"
              )}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/5 hover:bg-[#FF6B00]/20 transition-colors w-20"
            >
              <svg viewBox="0 0 40 40" className="w-8 h-8">
                <circle cx="20" cy="20" r="20" fill="#FF6B00"/>
                <text x="20" y="26" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">I</text>
              </svg>
              <span className="text-[10px] font-medium text-foreground">Inter</span>
            </button>

            {/* Itaú */}
            <button
              onClick={() => openBankApp(
                "itau://",
                "https://play.google.com/store/apps/details?id=com.itau",
                "https://apps.apple.com/br/app/itau/id493694158"
              )}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#EC7000]/30 bg-[#EC7000]/5 hover:bg-[#EC7000]/20 transition-colors w-20"
            >
              <svg viewBox="0 0 40 40" className="w-8 h-8">
                <circle cx="20" cy="20" r="20" fill="#EC7000"/>
                <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">IT</text>
              </svg>
              <span className="text-[10px] font-medium text-foreground">Itaú</span>
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
