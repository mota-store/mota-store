import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, ShoppingCart, Plus, Minus, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  
  const { data: cartItems, isLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});
  const pendingUpdates = useRef<Record<number, number>>({});

  useEffect(() => {
    if (cartItems) {
      setLocalQuantities(prev => {
        const serverTotals: Record<number, number> = {};
        cartItems.forEach(item => {
          serverTotals[item.productId] = (serverTotals[item.productId] || 0) + item.quantity;
        });

        const quantities: Record<number, number> = {};
        Object.entries(serverTotals).forEach(([id, serverQty]) => {
          const productId = Number(id);
          if ((pendingUpdates.current[productId] ?? 0) > 0) {
            quantities[productId] = prev[productId] !== undefined ? prev[productId] : serverQty;
          } else {
            quantities[productId] = serverQty;
          }
        });

        Object.entries(prev).forEach(([id, localQty]) => {
          const productId = Number(id);
          if ((pendingUpdates.current[productId] ?? 0) > 0 && quantities[productId] === undefined) {
            quantities[productId] = localQty;
          }
        });

        return quantities;
      });
    }
  }, [cartItems]);

  const removeItem = trpc.cart.removeItem.useMutation({
    onSuccess: async (_, variables) => {
      const productId = cartItems?.find(i => i.id === variables)?.productId;
      if (productId) {
        pendingUpdates.current[productId] = Math.max(0, (pendingUpdates.current[productId] || 0) - 1);
      }
      await utils.cart.getItems.invalidate();
    },
    onError: (_err, variables) => {
      const productId = cartItems?.find(i => i.id === variables)?.productId;
      if (productId) {
        pendingUpdates.current[productId] = Math.max(0, (pendingUpdates.current[productId] || 0) - 1);
      }
      toast.error("Erro ao remover item");
    }
  });

  const addItemMutation = trpc.cart.addItem.useMutation({
    onSuccess: async (_, variables) => {
      pendingUpdates.current[variables.productId] = Math.max(0, (pendingUpdates.current[variables.productId] || 0) - 1);
      await utils.cart.getItems.invalidate();
    },
    onError: (_error, variables) => {
      pendingUpdates.current[variables.productId] = Math.max(0, (pendingUpdates.current[variables.productId] || 0) - 1);
      toast.error("Erro ao atualizar quantidade");
    }
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const groupedItems: any[] = [];
  Object.entries(localQuantities).forEach(([id, quantity]) => {
    const productId = Number(id);
    if (quantity <= 0) return;
    const product = products?.find(p => p.id === productId);
    if (!product) return;
    const itemsForProduct = cartItems?.filter(item => item.productId === productId) || [];
    groupedItems.push({ productId, product, quantity, ids: itemsForProduct.map(item => item.id) });
  });

  const subtotal = groupedItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const total = subtotal;

  const handleUpdateQuantity = (productId: number, delta: number) => {
    const currentQty = localQuantities[productId] ?? 0;
    const newQty = currentQty + delta;
    if (delta > 0 && currentQty >= 5) {
      toast.error("Limite máximo de 5 unidades atingido.");
      return;
    }
    if (newQty <= 0) {
      const item = groupedItems.find(i => i.productId === productId);
      if (item && item.ids.length > 0) {
        setLocalQuantities(prev => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        pendingUpdates.current[productId] = (pendingUpdates.current[productId] || 0) + 1;
        removeItem.mutate(item.ids[0]);
      }
      return;
    }
    setLocalQuantities(prev => ({ ...prev, [productId]: newQty }));
    pendingUpdates.current[productId] = (pendingUpdates.current[productId] || 0) + 1;
    addItemMutation.mutate({ productId, quantity: delta });
  };

  const handleRemoveAll = (item: any) => {
    setLocalQuantities(prev => {
      const next = { ...prev };
      delete next[item.productId];
      return next;
    });
    pendingUpdates.current[item.productId] = (pendingUpdates.current[item.productId] || 0) + item.ids.length;
    item.ids.forEach((id: number) => removeItem.mutate(id));
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      <Header />

      <div className="container px-4 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">
              Seu <span className="text-accent">Carrinho</span>
            </h1>
            <p className="text-muted-foreground font-medium">Você tem {groupedItems.length} itens selecionados.</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="font-black uppercase tracking-widest text-xs hover:text-accent flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Continuar Comprando
          </Button>
        </div>

        {isLoading && groupedItems.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-card/50 rounded-3xl animate-pulse" />)}
            </div>
            <div className="h-64 bg-card/50 rounded-3xl animate-pulse" />
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 bg-card/30 border border-border/40 rounded-[2.5rem] border-dashed">
            <div className="p-6 rounded-full bg-accent/5 mb-6">
              <ShoppingCart className="h-16 w-16 text-accent/20" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Carrinho Vazio</h2>
            <p className="text-muted-foreground mb-10 text-center max-w-sm">Parece que você ainda não adicionou nenhum produto ao seu carrinho.</p>
            <Button 
              onClick={() => navigate("/")} 
              className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black px-12 py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-105"
            >
              EXPLORAR PRODUTOS
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Itens do Carrinho */}
            <div className="lg:col-span-2 space-y-4">
              {groupedItems.map((item) => (
                <Card key={item.productId} className="p-6 bg-card/40 border-border/40 backdrop-blur-md rounded-[2rem] hover:border-accent/30 transition-all overflow-hidden group">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Imagem do Produto */}
                    <div className="h-24 w-24 rounded-2xl bg-accent/5 flex items-center justify-center border border-border/50 group-hover:scale-105 transition-transform">
                      {item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-14 h-14 object-contain drop-shadow-xl" />
                      ) : (
                        <ShoppingCart className="h-10 w-10 text-accent/20" />
                      )}
                    </div>
                    
                    {/* Detalhes do Produto */}
                    <div className="flex-grow text-center sm:text-left">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-1">{item.product?.name}</h3>
                      <p className="text-accent font-black text-xl tracking-tighter">
                        R$ {(item.product?.price / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center bg-background/50 rounded-2xl p-1 border border-border/50">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="h-10 w-10 rounded-xl hover:bg-accent hover:text-white dark:hover:text-black flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-black w-10 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          disabled={item.quantity >= 5}
                          className="h-10 w-10 rounded-xl hover:bg-accent hover:text-white dark:hover:text-black flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveAll(item)}
                        className="text-[10px] font-black uppercase tracking-widest text-destructive/60 hover:text-destructive transition-colors"
                      >
                        Remover Item
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Resumo da Compra */}
            <div className="lg:col-span-1">
              <Card className="p-8 bg-card/40 border-border/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl sticky top-28">
                <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="h-2 w-2 bg-accent rounded-full animate-pulse" />
                  Resumo do Pedido
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subtotal</span>
                    <span className="font-bold">R$ {(subtotal / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Taxa de Serviço</span>
                    <span className="text-green-500 font-bold uppercase text-[10px]">Grátis</span>
                  </div>
                  <div className="pt-4 border-t border-border/40 flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-4xl font-black text-accent tracking-tighter">
                      R$ {(total / 100).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-8 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg uppercase tracking-tighter"
                    onClick={() => navigate("/checkout?direct=true")}
                  >
                    FINALIZAR COMPRA
                  </Button>
                  
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background/50 border border-border/50">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pagamento 100% Seguro</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background/50 border border-border/50">
                      <Zap className="h-5 w-5 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entrega Imediata</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
