import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingBag, ChevronRight, Calendar, CreditCard, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: orders, isLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();

  const cancelOrder = trpc.orders.cancel.useMutation({
    onSuccess: () => {
      toast.success("Pedido cancelado com sucesso");
      utils.orders.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("Erro ao cancelar pedido: " + err.message);
    }
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      <Header />

      <div className="container px-4 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">
              Histórico de <span className="text-accent">Compras</span>
            </h1>
            <p className="text-muted-foreground font-medium">Veja todos os seus pedidos realizados.</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="font-black uppercase tracking-widest text-xs hover:text-accent flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Minha Conta
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-card/50 rounded-2xl animate-pulse border border-border/40" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 bg-card/30 border border-border/40 rounded-[2.5rem] border-dashed">
            <div className="p-6 rounded-full bg-accent/5 mb-6">
              <ShoppingBag className="h-16 w-16 text-accent/20" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Nenhuma Compra Ainda</h2>
            <p className="text-muted-foreground mb-10 text-center max-w-sm">Você ainda não realizou nenhuma compra. Explore nossos produtos e aproveite as ofertas!</p>
            <Button 
              onClick={() => navigate("/")} 
              className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black px-12 py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-105"
            >
              VER PRODUTOS
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card 
                  className="p-6 bg-card/40 border-border/40 backdrop-blur-md rounded-2xl hover:border-accent/30 transition-all cursor-pointer group"
                  onClick={() => navigate(`/order/${order.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-accent/5 flex items-center justify-center border border-border/50 group-hover:scale-105 transition-transform">
                        <ShoppingBag className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-tight">Pedido #{order.id}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> R$ {((order.totalAmount ?? 0) / 100).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>
                    </div>
                    
	                    <div className="flex items-center justify-between sm:justify-end gap-4">
	                      {order.status === 'pending' && (
	                        <Button
	                          variant="ghost"
	                          size="sm"
	                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 font-black text-[10px] uppercase tracking-widest gap-1"
	                          onClick={(e) => {
	                            e.stopPropagation();
	                            if (window.confirm("Deseja realmente cancelar este pedido?")) {
	                              cancelOrder.mutate({ orderId: order.id });
	                            }
	                          }}
	                          disabled={cancelOrder.isPending}
	                        >
	                          <XCircle className="h-3 w-3" />
	                          Cancelar Pagamento
	                        </Button>
	                      )}
	                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
	                        order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
	                        order.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
	                      }`}>
	                        {order.status === 'completed' ? 'Concluído' : order.status === 'pending' ? 'Pendente' : 'Cancelado'}
	                      </span>
                      <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest gap-1 group-hover:text-accent">
                        Ver Detalhes
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
