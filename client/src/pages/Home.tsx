import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Music, Play, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const [cartCount, setCartCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-accent">MOTA STORE</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium hover:text-accent transition-colors">
              Ofertas
            </a>
            <a href="#" className="text-sm font-medium hover:text-accent transition-colors">
              Sobre
            </a>
            <a href="#" className="text-sm font-medium hover:text-accent transition-colors">
              Contato
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user?.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/profile")}
                >
                  Perfil
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Entrar com Google
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Os Melhores Testes Gratuitos de Streaming
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Acesse 30 dias grátis das principais plataformas de música e vídeo. Sem compromisso, cancele quando quiser.
            </p>
            <div className="flex gap-4">
              <Button size="lg" className="bg-accent hover:bg-accent/90">
                Explorar Ofertas
              </Button>
              <Button size="lg" variant="outline">
                Saiba Mais
              </Button>
            </div>
          </div>
        </div>

        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-accent/10 to-transparent" />
      </section>

      {/* Products Grid */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold mb-12">Plataformas Disponíveis</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products?.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col"
                >
                  {/* Product Image */}
                  <div className="h-40 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                    {product.category === "music" ? (
                      <Music className="h-16 w-16 text-accent/40" />
                    ) : (
                      <Play className="h-16 w-16 text-accent/40" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Trial Info */}
                    <div className="mb-4 p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm font-semibold text-accent">
                        {product.trialDays} dias grátis
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Depois R$ {(product.price / 100).toFixed(2)}/mês
                      </p>
                    </div>

                    {/* Benefits */}
                    {product.benefits && (
                      <ul className="text-xs text-muted-foreground mb-4 space-y-1">
                        {JSON.parse(product.benefits).slice(0, 2).map((benefit: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-accent mt-1">•</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-auto flex gap-2">
                      <Button
                        className="flex-1 bg-accent hover:bg-accent/90"
                        onClick={() => {
                          if (isAuthenticated) {
                            navigate(`/product/${product.id}`);
                          } else {
                            window.location.href = getLoginUrl();
                          }
                        }}
                      >
                        Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (isAuthenticated) {
                            setCartCount(cartCount + 1);
                          } else {
                            window.location.href = getLoginUrl();
                          }
                        }}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <h2 className="text-3xl font-bold mb-12 text-center">Por Que Escolher MOTA STORE?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Rápido e Fácil",
                description: "Ative seu teste gratuito em apenas alguns cliques",
              },
              {
                icon: <ShoppingCart className="h-8 w-8" />,
                title: "Melhor Preço",
                description: "Encontre as melhores ofertas de streaming em um só lugar",
              },
              {
                icon: <Music className="h-8 w-8" />,
                title: "Sem Compromisso",
                description: "Cancele quando quiser, sem taxas ocultas",
              },
            ].map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">MOTA STORE</h4>
              <p className="text-sm text-muted-foreground">
                Sua plataforma de testes gratuitos de streaming
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-accent transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-accent transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Termos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-accent transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Ajuda</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 MOTA STORE. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
