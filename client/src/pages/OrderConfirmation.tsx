import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { CheckCircle2, MessageCircle, ArrowLeft, Zap, Info, ExternalLink, Mail, Wallet, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { motion } from "framer-motion";

export default function OrderConfirmation() {
  const [, navigate] = useLocation();
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const data = sessionStorage.getItem("lastOrder");
    if (data) {
      setOrderData(JSON.parse(data));
    } else {
      navigate("/");
    }
  }, [navigate]);

  if (!orderData) return null;

  const whatsappNumber = "5591984886473";
  const now = new Date().toLocaleString('pt-BR');
  
  const groupedItems: Record<string, any> = {};
  orderData.items.forEach((item: any) => {
    if (!groupedItems[item.name]) {
      groupedItems[item.name] = { ...item, quantity: 1 };
    } else {
      groupedItems[item.name].quantity += 1;
    }
  });

  const displayItems = Object.values(groupedItems);
  const productList = displayItems
    .map((item: any) => item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name)
    .join(", ");

  const message = `Olá! Acabei de realizar o pedido #${orderData.id} na MOTA STORE.
Produto(s): ${productList}
Total: R$ ${((orderData.total ?? 0) / 100).toFixed(2).replace(".", ",")}
Horário: ${now}
Aguardo a ativação! 😊`;

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      <Header />

      <main className="container px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status Header */}
          <div className="text-center space-y-4 mb-10">
            <div className="flex justify-center items-center gap-4 mb-2">
              <div className="h-px flex-1 bg-green-500/20" />
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="h-px flex-1 bg-green-500/20" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
              Pagamento <span className="text-green-500">Aprovado</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">{now}</p>
          </div>

          {/* Main Info Card */}
          <Card className="bg-card/40 border-border/40 backdrop-blur-md rounded-[2rem] overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Valor Total</span>
                  <span className="text-2xl font-black text-green-500 tracking-tighter">
                    R$ {((orderData.total ?? 0) / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Método de Pagamento</span>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-accent/20 rounded flex items-center justify-center">
                      {orderData.paymentMethod === "balance" ? (
                        <Wallet className="h-3 w-3 text-accent" />
                      ) : (
                        <QrCode className="h-3 w-3 text-accent" />
                      )}
                    </div>
                    <span className="font-bold text-sm">
                      {orderData.paymentMethod === "balance" ? "Saldo da Carteira" : "PIX"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/40">
                <span className="text-[10px] font-mono text-muted-foreground break-all opacity-50 uppercase">
                  ID DO PEDIDO: #{orderData.id}
                </span>
              </div>
            </div>
          </Card>

          {/* Product with Image Preview */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-2">Itens do Pedido</span>
            {displayItems.map((item: any, idx: number) => (
              <Card key={idx} className="bg-card/30 border-border/30 rounded-2xl p-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-background flex items-center justify-center border border-border/50">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <Zap className="h-6 w-6 text-accent/30" />
                  )}
                </div>
                <div className="flex-grow">
                  <h4 className="font-black text-base uppercase tracking-tight">{item.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-muted-foreground">{item.quantity} unidade{item.quantity > 1 ? 's' : ''}</span>
                    <span className="text-sm font-black text-accent">R$ {((item.price * item.quantity) / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Important Notice */}
          <div className="relative overflow-hidden rounded-2xl bg-accent/5 border border-accent/20 p-6">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
            <div className="flex gap-4">
              <MessageCircle className="h-5 w-5 text-accent shrink-0" />
              <div className="space-y-2">
                <h4 className="font-black text-sm uppercase tracking-tight text-accent">O que fazer agora?</h4>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                  Para receber seu acesso, clique no botão abaixo e envie a mensagem para o nosso suporte no WhatsApp. 
                  Lá faremos o envio imediato do seu produto.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              size="lg" 
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-7 rounded-2xl shadow-xl shadow-green-500/20 transition-all hover:scale-[1.02] flex items-center gap-2"
              onClick={() => window.location.href = whatsappLink}
            >
              <MessageCircle className="h-5 w-5" />
              ENVIAR PEDIDO PARA O WHATSAPP
            </Button>
            <Button 
              variant="ghost" 
              className="w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-3 w-3" />
              VOLTAR PARA A LOJA
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
