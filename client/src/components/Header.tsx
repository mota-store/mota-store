import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, User, LogOut, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export function Header({ onSearch, searchQuery = "" }: HeaderProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevCount, setPrevCount] = useState(cartCount);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  
  const { data: products } = trpc.products.list.useQuery();

  React.useEffect(() => {
    if (cartCount > prevCount) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevCount(cartCount);
  }, [cartCount, prevCount]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const filteredProducts = React.useMemo(() => {
    if (!products || !localSearchQuery.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(localSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [products, localSearchQuery]);

  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
    setSearchOpen(false);
    setLocalSearchQuery("");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 md:h-20 items-center justify-between px-4 gap-3">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group shrink-0"
          onClick={() => navigate("/")}
        >
          <div className="h-8 md:h-10 w-8 md:w-10 flex items-center justify-center bg-accent/10 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform">
            <img src="/assets/cross-logo.png" alt="Mota Store" className="h-5 md:h-7 w-auto object-contain" />
          </div>
          <span className="hidden sm:block text-lg md:text-xl font-black tracking-tighter text-foreground group-hover:text-accent transition-colors uppercase">
            Mota<span className="text-accent">Store</span>
          </span>
        </div>

        {/* Search Bar - Icon-based that expands */}
        <div className="flex-1 max-w-xl relative group">
          {!searchOpen ? (
            <button
              onClick={() => setSearchOpen(true)}
              className="h-10 md:h-11 w-10 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl bg-card/50 border border-border/50 text-muted-foreground hover:text-accent hover:border-accent/50 transition-all"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          ) : (
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-accent" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar produto..."
                autoFocus
                className="w-full h-10 md:h-11 pl-10 pr-3 bg-card/80 border border-accent/50 rounded-lg md:rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                value={localSearchQuery}
                onChange={handleSearchChange}
                onBlur={() => {
                  if (!localSearchQuery.trim()) {
                    setSearchOpen(false);
                  }
                }}
              />
              
              {/* Dropdown Results */}
              <AnimatePresence>
                {filteredProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-card/95 border border-border/50 rounded-lg md:rounded-xl shadow-xl backdrop-blur-md z-50 overflow-hidden"
                  >
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="w-full px-3 py-2 md:py-3 text-left hover:bg-accent/10 transition-colors border-b border-border/30 last:border-b-0 flex items-center gap-2"
                      >
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="h-8 w-8 object-contain rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-black truncate uppercase">{product.name}</p>
                          <p className="text-accent text-[10px] md:text-xs font-bold">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* Support Link */}
          <a 
            href="https://wa.me/5591984886473" 
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center justify-center h-10 md:h-11 px-3 md:px-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:text-accent transition-colors"
          >
            Suporte
          </a>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 md:p-2.5 hover:bg-card rounded-lg md:rounded-xl transition-all text-foreground border border-transparent hover:border-border/50"
          >
            {theme === "light" ? <Moon className="h-4 w-4 md:h-5 md:w-5" /> : <Sun className="h-4 w-4 md:h-5 md:w-5" />}
          </button>

          {/* Cart */}
          {isAuthenticated && (
            <motion.button
              id="cart-icon"
              onClick={() => navigate("/cart")}
              className="relative p-2 md:p-2.5 hover:bg-card rounded-lg md:rounded-xl transition-all border border-transparent hover:border-border/50"
              animate={isPulsing ? { scale: [1, 1.2, 1] } : {}}
            >
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full bg-accent text-white dark:text-black text-[8px] md:text-[10px] flex items-center justify-center font-black shadow-lg shadow-accent/20"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Auth */}
          <div className="ml-1">
            {isAuthenticated ? (
              <div 
                className="h-8 md:h-10 w-8 md:w-10 rounded-lg md:rounded-xl overflow-hidden border-2 border-accent/20 cursor-pointer hover:border-accent/50 transition-all"
                onClick={() => navigate("/profile")}
              >
                <img 
                  src={user?.avatarUrl || "/assets/default-avatar.jpg"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black uppercase tracking-widest px-4 md:px-6 rounded-lg md:rounded-xl shadow-lg shadow-accent/10 h-8 md:h-10 text-[9px] md:text-[10px]"
                onClick={() => navigate("/login?tab=register")}
              >
                Entrar
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-card rounded-lg transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
          >
            <div className="container px-4 py-4 space-y-3">
              <a 
                href="https://wa.me/5591984886473"
                className="block w-full text-left px-3 py-2 font-black uppercase tracking-widest text-xs hover:bg-accent/10 hover:text-accent rounded-lg transition-all"
              >
                Suporte
              </a>
              
              <div className="border-t border-border/40 pt-3 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full font-black uppercase tracking-widest text-xs justify-start h-10 rounded-lg"
                    >
                      <User className="h-4 w-4 mr-2 text-accent" />
                      Meu Perfil
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full font-black uppercase tracking-widest text-xs justify-start h-10 rounded-lg text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair da Conta
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black uppercase tracking-widest h-10 rounded-lg"
                    onClick={() => {
                      navigate("/login?tab=register");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Entrar na Loja
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
