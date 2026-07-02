import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, ShoppingCart } from "lucide-react";
import { useState } from "react";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: cartItems, isLoading } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: products } = trpc.products.list.useQuery();
  const utils = trpc.useUtils();
  const removeItem = trpc.cart.removeItem.useMutation({
    onSuccess: () => {
      utils.cart.getItems.invalidate();
    }
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const enrichedItems = cartItems?.map(item => {
    const product = products?.find(p => p.id === item.productId);
    return { ...item, product };
  }) || [];

  const subtotal = enrichedItems.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const originalTotal = subtotal * 2; // Preço original (sem desconto)
  const savings = originalTotal - subtotal; // Economia
  const total = subtotal;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          <span className="text-xl font-bold text-accent">MOTA STORE</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-12">
        <h1 className="text-3xl font-bold mb-8">Meu Carrinho</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : enrichedItems.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6 text-lg">Seu carrinho está vazio</p>
            <Button onClick={() => navigate("/")} className="bg-accent hover:bg-accent/90">
              Continuar Comprando
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {enrichedItems.map((item) => (
                <Card key={item.id} className="p-6 flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                    item.product?.name.includes("Spotify") ? "from-green-600 to-green-900" :
                    item.product?.name.includes("YouTube Music") ? "from-red-800 to-black" :
                    item.product?.name.includes("YouTube") ? "from-red-600 to-red-900" :
                    "from-blue-800 to-blue-950"
                  }`}>
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <ShoppingCart className="h-8 w-8 text-white/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.product?.name || `Produto #${item.productId}`}</h3>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {item.quantity || 1}
                    </p>
                    <p className="text-xs text-muted-foreground line-through">
                      De R$ {(((item.product?.price || 0) * 2 * (item.quantity || 1)) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-bold text-accent">R$ {(((item.product?.price || 0) * (item.quantity || 1)) / 100).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeItem.mutate(item.id)}
                    disabled={removeItem.isPending}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-20">
                <h2 className="text-lg font-semibold mb-6">Resumo do Pedido</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({enrichedItems.length} itens)</span>
                    <span className="font-semibold line-through">R$ {(originalTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Com Desconto</span>
                    <span className="font-semibold text-accent">R$ {(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Economia</span>
                    <span className="font-semibold text-green-600">-R$ {(savings / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="font-semibold text-green-600">Grátis</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-accent">R$ {(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-accent hover:bg-accent/90 mb-3"
                  onClick={() => navigate("/checkout")}
                >
                  Ir para Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Continuar Comprando
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
