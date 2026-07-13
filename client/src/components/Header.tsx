import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, User, LogOut, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

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

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between px-4 gap-4">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          onClick={() => navigate("/")}
        >
          <div className="h-10 w-10 flex items-center justify-center bg-accent/10 rounded-xl group-hover:scale-110 transition-transform">
            <img src="/assets/cross-logo.png" alt="Mota Store" className="h-7 w-auto object-contain" />
          </div>
          <span className="hidden sm:block text-xl font-black tracking-tighter text-foreground group-hover:text-accent transition-colors uppercase">
            Mota<span className="text-accent">Store</span>
          </span>
        </div>

        {/* Search Bar in Header - Like Nexuz Store */}
        {onSearch && (
          <div className="flex-1 max-w-xl relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Pesquisar produtos..."
              className="w-full h-11 pl-11 pr-4 bg-card/50 border-border/50 rounded-2xl text-sm font-medium focus-visible:ring-accent/30 focus-visible:border-accent transition-all"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Support Link */}
          <a 
            href="https://wa.me/5591984886473" 
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center justify-center h-11 px-4 text-[10px] font-black uppercase tracking-widest hover:text-accent transition-colors"
          >
            Suporte
          </a>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-card rounded-xl transition-all text-foreground border border-transparent hover:border-border/50"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* Cart */}
          {isAuthenticated && (
            <motion.button
              id="cart-icon"
              onClick={() => navigate("/cart")}
              className="relative p-2.5 hover:bg-card rounded-xl transition-all border border-transparent hover:border-border/50"
              animate={isPulsing ? { scale: [1, 1.2, 1] } : {}}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-white dark:text-black text-[10px] flex items-center justify-center font-black shadow-lg shadow-accent/20"
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
                className="h-10 w-10 rounded-xl overflow-hidden border-2 border-accent/20 cursor-pointer hover:border-accent/50 transition-all"
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
                className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black uppercase tracking-widest px-6 rounded-xl shadow-lg shadow-accent/10 h-11"
                onClick={() => navigate("/login?tab=register")}
              >
                Entrar
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2.5 hover:bg-card rounded-xl transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
            <div className="container px-4 py-6 space-y-4">
              <a 
                href="https://wa.me/5591984886473"
                className="block w-full text-left px-4 py-3 font-black uppercase tracking-widest text-sm hover:bg-accent/10 hover:text-accent rounded-xl transition-all"
              >
                Suporte
              </a>
              
              <div className="border-t border-border/40 pt-4 space-y-3">
                {isAuthenticated ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full font-black uppercase tracking-widest text-sm justify-start h-12 rounded-xl"
                    >
                      <User className="h-5 w-5 mr-3 text-accent" />
                      Meu Perfil
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full font-black uppercase tracking-widest text-sm justify-start h-12 rounded-xl text-destructive"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sair da Conta
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black uppercase tracking-widest h-12 rounded-xl"
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
