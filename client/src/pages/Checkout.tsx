import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowLeft, Loader2, Wallet, QrCode } from "lucide-react";
import { useLocation } from "wouter";
import { PixPayment } from "@/components/PixPayment";
import { toast } from "sonner";

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"payment" | "pix" | "balance_confirm">("payment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ pixCode: string; qrCodeBase64: string; txid: string; expiresIn: number; amount?: number } | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  const { data: cartItems, isLoading: cartLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  const { data: balance } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });
  const createOrder = trpc.orders.create.useMutation();
  const createPix = trpc.payments.createPix.useMutation();
  const checkoutWithBalance = trpc.wallet.checkoutWithBalance.useMutation();

  const enrichedItems = cartItems?.map(item => ({
    ...item,
    product: products?.find(p => p.id === item.productId)
  })) || [];

  const total = enrichedItems.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
  const canPayWithBalance = (balance || 0) >= total;

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
      const cartItemsPayload = enrichedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity || 1,
        price: item.product?.price || 0,
      }));

      const result = await checkoutWithBalance.mutateAsync({
        amount: total,
        cartItems: cartItemsPayload,
      });

      if (result.success) {
        toast.success("Pagamento realizado com sucesso!");
        navigate(`/order-confirmation?id=${result.orderId}`);
      } else {
        toast.error(result.error || "Erro ao processar pagamento");
        setStep("payment");
      }
    } catch (err) {
      toast.error("Erro ao processar pagamento. Tente novamente.");
      setStep("payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder.mutateAsync({ totalAmount: total });
      setOrderId(order.id);
      
      const pix = await createPix.mutateAsync({ orderId: order.id, amount: total / 100 });
      const pixWithExpiry = { ...pix, expiresIn: 600, orderId: order.id, amount: total };
      
      sessionStorage.removeItem("pix_expiry_time");
      
      setPixData(pixWithExpiry);
      sessionStorage.setItem("pix_payment", JSON.stringify(pixWithExpiry));
      setStep("pix");
      toast.success("Pedido registrado! Aguardando pagamento PIX.");
    } catch (err) {
      toast.error("Erro ao processar pedido. Tente novamente.");
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

  if (cartLoading || (isSubmitting && step === "payment")) {
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

        {/* Resumo do valor */}
        <div className="flex-shrink-0 p-4 rounded-2xl bg-card/30 border border-border/30 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Total</span>
            <span className="text-xl font-black text-accent">R$ {(total / 100).toFixed(2).replace(".", ",")}</span>
          </div>
        </div>

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
                  <span className="font-black text-accent">R$ {(total / 100).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between text-sm font-black">
                  <span>Saldo após</span>
                  <span className="text-green-500">R$ {(((balance || 0) - total) / 100).toFixed(2).replace(".", ",")}</span>
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
                    total: total,
                    items: enrichedItems.map(i => ({ name: i.product?.name, price: i.product?.price }))
                  };
                  sessionStorage.setItem("lastOrder", JSON.stringify(orderInfo));
                  navigate(`/order-confirmation?id=${orderId}`);
                }}
              />
            </div>
          )}
          
          {/* Payment Method Selection */}
          {step === "payment" && !isSubmitting && (
            <div className="space-y-4 w-full">
              <div className="text-center mb-6">
                <h2 className="text-xl font-black tracking-tighter uppercase mb-1">Escolha o Método</h2>
                <p className="text-xs text-muted-foreground">Selecione como deseja pagar</p>
              </div>

              {/* Option: Pay with Balance */}
              {canPayWithBalance && (
                <button
                  onClick={() => setStep("balance_confirm")}
                  className="w-full p-6 rounded-2xl bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Wallet className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm text-green-500">Pagar com Saldo</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Saldo disponível: R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-green-500">✓ Suficiente</p>
                    </div>
                  </div>
                </button>
              )}

              {!canPayWithBalance && balance !== undefined && (
                <div className="p-4 rounded-2xl bg-muted/10 border border-border/30">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Saldo atual: R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
                    <span className="text-red-500 font-black">Insuficiente</span>
                  </div>
                </div>
              )}

              {/* Option: PIX */}
              <button
                onClick={handleConfirmOrder}
                className="w-full p-6 rounded-2xl bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-accent">Pagar com PIX</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Copiar e colar ou usar app do banco</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-accent">R$ {(total / 100).toFixed(2).replace(".", ",")}</p>
                  </div>
                </div>
              </button>

              {isSubmitting && (
                <div className="text-center space-y-3 mt-6">
                  <div className="h-10 w-10 border-3 border-accent/20 border-t-accent animate-spin rounded-full mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Processando...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
