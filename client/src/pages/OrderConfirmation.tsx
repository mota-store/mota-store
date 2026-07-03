import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { CheckCircle, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function OrderConfirmation() {
  const [, navigate] = useLocation();
  const [orderData, setOrderData] = useState<any>(null);
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem("lastOrder");
    if (data) {
      const parsedData = JSON.parse(data);
      setOrderData(parsedData);

      // Redirecionamento automático após 3 segundos
      const timer = setTimeout(() => {
        const orderNumber = parsedData.id.toString().padStart(4, '0');
        const whatsappNumber = "5591984886473";
        const now = new Date().toLocaleString('pt-BR');
        
        const message = `Olá! Acabei de realizar o pedido #${orderNumber} na MOTA STORE.
Produto(s): ${parsedData.items.map((i: any) => i.name).join(", ")}
Total: R$ ${(parsedData.total / 100).toFixed(2)}
Horário: ${now}
Aguardo a ativação! 😊`;

        window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      navigate("/");
    }
  }, [navigate]);

  if (!orderData) return null;

  const orderNumber = orderData.id.toString().padStart(4, '0');
  const whatsappNumber = "5591984886473";
  const now = new Date().toLocaleString('pt-BR');
  
  const message = `Olá! Acabei de realizar o pedido #${orderNumber} na MOTA STORE.
Produto(s): ${orderData.items.map((i: any) => i.name).join(", ")}
Total: R$ ${(orderData.total / 100).toFixed(2)}
Horário: ${now}
Aguardo a ativação! 😊`;

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar para Home</span>
          </button>
          <span className="text-xl font-bold text-accent">MOTA STORE</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 container py-12 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center shadow-2xl border-accent/20">
          <div className="mb-8 flex justify-center">
            <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black mb-4">Pagamento Confirmado!</h1>
          
          {redirecting && (
            <div className="flex flex-col items-center gap-2 mb-8 text-accent">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="font-bold animate-pulse">Redirecionando para o WhatsApp do vendedor...</p>
            </div>
          )}

          <p className="text-muted-foreground text-lg mb-8">
            Seu pedido foi processado. Estamos te enviando para o suporte para ativar seu acesso.
          </p>

          <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left border border-border">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Número do Pedido</span>
              <span className="text-2xl font-black text-accent">#{orderNumber}</span>
            </div>
            
            <div className="space-y-3 mb-6">
              {orderData.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">R$ {(item.price / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="font-bold text-lg">Total Pago</span>
              <span className="text-2xl font-black text-accent">R$ {(orderData.total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-8 text-xl shadow-xl shadow-green-600/20"
              onClick={() => window.location.href = whatsappLink}
            >
              <MessageCircle className="h-6 w-6 mr-2" />
              Falar com Suporte agora
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full py-6 font-semibold"
              onClick={() => navigate("/")}
            >
              Voltar para a Loja
            </Button>
          </div>
        </Card>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 MOTA STORE. Ativação imediata via WhatsApp.</p>
      </footer>
    </div>
  );
}
