import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft, Loader2, CheckCircle2, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { PixPayment } from "@/components/PixPayment";
import { toast } from "sonner";

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Você precisa estar logado para fazer checkout</p>
          <Button onClick={() => navigate("/login")}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  const enrichedItems = cartItems?.map(item => ({
    ...item,
    product: products?.find(p => p.id === item.productId)
  })) || [];

  const subtotal = enrichedItems.reduce((acc, item) => acc + (item.product?.price || 0), 0);
  const originalTotal = subtotal * 1.5;
  const savings = originalTotal - subtotal;
  const total = subtotal;

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      const order = await createOrder.mutateAsync({ totalAmount: total });
      setOrderId(order.id);
      
      const pix = await createPix.mutateAsync({ orderId: order.id, amount: total / 100 });
      setPixData(pix);
      setStep("pix");
      toast.success("Pedido registrado! Aguardando pagamento PIX.");
    } catch (err) {
      toast.error("Erro ao processar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (enrichedItems.length === 0 && step !== "pix") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h2>
        <Button onClick={() => navigate("/")}>Voltar para a Loja</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <Button variant="ghost" onClick={() => step === "payment" ? navigate("/cart") : setStep("payment")} disabled={step === "pix"}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-black tracking-tighter">CHECKOUT</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {step === "payment" && (
              <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50 rounded-3xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-accent" />
                  Confirmar Pedido
                </h2>
                <p className="text-muted-foreground mb-8">
                  Seu acesso será enviado para o WhatsApp após a confirmação do pagamento via PIX.
                </p>
                <div className="bg-muted/30 p-6 rounded-2xl mb-8 border border-border/50">
                  <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-muted-foreground">Resumo do Cliente</h3>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>NOME:</strong> {user?.name || "Não informado"}</p>
                    <p className="text-sm"><strong>EMAIL:</strong> {user?.email || "Não informado"}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-7 rounded-2xl font-bold"
                    onClick={() => navigate("/cart")}
                    disabled={isSubmitting}
                  >
                    Voltar ao Carrinho
                  </Button>
                  <Button 
                    onClick={handleConfirmOrder} 
                    className="flex-1 bg-accent hover:bg-accent/90 py-7 text-lg font-black rounded-2xl shadow-lg shadow-accent/20"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    GERAR PIX AGORA
                  </Button>
                </div>
              </Card>
            )}

            {step === "pix" && pixData && orderId && (
              <div className="space-y-8">
                <PixPayment 
                  pixCode={pixData.pixCode}
                  qrCodeBase64={pixData.qrCodeBase64}
                  expiresIn={pixData.expiresIn}
                  onPaymentConfirmed={() => {
                    navigate(`/order-confirmation?id=${orderId}`);
                  }}
                />
                <div className="text-center">
                  <Button 
                    variant="link" 
                    className="text-muted-foreground hover:text-accent"
                    onClick={() => {
                      const productNames = enrichedItems
                        .map(item => item.product?.name)
                        .filter(Boolean)
                        .join(", ");
                      const message = `Olá! Acabei de pagar o pedido #${orderId} na Mota Store. Comprei: ${productNames}. Total: R$ ${(total / 100).toFixed(2)}. Aguardo a ativação!`;
                      window.location.href = `https://wa.me/5591984886473?text=${encodeURIComponent(message)}`;
                    }}
                  >
                    Já paguei? Falar com Suporte no WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-8 sticky top-20 bg-card/30 backdrop-blur-sm border-border/50 rounded-[2rem]">
              <h2 className="text-xl font-black mb-8 uppercase tracking-tighter">Resumo do Pedido</h2>
              <div className="space-y-4 mb-8 pb-8 border-b border-border/50">
                {enrichedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-bold text-sm leading-none">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Premium 30 Dias</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-accent">R$ {((item.product?.price || 0) / 100).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground line-through">R$ {(((item.product?.price || 0) * 1.5) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Economia Total</span>
                  <span className="text-green-500 font-bold">-R$ {(savings / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Ativação</span>
                  <span className="text-green-500 font-bold uppercase text-[10px]">Grátis</span>
                </div>
              </div>
              <div className="pt-6 border-t border-border/50">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Total a Pagar</span>
                  <span className="text-4xl font-black text-accent tracking-tighter">R$ {(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
