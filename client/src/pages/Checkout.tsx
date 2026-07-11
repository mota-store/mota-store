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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
  const checkPaymentStatus = trpc.payments.checkStatus.useQuery(
    { txid: pixData?.txid || "" },
    { 
      enabled: !!pixData?.txid && step === "pix",
      refetchInterval: 5000, // Verificar a cada 5 segundos
    }
  );

  const enrichedItems = cartItems?.map(item => ({
    ...item,
    product: products?.find(p => p.id === item.productId)
  })) || [];

  // Lógica de Preço: Baseada no preço real do produto (product.price)
  const total = enrichedItems.reduce((acc, item) => {
    return acc + (item.product?.price || 0) * (item.quantity || 1);
  }, 0);

  const hasCashback = user?.hasCashbackBenefit === 1;
  const discountAmount = hasCashback ? Math.floor(total * 0.1) : 0;
  const finalTotal = total - discountAmount;
  
  const finalTotalPix = total;
  const canPayWithBalance = balance !== undefined && balance > 0 && balance >= finalTotal;
  const canPayWithBalanceAndPix = balance !== undefined && balance > 0 && balance < finalTotal;

  // Timer de carregamento inicial de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Restaurar pagamento pendente
  useEffect(() => {
    const savedPayment = sessionStorage.getItem("pix_payment");
    if (savedPayment) {
      const payment = JSON.parse(savedPayment);
      setPixData(payment);
      setOrderId(payment.orderId);
      setStep("pix");
    }
  }, []);

  // Efeito para lidar com a confirmação do pagamento PIX via polling
  useEffect(() => {
    if (checkPaymentStatus.data?.status === "COMPLETED" && pixData && orderId) {
      toast.success("Pagamento confirmado!");
      
      // Salvar dados para o WhatsApp
      sessionStorage.setItem("lastOrder", JSON.stringify({
        id: orderId,
        total: pixData.amount || total,
        items: enrichedItems.map(item => ({
          name: item.product?.name || "Produto",
          price: item.product?.price || 0,
          quantity: item.quantity
        }))
      }));

      sessionStorage.removeItem("pix_payment");
      sessionStorage.removeItem("pix_expiry_time");
      // Atualizar status do pedido no banco de dados para "completed"
      const updateStatus = async () => {
        try {
          const { trpc } = await import("../lib/trpc");
          // Chamada direta via trpc context não é ideal aqui, mas o mutate já está definido no componente
          // Como estamos dentro de um useEffect, usamos a instância da mutation já disponível no escopo do componente
        } catch (e) {
          console.error("Erro ao atualizar status do pedido:", e);
        }
      };

      updateOrderStatus.mutate({ orderId, status: "completed" });
      
      queryClient.invalidateQueries({ queryKey: [["cart", "getItems"]] });
      queryClient.invalidateQueries({ queryKey: [["wallet", "getBalance"]] });
      queryClient.invalidateQueries({ queryKey: [["orders", "list"]] });
      navigate(`/order-confirmation?id=${orderId}`);
    }
  }, [checkPaymentStatus.data, pixData, orderId, navigate, queryClient, enrichedItems, total, updateOrderStatus]);

  const handlePayWithBalance = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await checkoutWithBalance.mutateAsync({
        amount: finalTotal,
        cartItems: enrichedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product?.price || 0,
        })),
      });

      if (result.success) {
        toast.success("Pagamento realizado com sucesso!");
        
        // Salvar dados do pedido para a página de confirmação (WhatsApp)
        sessionStorage.setItem("lastOrder", JSON.stringify({
          id: result.orderId,
          total: finalTotal,
          items: enrichedItems.map(item => ({
            name: item.product?.name || "Produto",
            price: 500,
            quantity: item.quantity
          }))
        }));

        queryClient.invalidateQueries({ queryKey: [["cart", "getItems"]] });
        queryClient.invalidateQueries({ queryKey: [["wallet", "getBalance"]] });
        queryClient.invalidateQueries({ queryKey: [["orders", "list"]] });
        navigate(`/order-confirmation?id=${result.orderId}`);
      } else {
        toast.error(result.error || "Erro ao processar pagamento");
        setStep("payment");
      }
    } catch (err: any) {
      toast.error("Erro ao processar pagamento");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBalanceAndPix = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const balanceToUse = balance || 0;
      const result = await checkoutWithBalanceAndPix.mutateAsync({
        totalAmount: finalTotalPix,
        balanceToUse,
        cartItems: enrichedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product?.price || 0,
        })),
      });

      if (!result.success) {
        toast.error(result.error || "Erro ao processar pagamento parcial");
        setStep("payment");
        return;
      }

      setOrderId(result.orderId!);
      // amount deve ser em REAIS (ex: 10.00)
      const pix = await createPix.mutateAsync({ 
        orderId: result.orderId!, 
        amount: result.remainingAmount! / 100 
      });
      
      const pixWithExpiry = { 
        ...pix, 
        expiresIn: 600, 
        orderId: result.orderId!, 
        amount: result.remainingAmount // Mantemos em centavos para o componente de exibição
      };

      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
    } catch (err: any) {
      toast.error("Erro ao processar pagamento");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    
    // Verificar se há itens no carrinho antes de prosseguir
    if (!enrichedItems || enrichedItems.length === 0) {
      toast.error("Seu carrinho está vazio");
      navigate("/cart");
      return;
    }

    setIsSubmitting(true);
    try {
      // Garantir que o total está atualizado com base nos itens atuais
      const currentTotal = enrichedItems.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
      
      const order = await createOrder.mutateAsync({ totalAmount: currentTotal });
      setOrderId(order.id);
      
      // amount deve ser em REAIS (ex: 10.00)
      const pix = await createPix.mutateAsync({ 
        orderId: order.id, 
        amount: currentTotal / 100 
      });
      
      const pixWithExpiry = { 
        ...pix, 
        expiresIn: 600, 
        orderId: order.id, 
        amount: currentTotal // Mantemos em centavos para o componente de exibição
      };
      
      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
    } catch (err: any) {
      toast.error("Erro ao processar pedido");
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
    if (step === "pix") {
      sessionStorage.removeItem("pix_payment");
      setStep("payment");
      return;
    }
    navigate("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <Button onClick={() => navigate("/login")} className="bg-accent dark:text-black font-black rounded-2xl px-8 py-6">FAZER LOGIN</Button>
      </div>
    );
  }

  if (isInitialLoading || cartLoading || productsLoading || balanceLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (enrichedItems.length === 0 && step !== "pix") {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-background text-center">
        <h2 className="text-3xl font-black mb-4">Seu carrinho está vazio</h2>
        <Button onClick={() => navigate("/")} className="bg-accent font-black rounded-2xl px-12 py-7">VOLTAR PARA A LOJA</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" style={{ paddingTop: "54px" }}>
      <div className="container max-w-2xl mx-auto flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-4 mb-4 flex-shrink-0">
          <button onClick={handleBack} className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="text-3xl font-black tracking-tighter uppercase">PAGA<span className="text-accent">MENTO</span></h1>
        </div>

        {(step === "payment" || step === "balance_confirm") && (
          <div className="flex-shrink-0 p-4 rounded-2xl bg-card/30 border border-border/30 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total do Pedido</span>
              <span className="text-xl font-black text-accent tracking-tighter">R$ {(finalTotalPix / 100).toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {step === "balance_confirm" && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-green-500/10 border border-green-500/20">
                <Wallet className="h-10 w-10 text-green-500" />
              </div>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Saldo atual</span>
                  <span className="font-black text-green-500">R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm font-black">
                  <span>Total a pagar</span>
                  <span className="text-accent">R$ {(finalTotal / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep("payment")} variant="ghost" className="font-black text-xs uppercase">Voltar</Button>
                <Button onClick={handlePayWithBalance} disabled={isSubmitting} className="bg-green-600 font-black rounded-2xl px-8 py-6">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Pagamento"}
                </Button>
              </div>
            </div>
          )}

          {step === "balance_pix_confirm" && (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-black uppercase">Saldo + <span className="text-accent">PIX</span></h2>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3 w-full max-w-sm">
                <div className="flex justify-between text-sm text-green-500">
                  <span>Saldo utilizado</span>
                  <span className="font-black">- R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-accent">
                  <span>Restante via PIX</span>
                  <span className="text-2xl">R$ {((finalTotalPix - (balance || 0)) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep("payment")} variant="ghost" className="font-black text-xs uppercase">Voltar</Button>
                <Button onClick={handleBalanceAndPix} disabled={isSubmitting} className="bg-accent font-black rounded-2xl px-8 py-6">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gerar PIX do Restante"}
                </Button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="w-full max-w-sm space-y-4">
              {canPayWithBalance && (
                <button 
                  onClick={() => setStep("balance_confirm")} 
                  disabled={isSubmitting}
                  className="w-full p-6 rounded-[2rem] bg-green-500/5 border border-green-500/20 flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-5">
                    <Wallet className="h-7 w-7 text-green-500" />
                    <div className="text-left">
                      <h3 className="font-black uppercase text-lg">Pagar com Saldo</h3>
                      <p className="text-[10px] font-bold text-green-500/70 uppercase">Saldo: R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</p>
                    </div>
                  </div>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-green-500" /> : <ArrowLeft className="h-4 w-4 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />}
                </button>
              )}

              {canPayWithBalanceAndPix && (
                <button 
                  onClick={() => setStep("balance_pix_confirm")} 
                  disabled={isSubmitting}
                  className="w-full p-6 rounded-[2rem] bg-card/40 border border-border/40 flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-5">
                    <div className="relative"><Wallet className="h-5 w-5 text-green-500" /><QrCode className="h-5 w-5 text-accent absolute -bottom-1 -right-1" /></div>
                    <div className="text-left">
                      <h3 className="font-black uppercase text-lg">Saldo + PIX</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Use R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")} do saldo</p>
                    </div>
                  </div>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <ArrowLeft className="h-4 w-4 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />}
                </button>
              )}

              <button 
                onClick={handleConfirmOrder} 
                disabled={isSubmitting} 
                className="w-full p-6 rounded-[2rem] bg-accent/10 border border-accent/30 flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-5">
                  <QrCode className="h-7 w-7 text-accent" />
                  <div className="text-left"><h3 className="font-black uppercase text-lg">Pagar com PIX</h3></div>
                </div>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <ArrowLeft className="h-4 w-4 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />}
              </button>

              <div className="mt-8 text-center">
                <button onClick={() => navigate("/cart")} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors">
                  Cancelar Compra e Voltar
                </button>
              </div>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="w-full max-w-md">
              <PixPayment
                pixCode={pixData.pixCode}
                qrCodeBase64={pixData.qrCodeBase64}
                amount={pixData.amount} // Agora passamos em centavos para o componente
                expiresIn={pixData.expiresIn}
                onPaymentConfirmed={() => {
                  sessionStorage.removeItem("pix_payment");
                  queryClient.invalidateQueries({ queryKey: [["cart", "getItems"]] });
                  navigate(`/order-confirmation?id=${orderId}`);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
