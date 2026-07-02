import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ShoppingCart, Zap, Music, Play, CheckCircle2, Star, ShieldCheck, Headphones } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      toast.success("Produto adicionado ao carrinho!");
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden">
      <Header />

      {/* Hero Section with Video Background */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
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
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">
              MOTA STORE
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-medium">
              Testes gratuitos de 1 mês das maiores plataformas de streaming.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-base font-bold rounded-xl shadow-lg shadow-accent/20 transition-all hover:scale-105"
                onClick={() => {
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Ver Produtos
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/50 backdrop-blur-md px-8 py-6 text-base font-bold rounded-xl hover:bg-accent/10 transition-all"
                onClick={() => (window.location.href = "https://wa.me/5591984886473")}
              >
                Suporte
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <div className="container px-4 -mt-8 relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl">
          {[
            { icon: <Zap className="text-yellow-500 h-5 w-5" />, text: "Entrega Imediata" },
            { icon: <ShieldCheck className="text-green-500 h-5 w-5" />, text: "Compra Segura" },
            { icon: <Star className="text-orange-500 h-5 w-5" />, text: "Suporte 24/7" },
            { icon: <CheckCircle2 className="text-blue-500 h-5 w-5" />, text: "Garantia Total" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-center gap-2 py-2">
              {item.icon}
              <span className="font-bold text-xs md:text-sm uppercase tracking-wider">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <section id="products" className="py-16">
        <div className="container px-4">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-3 uppercase">Plataformas</h2>
            <p className="text-muted-foreground text-lg">Escolha sua diversão e comece agora.</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products?.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card/30 border-border/50 backdrop-blur-sm rounded-2xl transition-all group-hover:border-accent/50 group-hover:shadow-xl group-hover:shadow-accent/10">
                    {/* Product Image */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="p-8 text-accent/20">
                          {product.category === 'music' ? <Music className="w-full h-full" /> : <Play className="w-full h-full" />}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-accent/90 text-accent-foreground px-2 py-1 rounded-lg text-xs font-black uppercase tracking-widest backdrop-blur-md">
                        Premium
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-black mb-1 group-hover:text-accent transition-colors line-clamp-2">{product.name}</h3>
                      <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{product.description}</p>
                      
                      {/* Price */}
                      <div className="mb-4 mt-auto">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-2xl font-black text-accent">R$ 5,00</span>
                          <span className="text-muted-foreground text-xs line-through opacity-50">R$ 10,00</span>
                        </div>
                        <span className="text-green-500 text-xs font-bold">50% OFF</span>
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-5 rounded-xl shadow-lg shadow-accent/20 transition-all text-sm"
                        onClick={() => {
                          if (isAuthenticated) {
                            addItem.mutate({ productId: product.id });
                          } else {
                            window.location.href = getLoginUrl();
                          }
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        ADICIONAR
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
      <section className="py-16 bg-accent/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">POR QUE A MOTA?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Experiência premium com a segurança que você merece.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Ativação Turbo",
                desc: "Nada de espera. Comprou, pagou, ativou. Simples assim.",
                icon: <Zap className="h-10 w-10 text-accent" />
              },
              {
                title: "Suporte Humano",
                desc: "Dúvidas? Nosso time no WhatsApp está pronto para ajudar.",
                icon: <Star className="h-10 w-10 text-accent" />
              },
              {
                title: "100% Oficial",
                desc: "Acessos originais com garantia de funcionamento total.",
                icon: <ShieldCheck className="h-10 w-10 text-accent" />
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-card/20 border border-border/30">
                <div className="p-3 rounded-xl bg-accent/10">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black">{f.title}</h3>
                <p className="text-muted-foreground text-sm font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black tracking-tighter mb-2">MOTA STORE</h2>
              <p className="text-muted-foreground text-sm max-w-xs">O melhor do streaming premium ao seu alcance.</p>
            </div>
            
            <div className="flex gap-6 md:gap-12">
              <a href="https://wa.me/5591984886473" className="hover:text-accent transition-colors font-bold uppercase tracking-widest text-xs">Suporte</a>
              <a href="#" className="hover:text-accent transition-colors font-bold uppercase tracking-widest text-xs">Termos</a>
              <a href="#" className="hover:text-accent transition-colors font-bold uppercase tracking-widest text-xs">Privacidade</a>
            </div>
          </div>
          
          <div className="pt-6 border-t border-border/20 text-center text-xs text-muted-foreground font-medium">
            &copy; 2026 MOTA STORE. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
