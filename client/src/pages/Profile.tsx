import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, ShoppingBag, Moon, Sun, Check, Loader2, Lock, Eye, EyeOff, Mail, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const searchParams = new URLSearchParams(window.location.search);
  const isOnboarding = searchParams.get("onboarding") === "true";

  const { data: allOrders } = trpc.orders.list.useQuery();
  const orders = allOrders?.filter(order => order.status === "completed");
  
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordFields(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil.");
    }
  });

  const [isDark, setIsDark] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);

  const requestCodeMutation = trpc.auth.requestVerificationCode.useMutation();
  const verifyCodeMutation = trpc.auth.verifyCodeAndShowPassword.useMutation();

  const handleShowCurrentPassword = async () => {
    if (user?.loginMethod === "google") {
      toast.info("Contas Google não possuem senha definida no sistema. Crie uma senha abaixo se desejar.");
      return;
    }
    try {
      setIsVerifying(true);
      await requestCodeMutation.mutateAsync();
      setShowCodeModal(true);
      toast.success("Código de verificação enviado para seu e-mail!");
    } catch (err: any) {
      toast.error("Erro ao enviar código: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 4) {
      toast.error("O código deve ter 4 dígitos");
      return;
    }

    try {
      setIsVerifying(true);
      const result = await verifyCodeMutation.mutateAsync({ code: verificationCode });
      if (result.success) {
        setShowCodeModal(false);
        setIdentityVerified(true);
        toast.success("Identidade confirmada! Por segurança, as senhas são criptografadas. Você pode alterá-la abaixo.");
      } else {
        toast.error(result.error || "Código inválido");
      }
    } catch (err: any) {
      toast.error("Erro ao verificar código: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (showPasswordFields) {
      if (newPassword.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error("As senhas não conferem.");
        return;
      }
      updateProfile.mutate({ name, password: newPassword });
    } else {
      updateProfile.mutate({ name });
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      {/* Modal de Código de Verificação */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border p-8 rounded-[2rem] max-w-sm w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-accent mb-2">
                  <Mail className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Verifique seu e-mail</h2>
                <p className="text-sm text-muted-foreground">
                  Enviamos um código de 4 dígitos para <span className="text-foreground font-bold">{user?.email}</span>. Digite-o abaixo para continuar.
                </p>
                
                <div className="pt-4">
                  <Input
                    type="text"
                    maxLength={4}
                    placeholder="0000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-3xl font-black tracking-[1rem] h-16 bg-muted/50 border-2 border-accent/30 rounded-2xl focus:border-accent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="ghost"
                    className="flex-1 font-bold uppercase tracking-widest text-xs"
                    onClick={() => setShowCodeModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-accent hover:bg-accent/90 font-black uppercase tracking-widest text-xs"
                    onClick={handleVerifyCode}
                    disabled={isVerifying || verificationCode.length !== 4}
                  >
                    {isVerifying ? "Verificando..." : "Confirmar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isOnboarding && (
        <div className="bg-accent text-accent-foreground py-3 px-4 text-center font-black uppercase tracking-widest text-xs animate-pulse">
          Bem-vindo! Por favor, confirme seu nome e foto de perfil abaixo.
        </div>
      )}
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg overflow-hidden border border-accent/20">
              <img src="/assets/cross-logo.jpg" alt="Mota Store" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-black text-accent">MOTA STORE</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {isDark ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-accent" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-8 sticky top-24 bg-card/30 backdrop-blur-sm border-border/50 rounded-[2.5rem] shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="h-32 w-32 rounded-[2.5rem] bg-accent/10 flex items-center justify-center overflow-hidden border-2 border-accent/20">
                    <img 
                      src={user.avatarUrl || "/assets/default-avatar.jpg"} 
                      alt={user.name || "Avatar"} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="w-full space-y-6">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome de Exibição</label>
                    <div className="relative">
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-14 rounded-2xl bg-background/50 border-border/50 pl-4 pr-12 font-bold text-lg focus:ring-accent"
                        placeholder="Como quer ser chamado?"
                      />
                      <button 
                        type="submit"
                        disabled={updateProfile.isPending || name === user.name}
                        className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center bg-accent/10 text-accent rounded-xl hover:bg-accent hover:text-accent-foreground transition-all disabled:opacity-0"
                      >
                        {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="w-full space-y-4 pt-4 text-left">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">E-mail da Conta</span>
                      <p className="font-bold text-sm truncate">{user.email}</p>
                    </div>

                    {!showPasswordFields ? (
                      <div className="space-y-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPasswordFields(true)}
                          className="w-full h-12 rounded-xl border-accent/20 text-accent font-bold text-xs uppercase tracking-widest hover:bg-accent/10"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Alterar Senha
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleShowCurrentPassword}
                          disabled={isVerifying}
                          className="w-full h-10 rounded-xl text-accent/70 font-bold text-[10px] uppercase tracking-widest hover:bg-accent/5"
                        >
                          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver Senha Atual"}
                        </Button>
                        
                        {identityVerified && (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Identidade Verificada</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 p-4 rounded-2xl bg-accent/5 border border-accent/20 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent">Nova Senha</span>
                          <button 
                            type="button" 
                            onClick={() => setShowPasswordFields(false)}
                            className="text-[10px] font-black text-muted-foreground hover:text-foreground"
                          >
                            CANCELAR
                          </button>
                        </div>
                        {user.loginMethod === "google" && (
                          <p className="text-[10px] text-yellow-500/80 font-medium mb-2">
                            Você entrou com o Google. Defina uma senha para acesso manual.
                          </p>
                        )}
                        
                        <div className="space-y-3">
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Nova senha (min. 6)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="h-10 rounded-lg bg-background/50 border-border/50 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          
                          <Input
                            type="password"
                            placeholder="Confirme a nova senha"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="h-10 rounded-lg bg-background/50 border-border/50 text-sm"
                          />
                          
                          <Button
                            type="button"
                            onClick={handleUpdateProfile}
                            disabled={updateProfile.isPending}
                            className="w-full bg-accent text-accent-foreground font-black h-10 rounded-lg"
                          >
                            {updateProfile.isPending ? "SALVANDO..." : "SALVAR SENHA"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => logout()}
                    variant="ghost"
                    className="w-full h-12 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/5 font-black text-xs uppercase tracking-widest"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    ENCERRAR SESSÃO
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* Orders Section */}
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h3 className="text-4xl font-black tracking-tighter mb-4 uppercase">MEUS <span className="text-accent">PEDIDOS</span></h3>
              <p className="text-muted-foreground text-lg font-medium">
                {orders && orders.length > 0
                  ? `Você já garantiu ${orders.length} acesso${orders.length !== 1 ? "s" : ""} premium.`
                  : "Você ainda não tem nenhum acesso ativo."}
              </p>
            </div>
            {orders && orders.length > 0 ? (
              <div className="space-y-6">
                {orders.map((order) => (
                  <Card key={order.id} className="p-8 bg-card/30 backdrop-blur-sm border-border/50 rounded-[2.5rem] hover:border-accent/30 transition-all group shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-6 border-b border-border/50">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Identificador do Pedido</p>
                        <p className="text-lg font-black group-hover:text-accent transition-colors">#MOTA-{order.id}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Valor Total</p>
                        <p className="text-3xl font-black text-accent tracking-tighter">
                          R$ {(order.totalAmount / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            order.status === "completed"
                              ? "bg-green-500/10 text-green-500 border border-green-500/20"
                              : order.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}
                        >
                          {order.status === "completed"
                            ? "✓ Ativado"
                            : order.status === "pending"
                            ? "⏳ Processando"
                            : "✕ Cancelado"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Realizado em {new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <Button 
                        variant="link" 
                        className="text-accent hover:text-accent/80 p-0 h-auto font-black"
                        onClick={() => window.location.href = `https://wa.me/5591984886473?text=Olá! Preciso de ajuda com o pedido #MOTA-${order.id}`}
                      >
                        PRECISA DE AJUDA?
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-16 text-center bg-card/30 backdrop-blur-sm border-border/50 rounded-[2.5rem] border-dashed">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-50" />
                </div>
                <h4 className="text-2xl font-black mb-2 uppercase tracking-tight">Sua estante está vazia</h4>
                <p className="text-muted-foreground mb-10 max-w-xs mx-auto font-medium">
                  Garanta agora seu acesso premium às melhores plataformas do mundo.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-black px-10 py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95"
                >
                  VER PLATAFORMAS DISPONÍVEIS
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
