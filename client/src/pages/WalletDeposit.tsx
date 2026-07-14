import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ArrowLeft, Wallet, Star, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { PixPayment } from "../components/PixPayment";
import { toast } from "sonner";

export default function WalletDeposit() {
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState<string | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixData, setPixData] = useState<{ pixCode: string; qrCodeBase64: string; txid: string; expiresIn: number } | null>(null);

  const { data: balance = 0 } = trpc.wallet.getBalance.useQuery();
  const utils = trpc.useUtils();
  
  const createPixMutation = trpc.payments.createPix.useMutation();
  const confirmDepositMutation = trpc.wallet.deposit.useMutation();

  // Usar query com refetchInterval para polling, assim como no Checkout.tsx
  const { data: statusData } = trpc.payments.checkStatus.useQuery(
    { txid: pixData?.txid || "" },
    { 
      enabled: !!pixData,
      refetchInterval: 5000,
    }
  );

  const handleAmountSelect = (val: number) => {
    setAmount(val.toString());
  };

  const handleGeneratePix = async () => {
    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents < 100) {
      toast.error("O valor mínimo para recarga é R$ 1,00");
      return;
    }

    setIsGenerating(true);
    try {
      // O endpoint payments.createPix exige um orderId. 
      // Como é uma recarga direta, passamos 0 ou um ID fictício, 
      // já que o efi-payment.ts usa o orderId apenas para a descrição se não houver uma.
      const result = await createPixMutation.mutateAsync({ 
        orderId: 0, 
        amount: amountCents / 100 
      });
      setPixData(result);
      toast.success("QR Code gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar QR Code PIX");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    if (!pixData) return;
    
    try {
      const amountCents = Math.round(Number(amount) * 100);
      const result = await confirmDepositMutation.mutateAsync({ 
        amount: amountCents
      });

      if (result.success) {
        toast.success(`R$ ${Number(amount || 0).toFixed(2)} creditados com sucesso!`);
        utils.wallet.getBalance.invalidate();
        navigate("/profile");
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Erro ao confirmar depósito";
      toast.error(errorMsg);
      console.error("Erro ao confirmar depósito:", error);
    }
  };

  // Efeito para observar a mudança de status do PIX
  useEffect(() => {
    if (statusData?.status === "COMPLETED") {
      handlePaymentConfirmed();
    }
  }, [statusData]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black tracking-tighter uppercase">MOTA STORE</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-24 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase text-accent">Recarregar Carteira</h2>
          <p className="text-sm text-muted-foreground font-medium">Adicione saldo para comprar produtos com desconto</p>
        </div>

        {/* Saldo Atual */}
        <Card className="p-6 bg-card/40 border-border/40 backdrop-blur-xl rounded-[2rem] shadow-xl border-t-accent/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Disponível</p>
              <p className="text-3xl font-black tracking-tighter">
                R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}
              </p>
            </div>
            <div className="p-3 bg-accent/10 rounded-2xl">
              <Wallet className="w-8 h-8 text-accent" />
            </div>
          </div>
        </Card>

        {!pixData ? (
          <div className="space-y-6">
            {/* Atalhos de Valor */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "R$ 5,00", value: 5, promo: "10% CASHBACK" },
                { label: "R$ 10,00", value: 10 },
                { label: "R$ 20,00", value: 20 },
                { label: "R$ 50,00", value: 50 },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleAmountSelect(item.value)}
                  className={`relative p-4 rounded-[1.5rem] border-2 transition-all active:scale-95 text-left group ${
                    amount === item.value.toString() 
                      ? "border-accent bg-accent/5" 
                      : "border-border/40 bg-card/20 hover:border-border"
                  }`}
                >
                  <span className="block text-lg font-black tracking-tighter">{item.label}</span>
                  {item.promo && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-500 text-[8px] font-black text-white uppercase">
                      {item.promo}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Valor Personalizado */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ou digite um valor</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 py-7 text-lg font-black rounded-[1.5rem] border-border/40 bg-card/20 focus:border-accent transition-all"
                />
              </div>
            </div>

            {/* Aviso de Benefício */}
            <div className="p-4 rounded-[1.5rem] bg-accent/5 border border-accent/10 flex items-start gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-tight">Benefício Exclusivo</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Recarregue <span className="text-accent font-bold">R$ 5,00 ou mais</span> e ganhe 10% de cashback em todas as suas compras!
                </p>
              </div>
            </div>

            <Button
              className="w-full py-8 rounded-[1.5rem] bg-accent hover:bg-accent/90 text-accent-foreground font-black text-sm uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
              onClick={handleGeneratePix}
              disabled={!amount || Number(amount) < 1 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                "Gerar QR Code PIX"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <PixPayment 
              qrCodeBase64={pixData.qrCodeBase64}
              pixCode={pixData.pixCode}
              expiresIn={pixData.expiresIn}
              amount={Math.round(Number(amount) * 100)}
              onPaymentConfirmed={handlePaymentConfirmed}
            />
            
            <Button
              variant="outline"
              className="w-full py-6 rounded-[1.5rem] border-border/40 font-black text-[10px] uppercase tracking-widest"
              onClick={() => setPixData(null)}
            >
              Escolher outro valor
            </Button>

            {/* Botão de simulação/confirmação manual para desenvolvimento/teste */}
            <button 
              onClick={handlePaymentConfirmed}
              className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-muted-foreground transition-colors"
            >
              [ Simular Confirmação de Pagamento ]
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
