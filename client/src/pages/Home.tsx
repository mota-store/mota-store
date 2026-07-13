import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ShoppingCart, Zap, Music, Play, Star, ShieldCheck, Headphones, ArrowRight, Sparkles, Search, LayoutGrid, Tv, Layers } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { triggerFlyAnimation, invalidateCart } = useCart();
  const utils = trpc.useUtils();
  
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const lastClickTime = useRef<number>(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

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
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  const categories = [
    { id: "all", label: "Todos", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "video", label: "Vídeo", icon: <Tv className="w-4 h-4" /> },
    { id: "music", label: "Música", icon: <Music className="w-4 h-4" /> },
    { id: "combined", label: "Combos", icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden scroll-smooth pb-20">
      <Header />

      {/* Hero / Search Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="container max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest backdrop-blur-md"
            >
              <Sparkles className="h-3 w-3" />
              Ofertas de Lançamento Ativas
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85]"
            >
              O MELHOR DO <br />
              <span className="text-accent drop-shadow-[0_0_20px_rgba(var(--accent),0.4)]">STREAMING</span> AQUI.
            </motion.h1>
          </div>

          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/40 to-accent/10 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center bg-card/60 border border-border/50 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl">
              <div className="pl-6 text-accent">
                <Search className="h-6 w-6" />
              </div>
              <Input
                type="text"
                placeholder="O que você deseja assistir hoje?"
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-lg h-14 font-medium placeholder:text-muted-foreground/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button className="hidden md:flex bg-accent hover:bg-accent/90 text-white dark:text-black font-black px-10 h-14 rounded-[1.5rem] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-accent/20">
                BUSCAR
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Filter Bar */}
      <section className="py-6 px-4 sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all
                ${activeCategory === cat.id 
                  ? "bg-accent text-white dark:text-black shadow-lg shadow-accent/20 scale-105" 
                  : "bg-card/50 border border-border/50 text-muted-foreground hover:border-accent/50 hover:text-foreground"}
              `}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Product Grid */}
      <main className="container max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4">
            Nossas <span className="text-accent">Opções</span>
          </h2>
          <div className="h-1.5 w-20 bg-accent rounded-full" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-[420px] bg-card/50 rounded-[2.5rem] animate-pulse border border-border/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -10 }}
                  className="group"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card/40 border-border/40 backdrop-blur-md rounded-[2.5rem] transition-all duration-500 group-hover:border-accent/50 group-hover:shadow-3xl group-hover:shadow-accent/10 relative">
                    <div 
                      className="relative h-52 overflow-hidden bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-center p-8 cursor-pointer"
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
                          {product.category === 'music' ? <Music className="w-20 h-20" /> : <Play className="w-20 h-20" />}
                        </div>
                      )}
                      <div className="absolute top-5 left-5 bg-background/90 backdrop-blur-md border border-border/50 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest text-accent">
                        {product.category}
                      </div>
                    </div>

                    <div className="p-7 flex flex-col flex-grow">
                      <h3
                        className="text-xl font-black mb-2 group-hover:text-accent transition-colors line-clamp-1 cursor-pointer uppercase tracking-tight"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >{product.name}</h3>
                      
                      <div className="flex items-center gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3.5 h-3.5 fill-accent text-accent" />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1 font-black">4.9/5.0</span>
                      </div>
                      
                      <div className="mb-8 mt-auto">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-accent tracking-tighter">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</span>
                          <span className="text-muted-foreground text-xs line-through opacity-40 font-bold">R$ {(product.price * 1.5 / 100).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-7 rounded-2xl shadow-xl shadow-accent/10 transition-all text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        onClick={(e) => handleAddToCart(e, product.id)}
                        disabled={isAdding === product.id}
                      >
                        {isAdding === product.id ? (
                          <div className="h-4 w-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                        {isAdding === product.id ? "AGUARDE..." : "COMPRAR AGORA"}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-32 space-y-6">
            <div className="inline-flex p-8 rounded-full bg-accent/5">
              <Search className="h-16 w-16 text-accent/10" />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">Nada encontrado</h3>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">Não encontramos nenhum produto com esses critérios. Tente limpar os filtros.</p>
            <Button 
              variant="outline" 
              onClick={() => { setSearchQuery(""); setActiveCategory("all"); }} 
              className="rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-6 border-accent/20 hover:bg-accent/5"
            >
              LIMPAR TODOS OS FILTROS
            </Button>
          </div>
        )}
      </main>

      {/* Trust Badges */}
      <section className="container max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-border/40">
        {[
          { icon: <Zap className="w-10 h-10" />, title: "Entrega Turbo", desc: "Acesso enviado para seu e-mail em menos de 1 minuto." },
          { icon: <Star className="w-10 h-10" />, title: "Garantia Total", desc: "Suporte especializado e garantia de funcionamento em todos os planos." },
          { icon: <ShieldCheck className="w-10 h-10" />, title: "Compra 100% Segura", desc: "Ambiente criptografado e pagamentos protegidos." },
        ].map((badge, i) => (
          <div key={i} className="flex flex-col items-center text-center p-10 rounded-[2.5rem] bg-card/20 border border-border/40 space-y-5 group hover:border-accent/30 transition-all">
            <div className="text-accent p-5 bg-accent/5 rounded-[1.5rem] group-hover:scale-110 transition-transform">{badge.icon}</div>
            <h4 className="font-black uppercase tracking-tight text-xl">{badge.title}</h4>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{badge.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
