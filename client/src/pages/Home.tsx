import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ShoppingCart, Zap, Music, Play, CheckCircle2, Star, ShieldCheck, Headphones, ArrowRight, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { FlyAnimationsContainer } from "@/components/FlyToCart";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

    // 1. Throttle rigoroso de 2 segundos no frontend
    const now = Date.now();
    if (now - lastClickTime.current < 2000) return;
    lastClickTime.current = now;

    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    // 2. Bloqueio por estado de loading
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
    
    // Envia a mutação
    addItem.mutate({ productId, quantity: 1 });
  };

  return (
    <div 
      ref={containerRef}
      className="h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden overflow-y-auto scroll-smooth"
    >
      <Header />

      {/* Hero Section */}
      {!isAuthenticated && (
      <section 
        ref={heroRef}
        className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/home-bg.gif" 
            alt="Mota Store Banner" 
            className="w-full h-full object-cover object-center opacity-100"
          />
        </div>

        <div className="container relative z-20 px-4 -mt-72 sm:-mt-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 text-accent text-sm font-black mt-[5px] mb-8 backdrop-blur-md">
                <Sparkles className="h-4 w-4" />
                <span className="text-[#FFFFFF] dark:text-accent">OFERTA DE LANÇAMENTO: 50% OFF EM TODO O SITE</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.8] text-white drop-shadow-2xl">
                O MELHOR DO <br />
                <span className="text-accent">STREAMING</span> AQUI.
              </h1>
              <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-8 font-bold leading-relaxed drop-shadow-md">
                Compre Spotify, YouTube, Prime Video e muito mais por um preço que você nunca viu. Entrega instantânea via WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-transparent hover:bg-white/10 border-2 border-accent text-white px-12 py-8 text-xl font-black rounded-[2rem] shadow-2xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 -translate-y-[27px]"
                  onClick={() => {
                    navigate("/login?tab=register");
                  }}
                >
                  GARANTIR MEU ACESSO
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}
									
      {/* Trust Badges */}
      {!isAuthenticated && (
        <div className="container px-4 relative z-30 -mt-[362px] sm:-mt-[138px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-transparent border-2 border-accent/20 rounded-[2.5rem] shadow-2xl shadow-accent/5">
            {[
              { icon: <Zap className="text-accent h-6 w-6" />, title: "Entrega Imediata", desc: "Acesso na hora" },
              { icon: <ShieldCheck className="text-accent h-6 w-6" />, title: "Compra Segura", desc: "Pagamento via PIX" },
              { icon: <Star className="text-accent h-6 w-6" />, title: "Suporte 24/7", desc: "Via WhatsApp" },
              { icon: <CheckCircle2 className="text-accent h-6 w-6" />, title: "Garantia Total", desc: "Satisfação ou Reembolso" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center md:items-start gap-1 text-center md:text-left px-4">
                <div className="mb-2 p-2 rounded-xl bg-accent/10">{item.icon}</div>
                <span className="font-black text-sm uppercase tracking-wider text-white">{item.title}</span>
                <span className="text-xs text-white/70 font-medium">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      <section 
        ref={productsRef}
        id="products" 
        className={`py-24 ${isAuthenticated ? "pt-12" : "min-h-screen flex flex-col justify-center"}`}
      >
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className={`text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none ${isAuthenticated ? "mt-[15px] mb-4" : "mb-4"}`}>
                NOSSAS <span className="text-accent">PLATAFORMAS</span>
              </h2>
              <p className={`text-muted-foreground text-lg max-w-xl font-medium ${isAuthenticated ? "mt-[10px]" : ""}`}>
                Escolha o plano que mais combina com você e comece a maratonar hoje mesmo.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[450px] rounded-[2.5rem] bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products?.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -12 }}
                  className="group"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card/30 border-border/50 backdrop-blur-sm rounded-[2.5rem] transition-all duration-500 group-hover:border-accent/50 group-hover:shadow-2xl group-hover:shadow-accent/10">
                    <div 
                      className="relative h-56 overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center p-8 cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="p-8 text-accent/20">
                          {product.category === 'music' ? <Music className="w-full h-full" /> : <Play className="w-full h-full" />}
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-accent text-white dark:text-accent-foreground px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        PREMIUM
                      </div>
                    </div>

                    <div className="p-8 flex flex-col flex-grow">
                      <h3
                        className="text-2xl font-black mb-2 group-hover:text-accent transition-colors line-clamp-1 cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >{product.name}</h3>
                      <p
                        className="text-muted-foreground text-sm mb-6 font-medium cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >{product.description}</p>
                      
                      <div
                        className="mb-8 mt-auto cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <div className="flex items-baseline gap-3 mb-1">
                          <span className="text-4xl font-black text-accent tracking-tighter">R$ 5,00</span>
                          <span className="text-muted-foreground text-sm line-through opacity-50 font-bold">R$ 10,00</span>
                        </div>
                        <div className="inline-block px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                          ECONOMIZE 50%
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="w-full bg-accent hover:bg-accent/90 text-white dark:text-accent-foreground font-black py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all text-base active:scale-95"
                        onClick={(e) => handleAddToCart(e, product.id)}
                        disabled={isAdding === product.id}
                      >
                        {isAdding === product.id ? (
                          <div className="h-5 w-5 border-2 border-white dark:border-accent-foreground/30 border-t-white dark:border-t-accent-foreground rounded-full animate-spin mr-2" />
                        ) : (
                          <ShoppingCart className="h-5 w-5 mr-2 text-white dark:text-accent-foreground" />
                        )}
                        {isAdding === product.id ? "ADICIONANDO..." : "ADICIONAR AO CARRINHO"}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-accent/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="container px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">
              POR QUE A <span className="text-accent">MOTA STORE?</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Ativação Turbo",
                desc: "Esqueça a burocracia. Nosso sistema é focado em velocidade para você não perder nem um segundo.",
                icon: <Zap className="h-10 w-10 text-accent" />
              },
              {
                title: "Suporte Real",
                desc: "Pessoas de verdade atendendo pessoas de verdade. No WhatsApp, quando você precisar.",
                icon: <Headphones className="h-10 w-10 text-accent" />
              },
              {
                title: "Segurança Máxima",
                desc: "Seus dados e sua compra protegidos pelos melhores protocolos do mercado.",
                icon: <ShieldCheck className="h-10 w-10 text-accent" />
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-6 p-10 rounded-[2.5rem] bg-card/20 border border-border/30 hover:border-accent/30 transition-all duration-500">
                <div className="p-5 rounded-3xl bg-accent/10 text-accent mb-2">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FlyAnimationsContainer animations={[]} onAnimationComplete={() => {}} />
    </div>
  );
}
