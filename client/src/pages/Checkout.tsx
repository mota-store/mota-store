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
      <div className="h-screen flex items-center justify-center overflow-hidden">
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
  // Preço original é R$ 10,00 por item (1000 centavos)
  const originalTotal = enrichedItems.length * 1000;
  // Preço promocional é R$ 5,00 por item (500 centavos)
  const total = enrichedItems.length * 500;
  const savings = originalTotal - total;

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
      <div className="h-screen flex items-center justify-center overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
          <Button variant="ghost" size="sm" onClick={() => step === "payment" ? navigate("/cart") : setStep("payment")} disabled={step === "pix"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-black tracking-tighter">CHECKOUT</h1>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex-1 overflow-y-auto lg:overflow-hidden">
            {step === "payment" && (
              <Card className="p-4 lg:p-6 bg-card/50 backdrop-blur-sm border-border/50 rounded-3xl h-full flex flex-col">
                <h2 className="text-lg lg:text-xl font-bold mb-3 flex items-center gap-2 flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  Confirmar Pedido
                </h2>
                <p className="text-xs lg:text-sm text-muted-foreground mb-3 flex-shrink-0">
                  Seu acesso será enviado para o WhatsApp após a confirmação do pagamento via PIX.
                </p>
                <div className="bg-muted/30 p-3 rounded-2xl mb-3 border border-border/50 flex-shrink-0">
                  <h3 className="font-bold mb-1 uppercase text-[9px] lg:text-[10px] tracking-widest text-muted-foreground">Resumo do Cliente</h3>
                  <div className="space-y-0.5">
                    <p className="text-[11px] lg:text-xs"><strong>NOME:</strong> {user?.name || "Não informado"}</p>
                    <p className="text-[11px] lg:text-xs"><strong>EMAIL:</strong> {user?.email || "Não informado"}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-3 lg:py-4 rounded-2xl font-bold text-sm"
                    onClick={() => navigate("/cart")}
                    disabled={isSubmitting}
                  >
                    Voltar ao Carrinho
                  </Button>
                  <Button 
                    onClick={handleConfirmOrder} 
                    className="flex-1 bg-accent hover:bg-accent/90 py-3 lg:py-4 text-sm lg:text-base font-black rounded-2xl shadow-lg shadow-accent/20"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    GERAR PIX AGORA
                  </Button>
                </div>
              </Card>
            )}

            {step === "pix" && pixData && orderId && (
              <div className="space-y-3 lg:space-y-6 overflow-y-auto h-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <PixPayment 
                    pixCode={pixData.pixCode}
                    qrCodeBase64={pixData.qrCodeBase64}
                    expiresIn={pixData.expiresIn}
                    onPaymentConfirmed={() => {
                      navigate(`/order-confirmation?id=${orderId}`);
                    }}
                  />
                </div>
                <div className="text-center flex-shrink-0">
                  <Button 
                    variant="link" 
                    className="text-xs lg:text-sm text-muted-foreground hover:text-accent"
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

          <div className="hidden lg:flex flex-col w-full lg:w-1/3">
            <Card className="p-4 lg:p-6 bg-card/30 backdrop-blur-sm border-border/50 rounded-[2rem] h-full flex flex-col overflow-hidden">
              <h2 className="text-base lg:text-lg font-black mb-3 lg:mb-4 uppercase tracking-tighter flex-shrink-0">Resumo do Pedido</h2>
              <div className="space-y-2 lg:space-y-3 mb-3 lg:mb-4 pb-3 lg:pb-4 border-b border-border/50 overflow-y-auto flex-1">
                {enrichedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start flex-shrink-0">
                    <div className="space-y-0.5 lg:space-y-1">
                      <p className="font-bold text-[11px] lg:text-xs leading-none">{item.product?.name}</p>
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground uppercase tracking-widest">Premium 30 Dias</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-accent text-xs lg:text-sm">R$ 5,00</p>
                      <p className="text-[8px] lg:text-[9px] text-muted-foreground line-through">R$ 10,00</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 lg:pt-4 border-t border-border/50 flex-shrink-0">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-muted-foreground">Total a Pagar</span>
                  <span className="text-2xl lg:text-3xl font-black text-accent tracking-tighter">R$ {(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
