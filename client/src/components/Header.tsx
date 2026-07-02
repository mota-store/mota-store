import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, User, LogOut, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getLoginUrl } from "@/const";

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-accent/20 border border-accent/20">
            <img src="/assets/cross-logo.jpg" alt="Mota Store" className="w-full h-full object-cover" />
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

        {/* Right Side - Auth & Cart */}
        <div className="flex items-center gap-4">
          {/* Cart - Only visible when authenticated */}
          {isAuthenticated && (
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
          )}

          {/* Auth Buttons - Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div 
                  className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-xl border border-border/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate("/profile")}
                >
                  <div className="h-6 w-6 rounded-full overflow-hidden border border-accent/20">
                    <img 
                      src={user?.avatarUrl || "/assets/default-avatar.jpg"} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm font-bold pr-1">{user?.name?.split(" ")[0]}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="font-bold text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sair
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 font-black uppercase tracking-widest px-6"
                onClick={() => navigate("/login")}
              >
                Entrar / Cadastro
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
              <div className="border-t border-border/50 pt-3 space-y-2">
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-2 text-sm font-bold">
                      Olá, {user?.name?.split(" ")[0]}!
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigate("/profile");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full font-bold"
                    >
                      Perfil
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full font-bold text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full font-bold"
                    >
                      Entrar
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-accent hover:bg-accent/90 font-bold"
                      onClick={() => {
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Cadastro
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
