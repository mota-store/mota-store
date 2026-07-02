import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Zap, Music, Play, CheckCircle2, Star, ShieldCheck, Headphones } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [cartCount, setCartCount] = useState(0);

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      setCartCount(prev => prev + 1);
    }
  });

  const streamingPlatforms = [
    { name: "Spotify Premium", icon: <Music className="h-6 w-6" />, color: "bg-[#1DB954]" },
    { name: "YouTube Premium", icon: <Play className="h-6 w-6" />, color: "bg-[#FF0000]" },
    { name: "Prime Video", icon: <Play className="h-6 w-6" />, color: "bg-[#00A8E1]" },
    { name: "YouTube Music", icon: <Headphones className="h-6 w-6" />, color: "bg-[#FF0000]" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden">
      {/* Hero Section with Video Background */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-40 scale-105"
          >
            <source src="/assets/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background z-10" />
        </div>

        <div className="container relative z-20 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">
              MOTA STORE
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium">
              Sua porta de entrada para o entretenimento premium. Testes gratuitos de 1 mês das maiores plataformas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-7 text-lg font-bold rounded-2xl shadow-2xl shadow-accent/20 transition-all hover:scale-105"
                onClick={() => {
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explorar Produtos
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/50 backdrop-blur-md px-8 py-7 text-lg font-bold rounded-2xl hover:bg-accent/10 transition-all"
                onClick={() => (window.location.href = "https://wa.me/5591984886473")}
              >
                Falar com Suporte
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <div className="container -mt-10 relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl">
          {[
            { icon: <Zap className="text-yellow-500" />, text: "Entrega Imediata" },
            { icon: <ShieldCheck className="text-green-500" />, text: "Compra Segura" },
            { icon: <Star className="text-orange-500" />, text: "Suporte 24/7" },
            { icon: <CheckCircle2 className="text-blue-500" />, text: "Garantia Total" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-center gap-3 py-2">
              {item.icon}
              <span className="font-bold text-sm uppercase tracking-wider">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <section id="products" className="py-24">
        <div className="container">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase">Plataformas</h2>
              <p className="text-muted-foreground text-lg">Escolha sua diversão e comece agora.</p>
            </div>
            <div className="flex gap-2">
              {streamingPlatforms.map((p, i) => (
                <div key={i} className={`${p.color} p-2 rounded-lg text-white shadow-lg`}>
                  {p.icon}
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[400px] rounded-3xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {products?.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -10 }}
                  className="group"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card/30 border-border/50 backdrop-blur-sm rounded-[2rem] transition-all group-hover:border-accent/50 group-hover:shadow-2xl group-hover:shadow-accent/10">
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-accent/5 to-accent/20 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="p-12 text-accent/20">
                          {product.category === 'music' ? <Music className="w-full h-full" /> : <Play className="w-full h-full" />}
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-accent/90 text-accent-foreground px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md">
                        Premium
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-grow">
                      <h3 className="text-2xl font-black mb-2 group-hover:text-accent transition-colors">{product.name}</h3>
                      <p className="text-muted-foreground text-sm mb-6 line-clamp-2">{product.description}</p>
                      
                      <div className="mt-auto space-y-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-accent">R$ {(product.price / 100).toFixed(2)}</span>
                          <span className="text-muted-foreground text-sm line-through opacity-50">R$ {((product.price * 1.5) / 100).toFixed(2)}</span>
                        </div>
                        
                        <Button
                          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black py-7 rounded-2xl shadow-lg shadow-accent/20 transition-all"
                          onClick={() => {
                            if (isAuthenticated) {
                              addItem.mutate({ productId: product.id });
                              toast.success(`${product.name} adicionado!`);
                            } else {
                              window.location.href = getLoginUrl();
                            }
                          }}
                        >
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          ADQUIRIR AGORA
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features / Why Us */}
      <section className="py-24 bg-accent/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="container">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">POR QUE A MOTA?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Experiência premium com a segurança que você merece.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Ativação Turbo",
                desc: "Nada de espera. Comprou, pagou, ativou. Simples assim.",
                icon: <Zap className="h-12 w-12 text-accent" />
              },
              {
                title: "Suporte Humano",
                desc: "Dúvidas? Nosso time no WhatsApp está pronto para ajudar.",
                icon: <Star className="h-12 w-12 text-accent" />
              },
              {
                title: "100% Oficial",
                desc: "Acessos originais com garantia de funcionamento total.",
                icon: <ShieldCheck className="h-12 w-12 text-accent" />
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-4 p-8 rounded-[2rem] bg-card/20 border border-border/30">
                <div className="p-4 rounded-2xl bg-accent/10 mb-2">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black">{f.title}</h3>
                <p className="text-muted-foreground font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-border/50">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black tracking-tighter mb-4">MOTA STORE</h2>
              <p className="text-muted-foreground max-w-xs">O melhor do streaming premium ao seu alcance.</p>
            </div>
            
            <div className="flex gap-8">
              <a href="https://wa.me/5591984886473" className="hover:text-accent transition-colors font-bold uppercase tracking-widest text-sm">Suporte</a>
              <a href="#" className="hover:text-accent transition-colors font-bold uppercase tracking-widest text-sm">Termos</a>
              <a href="#" className="hover:text-accent transition-colors font-bold uppercase tracking-widest text-sm">Privacidade</a>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-border/20 text-center text-sm text-muted-foreground font-medium">
            &copy; 2026 MOTA STORE. DESIGN BY MANUS.
          </div>
        </div>
      </footer>
    </div>
  );
}
