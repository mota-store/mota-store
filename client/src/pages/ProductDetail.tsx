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

  const reviews = [
    { name: "Marcos Oliveira", rating: 5, comment: "Entrega super rápida! O suporte me ajudou em 5 minutos.", date: "Há 2 dias" },
    { name: "Julia Santos", rating: 5, comment: "Melhor preço que já encontrei. Recomendo muito!", date: "Há 1 semana" },
    { name: "Ricardo M.", rating: 4, comment: "Muito bom, funciona perfeitamente.", date: "Há 3 dias" },
  ];

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
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      <Header />

      <div className="container px-4 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="h-[500px] bg-card/50 rounded-[2.5rem] animate-pulse border border-border/40" />
            <div className="space-y-6">
              <div className="h-16 bg-card/50 rounded-2xl animate-pulse" />
              <div className="h-24 bg-card/50 rounded-2xl animate-pulse" />
              <div className="h-64 bg-card/50 rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : product ? (
          <div className="space-y-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              {/* Product Visuals */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="relative h-[450px] overflow-hidden bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-center p-12 rounded-[2.5rem] border border-border/40 backdrop-blur-sm group">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="p-8 text-accent/10">
                      {product.category === 'music' ? <Music className="w-40 h-40" /> : <Play className="w-40 h-40" />}
                    </div>
                  )}
                  <div className="absolute top-6 left-6 bg-accent/90 text-white dark:text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                    Entrega Instantânea
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: <Zap className="w-4 h-4" />, label: "Ativação Turbo" },
                    { icon: <Shield className="w-4 h-4" />, label: "Garantia Total" },
                    { icon: <Headphones className="w-4 h-4" />, label: "Suporte 24/7" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-card/30 border border-border/40 text-center">
                      <div className="text-accent mb-2">{item.icon}</div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Product Info */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-8"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                      {product.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 fill-accent text-accent" />)}
                      <span className="text-[10px] font-bold text-muted-foreground ml-1">4.9/5.0</span>
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-tight">{product.name}</h1>
                  <p className="text-muted-foreground font-medium leading-relaxed">{product.description}</p>
                </div>

                <div className="p-8 rounded-[2rem] bg-card/40 border border-border/40 backdrop-blur-md space-y-6">
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Preço Promocional</span>
                      <span className="text-5xl font-black text-accent tracking-tighter">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</span>
                    </div>
                    <span className="text-lg text-muted-foreground line-through opacity-40 font-bold mb-1">R$ {((product.price * 1.5) / 100).toFixed(2).replace(".", ",")}</span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">O que você recebe:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {["Acesso Premium Vitalício", "Suporte VIP no WhatsApp", "Garantia de Funcionamento", "Entrega Automática"].map((text, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-bold">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-8 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-lg uppercase tracking-tighter mt-4"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <div className="h-6 w-6 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin mr-3" />
                    ) : (
                      <ShoppingCart className="h-6 w-6 mr-3" />
                    )}
                    {isAdding ? "ADICIONANDO..." : "COMPRAR AGORA"}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-6 opacity-50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Compra Segura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Entrega na Hora</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-8 pt-8 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Avaliações de Clientes</h2>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="font-black text-lg">4.9</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Média Global</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reviews.map((review, i) => (
                  <Card key={i} className="p-6 bg-card/30 border-border/30 rounded-2xl space-y-4 hover:border-accent/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-black text-sm">{review.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed italic">"{review.comment}"</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {review.date}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
