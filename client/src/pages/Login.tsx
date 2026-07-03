import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Mail, Lock, User, ArrowLeft, Zap, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError("Senhas não conferem");
          setLoading(false);
          return;
        }

        const result = await registerMutation.mutateAsync({
          email,
          password,
          name,
        });

        if (result.success) {
          // Login automático após o registro
          window.location.href = "/profile?onboarding=true";
        } else {
          setError((result as any).error || "Erro ao registrar");
        }
      } else {
        const result = await loginMutation.mutateAsync({
          email,
          password,
        });

        if (result.success) {
          // Se for o primeiro login, redirecionar para o perfil para configurar nome/foto
          window.location.href = "/profile?onboarding=true";
        } else {
          setError(result.error || "Email ou senha inválidos");
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen relative flex items-center justify-center p-4 overflow-hidden touch-none">
      {/* Background Image with Pixel Art */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/login-bg.gif" 
          alt="Login Background" 
          className="w-full h-full object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-xl z-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-20 w-full max-w-md"
      >
        <Button
          variant="ghost"
          className="absolute -top-12 left-0 text-muted-foreground hover:text-foreground mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Home
        </Button>

        <Card className="p-8 bg-card border-border/50 shadow-2xl rounded-[2.5rem]">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent mb-6 shadow-xl shadow-accent/10">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">
              {isRegister ? "CRIAR CONTA" : "BEM-VINDO"}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              {isRegister ? "Junte-se à Mota Store" : "Acesse sua conta premium"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-12 bg-background/50 border-border/50 h-12 rounded-xl focus:ring-accent"
                    placeholder="Como podemos te chamar?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-12 bg-background/50 border-border/50 h-12 rounded-xl focus:ring-accent"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-12 pr-12 bg-background/50 border-border/50 h-12 rounded-xl focus:ring-accent"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    className="pl-12 pr-12 bg-background/50 border-border/50 h-12 rounded-xl focus:ring-accent"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={isRegister}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-medium"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-14 rounded-xl font-black text-lg shadow-lg shadow-accent/20 transition-all active:scale-95"
              disabled={loading}
            >
              {loading ? "PROCESSANDO..." : isRegister ? "CRIAR CONTA" : "ENTRAR"}
            </Button>

            {!isRegister && (
              <div className="text-center mt-2 flex flex-col items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Não sabe sua senha?</span>
                <button
                  type="button"
                  onClick={() => navigate("/reset-password")}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
              <span className="px-4 bg-transparent text-muted-foreground -mt-[15px]">ou continue com</span>
            </div>
          </div>

          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            variant="outline"
            className="w-full h-14 rounded-xl border-2 border-white bg-transparent backdrop-blur-sm font-bold hover:bg-white/10 transition-all -mt-[45px] text-white"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm font-black text-accent hover:underline uppercase tracking-widest"
            >
              <span className="-mt-[100px] inline-block">{isRegister ? "Já tenho uma conta" : "Criar nova conta"}</span>
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
