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
  const [isUpdating, setIsUpdating] = useState(false);

  const checkPending = () => {
    const totalPending = Object.values(pendingUpdates.current).reduce((a, b) => a + b, 0);
    setIsUpdating(totalPending > 0);
  };

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
      checkPending();
      await utils.cart.getItems.invalidate();
    },
    onError: (_err, variables) => {
      const productId = cartItems?.find(i => i.id === variables)?.productId;
      if (productId) {
        pendingUpdates.current[productId] = Math.max(0, (pendingUpdates.current[productId] || 0) - 1);
      }
      checkPending();
      toast.error("Erro ao remover item");
    }
  });

  const addItemMutation = trpc.cart.addItem.useMutation({
    onSuccess: async (_, variables) => {
      pendingUpdates.current[variables.productId] = Math.max(0, (pendingUpdates.current[variables.productId] || 0) - 1);
      checkPending();
      await utils.cart.getItems.invalidate();
    },
    onError: (_error, variables) => {
      pendingUpdates.current[variables.productId] = Math.max(0, (pendingUpdates.current[variables.productId] || 0) - 1);
      checkPending();
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
    checkPending();
    addItemMutation.mutate({ productId, quantity: Number(delta) });
  };

  const handleRemoveAll = (item: any) => {
    setLocalQuantities(prev => {
      const next = { ...prev };
      delete next[item.productId];
      return next;
    });
    pendingUpdates.current[item.productId] = (pendingUpdates.current[item.productId] || 0) + item.ids.length;
    checkPending();
    item.ids.forEach((id: number) => removeItem.mutate(id));
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      <Header />

      <div className="container px-4 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-12 gap-4 md:gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-5xl font-black tracking-tighter uppercase mb-1 md:mb-2">
              Carrinho de <span className="text-accent">Compras</span>
            </h1>
            <p className="text-xs md:text-base text-muted-foreground font-medium">Você tem {groupedItems.length} itens selecionados.</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="font-black uppercase tracking-widest text-[10px] md:text-xs hover:text-accent flex items-center gap-2 h-8 md:h-10"
          >
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
            Continuar na Loja
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
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Seu Carrinho Está Vazio</h2>
            <p className="text-muted-foreground mb-10 text-center max-w-sm">Explore nossos produtos e adicione os que você deseja ao carrinho.</p>
            <Button 
              onClick={() => navigate("/")} 
              className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black px-12 py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-105"
            >
              VER PRODUTOS
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Itens do Carrinho */}
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              {groupedItems.map((item) => (
                <Card key={item.productId} className="p-4 md:p-6 bg-card/40 border-border/40 backdrop-blur-md rounded-2xl md:rounded-[2rem] hover:border-accent/30 transition-all overflow-hidden group">
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Imagem do Produto */}
                    <div className="h-16 w-16 md:h-24 md:w-24 rounded-xl md:rounded-2xl bg-accent/5 flex items-center justify-center border border-border/50 group-hover:scale-105 transition-transform shrink-0">
                      {item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 md:w-14 md:h-14 object-contain drop-shadow-xl" />
                      ) : (
                        <ShoppingCart className="h-6 w-6 md:h-10 md:w-10 text-accent/20" />
                      )}
                    </div>
                    
                    {/* Detalhes do Produto */}
                    <div className="flex-grow min-w-0">
                      <h3 className="text-sm md:text-lg font-black uppercase tracking-tight mb-0.5 md:mb-1 truncate">{item.product?.name}</h3>
                      <p className="text-accent font-black text-base md:text-xl tracking-tighter">
                        R$ {(item.product?.price / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex flex-col items-center gap-2 md:gap-3 shrink-0">
                      <div className="flex items-center bg-background/50 rounded-lg md:rounded-2xl p-0.5 md:p-1 border border-border/50">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="h-7 w-7 md:h-10 md:w-10 rounded-md md:rounded-xl hover:bg-accent hover:text-white dark:hover:text-black flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                        <span className="text-xs md:text-sm font-black w-6 md:w-10 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          disabled={item.quantity >= 5}
                          className="h-7 w-7 md:h-10 md:w-10 rounded-md md:rounded-xl hover:bg-accent hover:text-white dark:hover:text-black flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveAll(item)}
                        className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-destructive/60 hover:text-destructive transition-colors"
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
              <Card className="p-6 md:p-8 bg-card/40 border-border/40 backdrop-blur-md rounded-3xl md:rounded-[2.5rem] shadow-2xl sticky top-28">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-4 md:mb-8 flex items-center gap-3">
                  <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-accent rounded-full animate-pulse" />
                  Resumo do Pedido
                </h2>

                <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Subtotal</span>
                    <span className="text-sm md:font-bold">R$ {(subtotal / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">Frete</span>
                    <span className="text-green-500 font-bold uppercase text-[9px] md:text-[10px]">Grátis</span>
                  </div>
                  <div className="pt-3 md:pt-4 border-t border-border/40 flex justify-between items-end">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-2xl md:text-4xl font-black text-accent tracking-tighter">
                      R$ {(total / 100).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-6 md:py-8 rounded-xl md:rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-base md:text-lg uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => navigate("/checkout?direct=true")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "ATUALIZANDO..." : "PAGAR AGORA"}
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
