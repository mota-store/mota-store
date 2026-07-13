import React, { useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, CheckCircle2, Shield, Zap, Headphones, Music, Play, Star, MessageSquare, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { motion } from "framer-motion";

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
        <h1 className="text-xl font-black mb-4 uppercase">Produto não encontrado</h1>
        <Button onClick={() => navigate("/")} className="bg-accent hover:bg-accent/90 rounded-xl px-6">
          Voltar à Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 pb-16">
      <Header />

      <div className="container px-4 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-[300px] bg-card/50 rounded-[2rem] animate-pulse border border-border/40" />
            <div className="space-y-4">
              <div className="h-12 bg-card/50 rounded-xl animate-pulse" />
              <div className="h-16 bg-card/50 rounded-xl animate-pulse" />
              <div className="h-40 bg-card/50 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : product ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Product Visuals - Smaller */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="relative h-[300px] overflow-hidden bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-center p-8 rounded-[2rem] border border-border/40 backdrop-blur-sm group">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain drop-shadow-xl transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="p-6 text-accent/10">
                      {product.category === 'music' ? <Music className="w-24 h-24" /> : <Play className="w-24 h-24" />}
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-accent/90 text-white dark:text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                    Acesso Imediato
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Zap className="w-3 h-3" />, label: "Rápido" },
                    { icon: <Shield className="w-3 h-3" />, label: "Seguro" },
                    { icon: <Headphones className="w-3 h-3" />, label: "Suporte 24h" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-3 rounded-xl bg-card/30 border border-border/40 text-center">
                      <div className="text-accent mb-1">{item.icon}</div>
                      <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Product Info - Smaller */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest">
                      {product.category}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-2.5 h-2.5 fill-accent text-accent" />)}
                      <span className="text-[9px] font-bold text-muted-foreground ml-1">4.9</span>
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">{product.name}</h1>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed">{product.description}</p>
                </div>

                <div className="p-6 rounded-[1.5rem] bg-card/40 border border-border/40 backdrop-blur-md space-y-4">
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Preço</span>
                      <span className="text-3xl md:text-4xl font-black text-accent tracking-tighter">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</span>
                    </div>
                    <span className="text-sm text-muted-foreground line-through opacity-40 font-bold mb-1">R$ {((product.price * 2) / 100).toFixed(2).replace(".", ",")}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="grid grid-cols-1 gap-1.5">
                      {["Acesso Completo", "Suporte Prioritário", "Ativação Automática"].map((text, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-bold">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-6 rounded-xl shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm uppercase tracking-widest mt-2"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <div className="h-4 w-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    {isAdding ? "ADICIONANDO..." : "ADICIONAR AO CARRINHO"}
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Empty Reviews Section - Structure only */}
            <div className="space-y-6 pt-8 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Avaliações</h2>
                </div>
              </div>
              
              <div className="text-center py-10 bg-card/20 rounded-2xl border border-dashed border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma avaliação ainda</p>
                <p className="text-[9px] text-muted-foreground/60 mt-1">Seja o primeiro a avaliar este produto após sua compra!</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
