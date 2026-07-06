import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, ShoppingCart, Plus, Minus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  
  const { data: cartItems, isLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  
  // Estado local para atualização otimista
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});
  
  // Contador de atualizações pendentes para evitar race condition
  const pendingUpdates = useRef<Record<number, number>>({});

  // Sincronizar estado local quando os dados do servidor mudarem
  useEffect(() => {
    if (cartItems) {
      const quantities: Record<number, number> = {};
      cartItems.forEach(item => {
        // Só sobrescreve se não houver atualizações pendentes para este produto
        if (!pendingUpdates.current[item.productId]) {
          quantities[item.productId] = (quantities[item.productId] || 0) + item.quantity;
        } else {
          // Mantém o valor local atual se houver pendências
          quantities[item.productId] = localQuantities[item.productId];
        }
      });
      
      // Também mantém itens que podem ter sido adicionados localmente mas ainda não voltaram do servidor
      Object.keys(localQuantities).forEach(id => {
        const productId = Number(id);
        if (pendingUpdates.current[productId] && !quantities[productId]) {
          quantities[productId] = localQuantities[productId];
        }
      });

      setLocalQuantities(quantities);
    }
  }, [cartItems]);

  const removeItem = trpc.cart.removeItem.useMutation({
    onSuccess: () => {
      utils.cart.getItems.invalidate();
    },
    onError: () => {
      toast.error("Erro ao remover item");
      utils.cart.getItems.invalidate();
    }
  });

  const addItemMutation = trpc.cart.addItem.useMutation({
    onSuccess: (_, variables) => {
      pendingUpdates.current[variables.productId] = Math.max(0, (pendingUpdates.current[variables.productId] || 0) - 1);
      utils.cart.getItems.invalidate();
    },
    onError: (error, variables) => {
      pendingUpdates.current[variables.productId] = Math.max(0, (pendingUpdates.current[variables.productId] || 0) - 1);
      toast.error("Erro ao atualizar quantidade");
      utils.cart.getItems.invalidate();
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      utils.cart.getItems.invalidate();
    }
  }, [isAuthenticated, utils.cart.getItems]);

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  // Agrupar itens por productId para exibição, usando as quantidades locais se disponíveis
  const groupedItemsMap = new Map<number, any>();
  
  // Usamos os produtos e os cartItems para construir a lista, mas a quantidade vem do localQuantities
  const productIds = Array.from(new Set([
    ...(cartItems?.map(item => item.productId) || []),
    ...Object.keys(localQuantities).map(Number)
  ]));
  
  productIds.forEach(productId => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const itemsForProduct = cartItems?.filter(item => item.productId === productId) || [];
    const quantity = localQuantities[productId] ?? itemsForProduct.reduce((sum, item) => sum + item.quantity, 0);

    if (quantity > 0) {
      groupedItemsMap.set(productId, {
        productId,
        product,
        quantity,
        ids: itemsForProduct.map(item => item.id)
      });
    }
  });

  const groupedItems = Array.from(groupedItemsMap.values());
  // Subtotal agora aplica o desconto de 50% promocional
  const subtotal = groupedItems.reduce((sum, item) => sum + Math.floor((item.product?.price || 0) * 0.5) * (item.quantity || 1), 0);
  const originalTotal = groupedItems.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const total = subtotal;

  const handleUpdateQuantity = (productId: number, delta: number) => {
    const currentQty = localQuantities[productId] || 0;

    // Bloquear incremento se já atingiu o limite de 5
    if (delta > 0 && currentQty >= 5) {
      toast.error("Limite máximo de 5 unidades por produto atingido.");
      return;
    }

    pendingUpdates.current[productId] = (pendingUpdates.current[productId] || 0) + 1;

    setLocalQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        const item = groupedItems.find(i => i.productId === productId);
        if (item && item.ids.length > 0) {
          removeItem.mutate(item.ids[0]);
        }
        const next = { ...prev };
        delete next[productId];
        // Reset pending updates for removed item
        pendingUpdates.current[productId] = 0;
        return next;
      }

      // Chamar API em segundo plano
      addItemMutation.mutate({ productId, quantity: delta });

      return {
        ...prev,
        [productId]: newQty
      };
    });
  };

  const handleRemoveAll = (item: any) => {
    // Otimista: remove do estado local
    setLocalQuantities(prev => {
      const next = { ...prev };
      delete next[item.productId];
      return next;
    });
    
    pendingUpdates.current[item.productId] = 0;

    item.ids.forEach((id: number) => {
      removeItem.mutate(id);
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          <span className="text-xl font-black text-accent">MOTA STORE</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-3 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase">MEU <span className="text-accent">CARRINHO</span></h1>
          <span className="text-xs font-black bg-accent/10 text-accent px-4 py-1.5 rounded-full uppercase tracking-widest">
            {groupedItems.reduce((sum, item) => sum + item.quantity, 0)} {groupedItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'PRODUTO' : 'PRODUTOS'}
          </span>
        </div>

        {isLoading && groupedItems.length === 0 ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : groupedItems.length === 0 ? (
          <Card className="p-16 text-center bg-card/30 backdrop-blur-sm border-border/50 rounded-[2.5rem] border-dashed">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground mb-8 text-lg font-medium">Seu carrinho está vazio</p>
            <Button 
              onClick={() => navigate("/")} 
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-black px-10 py-6 rounded-2xl shadow-xl shadow-accent/20"
            >
              CONTINUAR COMPRANDO
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-2">
              {groupedItems.map((item) => (
                <Card key={item.productId} className="p-3 bg-card/40 backdrop-blur-md border-border/40 rounded-[2rem] hover:border-accent/30 transition-all group relative overflow-hidden">
                  <div className="flex flex-col items-center text-center space-y-2">
                    {/* Imagem Centralizada e Menor */}
                    <div className={`h-20 w-20 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg ${
                      item.product?.name.includes("Spotify") ? "from-green-500/20 to-green-900/40 border border-green-500/30" :
                      item.product?.name.includes("YouTube Music") ? "from-red-800/20 to-black/40 border border-red-500/30" :
                      item.product?.name.includes("YouTube") ? "from-red-600/20 to-red-900/40 border border-red-500/30" :
                      "from-blue-800/20 to-blue-950/40 border border-blue-500/30"
                    }`}>
                      {item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 object-contain drop-shadow-2xl" />
                      ) : (
                        <ShoppingCart className="h-8 w-8 text-white/20" />
                      )}
                    </div>
                    
                    {/* Info Centralizada */}
                    <div className="space-y-1">
                      <h3 className="font-black text-base uppercase tracking-tight">{item.product?.name}</h3>
                      <p className="font-black text-accent text-lg">R$ {(Math.floor((item.product?.price || 0) * 0.5) / 100).toFixed(2)}</p>
                    </div>

                    {/* Controles Centralizados */}
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-center bg-background/50 rounded-2xl p-1.5 border border-border/50 shadow-inner">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="h-10 w-10 rounded-xl hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-black w-12 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          disabled={item.quantity >= 5}
                          className="h-10 w-10 rounded-xl hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Botão Excluir Centralizado */}
                      <button
                        onClick={() => handleRemoveAll(item)}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir Item
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <Card className="p-8 sticky top-24 bg-card/40 backdrop-blur-md border-border/40 rounded-[2.5rem] shadow-2xl border-t-accent/20">
                <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                  <span className="h-2 w-2 bg-accent rounded-full animate-pulse" />
                  Resumo do Pedido
                </h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="line-through opacity-40">R$ {(originalTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Desconto Aplicado</span>
                    <span className="text-green-500">-{(((originalTotal - total) / 100)).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-3 mb-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total a Pagar</span>
                    <span className="text-4xl font-black text-accent tracking-tighter">R$ {(total / 100).toFixed(2)}</span>
                  </div>

                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-white font-black py-8 rounded-[1.5rem] shadow-xl shadow-[#22c55e]/20 transition-all active:scale-95 text-base uppercase tracking-tighter"
                    onClick={() => navigate("/checkout?direct=true")}
                  >
                    FINALIZAR COMPRA
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-foreground"
                    onClick={() => navigate("/")}
                  >
                    ADICIONAR MAIS PRODUTOS
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
