import React, { useState } from "react";
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
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { triggerFlyAnimation, invalidateCart, flyAnimations, removeFlyAnimation } = useCart();
  const utils = trpc.useUtils();
  const addItem = trpc.cart.addItem.useMutation({
    onMutate: async (newItem) => {
      // Cancela refetches em andamento para não sobrescrever o update otimista
      await utils.cart.getItems.cancel();

      // Snapshot do estado anterior
      const previousItems = utils.cart.getItems.getData();

      // Atualiza o cache otimisticamente
      utils.cart.getItems.setData(undefined, (old) => {
        const existingItem = old?.find(item => item.productId === newItem.productId);
        if (existingItem) {
          return old?.map(item => 
            item.productId === newItem.productId 
              ? { ...item, quantity: item.quantity + 1 } 
              : item
          );
        }
        return [...(old || []), { 
          productId: newItem.productId, 
          quantity: 1, 
          id: Math.random(),
          userId: 0, // Dummy value for TS
          addedAt: new Date() // Dummy value for TS
        }];
      });

      return { previousItems };
    },
    onError: (err, newItem, context) => {
      // Reverte para o estado anterior em caso de erro
      if (context?.previousItems) {
        utils.cart.getItems.setData(undefined, context.previousItems);
      }
      toast.error("Erro ao adicionar ao carrinho");
    },
    onSettled: () => {
      // Invalida para sincronizar com o servidor
      invalidateCart();
    },
    onSuccess: () => {
      toast.success("Produto adicionado ao carrinho!");
    }
  });

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, productId: number) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    triggerFlyAnimation(startPos);
    addItem.mutate({ productId });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden">
      <Header />

      {/* Hero Section - Professional Store Look */}
      {!isAuthenticated && (
      <section className="relative min-h-[73vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/home-bg.gif" 
            alt="Mota Store Banner" 
            className="w-full h-full object-cover opacity-100"
          />
        </div>

        <div className="container relative z-20 px-4 pt-0">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 text-accent text-sm font-black mb-8 backdrop-blur-md">
                <Sparkles className="h-4 w-4" />
                <span>OFERTA DE LANÇAMENTO: 50% OFF EM TODO O SITE</span>
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
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-12 py-8 text-xl font-black rounded-[2rem] shadow-2xl shadow-accent/40 transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
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
		
      {/* Trust Badges - Only show when NOT authenticated */}
      {!isAuthenticated && (
        <div className="container px-4 relative z-30 -mt-32">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-card/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl">
            {[
              { icon: <Zap className="text-accent h-6 w-6" />, title: "Entrega Imediata", desc: "Acesso na hora" },
              { icon: <ShieldCheck className="text-accent h-6 w-6" />, title: "Compra Segura", desc: "Pagamento via PIX" },
              { icon: <Star className="text-accent h-6 w-6" />, title: "Suporte 24/7", desc: "Via WhatsApp" },
              { icon: <CheckCircle2 className="text-accent h-6 w-6" />, title: "Garantia Total", desc: "Satisfação ou Reembolso" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center md:items-start gap-1 text-center md:text-left px-4">
                <div className="mb-2 p-2 rounded-xl bg-accent/10">{item.icon}</div>
                <span className="font-black text-sm uppercase tracking-wider">{item.title}</span>
                <span className="text-xs text-muted-foreground font-medium">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Section */}
      <section id="products" className={`py-24 ${isAuthenticated ? "pt-12" : ""}`}>
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase leading-none">
                NOSSAS <span className="text-accent">PLATAFORMAS</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl font-medium">
                Escolha o plano que mais combina com você e comece a maratonar hoje mesmo.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="flex gap-2">
                <div className="h-2 w-12 rounded-full bg-accent" />
                <div className="h-2 w-2 rounded-full bg-accent/20" />
                <div className="h-2 w-2 rounded-full bg-accent/20" />
              </div>
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
                    {/* Product Image */}
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center p-8">
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
                      <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        PREMIUM
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-8 flex flex-col flex-grow">
                      <h3 className="text-2xl font-black mb-2 group-hover:text-accent transition-colors line-clamp-1">{product.name}</h3>
                      <p className="text-muted-foreground text-sm mb-6 line-clamp-2 font-medium">{product.description}</p>
                      
                      {/* Price */}
                      <div className="mb-8 mt-auto">
                        <div className="flex items-baseline gap-3 mb-1">
                          <span className="text-4xl font-black text-accent tracking-tighter">R$ 5,00</span>
                          <span className="text-muted-foreground text-sm line-through opacity-50 font-bold">R$ 10,00</span>
                        </div>
                        <div className="inline-block px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                          ECONOMIZE 50%
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all text-base active:scale-95"
                        onClick={(e) => handleAddToCart(e, product.id)}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        ADICIONAR AO CARRINHO
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
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
              Não somos apenas uma loja, somos a ponte entre você e o melhor conteúdo do mundo.
            </p>
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
              <div key={i} className="flex flex-col items-center text-center space-y-6 p-10 rounded-[2.5rem] bg-card/20 border border-border/30 hover:border-accent/30 transition-colors">
                <div className="p-5 rounded-2xl bg-accent/10">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground text-base font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-border/50">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-16">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl overflow-hidden border border-accent/20">
                  <img src="/assets/cross-logo.jpg" alt="Mota Store" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter text-accent">MOTA STORE</h2>
              </div>
              <p className="text-muted-foreground text-base max-w-xs font-medium">
                O destino número um para acessos premium com o melhor custo-benefício do Brasil.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="font-black uppercase tracking-widest text-xs text-accent">Loja</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Produtos</a></li>
                  <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Ofertas</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-black uppercase tracking-widest text-xs text-accent">Suporte</h4>
                <ul className="space-y-2">
                  <li><a href="https://wa.me/5591984886473" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">WhatsApp</a></li>
                  <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Ajuda</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-black uppercase tracking-widest text-xs text-accent">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Termos</a></li>
                  <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">Privacidade</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-widest">
            <span>&copy; 2026 MOTA STORE. Todos os direitos reservados.</span>
            <div className="flex gap-4">
              <span>Feito com ❤️ por Mota Store Team</span>
            </div>
          </div>
        </div>
      </footer>
      <FlyAnimationsContainer 
        animations={flyAnimations} 
        onRemove={removeFlyAnimation} 
      />
    </div>
  );
}
