import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cartItems } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  const createOrder = trpc.orders.create.useMutation();

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Você precisa estar logado para fazer checkout</p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  const enrichedItems = cartItems?.map(item => {
    const product = products?.find(p => p.id === item.productId);
    return { ...item, product };
  }) || [];

  const subtotal = enrichedItems.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const total = subtotal;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await createOrder.mutateAsync({ totalAmount: total });
      
      // Store order info for confirmation page
      const orderInfo = {
        id: result.id,
        total: total,
        items: enrichedItems.map(item => ({
          name: item.product?.name,
          price: item.product?.price
        }))
      };
      sessionStorage.setItem("lastOrder", JSON.stringify(orderInfo));
      
      navigate("/order-confirmation");
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      alert("Erro ao processar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => step === "shipping" ? navigate("/cart") : setStep("shipping")}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          <span className="text-xl font-bold text-accent">MOTA STORE</span>
          <div className="w-20" />
        </div>
      </header>

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex gap-4 mb-8">
              {["shipping", "payment"].map((s, idx) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      step === s || (step === "payment" && s === "shipping")
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium">
                    {s === "shipping" ? "Dados de Contato" : "Confirmação"}
                  </span>
                  {idx < 1 && <div className="w-4 h-0.5 bg-muted mx-2" />}
                </div>
              ))}
            </div>

            {step === "shipping" && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Dados para Ativação</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email de Acesso</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">WhatsApp (para receber o acesso)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(91) 98488-6473"
                      required
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 py-6 text-lg font-bold">
                      Continuar
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {step === "payment" && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Confirmar Pedido</h2>
                <p className="text-muted-foreground mb-8">
                  Ao clicar em confirmar, seu pedido será registrado e você será redirecionado para o WhatsApp para finalizar o pagamento e receber seu acesso.
                </p>
                
                <div className="bg-muted/50 p-6 rounded-xl mb-8 border border-border">
                  <h3 className="font-bold mb-4">Resumo da Entrega</h3>
                  <p className="text-sm"><strong>Nome:</strong> {formData.fullName}</p>
                  <p className="text-sm"><strong>Email:</strong> {formData.email}</p>
                  <p className="text-sm"><strong>WhatsApp:</strong> {formData.phone}</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-6"
                    onClick={() => setStep("shipping")}
                    disabled={isSubmitting}
                  >
                    Corrigir Dados
                  </Button>
                  <Button 
                    onClick={handleConfirmOrder} 
                    className="flex-1 bg-accent hover:bg-accent/90 py-6 text-lg font-bold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Finalizar e Ir para WhatsApp
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <h2 className="text-lg font-semibold mb-6">Resumo do Pedido</h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                {enrichedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.product?.name}</span>
                    <span className="font-medium">R$ {((item.product?.price || 0) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Ativação</span>
                  <span className="text-green-600 font-semibold">Grátis</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span className="text-accent">R$ {(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
