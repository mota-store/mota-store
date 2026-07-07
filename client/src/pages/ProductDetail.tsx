import React, { useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, CheckCircle2, Shield, Zap, Headphones, Music, Play } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { invalidateCart, triggerFlyAnimation } = useCart();
  const utils = trpc.useUtils();
  const [isAdding, setIsAdding] = useState(false);
  const lastClickTime = useRef<number>(0);

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const product = products?.find(p => p.id === Number(id));

  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      setIsAdding(false);
      invalidateCart();
    },
    onError: () => {
      setIsAdding(false);
      toast.error("Erro ao adicionar ao carrinho");
      utils.cart.getItems.invalidate();
    }
  });

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Throttle de 2 segundos
    const now = Date.now();
    if (now - lastClickTime.current < 2000) return;
    lastClickTime.current = now;

    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    if (!product || isAdding) return;

    const cartItems = utils.cart.getItems.getData();
    const isAlreadyInCart = cartItems?.some(item => item.productId === product.id);

    if (isAlreadyInCart) {
      toast.info("Este item já está no seu carrinho.");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setIsAdding(true);
    triggerFlyAnimation(startPos);
    addItem.mutate({ productId: product.id, quantity: 1 });
  };

  if (!product && !isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <h1 className="text-2xl font-black mb-4">Produto não encontrado</h1>
        <Button onClick={() => navigate("/")} className="bg-accent hover:bg-accent/90">
          Voltar à Home
        </Button>
      </div>
    );
  }

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
      <div className="container py-8 max-w-6xl">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="h-96 bg-muted rounded-[2.5rem] animate-pulse" />
            <div className="space-y-4">
              <div className="h-12 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 bg-muted rounded-lg animate-pulse w-1/3" />
            </div>
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Imagem do Produto */}
            <div className="flex flex-col gap-6">
              <div className="relative h-96 overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center p-8 rounded-[2.5rem] border border-border/50">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-8 text-accent/20">
                    {product.category === 'music' ? <Music className="w-32 h-32" /> : <Play className="w-32 h-32" />}
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-accent text-white dark:text-accent-foreground px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                  PREMIUM
                </div>
              </div>
            </div>

            {/* Informações do Produto */}
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">{product.name}</h1>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-accent tracking-tighter">R$ 5,00</span>
                  <span className="text-lg text-muted-foreground line-through opacity-50 font-bold">R$ 10,00</span>
                </div>
                <div className="inline-block px-3 py-1.5 rounded bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                  ECONOMIZE 50%
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Descrição</h2>
                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>

              <div className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Benefícios Inclusos</h2>
                <div className="space-y-3">
                  {[
                    { icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, text: "Conta nova com e-mail novo" },
                    { icon: <Shield className="h-5 w-5 text-green-500" />, text: "Garantia de 30 dias" },
                    { icon: <Zap className="h-5 w-5 text-green-500" />, text: "Entrega imediata via WhatsApp" },
                    { icon: <Headphones className="h-5 w-5 text-green-500" />, text: "Suporte 24/7" },
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {b.icon}
                      <span className="text-sm font-medium">{b.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-accent hover:bg-accent/90 text-white dark:text-accent-foreground font-black py-8 rounded-2xl shadow-xl shadow-accent/20 transition-all text-base active:scale-95 mt-4"
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                {isAdding ? (
                  <div className="h-5 w-5 border-2 border-white dark:border-accent-foreground/30 border-t-white dark:border-t-accent-foreground rounded-full animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="h-5 w-5 mr-2 text-white dark:text-accent-foreground" />
                )}
                {isAdding ? "ADICIONANDO..." : "ADICIONAR AO CARRINHO"}
              </Button>

              <Button
                variant="ghost"
                className="w-full font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => navigate("/")}
              >
                ← Voltar para a Home
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
