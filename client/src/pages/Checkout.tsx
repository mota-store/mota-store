import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowLeft, Loader2, Wallet, QrCode } from "lucide-react";
import { useLocation } from "wouter";
import { PixPayment } from "@/components/PixPayment";
import { toast } from "sonner";

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"payment" | "pix" | "balance_confirm" | "balance_pix_confirm">("payment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ pixCode: string; qrCodeBase64: string; txid: string; expiresIn: number; amount?: number } | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const { data: cartItems, isLoading: cartLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery();
  const { data: balance, isLoading: balanceLoading } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const { data: user } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated });
  const createOrder = trpc.orders.create.useMutation();
  const createPix = trpc.payments.createPix.useMutation();
  const checkoutWithBalance = trpc.wallet.checkoutWithBalance.useMutation();
  const checkoutWithBalanceAndPix = trpc.wallet.checkoutWithBalanceAndPix.useMutation();

  const enrichedItems = cartItems?.map(item => ({
    ...item,
    product: products?.find(p => p.id === item.productId)
  })) || [];

  // Lógica de Preço: 50% de desconto promocional
  // REGRA FIXA: Todos os produtos custam R$ 5,00 (500 centavos) independente do preço no banco
  const getDiscountedPrice = (_originalPrice: number) => 500;
  
  const total = enrichedItems.reduce((acc, item) => {
    return acc + 500 * (item.quantity || 1);
  }, 0);

  const hasCashback = user?.hasCashbackBenefit === 1;
  const discountAmount = hasCashback ? Math.floor(total * 0.1) : 0;
  const finalTotal = total - discountAmount;
  
  // No PIX não tem desconto adicional de 10% de cashback, apenas o desconto de 50% da loja
  const finalTotalPix = total;
  const canPayWithBalance = balance !== undefined && balance > 0 && balance >= finalTotal;
  const canPayWithBalanceAndPix = balance !== undefined && balance > 0 && balance < finalTotal;

  // Restaurar pagamento pendente do sessionStorage
  useEffect(() => {
    const savedPayment = sessionStorage.getItem("pix_payment");
    if (savedPayment) {
      const payment = JSON.parse(savedPayment);
      setPixData(payment);
      setOrderId(payment.orderId);
      setStep("pix");
    }
  }, []);

  const handlePayWithBalance = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Validar se todos os produtos foram carregados corretamente antes de prosseguir
      const hasMissingProduct = enrichedItems.some(item => !item.product);
      if (hasMissingProduct) {
        toast.error("Alguns produtos não foram carregados corretamente. Tente recarregar a página.");
        setIsSubmitting(false);
        return;
      }

      const cartItemsPayload = enrichedItems.map(item => ({
        productId: item.productId,
        quantity: Math.max(1, parseInt(String(item.quantity ?? 1), 10) || 1),
        price: 500,
      }));

      const result = await checkoutWithBalance.mutateAsync({
        amount: finalTotal,
        cartItems: cartItemsPayload,
      });

      if (result.success) {
        toast.success("Pagamento realizado com sucesso!");
        
        // Salvar informações para a tela de confirmação antes de navegar
        const orderInfo = {
          id: result.orderId,
          total: finalTotal,
          items: enrichedItems.map(i => ({ name: i.product?.name, price: 500 }))
        };
        sessionStorage.setItem("lastOrder", JSON.stringify(orderInfo));
        
        // Recarregar o estado do carrinho após a compra
        queryClient.invalidateQueries({ queryKey: [["cart", "getItems"]] });
        queryClient.invalidateQueries({ queryKey: [["wallet", "getBalance"]] });
        
        navigate(`/order-confirmation?id=${result.orderId}`);
      } else {
        toast.error(result.error || "Erro ao processar pagamento");
        setStep("payment");
      }
    } catch (err: any) {
      const message = err?.message || err?.data?.message || "Erro ao processar pagamento. Tente novamente.";
      toast.error(message);
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBalanceAndPix = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Validar se todos os produtos foram carregados corretamente antes de prosseguir
      const hasMissingProduct = enrichedItems.some(item => !item.product);
      if (hasMissingProduct) {
        toast.error("Alguns produtos não foram carregados corretamente. Tente recarregar a página.");
        setIsSubmitting(false);
        return;
      }

      const cartItemsPayload = enrichedItems.map(item => ({
        productId: item.productId,
        quantity: Math.max(1, parseInt(String(item.quantity ?? 1), 10) || 1),
        price: 500,
      }));

      const balanceToUse = balance || 0;
      // No pagamento misto (Saldo + PIX), o desconto de 10% também não se aplica ao valor total
      const result = await checkoutWithBalanceAndPix.mutateAsync({
        totalAmount: finalTotalPix,
        balanceToUse,
        cartItems: cartItemsPayload,
      });

      if (!result.success) {
        toast.error(result.error || "Erro ao processar pagamento parcial");
        setStep("payment");
        return;
      }

      const remainingAmount = result.remainingAmount!;
      setOrderId(result.orderId!);

      const pix = await createPix.mutateAsync({ orderId: result.orderId!, amount: remainingAmount / 100 });
      const pixWithExpiry = { ...pix, expiresIn: 600, orderId: result.orderId!, amount: remainingAmount };

      sessionStorage.removeItem("pix_expiry_time");
      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
    } catch (err: any) {
      const message = err?.message || err?.data?.message || "Erro ao processar pagamento. Tente novamente.";
      toast.error(message);
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // No PIX não tem desconto de 10%
      const order = await createOrder.mutateAsync({ totalAmount: finalTotalPix });
      setOrderId(order.id);
      
      const pix = await createPix.mutateAsync({ orderId: order.id, amount: finalTotalPix / 100 });
      const pixWithExpiry = { ...pix, expiresIn: 600, orderId: order.id, amount: finalTotalPix };
      
      sessionStorage.removeItem("pix_expiry_time");
      
      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
    } catch (err: any) {
      const message = err?.message || err?.data?.message || "Erro ao processar pedido. Tente novamente.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "balance_confirm" || step === "balance_pix_confirm") {
      setStep("payment");
      return;
    }

    if (step === "payment") {
      navigate("/cart");
      return;
    }

    sessionStorage.removeItem("lastOrder");
    navigate("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-medium">Você precisa estar logado para fazer checkout</p>
          <Button onClick={() => navigate("/login")} className="bg-accent font-black rounded-2xl px-8 py-6">FAZER LOGIN</Button>
        </div>
      </div>
    );
  }

  if (cartLoading || productsLoading || balanceLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-accent" />
            </div>
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (enrichedItems.length === 0 && step !== "pix") {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-background text-center">
        <div className="bg-muted/20 p-8 rounded-[3rem] mb-6">
          <ShoppingBag className="h-20 w-20 text-muted-foreground opacity-20" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Seu carrinho está vazio</h2>
        <p className="text-muted-foreground mb-8 font-medium">Adicione alguns itens antes de finalizar sua compra.</p>
        <Button onClick={() => navigate("/")} className="bg-accent font-black rounded-2xl px-12 py-7 shadow-xl shadow-accent/20">VOLTAR PARA A LOJA</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" style={{ paddingTop: "54px" }}>
      <div className="container max-w-2xl mx-auto flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-4 mb-4 flex-shrink-0">
          <button
            onClick={handleBack}
            className="font-black uppercase tracking-widest text-[10px] hover:bg-accent/10 flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <h1 className="text-3xl font-black tracking-tighter uppercase">PAGA<span className="text-accent">MENTO</span></h1>
        </div>

        {/* Resumo do valor - Exibido na seleção de pagamento também */}
        {(step === "payment" || step === "balance_confirm") && (
          <div className="flex-shrink-0 p-4 rounded-2xl bg-card/30 border border-border/30 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total do Pedido</span>
              <span className="text-xl font-black text-accent tracking-tighter">R$ {(finalTotalPix / 100).toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {/* Saldo Confirmation */}
          {step === "balance_confirm" && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-green-500/10 border border-green-500/20">
                <Wallet className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">Pagar com <span className="text-green-500">Saldo</span></h2>
                <p className="text-xs text-muted-foreground mt-2">O valor será descontado da sua carteira virtual</p>
              </div>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo atual</span>
                  <span className="font-black text-green-500">R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor da compra</span>
                  <span className={`font-black ${hasCashback ? "line-through text-muted-foreground/50" : "text-accent"}`}>
                    R$ {(total / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {hasCashback && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-500 font-bold">Desconto Cashback (10%)</span>
                    <span className="font-black text-green-500">- R$ {(discountAmount / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
                <div className="h-px bg-border/50" />
                <div className="flex justify-between text-sm font-black">
                  <span>Total a pagar</span>
                  <span className="text-accent">R$ {(finalTotal / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm font-black">
                  <span>Saldo após</span>
                  <span className="text-green-500">R$ {(((balance || 0) - finalTotal) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep("payment")}
                  variant="ghost"
                  className="font-black text-xs uppercase tracking-widest"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handlePayWithBalance}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 font-black rounded-2xl px-8 py-6 shadow-xl shadow-green-600/20 uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <Wallet className="h-5 w-5 mr-2" />
                      Confirmar Pagamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Balance + PIX Confirmation */}
          {step === "balance_pix_confirm" && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="flex gap-4 justify-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-[1.5rem] bg-green-500/10 border border-green-500/20">
                  <Wallet className="h-8 w-8 text-green-500" />
                </div>
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-[1.5rem] bg-accent/10 border border-accent/20">
                  <QrCode className="h-8 w-8 text-accent" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">Saldo + <span className="text-accent">PIX</span></h2>
                <p className="text-xs text-muted-foreground mt-2">Use seu saldo e pague o restante via PIX</p>
              </div>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3 w-full max-w-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total da compra</span>
                  <span className="font-black">R$ {(finalTotalPix / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm text-green-500">
                  <span>Saldo utilizado</span>
                  <span className="font-black">- R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between text-sm font-black text-accent">
                  <span>Restante via PIX</span>
                  <span className="text-2xl tracking-tighter">R$ {((finalTotalPix - (balance || 0)) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep("payment")}
                  variant="ghost"
                  className="font-black text-xs uppercase tracking-widest"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleBalanceAndPix}
                  disabled={isSubmitting}
                  className="bg-accent hover:bg-accent/90 font-black rounded-2xl px-8 py-6 shadow-xl shadow-accent/20 uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <QrCode className="h-5 w-5 mr-2" />
                      Gerar PIX do Restante
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Payment Selection */}
          {step === "payment" && (
            <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Selecione a forma de pagamento</p>
              </div>

              {/* Opção: Saldo (se tiver saldo suficiente) */}
              {canPayWithBalance && (
                <button
                  onClick={() => setStep("balance_confirm")}
                  className="w-full p-6 rounded-[2rem] bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 hover:border-green-500/40 transition-all group text-left flex items-center gap-5"
                >
                  <div className="h-14 w-14 rounded-2xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="h-7 w-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg">Pagar com Saldo</h3>
                    <p className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest">Saldo: R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</p>
                  </div>
                </button>
              )}

              {/* Opção: Saldo Parcial + PIX (se tiver saldo mas não suficiente) */}
              {canPayWithBalanceAndPix && (
                <button
                  onClick={() => setStep("balance_pix_confirm")}
                  className="w-full p-6 rounded-[2rem] bg-card/40 border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-all group text-left flex items-center gap-5"
                >
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="relative">
                      <Wallet className="h-5 w-5 text-green-500 absolute -top-1 -left-1" />
                      <QrCode className="h-5 w-5 text-accent absolute -bottom-1 -right-1" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg">Saldo + PIX</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Use R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")} do seu saldo</p>
                  </div>
                </button>
              )}

              {/* Opção: PIX (Sempre disponível) */}
              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="w-full p-6 rounded-[2rem] bg-accent/10 border border-accent/30 hover:bg-accent/20 hover:border-accent transition-all group text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-accent/20">
                    <QrCode className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg">Pagar com PIX</h3>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Aprovação imediata</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full border border-accent/30 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </div>
              </button>

              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate("/cart")}
                  className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors"
                >
                  <span className="h-px w-4 bg-muted-foreground/30 group-hover:bg-destructive/30 transition-colors" />
                  Cancelar Compra e Voltar
                  <span className="h-px w-4 bg-muted-foreground/30 group-hover:bg-destructive/30 transition-colors" />
                </button>
              </div>

              <p className="text-[9px] text-center text-muted-foreground/50 font-bold uppercase tracking-widest pt-4">
                Ambiente seguro & criptografado
              </p>
            </div>
          )}

          {/* PIX Payment Display */}
          {step === "pix" && pixData && (
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
              <PixPayment
                pixCode={pixData.pixCode}
                qrCodeBase64={pixData.qrCodeBase64}
                amount={pixData.amount ? pixData.amount / 100 : finalTotalPix / 100}
                expiresIn={pixData.expiresIn}
                onSuccess={() => {
                  sessionStorage.removeItem("pix_payment");
                  sessionStorage.removeItem("pix_expiry_time");
                  queryClient.invalidateQueries({ queryKey: [["cart", "getItems"]] });
                  queryClient.invalidateQueries({ queryKey: [["wallet", "getBalance"]] });
                  navigate(`/order-confirmation?id=${orderId}`);
                }}
                onCancel={() => {
                  sessionStorage.removeItem("pix_payment");
                  sessionStorage.removeItem("pix_expiry_time");
                  setStep("payment");
                }}
              />
              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    sessionStorage.removeItem("pix_payment");
                    sessionStorage.removeItem("pix_expiry_time");
                    setStep("payment");
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors"
                >
                  Cancelar e escolher outro método
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="py-6 flex-shrink-0">
          <div className="flex items-center justify-center gap-8 opacity-30 grayscale">
            <img src="https://logopng.com.br/logos/pix-106.png" alt="PIX" className="h-4 object-contain" />
            <div className="h-4 w-px bg-border" />
            <span className="text-[10px] font-black tracking-widest uppercase">Compra 100% Segura</span>
          </div>
        </div>
      </div>
    </div>
  );
}
