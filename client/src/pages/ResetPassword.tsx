import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Lock, Zap, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation();
  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await requestResetMutation.mutateAsync({ email });
      if (result.success) {
        setEmailSent(true);
        toast.success("E-mail de recuperação enviado!");
      } else {
        toast.error("Erro ao solicitar recuperação");
      }
    } catch (err) {
      toast.error("Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }

    setLoading(true);
    try {
      const result = await resetMutation.mutateAsync({ token, password });
      if (result.success) {
        setSuccess(true);
        toast.success("Senha alterada com sucesso!");
      } else {
        toast.error(result.error || "Erro ao alterar senha");
      }
    } catch (err) {
      toast.error("Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/assets/login-bg.gif" className="w-full h-full object-cover opacity-100" />
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl z-10" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 w-full max-w-md">
          <Card className="p-8 bg-card border-border/50 shadow-2xl rounded-[2.5rem]">
            {emailSent ? (
              <div className="text-center py-8">
                <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-10 w-10 text-accent" />
                </div>
                <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">E-MAIL ENVIADO!</h2>
                <p className="text-muted-foreground mb-10 font-medium">Verifique sua caixa de entrada para redefinir sua senha.</p>
                <Button 
                  className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-xl"
                  onClick={() => navigate("/login")}
                >
                  VOLTAR AO LOGIN
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent mb-6">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase">RECUPERAR ACESSO</h1>
                  <p className="text-muted-foreground mt-2 font-medium">Digite seu e-mail para receber o link.</p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        className="pl-12 bg-background/50 border-border/50 h-12 rounded-xl"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-14 rounded-xl font-black text-lg shadow-lg shadow-accent/20"
                    disabled={loading}
                  >
                    {loading ? "ENVIANDO..." : "ENVIAR LINK"}
                  </Button>
                  
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => navigate("/login")}
                      className="text-sm font-black text-muted-foreground hover:text-accent uppercase tracking-widest"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-12 text-center max-w-md bg-card/40 backdrop-blur-2xl border-border/50 rounded-[2.5rem]">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">SENHA ALTERADA!</h2>
            <p className="text-muted-foreground mb-10 font-medium">Sua nova senha já está ativa. Você pode fazer login agora.</p>
            <Button 
              className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-xl"
              onClick={() => navigate("/login")}
            >
              IR PARA O LOGIN
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="/assets/login-bg.gif" className="w-full h-full object-cover opacity-100" />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-xl z-10" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 w-full max-w-md">
        <Card className="p-8 bg-card border-border/50 shadow-2xl rounded-[2.5rem]">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent mb-6">
              <Lock className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">NOVA SENHA</h1>
            <p className="text-muted-foreground mt-2 font-medium">Escolha uma senha forte para sua conta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-12 pr-12 bg-background/50 border-border/50 h-12 rounded-xl"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest ml-1 text-muted-foreground">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-12 bg-background/50 border-border/50 h-12 rounded-xl"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-14 rounded-xl font-black text-lg shadow-lg shadow-accent/20"
              disabled={loading}
            >
              {loading ? "ALTERANDO..." : "REDEFINIR SENHA"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
