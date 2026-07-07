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

        {/* Resumo do valor - Oculto nas etapas de pagamento e PIX conforme solicitado */}
        {step === "balance_confirm" && (
          <div className="flex-shrink-0 p-4 rounded-2xl bg-card/30 border border-border/30 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Total</span>
              <span className="text-xl font-black text-accent">R$ {(total / 100).toFixed(2).replace(".", ",")}</span>
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
                <h2 className="text-2xl font-black tracking-tighter uppercase">Pagamento <span className="text-accent">Misto</span></h2>
                <p className="text-xs text-muted-foreground mt-2">Saldo + PIX para completar o valor</p>
              </div>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3 w-full max-w-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="font-black">R$ {(finalTotalPix / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm text-green-500">
                  <span className="font-bold">Usar do Saldo</span>
                  <span className="font-black">- R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between text-sm font-black">
                  <span>Pagar via PIX</span>
                  <span className="text-accent text-lg">R$ {((finalTotalPix - (balance || 0)) / 100).toFixed(2).replace(".", ",")}</span>
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
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gerar QR Code"}
                </Button>
              </div>
            </div>
          )}

          {/* Payment Selection */}
          {step === "payment" && (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Escolha como pagar</p>
                <h2 className="text-2xl font-black tracking-tighter uppercase">MÉTODO DE <span className="text-accent">PAGAMENTO</span></h2>
              </div>

              <div className="grid gap-3">
                {/* Option: Balance */}
                <button
                  onClick={() => setStep("balance_confirm")}
                  disabled={!canPayWithBalance}
                  className={`group relative flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all text-left ${
                    canPayWithBalance 
                      ? "bg-card/40 border-border/50 hover:border-green-500/50 hover:bg-green-500/5 shadow-lg hover:shadow-green-500/10" 
                      : "opacity-40 cursor-not-allowed border-transparent bg-muted/20"
                  }`}
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${canPayWithBalance ? "bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white" : "bg-muted text-muted-foreground"}`}>
                    <Wallet className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black uppercase tracking-tight">Saldo da Carteira</span>
                      {canPayWithBalance && <span className="text-[10px] font-black bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full uppercase">Disponível</span>}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {balance !== undefined ? `Seu saldo: R$ ${(balance / 100).toFixed(2).replace(".", ",")}` : "Carregando saldo..."}
                    </p>
                  </div>
                </button>

                {/* Option: Balance + PIX */}
                {canPayWithBalanceAndPix && (
                  <button
                    onClick={() => setStep("balance_pix_confirm")}
                    className="group relative flex items-center gap-4 p-6 rounded-[2rem] border-2 bg-card/40 border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all text-left shadow-lg hover:shadow-accent/10"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                      <div className="relative">
                        <Wallet className="h-6 w-6" />
                        <Plus className="h-3 w-3 absolute -top-1 -right-1" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black uppercase tracking-tight text-sm">Saldo + PIX</span>
                        <span className="text-[10px] font-black bg-accent/20 text-accent px-2 py-0.5 rounded-full uppercase">Recomendado</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Use seu saldo e pague o restante via PIX</p>
                    </div>
                  </button>
                )}

                {/* Option: PIX */}
                <button
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting}
                  className="group relative flex items-center gap-4 p-6 rounded-[2rem] border-2 bg-card/40 border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all text-left shadow-lg hover:shadow-accent/10"
                >
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                    <QrCode className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black uppercase tracking-tight">Pagar com PIX</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Aprovação instantânea e segura</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* PIX Payment Component */}
          {step === "pix" && pixData && (
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
              <PixPayment
                pixCode={pixData.pixCode}
                qrCodeBase64={pixData.qrCodeBase64}
                amount={pixData.amount || finalTotalPix}
                expiresIn={pixData.expiresIn}
                orderId={orderId!}
                onSuccess={(orderId) => navigate(`/order-confirmation?id=${orderId}`)}
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

              {isSubmitting && (
                <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in zoom-in">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Processando...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
