import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { PixPayment } from "@/components/PixPayment";
import { toast } from "sonner";

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"payment" | "pix">("payment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ pixCode: string; qrCodeBase64: string; txid: string; expiresIn: number } | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

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

  const { data: cartItems, isLoading: cartLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  const createOrder = trpc.orders.create.useMutation();
  const createPix = trpc.payments.createPix.useMutation();

  const enrichedItems = cartItems?.map(item => ({
    ...item,
    product: products?.find(p => p.id === item.productId)
  })) || [];

  const total = enrichedItems.reduce((acc, item) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDirect = params.get("direct") === "true";
    
    if (isDirect && !isSubmitting && enrichedItems.length > 0 && step === "payment") {
      // Verificar se já existe um pagamento salvo antes de criar um novo
      const savedPayment = sessionStorage.getItem("pix_payment");
      if (!savedPayment) {
        handleConfirmOrder();
      }
    }
  }, [enrichedItems.length, step]);

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder.mutateAsync({ totalAmount: total });
      setOrderId(order.id);
      
      const pix = await createPix.mutateAsync({ orderId: order.id, amount: total / 100 });
      const pixWithExpiry = { ...pix, expiresIn: 600, orderId: order.id, amount: total };
      
      // Limpar timer antigo se existir
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
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Gerando seu PIX...</p>
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
    <div className="min-h-screen bg-background flex flex-col pt-20 px-4 pb-10">
      <div className="container max-w-2xl mx-auto flex flex-col h-full">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              sessionStorage.removeItem("pix_payment");
              sessionStorage.removeItem("pix_expiry_time");
              navigate("/cart");
            }} 
            disabled={step === "pix" && pixData !== null}
            className="font-black uppercase tracking-widest text-[10px] hover:bg-accent/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-black tracking-tighter uppercase">PAGA<span className="text-accent">MENTO</span></h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {step === "pix" && pixData && orderId && (
            <div className="w-full animate-in fade-in zoom-in duration-500">
              <PixPayment 
                pixCode={pixData.pixCode}
                qrCodeBase64={pixData.qrCodeBase64}
                expiresIn={600}
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
          
          {step === "payment" && !isSubmitting && (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 border-4 border-accent/20 border-t-accent animate-spin rounded-full mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Iniciando Checkout...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
