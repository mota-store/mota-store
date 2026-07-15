import React from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Package, Calendar, CreditCard, User, Headphones, ExternalLink, Info, Zap, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const { data: allOrders, isLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const order = allOrders?.find(o => o.id === Number(id));

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-24">
        <Header />
        <div className="container px-4 max-w-2xl mx-auto space-y-4">
          <div className="h-40 bg-card/50 rounded-[2rem] animate-pulse" />
          <div className="h-64 bg-card/50 rounded-[2rem] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-24">
        <Header />
        <div className="container px-4 max-w-2xl mx-auto text-center py-20">
          <h1 className="text-2xl font-black uppercase mb-4">Pedido não encontrado</h1>
          <Button onClick={() => navigate("/orders")} className="bg-accent hover:bg-accent/90 rounded-xl">
            Voltar para Pedidos
          </Button>
        </div>
      </div>
    );
  }

  const whatsappNumber = "5591984886473";
  const now = new Date(order.createdAt).toLocaleString('pt-BR');
  
  const productList = order.items?.map((item: any) => 
    item.quantity > 1 ? `${item.product?.name} x${item.quantity}` : item.product?.name
  ).join(", ");

  const message = `Olá! Gostaria de falar sobre meu pedido #${order.id} na MOTA STORE.
Status: ${order.status === 'completed' ? 'Aprovado' : 'Pendente'}
Total: R$ ${((order.totalAmount ?? 0) / 100).toFixed(2).replace(".", ",")}
Aguardo retorno! 😊`;

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      <Header />

      <main className="container px-4 max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header Status */}
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full border-4 mb-2 ${
              order.status === 'completed' ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              {order.status === 'completed' ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : (
                <Zap className="h-10 w-10 text-amber-500" />
              )}
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              {order.status === 'completed' ? (
                <>Compra <span className="text-green-500">Realizada</span></>
              ) : (
                <>Pedido <span className="text-amber-500">Pendente</span></>
              )}
            </h1>
            <p className="text-muted-foreground font-medium">
              {order.status === 'completed' ? 'Seu pagamento foi confirmado com sucesso.' : 'Aguardando confirmação do pagamento.'}
            </p>
          </div>

          {/* Order Info Card */}
          <Card className="p-8 bg-card/40 border-border/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" /> Número do Pedido
                </span>
                <p className="font-black text-lg">#{order.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data
                </span>
                <p className="font-black text-lg">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Valor Total
                </span>
                <p className="font-black text-lg text-accent">R$ {((order.totalAmount ?? 0) / 100).toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Status
                </span>
                <p className={`font-black text-sm uppercase ${order.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                  {order.status === 'completed' ? 'Aprovado' : 'Pendente'}
                </p>
              </div>
            </div>
          </Card>

          {/* Items Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-2">Itens do Pedido</span>
            {order.items?.map((item: any, idx: number) => (
              <Card key={idx} className="bg-card/30 border-border/30 rounded-2xl p-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-background flex items-center justify-center border border-border/50">
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <Zap className="h-6 w-6 text-accent/30" />
                  )}
                </div>
                <div className="flex-grow">
                  <h4 className="font-black text-base uppercase tracking-tight">{item.product?.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-muted-foreground">{item.quantity} unidade{item.quantity > 1 ? 's' : ''}</span>
                    <span className="text-sm font-black text-accent">R$ {((item.priceAtPurchase * item.quantity) / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Support Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-2">Precisa de ajuda?</span>
            <Card className="bg-card/30 border-border/30 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border/50">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase">Falar no WhatsApp</h4>
                  <button 
                    onClick={() => window.open(whatsappLink, '_blank')}
                    className="text-accent text-[11px] font-black uppercase tracking-widest hover:underline"
                  >
                    Enviar mensagem agora
                  </button>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-30" />
            </Card>
          </div>

          {/* Important Notice */}
          <div className="relative overflow-hidden rounded-2xl bg-accent/5 border border-accent/20 p-6">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
            <div className="flex gap-4">
              <Info className="h-5 w-5 text-accent shrink-0" />
              <div className="space-y-2">
                <h4 className="font-black text-sm uppercase tracking-tight text-accent">Informação</h4>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                  O envio do seu acesso é realizado manualmente pela nossa equipe após a confirmação do pagamento. 
                  Clique no botão do WhatsApp acima para agilizar o seu atendimento.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              variant="ghost" 
              className="w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
              onClick={() => navigate("/orders")}
            >
              <ArrowLeft className="h-3 w-3" />
              VOLTAR PARA MEUS PEDIDOS
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
