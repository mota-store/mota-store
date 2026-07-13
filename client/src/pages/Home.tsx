import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ShoppingCart, Zap, Music, Play, CheckCircle2, Star, ShieldCheck, Headphones, ArrowRight, Sparkles, Search, LayoutGrid, Tv, Layers } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { FlyAnimationsContainer } from "@/components/FlyToCart";
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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const lastClickTime = useRef<number>(0);

  // Estados para busca e filtro
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

  // Lógica de filtragem
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
    <div 
      ref={containerRef}
      className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden scroll-smooth pb-20"
    >
      <Header />

      {/* Hero Section */}
      {!isAuthenticated && (
      <section 
        ref={heroRef}
        className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/home-bg.gif" 
            alt="Mota Store Banner" 
            className="w-full h-full object-cover object-center opacity-40 grayscale-[0.5]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background z-10" />
        </div>

        <div className="container relative z-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-black mb-8 backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                <span className="uppercase tracking-widest">Ofertas Exclusivas de Lançamento</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] uppercase">
                O MELHOR DO <br />
                <span className="text-accent drop-shadow-[0_0_15px_rgba(var(--accent),0.3)]">STREAMING</span> AQUI.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                Acesse suas plataformas favoritas com preços imbatíveis. Entrega automática e suporte especializado.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white dark:text-black px-10 py-7 text-lg font-black rounded-2xl shadow-2xl shadow-accent/20 transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  VER PRODUTOS
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}
										
      {/* Products Section */}
      <section 
        ref={productsRef}
        id="products" 
        className={`py-12 ${isAuthenticated ? "pt-24" : ""}`}
      >
        <div className="container px-4">
          {/* Search and Filters */}
          <div className="max-w-5xl mx-auto mb-16 space-y-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="O que você está procurando hoje?"
                className="w-full h-16 pl-14 pr-6 bg-card/50 border-border/50 rounded-3xl text-lg font-medium focus-visible:ring-accent focus-visible:border-accent transition-all shadow-xl shadow-black/5"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat.id
                      ? "bg-accent text-white dark:text-black shadow-lg shadow-accent/20 scale-105"
                      : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50"
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4">
              Nossas <span className="text-accent">Opções</span>
            </h2>
            <div className="h-1.5 w-20 bg-accent rounded-full" />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[400px] rounded-[2rem] bg-card/50 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                <motion.div 
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  {filteredProducts.map((product) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={product.id}
                      whileHover={{ y: -8 }}
                      className="group"
                    >
                      <Card className="h-full flex flex-col overflow-hidden bg-card/40 border-border/40 backdrop-blur-md rounded-[2rem] transition-all duration-500 group-hover:border-accent/40 group-hover:shadow-2xl group-hover:shadow-accent/5">
                        <div 
                          className="relative h-48 overflow-hidden bg-gradient-to-br from-accent/5 to-transparent flex items-center justify-center p-6 cursor-pointer"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl"
                            />
                          ) : (
                            <div className="p-8 text-accent/20">
                              {product.category === 'music' ? <Music className="w-16 h-16" /> : <Play className="w-16 h-16" />}
                            </div>
                          )}
                          <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md border border-border/50 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                            {product.category}
                          </div>
                        </div>

                        <div className="p-6 flex flex-col flex-grow">
                          <h3
                            className="text-xl font-black mb-2 group-hover:text-accent transition-colors line-clamp-1 cursor-pointer uppercase tracking-tight"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >{product.name}</h3>
                          
                          <div className="flex items-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className="w-3 h-3 fill-accent text-accent" />
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-1 font-bold">(4.9)</span>
                          </div>
                          
                          <div
                            className="mb-6 mt-auto cursor-pointer"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-accent tracking-tighter">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</span>
                              <span className="text-muted-foreground text-xs line-through opacity-50 font-bold">R$ {(product.price * 1.5 / 100).toFixed(2).replace(".", ",")}</span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-6 rounded-xl shadow-lg shadow-accent/10 transition-all text-sm active:scale-95 flex items-center justify-center gap-2"
                            onClick={(e) => handleAddToCart(e, product.id)}
                            disabled={isAdding === product.id}
                          >
                            {isAdding === product.id ? (
                              <div className="h-4 w-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                            {isAdding === product.id ? "ADICIONANDO..." : "COMPRAR AGORA"}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-20">
                  <Search className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-xl font-bold text-muted-foreground">Nenhum produto encontrado.</p>
                  <Button 
                    variant="link" 
                    className="text-accent font-black mt-2"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("all");
                    }}
                  >
                    LIMPAR FILTROS
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/20 relative overflow-hidden border-y border-border/50">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Entrega Automática",
                desc: "Receba seus dados de acesso instantaneamente após a confirmação do pagamento.",
                icon: <Zap className="h-8 w-8 text-accent" />
              },
              {
                title: "Suporte Especializado",
                desc: "Nossa equipe está pronta para te ajudar 24h por dia via WhatsApp e Discord.",
                icon: <Headphones className="h-8 w-8 text-accent" />
              },
              {
                title: "Garantia de Satisfação",
                desc: "Produtos testados e aprovados com 100% de garantia de funcionamento.",
                icon: <ShieldCheck className="h-8 w-8 text-accent" />
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center p-8 rounded-3xl bg-background/50 border border-border/50 hover:border-accent/30 transition-all">
                <div className="p-4 rounded-2xl bg-accent/10 text-accent mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FlyAnimationsContainer animations={[]} onAnimationComplete={() => {}} />
    </div>
  );
}
