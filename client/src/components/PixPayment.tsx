import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Copy, CheckCircle2, Clock, QrCode } from "lucide-react";
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

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6 bg-card/50 border-border/50 backdrop-blur-sm max-w-md mx-auto">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Pagamento via PIX</h3>
          <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o código abaixo</p>
        </div>

        {/* QR Code Placeholder/Real */}
        <div className="relative group">
          <div className="w-64 h-64 bg-white p-4 rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
            {qrCodeBase64 ? (
              <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" className="w-full h-full object-contain" />
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
