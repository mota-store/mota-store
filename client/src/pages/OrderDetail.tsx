import React from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Package, Calendar, CreditCard, User, Headphones, ExternalLink, Info, Zap } from "lucide-react";
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

  const whatsappNumber = "5511999999999"; // Exemplo
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Olá, preciso de suporte com o pedido #${order.id}`;

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
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-500/10 border-4 border-green-500/20 mb-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              Compra <span className="text-green-500">Realizada</span>
            </h1>
            <p className="text-muted-foreground font-medium">Seu acesso já está disponível abaixo.</p>
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
                  <User className="h-3 w-3" /> Forma de Pagamento
                </span>
                <p className="font-black text-lg uppercase text-xs">Saldo / PIX</p>
              </div>
            </div>
          </Card>

          {/* Support Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-2">Problemas com o pedido?</span>
            <Card className="bg-card/30 border-border/30 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border/50">
                  <Headphones className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase">Suporte Mota Store</h4>
                  <button 
                    onClick={() => window.open(whatsappLink, '_blank')}
                    className="text-accent text-[11px] font-black uppercase tracking-widest hover:underline"
                  >
                    Enviar mensagem
                  </button>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-30" />
            </Card>
          </div>

          {/* Important Notice */}
          <div className="relative overflow-hidden rounded-2xl bg-amber-500/5 border border-amber-500/20 p-6">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <div className="flex gap-4">
              <Info className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="space-y-2">
                <h4 className="font-black text-sm uppercase tracking-tight text-amber-500">Importante</h4>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                  Seu acesso foi enviado para o seu e-mail cadastrado e também está disponível no seu perfil. 
                  Lembre-se de verificar a caixa de <strong>SPAM</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              size="lg" 
              className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-[1.02]"
              onClick={() => navigate("/profile")}
            >
              IR PARA MEU PERFIL
            </Button>
            <Button 
              variant="ghost" 
              className="w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
              onClick={() => navigate("/orders")}
            >
              <ArrowLeft className="h-3 w-3" />
              VER TODOS OS PEDIDOS
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
