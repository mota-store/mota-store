import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, User, LogOut, Zap, Sun, Moon, CreditCard } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getLoginUrl } from "@/const";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevCount, setPrevCount] = useState(cartCount);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  React.useEffect(() => {
    const checkPendingPayment = () => {
      const pending = !!sessionStorage.getItem("pix_payment");
      setHasPendingPayment(pending);
    };

    checkPendingPayment();
    
    // Verificar periodicamente para detectar mudanças no sessionStorage
    const interval = setInterval(checkPendingPayment, 2000);
    return () => clearInterval(interval);
  }, []);

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
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <div className="h-10 w-10 flex items-center justify-center">
            <img src="/assets/cross-logo.png" alt="Mota Store" className="h-full w-auto object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-accent">MOTA STORE</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
            className="text-sm font-bold uppercase tracking-widest hover:text-accent transition-colors"
          >
            Produtos
          </button>
          <a 
            href="https://wa.me/5591984886473" 
            className="text-sm font-bold uppercase tracking-widest hover:text-accent transition-colors"
          >
            Suporte
          </a>
        </nav>

        {/* Right Side - Auth & Cart & Payment */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle - Desktop */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex p-2 hover:bg-muted rounded-lg transition-colors text-foreground"
            title={theme === "light" ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          {/* Pending Payment Badge - Only visible when authenticated and has pending payment */}
          {isAuthenticated && hasPendingPayment && (
            <motion.button
              id="payment-icon"
              onClick={() => navigate("/checkout?direct=true")}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <CreditCard className="h-5 w-5 text-yellow-500" />
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            </motion.button>
          )}
          {/* Cart - Only visible when authenticated */}
          {isAuthenticated && (
            <motion.button
              id="cart-icon"
              onClick={() => navigate("/cart")}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
              animate={isPulsing ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.6 }}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-accent text-white dark:text-accent-foreground text-[10px] flex items-center justify-center font-black"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
              {isPulsing && (
                <span className="absolute inset-0 rounded-lg bg-accent/20 animate-ping pointer-events-none" />
              )}
            </motion.button>
          )}

          {/* Auth Buttons - Desktop & Mobile Avatar */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div 
                  className="h-10 w-10 rounded-full overflow-hidden border-2 border-accent/50 cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-accent/20"
                  onClick={() => navigate("/profile")}
                >
                  <img 
                    src={user?.avatarUrl || "/assets/default-avatar.jpg"} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="hidden sm:flex font-black uppercase tracking-widest text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sair
                </Button>
              </div>
            ) : (
	              <Button
	                size="sm"
	                className="bg-accent hover:bg-accent/90 text-accent-foreground dark:text-black font-black uppercase tracking-widest px-6 rounded-xl"
	                onClick={() => navigate("/login?tab=register")}
	              >
	                Cadastrar
	              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 bg-card/50 backdrop-blur-xl"
          >
            <div className="container px-4 py-4 space-y-3">
              <button 
                onClick={() => {
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 font-bold uppercase tracking-widest hover:bg-muted rounded-lg transition-colors"
              >
                Produtos
              </button>
              <a 
                href="https://wa.me/5591984886473"
                className="block w-full text-left px-4 py-2 font-bold uppercase tracking-widest hover:bg-muted rounded-lg transition-colors"
              >
                Suporte
              </a>
              <button
                onClick={() => {
                  toggleTheme?.();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2 font-bold uppercase tracking-widest hover:bg-muted rounded-lg transition-colors"
              >
                <span>Modo {theme === "light" ? "Escuro" : "Claro"}</span>
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
              <div className="border-t border-border/50 pt-3 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full font-black uppercase tracking-widest text-sm justify-start"
                    >
                      <User className="h-5 w-5 mr-3 text-accent" />
                      Meu Perfil
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full font-black uppercase tracking-widest text-sm justify-start text-destructive"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sair da Conta
                    </Button>
                  </>
                ) : (
	                    <Button
	                    size="lg"
	                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground dark:text-black font-black uppercase tracking-widest"
	                    onClick={() => {
	                      navigate("/login?tab=register");
	                      setMobileMenuOpen(false);
	                    }}
	                  >
	                    Cadastrar
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
