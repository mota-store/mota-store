import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Copy, CheckCircle2, Clock, QrCode, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PixPaymentProps {
  qrCodeBase64?: string;
  pixCode?: string;
  expiresIn?: number; // em segundos
  amount?: number; // valor total em centavos
  onPaymentConfirmed?: () => void;
}

export function PixPayment({ 
  qrCodeBase64, 
  pixCode = "00020126360014br.gov.bcb.pix0114+55919848864735204000053039865802BR5910MOTA STORE6009SAO PAULO62070503***6304E2B9", 
  expiresIn = 600,
  amount,
  onPaymentConfirmed 
}: PixPaymentProps) {
  // Inicializar timeLeft a partir do sessionStorage se existir, para persistir após refresh
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedExpiry = sessionStorage.getItem("pix_expiry_time");
    if (savedExpiry) {
      const remaining = Math.floor((parseInt(savedExpiry) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    
    // Se não tiver salvo, salvar o tempo atual + expiresIn
    const expiryTime = Date.now() + expiresIn * 1000;
    sessionStorage.setItem("pix_expiry_time", expiryTime.toString());
    return expiresIn;
  });
  
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [bankCopied, setBankCopied] = useState<string | null>(null); // qual banco já copiou

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQrCodeSrc = () => {
    if (!qrCodeBase64) return null;
    if (qrCodeBase64.startsWith("http") || qrCodeBase64.startsWith("data:")) return qrCodeBase64;
    return `data:image/png;base64,${qrCodeBase64}`;
  };

  const copyPixCode = async (silent = false) => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      if (!silent) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (!silent) toast.error("Erro ao copiar código");
    }
  };

  const openBankApp = (appName: string, intentLink: string, fallbackScheme: string) => {
    // Copiar o código PIX apenas na primeira vez que clicar neste banco
    if (bankCopied !== appName) {
      copyPixCode(true);
      setBankCopied(appName);
    }
    
    const encodedCode = encodeURIComponent(pixCode || "");
    const intentUrl = intentLink.replace("CODIGO_PIX", encodedCode);
    const fallbackUrl = fallbackScheme.replace("CODIGO_PIX", encodedCode);

    // Tentar abrir com intent:// primeiro (Android)
    window.location.href = intentUrl;

    // Fallback após 1500ms: tentar scheme simples (iOS / navegadores)
    setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 1500);


  };

  const qrCodeSrc = getQrCodeSrc();
  const amountDisplay = amount ? `R$ ${(amount / 100).toFixed(2).replace(".", ",")}` : "";

  return (
    <Card className="p-6 bg-card/40 border-border/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-md mx-auto border-t-accent/20 overflow-hidden">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Pagamento Seguro via PIX
          </div>
          <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">Finalize seu Pedido</h3>
          {amountDisplay && (
            <p className="text-accent font-black text-3xl tracking-tighter">{amountDisplay}</p>
          )}
          <p className="text-[10px] text-muted-foreground font-medium px-4">Escaneie o QR Code ou utilize o Copia e Cola</p>
        </div>

        {/* QR Code */}
        <div className="relative group">
          <div className="w-48 h-48 bg-white p-4 rounded-[2rem] shadow-2xl flex items-center justify-center overflow-hidden border-4 border-accent/5 transition-transform group-hover:scale-[1.02]">
            {qrCodeSrc ? (
              <img src={qrCodeSrc} alt="QR Code PIX" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center text-slate-300">
                <QrCode className="w-12 h-12 mb-2 opacity-10" />
                <span className="text-[10px] font-black opacity-20 uppercase tracking-widest">Gerando...</span>
              </div>
            )}
          </div>
          
          {timeLeft > 0 ? (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background border border-border/50 px-6 py-2 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl whitespace-nowrap">
              <Clock className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-foreground">Expira em:</span>
              <span className="text-accent tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-6 py-2 rounded-2xl text-sm font-black shadow-xl">
              QR Code Expirado
            </div>
          )}
        </div>

        {/* Bancos */}
        <div className="w-full space-y-4 -mt-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pagar com meu banco</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                name: "Nubank",
                color: "#820AD1",
                icon: "/assets/banks/nubank.png",
                intentLink: "intent://nu/pix/copia-e-cola?code=CODIGO_PIX#Intent;scheme=nubank;package=com.nu.production;end",
                fallbackScheme: "nubank://nu/pix/copia-e-cola?code=CODIGO_PIX"
              },
              {
                name: "Inter",
                color: "#FF6B00",
                icon: "/assets/banks/inter.png",
                intentLink: "intent://pix?code=CODIGO_PIX#Intent;scheme=inter;package=br.com.intermedium;end",
                fallbackScheme: "inter://pix?code=CODIGO_PIX"
              },
              {
                name: "Itaú",
                color: "#EC7000",
                icon: "/assets/banks/itau.png",
                intentLink: "intent://pix/copia-e-cola?code=CODIGO_PIX#Intent;scheme=itau-empresas;package=com.itau;end",
                fallbackScheme: "itau-empresas://pix/copia-e-cola?code=CODIGO_PIX"
              },
              {
                name: "Bradesco",
                color: "#cc092f",
                icon: "/assets/banks/bradesco.png",
                intentLink: "intent://pix?code=CODIGO_PIX#Intent;scheme=bradesco;package=com.bradesco;end",
                fallbackScheme: "bradesco://pix?code=CODIGO_PIX"
              }
            ].map((bank) => (
              <button
                key={bank.name}
                onClick={() => openBankApp(bank.name, bank.intentLink, bank.fallbackScheme)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all active:scale-90 group"
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-all">
                  <img src={bank.icon} alt={bank.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">{bank.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copia e Cola */}
        <div className="w-full space-y-3 -mt-1">
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-white dark:text-accent-foreground font-black py-8 rounded-[1.5rem] shadow-xl shadow-accent/20 transition-all active:scale-95 text-sm uppercase tracking-widest flex items-center justify-center gap-3"
            onClick={() => copyPixCode()}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Código Copiado!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Pix Copia e Cola
              </>
            )}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Verificando Pagamento...' : 'Aguardando confirmação...'}
          </div>
        </div>
      </div>
    </Card>
  );
}
