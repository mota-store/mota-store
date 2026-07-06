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

  // Lógica de Preço: 50% de desconto promocional (R$ 5,00 por item)
  const total = enrichedItems.reduce((acc, item) => acc + 500 * (item.quantity || 1), 0);
  const hasCashback = user?.hasCashbackBenefit === 1;
  const discountAmount = hasCashback ? Math.floor(total * 0.1) : 0;
  const finalTotal = total - discountAmount;
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
      const result = await checkoutWithBalanceAndPix.mutateAsync({
        totalAmount: finalTotal,
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
      const order = await createOrder.mutateAsync({ totalAmount: finalTotal });
      setOrderId(order.id);
      
      const pix = await createPix.mutateAsync({ orderId: order.id, amount: finalTotal / 100 });
      const pixWithExpiry = { ...pix, expiresIn: 600, orderId: order.id, amount: finalTotal };
      
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
    // Ao voltar da tela de PIX, NÃO removemos o pix_payment do sessionStorage
    // Isso permite que o Header exiba o ícone de "Pagamento Pendente"
    
    // Limpar carrinho ao voltar
    sessionStorage.removeItem("lastOrder");
    navigate("/");
    // Forçar reload para atualizar estado
    setTimeout(() => window.location.href = "/", 100);
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

          {step === "balance_pix_confirm" && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-blue-500/10 border border-blue-500/20">
                <Wallet className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">Saldo + <span className="text-blue-500">PIX</span></h2>
                <p className="text-xs text-muted-foreground mt-2">Seu saldo será usado e o restante será cobrado via PIX</p>
              </div>
              <div className="bg-card/30 rounded-2xl p-6 border border-border/30 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total da compra</span>
                  <span className="font-black text-accent">R$ {(finalTotal / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo a usar</span>
                  <span className="font-black text-green-500">- R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between text-sm font-black">
                  <span>Valor do PIX</span>
                  <span className="text-blue-500">R$ {((finalTotal - (balance || 0)) / 100).toFixed(2).replace(".", ",")}</span>
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
                  className="bg-blue-600 hover:bg-blue-700 font-black rounded-2xl px-8 py-6 shadow-xl shadow-blue-600/20 uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <QrCode className="h-5 w-5 mr-2" />
                      Confirmar e Gerar PIX
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* PIX Payment */}
          {step === "pix" && pixData && orderId && (
            <div className="w-full animate-in fade-in zoom-in duration-500">
              <PixPayment 
                pixCode={pixData.pixCode}
                qrCodeBase64={pixData.qrCodeBase64}
                expiresIn={600}
                amount={pixData.amount}
                onPaymentConfirmed={() => {
                  sessionStorage.removeItem("pix_payment");
                  sessionStorage.removeItem("pix_expiry_time");
                  const orderInfo = {
                    id: orderId,
                    total: finalTotal,
                    items: enrichedItems.map(i => ({ name: i.product?.name, price: 500 }))
                  };
                  sessionStorage.setItem("lastOrder", JSON.stringify(orderInfo));
                  navigate(`/order-confirmation?id=${orderId}`);
                }}
              />
            </div>
          )}
          
          {/* Payment Method Selection */}
          {step === "payment" && (
            <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black tracking-tighter uppercase">Escolha o <span className="text-accent">Método</span></h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Selecione sua forma de pagamento</p>
              </div>

              <div className="space-y-3">
                {canPayWithBalance && (
                  <button
                    onClick={() => setStep("balance_confirm")}
                    disabled={isSubmitting}
                    className="w-full group relative overflow-hidden rounded-[2rem] border border-green-500/20 bg-green-500/5 p-6 text-left transition-all hover:bg-green-500/10 hover:border-green-500/40 active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex items-center gap-5">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-500 transition-transform group-hover:scale-110 group-hover:rotate-3">
                        <Wallet className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-green-500">Pagar com Saldo</h3>
                        <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Descontar da carteira</p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end">
                          {hasCashback && (
                            <span className="px-1.5 py-0.5 rounded-md bg-green-500 text-[7px] font-black text-white uppercase mb-1">10% OFF</span>
                          )}
                          <p className="text-xs font-black text-green-500 uppercase tracking-tighter">
                            {hasCashback ? (
                              <>
                                <span className="line-through opacity-50 mr-1 text-[10px]">R$ {(total / 100).toFixed(2).replace(".", ",")}</span>
                                R$ {(finalTotal / 100).toFixed(2).replace(".", ",")}
                              </>
                            ) : (
                              `R$ ${(total / 100).toFixed(2).replace(".", ",")}`
                            )}
                          </p>
                        </div>
                        <p className="text-[8px] font-black text-green-500/60 uppercase tracking-widest mt-1">Pagar com Saldo</p>
                      </div>
                    </div>
                  </button>
                )}

                {canPayWithBalanceAndPix && (
                  <button
                    onClick={() => setStep("balance_pix_confirm")}
                    disabled={isSubmitting}
                    className="w-full group relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-6 text-left transition-all hover:bg-blue-500/10 hover:border-blue-500/40 active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex items-center gap-5">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110 group-hover:rotate-3">
                        <Wallet className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-blue-500">Saldo + PIX</h3>
                        <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                          Usar R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")} do saldo + PIX para o restante
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-blue-500 uppercase tracking-tighter">
                          PIX: R$ {((finalTotal - (balance || 0)) / 100).toFixed(2).replace(".", ",")}
                        </p>
                        <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest mt-1">Restante</p>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={handleConfirmOrder}
                  disabled={isSubmitting}
                  className="w-full group relative overflow-hidden rounded-[2rem] border border-accent/20 bg-accent/5 p-6 text-left transition-all hover:bg-accent/10 hover:border-accent/40 active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-transform group-hover:scale-110 group-hover:-rotate-3">
                      {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin" /> : <QrCode className="h-8 w-8" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black uppercase tracking-widest text-accent">Pagar com PIX</h3>
                      <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Aprovação imediata</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-accent uppercase tracking-tighter">R$ {(finalTotal / 100).toFixed(2).replace(".", ",")}</p>
                      <p className="text-[8px] font-black text-accent/60 uppercase tracking-widest mt-1">Total</p>
                    </div>
                  </div>
                </button>

                {!canPayWithBalance && balance !== undefined && (
                  <div className="px-6 py-3 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                      Saldo insuficiente (R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}) para pagar {hasCashback ? "R$ " + (finalTotal / 100).toFixed(2).replace(".", ",") : "com carteira"}
                    </p>
                  </div>
                )}
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
