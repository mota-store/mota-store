import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, ShoppingCart } from "lucide-react";
import { useEffect } from "react";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  
  const { data: cartItems, isLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  
  const removeItem = trpc.cart.removeItem.useMutation({
    onSuccess: () => {
      utils.cart.getItems.invalidate();
    }
  });

  const addItemMutation = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      utils.cart.getItems.invalidate();
    }
  });

  // Passo 6.4: Garantir que o carrinho seja invalidado ao montar
  useEffect(() => {
    if (isAuthenticated) {
      utils.cart.getItems.invalidate();
    }
  }, [isAuthenticated, utils.cart.getItems]);

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const enrichedItems = cartItems?.map(item => {
    const product = products?.find(p => p.id === item.productId);
    return { ...item, product };
  }) || [];

  const subtotal = enrichedItems.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const originalTotal = subtotal * 2; 
  const total = subtotal;

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
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black tracking-tighter uppercase">MEU <span className="text-accent">CARRINHO</span></h1>
          <span className="text-xs font-black bg-accent/10 text-accent px-3 py-1 rounded-full uppercase tracking-widest">
            {enrichedItems.length} ITENS
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : enrichedItems.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {enrichedItems.map((item) => (
                <Card key={item.id} className="p-4 flex items-center gap-4 bg-card/30 backdrop-blur-sm border-border/50 rounded-2xl hover:border-accent/30 transition-all group">
                  <div className={`h-16 w-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                    item.product?.name.includes("Spotify") ? "from-green-600 to-green-900" :
                    item.product?.name.includes("YouTube Music") ? "from-red-800 to-black" :
                    item.product?.name.includes("YouTube") ? "from-red-600 to-red-900" :
                    "from-blue-800 to-blue-950"
                  }`}>
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <ShoppingCart className="h-6 w-6 text-white/40" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm uppercase tracking-tight truncate">{item.product?.name || `Produto #${item.productId}`}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              addItemMutation.mutate({ productId: item.productId, quantity: -1 });
                            } else {
                              removeItem.mutate(item.id);
                            }
                          }}
                          className="h-6 w-6 rounded-md hover:bg-background flex items-center justify-center text-xs font-black transition-colors"
                        >
                          -
                        </button>
                        <span className="text-xs font-black w-6 text-center">{item.quantity || 1}</span>
                        <button
                          onClick={() => addItemMutation.mutate({ productId: item.productId, quantity: 1 })}
                          className="h-6 w-6 rounded-md hover:bg-background flex items-center justify-center text-xs font-black transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-black text-accent text-sm">R$ {(((item.product?.price || 0) * (item.quantity || 1)) / 100).toFixed(2)}</p>
                    <button
                      onClick={() => removeItem.mutate(item.id)}
                      disabled={removeItem.isPending}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive/50 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <Card className="p-8 sticky top-24 bg-card/30 backdrop-blur-sm border-border/50 rounded-[2.5rem] shadow-2xl">
                <h2 className="text-lg font-black uppercase tracking-tighter mb-8">Resumo do Pedido</h2>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Subtotal ({enrichedItems.length} itens)</span>
                    <span className="line-through opacity-50">R$ {(originalTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Com Desconto</span>
                    <span className="text-accent">R$ {(subtotal / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6 mb-8">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-3xl font-black text-accent tracking-tighter">R$ {(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95"
                    onClick={() => navigate("/checkout?direct=true")}
                  >
                    IR PARA CHECKOUT
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground"
                    onClick={() => navigate("/")}
                  >
                    CONTINUAR COMPRANDO
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
