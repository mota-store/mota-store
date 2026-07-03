import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { PixPayment } from "@/components/PixPayment";
import { toast } from "sonner";

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const [step, setStep] = useState<"payment" | "pix">("payment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ pixCode: string; qrCodeBase64: string; txid: string; expiresIn: number } | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

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

  const total = enrichedItems.length * 500;

  // Efeito para processar o pedido automaticamente se vier do carrinho com direct=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDirect = params.get("direct") === "true";
    
    if (isDirect && !isSubmitting && enrichedItems.length > 0 && step === "payment") {
      handleConfirmOrder();
    }
  }, [enrichedItems.length, step]);

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder.mutateAsync({ totalAmount: total });
      setOrderId(order.id);
      
      // Forçar 600 segundos (10 minutos) para o PIX
      const pix = await createPix.mutateAsync({ orderId: order.id, amount: total / 100 });
      setPixData({ ...pix, expiresIn: 600 });
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
      <div className="h-screen flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Você precisa estar logado para fazer checkout</p>
          <Button onClick={() => navigate("/login")}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  if (cartLoading || (isSubmitting && step === "payment")) {
    return (
      <div className="h-screen flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Gerando seu QR Code PIX...</p>
        </div>
      </div>
    );
  }

  if (enrichedItems.length === 0 && step !== "pix") {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
        <Button onClick={() => navigate("/")}>Voltar para a Loja</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col pt-20 px-4">
        <div className="flex items-center gap-4 mb-4 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/cart")} disabled={step === "pix"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-black tracking-tighter">PAGAMENTO</h1>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center">
          {step === "pix" && pixData && orderId && (
            <div className="w-full max-w-md space-y-3 lg:space-y-6 overflow-y-auto h-full flex flex-col">
              <div className="flex-1">
                <PixPayment 
                  pixCode={pixData.pixCode}
                  qrCodeBase64={pixData.qrCodeBase64}
                  expiresIn={600} // 10 minutos
                  onPaymentConfirmed={() => {
                    // Armazenar dados para o redirecionamento automático no OrderConfirmation
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

            </div>
          )}
          
          {step === "payment" && !isSubmitting && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
              <p>Redirecionando para o pagamento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
