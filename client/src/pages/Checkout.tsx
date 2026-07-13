import React, { useState, useEffect, useRef } from "react";
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
  const lastSubmitTime = useRef<number>(0);

  const { data: cartItems, isLoading: cartLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery();
  const { data: balance, isLoading: balanceLoading } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const { data: user } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated });
  
  const createOrder = trpc.orders.create.useMutation();
  const createPix = trpc.payments.createPix.useMutation();
  const updateOrderStatus = trpc.orders.updateStatus.useMutation();
  const checkoutWithBalance = trpc.wallet.checkoutWithBalance.useMutation();
  const checkoutWithBalanceAndPix = trpc.wallet.checkoutWithBalanceAndPix.useMutation();
  
  const checkPaymentStatus = trpc.payments.checkStatus.useQuery(
    { txid: pixData?.txid || "" },
    { 
      enabled: !!pixData?.txid && step === "pix",
      refetchInterval: 5000,
    }
  );

  const enrichedItems = cartItems?.map(item => ({
    ...item,
    product: products?.find(p => p.id === item.productId)
  })) || [];

  const total = enrichedItems.reduce((acc, item) => {
    return acc + (item.product?.price || 0) * (item.quantity || 1);
  }, 0);

  const hasCashback = user?.hasCashbackBenefit === 1;
  const discountAmount = hasCashback ? Math.floor(total * 0.1) : 0;
  const finalTotal = total - discountAmount;
  
  const finalTotalPix = total;

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const savedPayment = sessionStorage.getItem("pix_payment");
    if (savedPayment) {
      const payment = JSON.parse(savedPayment);
      setPixData(payment);
      setOrderId(payment.orderId);
      setStep("pix");
    }
  }, []);

  useEffect(() => {
    if (checkPaymentStatus.data?.status === "COMPLETED" && pixData && orderId) {
      toast.success("Pagamento confirmado!");
      
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
      
      updateOrderStatus.mutate({ orderId, status: "completed" });
      
      queryClient.invalidateQueries({ queryKey: [["cart", "getItems"]] });
      queryClient.invalidateQueries({ queryKey: [["wallet", "getBalance"]] });
      queryClient.invalidateQueries({ queryKey: [["orders", "list"]] });
      navigate(`/order-confirmation?id=${orderId}`);
    }
  }, [checkPaymentStatus.data, pixData, orderId, navigate, queryClient, enrichedItems, total, updateOrderStatus]);

  const handlePayWithBalance = async () => {
    const now = Date.now();
    if (isSubmitting || (now - lastSubmitTime.current < 3000)) return;
    lastSubmitTime.current = now;
    
    setIsSubmitting(true);
    try {
      if (enrichedItems.length === 0) {
        toast.error("Seu carrinho está vazio");
        navigate("/cart");
        return;
      }

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
        
        sessionStorage.setItem("lastOrder", JSON.stringify({
          id: result.orderId,
          total: finalTotal,
          items: enrichedItems.map(item => ({
            name: item.product?.name || "Produto",
            price: item.product?.price || 0,
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
      toast.error(err?.message || "Erro ao processar pagamento");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBalanceAndPix = async () => {
    const now = Date.now();
    if (isSubmitting || (now - lastSubmitTime.current < 3000)) return;
    lastSubmitTime.current = now;

    setIsSubmitting(true);
    try {
      if (enrichedItems.length === 0) {
        toast.error("Seu carrinho está vazio");
        navigate("/cart");
        return;
      }

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
      const pix = await createPix.mutateAsync({ 
        orderId: result.orderId!, 
        amount: result.remainingAmount! / 100 
      });
      
      const pixWithExpiry = { 
        ...pix, 
        expiresIn: 600, 
        orderId: result.orderId!, 
        amount: result.remainingAmount
      };

      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar pagamento");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async () => {
    const now = Date.now();
    if (isSubmitting || (now - lastSubmitTime.current < 3000)) return;
    lastSubmitTime.current = now;

    if (!enrichedItems || enrichedItems.length === 0) {
      toast.error("Seu carrinho está vazio");
      navigate("/cart");
      return;
    }

    setIsSubmitting(true);
    try {
      const currentTotal = enrichedItems.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
      
      const order = await createOrder.mutateAsync({ totalAmount: currentTotal });
      setOrderId(order.id);
      
      const pix = await createPix.mutateAsync({ 
        orderId: order.id, 
        amount: currentTotal / 100 
      });
      
      const pixWithExpiry = { 
        ...pix, 
        expiresIn: 600, 
        orderId: order.id, 
        amount: currentTotal
      };
      
      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar pedido");
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
        <Button onClick={() => navigate("/login")} className="bg-accent dark:text-black font-black rounded-xl px-8 py-6">FAZER LOGIN</Button>
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

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={handleBack} className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="text-2xl font-black tracking-tighter uppercase">PAGA<span className="text-accent">MENTO</span></h1>
        </div>

        {(step === "payment" || step === "balance_confirm") && (
          <Card className="p-6 bg-card/30 border-border/30 rounded-2xl mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total do Pedido</span>
              <span className="text-2xl font-black text-accent tracking-tighter">R$ {(finalTotalPix / 100).toFixed(2).replace(".", ",")}</span>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {step === "payment" && (
            <div className="space-y-4">
              <Button 
                onClick={canPayWithBalance ? () => setStep("balance_confirm") : () => setStep("balance_pix_confirm")}
                className="w-full h-16 rounded-2xl bg-card/50 border-2 border-border/50 hover:border-accent/50 flex items-center justify-between px-6 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Saldo em Carteira</p>
                    <p className="text-[10px] text-muted-foreground">Disponível: R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</p>
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>

              <Button 
                onClick={handleConfirmOrder}
                className="w-full h-16 rounded-2xl bg-card/50 border-2 border-border/50 hover:border-accent/50 flex items-center justify-between px-6 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Pagar com PIX</p>
                    <p className="text-[10px] text-muted-foreground">Aprovação instantânea</p>
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}

          {step === "balance_confirm" && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-green-500/10 border border-green-500/20">
                <Wallet className="h-10 w-10 text-green-500" />
              </div>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span>Saldo atual</span>
                  <span className="text-green-500">R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span>Total a pagar</span>
                  <span className="text-accent">R$ {(finalTotal / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep("payment")} variant="ghost" className="flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest">Voltar</Button>
                <Button onClick={handlePayWithBalance} disabled={isSubmitting} className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl uppercase tracking-widest">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar"}
                </Button>
              </div>
            </div>
          )}

          {step === "pix" && pixData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PixPayment 
                pixCode={pixData.pixCode} 
                qrCodeBase64={pixData.qrCodeBase64} 
                expiresIn={pixData.expiresIn}
                amount={pixData.amount}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
