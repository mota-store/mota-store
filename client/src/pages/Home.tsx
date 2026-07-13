import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ShoppingCart, Zap, Music, Play, Star, ShieldCheck, Headphones, ArrowRight, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { triggerFlyAnimation, invalidateCart } = useCart();
  const utils = trpc.useUtils();
  
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const lastClickTime = useRef<number>(0);

  const [searchQuery, setSearchQuery] = useState("");

  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      setIsAdding(null);
      invalidateCart();
    },
    onError: () => {
      setIsAdding(null);
      toast.error("Erro ao adicionar ao carrinho");
      utils.cart.getItems.invalidate();
    }
  });

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, productId: number) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastClickTime.current < 2000) return;
    lastClickTime.current = now;

    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    if (isAdding !== null) return;

    const cartItems = utils.cart.getItems.getData();
    const isAlreadyInCart = cartItems?.some(item => item.productId === productId);

    if (isAlreadyInCart) {
      toast.info("Este item já está no seu carrinho.");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setIsAdding(productId);
    triggerFlyAnimation(startPos);
    
    addItem.mutate({ productId, quantity: 1 });
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      return product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden scroll-smooth pb-20">
      <Header onSearch={setSearchQuery} searchQuery={searchQuery} />

      {/* Hero Section with GIF - Like original */}
      <section className="relative w-full h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/home-bg.gif" 
            alt="Mota Store Banner" 
            className="w-full h-full object-cover object-center opacity-30 grayscale-[0.2]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background z-10" />
        </div>

        <div className="container relative z-20 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                Promoções de Inverno Ativas
              </div>
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.85] uppercase">
                O MELHOR DO <br />
                <span className="text-accent drop-shadow-[0_0_20px_rgba(var(--accent),0.5)]">STREAMING</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                Acesse suas plataformas favoritas com preços imbatíveis. Entrega automática e suporte especializado 24/7.
              </p>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white dark:text-black px-12 py-8 text-xl font-black rounded-[2rem] shadow-2xl shadow-accent/20 transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                VER PRODUTOS
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product Grid - 2x2 for Desktop, 2x2 for Mobile as requested */}
      <main className="container max-w-5xl mx-auto px-4 py-16" id="products">
        <div className="flex flex-col items-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4">
            Nossas <span className="text-accent">Ofertas</span>
          </h2>
          <div className="h-1.5 w-20 bg-accent rounded-full" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[350px] bg-card/50 rounded-[2.5rem] animate-pulse border border-border/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card/40 border-border/40 backdrop-blur-md rounded-[2rem] transition-all duration-500 group-hover:border-accent/50 group-hover:shadow-3xl group-hover:shadow-accent/10 relative">
                    <div 
                      className="relative h-40 md:h-56 overflow-hidden bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-center p-6 md:p-10 cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl"
                        />
                      ) : (
                        <div className="p-8 text-accent/10">
                          {product.category === 'music' ? <Music className="w-16 h-16" /> : <Play className="w-16 h-16" />}
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md border border-border/50 text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-widest text-accent">
                        {product.category}
                      </div>
                    </div>

                    <div className="p-4 md:p-7 flex flex-col flex-grow">
                      <h3
                        className="text-sm md:text-xl font-black mb-1 md:mb-2 group-hover:text-accent transition-colors line-clamp-1 cursor-pointer uppercase tracking-tight"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >{product.name}</h3>
                      
                      <div className="flex items-center gap-1 mb-4 md:mb-6">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 fill-accent text-accent" />
                        ))}
                        <span className="text-[8px] md:text-[10px] text-muted-foreground ml-1 font-black">4.9</span>
                      </div>
                      
                      <div className="mb-4 md:mb-8 mt-auto">
                        <div className="flex items-baseline gap-1 md:gap-2">
                          <span className="text-xl md:text-4xl font-black text-accent tracking-tighter">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</span>
                          <span className="text-[10px] md:text-xs text-muted-foreground line-through opacity-40 font-bold">R$ {(product.price * 1.5 / 100).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-5 md:py-7 rounded-xl md:rounded-2xl shadow-xl shadow-accent/10 transition-all text-[9px] md:text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        onClick={(e) => handleAddToCart(e, product.id)}
                        disabled={isAdding === product.id}
                      >
                        {isAdding === product.id ? (
                          <div className="h-3 w-3 md:h-4 md:w-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
                        )}
                        <span className="hidden xs:inline">{isAdding === product.id ? "AGUARDE..." : "COMPRAR"}</span>
                        <span className="xs:hidden">{isAdding === product.id ? "..." : "OK"}</span>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Trust Badges */}
      <section className="container max-w-5xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-border/40">
        {[
          { icon: <Zap className="w-10 h-10" />, title: "Entrega Turbo", desc: "Acesso enviado imediatamente após a confirmação." },
          { icon: <Star className="w-10 h-10" />, title: "Garantia Total", desc: "Suporte especializado e garantia de funcionamento." },
          { icon: <ShieldCheck className="w-10 h-10" />, title: "Compra Segura", desc: "Ambiente criptografado e pagamentos protegidos." },
        ].map((badge, i) => (
          <div key={i} className="flex flex-col items-center text-center p-8 rounded-[2rem] bg-card/20 border border-border/40 space-y-4 group hover:border-accent/30 transition-all">
            <div className="text-accent p-4 bg-accent/5 rounded-[1.5rem] group-hover:scale-110 transition-transform">{badge.icon}</div>
            <h4 className="font-black uppercase tracking-tight text-lg">{badge.title}</h4>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">{badge.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
