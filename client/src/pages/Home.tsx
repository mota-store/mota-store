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
      navigate("/cart");
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

      {/* Hero Section with GIF - Oculto para usuários logados */}
      {!isAuthenticated && (
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
                  Ofertas Exclusivas Ativas
                </div>
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.85] uppercase">
                  O MELHOR <br />
                  <span className="text-accent drop-shadow-[0_0_20px_rgba(var(--accent),0.5)]">STREAMING</span> AQUI.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                  Assine suas plataformas favoritas com os melhores preços do mercado. Ativação automática e suporte dedicado 24 horas.
                </p>
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white dark:text-black px-12 py-8 text-xl font-black rounded-[2rem] shadow-2xl shadow-accent/20 transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    navigate("/login?tab=register");
                  }}
                >
                  APROVEITAR AGORA
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Product Grid - 2x2 */}
      <main className="container max-w-5xl mx-auto px-4 py-16" id="products">
        <div className="flex flex-col items-center mb-12">
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase mb-3">
            Produtos em <span className="text-accent">Destaque</span>
          </h2>
          <div className="h-1 w-16 bg-accent rounded-full" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[280px] bg-card/50 rounded-[1.5rem] animate-pulse border border-border/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card/40 border-border/40 backdrop-blur-md rounded-[1.5rem] transition-all duration-500 group-hover:border-accent/50 group-hover:shadow-2xl group-hover:shadow-accent/10 relative">
                    <div 
                      className="relative h-32 md:h-40 overflow-hidden bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-center p-4 md:p-6 cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className={`w-full h-full flex items-center justify-center ${product.stock === 0 ? "blur-[2px]" : ""}`}>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-lg"
                          />
                        ) : (
                          <div className="p-6 text-accent/10">
                            {product.category === 'music' ? <Music className="w-12 h-12" /> : <Play className="w-12 h-12" />}
                          </div>
                        )}
                      </div>
                      {product.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                          <span className="text-white font-black text-lg md:text-2xl uppercase tracking-tighter drop-shadow-lg">ESGOTADO</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-md border border-border/50 text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-accent">
                        {product.category}
                      </div>
                    </div>

                    <div className="p-3 md:p-5 flex flex-col flex-grow">
                      <h3
                        className="text-xs md:text-base font-black mb-1 group-hover:text-accent transition-colors line-clamp-1 cursor-pointer uppercase tracking-tight"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >{product.name}</h3>
                      
                      <div className="flex items-center gap-0.5 mb-3 md:mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-2 h-2 md:w-3 md:h-3 fill-accent text-accent" />
                        ))}
                        <span className="text-[7px] md:text-[9px] text-muted-foreground ml-1 font-black">4.9</span>
                      </div>
                      
                      <div className="mb-3 md:mb-5 mt-auto">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg md:text-2xl font-black text-accent tracking-tighter">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</span>
                          <span className="text-[7px] md:text-[8px] text-muted-foreground line-through opacity-40 font-bold">R$ {(product.price * 2 / 100).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-3 md:py-5 rounded-lg md:rounded-xl shadow-lg shadow-accent/10 transition-all text-[8px] md:text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-1"
                        onClick={(e) => handleAddToCart(e, product.id)}
                        disabled={isAdding === product.id || product.stock === 0}
                      >
                        {isAdding === product.id ? (
                          <div className="h-2.5 w-2.5 md:h-3 md:w-3 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                        ) : product.stock === 0 ? null : (
                          <ShoppingCart className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        )}
                        <span className="hidden xs:inline">
                          {isAdding === product.id ? "..." : product.stock === 0 ? "ESGOTADO" : "ADICIONAR AO CARRINHO"}
                        </span>
                        <span className="xs:hidden">
                          {isAdding === product.id ? "..." : product.stock === 0 ? "ESGOTADO" : "ADICIONAR"}
                        </span>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-20 space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Nada encontrado</h3>
            <p className="text-muted-foreground font-medium text-sm">Tente ajustar sua busca.</p>
          </div>
        )}
      </main>

      {/* Trust Badges */}
      <section className="container max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 border-t border-border/40">
        {[
          { icon: <Zap className="w-6 h-6 md:w-8 md:h-8" />, title: "Ativação Imediata", desc: "Seu acesso ativado na hora." },
          { icon: <Star className="w-6 h-6 md:w-8 md:h-8" />, title: "Suporte Premium", desc: "Atendimento dedicado 24/7." },
          { icon: <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />, title: "Pagamento Protegido", desc: "Transações 100% seguras." },
        ].map((badge, i) => (
          <div key={i} className="flex flex-col items-center text-center p-5 md:p-6 rounded-xl md:rounded-2xl bg-card/20 border border-border/40 space-y-3 group hover:border-accent/30 transition-all">
            <div className="text-accent p-2.5 md:p-3 bg-accent/5 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">{badge.icon}</div>
            <h4 className="font-black uppercase tracking-tight text-xs md:text-sm">{badge.title}</h4>
            <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-tight">{badge.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
