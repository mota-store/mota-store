import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, ShoppingBag, Moon, Sun, Check, Loader2, Lock, Eye, EyeOff, Mail, ShoppingCart, Gift, Wallet, Send, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const isOnboarding = searchParams.get("onboarding") === "true";

  const { data: allOrders } = trpc.orders.list.useQuery();
  const orders = allOrders?.filter(order => order.status === "completed");
  const { data: balance } = trpc.wallet.getBalance.useQuery(undefined, { enabled: !!user });
  const { data: transactions } = trpc.wallet.getUserTransactions.useQuery(undefined, { enabled: !!user });
  
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
      setNewPassword("");
      setConfirmNewPassword("");
      setVerificationCode("");
      setShowPasswordFields(false);
      setPasswordsMatch(null);
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar perfil: " + (err.message || "Erro desconhecido"));
    }
  });

  const getUploadUrlMutation = trpc.auth.getUploadUrl.useMutation();
  const requestCodeMutation = trpc.auth.requestVerificationCode.useMutation();

  const [isDark, setIsDark] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<true | false | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Validação em tempo real das senhas
  useEffect(() => {
    if (newPassword.length === 0 && confirmNewPassword.length === 0) {
      setPasswordsMatch(null);
      return;
    }
    if (newPassword.length >= 6 && confirmNewPassword.length >= 6) {
      setPasswordsMatch(newPassword === confirmNewPassword);
    } else if (confirmNewPassword.length >= 6 && newPassword.length >= 6) {
      setPasswordsMatch(false);
    } else {
      setPasswordsMatch(null);
    }
  }, [newPassword, confirmNewPassword]);

  const handleSendCode = async () => {
    try {
      setIsSendingCode(true);
      await requestCodeMutation.mutateAsync();
      setCodeSent(true);
      toast.success("Código de 4 dígitos enviado para seu e-mail!");
    } catch (err: any) {
      toast.error("Erro ao enviar código: " + err.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      
      // 1. Obter URL de upload presignada
      const uploadResult = await getUploadUrlMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });

      const { uploadUrl, publicUrl } = uploadResult;
      // Se for upload local, precisamos passar a key na query string
      const finalUploadUrl = (uploadResult as any).isLocal 
        ? `${uploadUrl}?key=${(uploadResult as any).key}` 
        : uploadUrl;

      // 2. Fazer o upload
      const uploadResp = await fetch(finalUploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResp.ok) {
        throw new Error("Falha no upload da imagem");
      }

      // 3. Atualizar o perfil com a nova URL
      await updateProfile.mutateAsync({ avatarUrl: publicUrl });
      toast.success("Foto de perfil atualizada!");
      
    } catch (err: any) {
      console.error("[AvatarUpload] Error:", err);
      toast.error("Erro ao atualizar foto de perfil: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Verificar se o botão deve estar ativo
  const canSubmitPassword = 
    newPassword.length >= 6 &&
    confirmNewPassword.length >= 6 &&
    newPassword === confirmNewPassword &&
    verificationCode.length === 4;

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
      if (verificationCode.length !== 4) {
        toast.error("Digite o código de 4 dígitos enviado no seu e-mail.");
        return;
      }
      updateProfile.mutate({ name, password: newPassword, verificationCode });
    } else {
      updateProfile.mutate({ name });
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

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
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
            <div className="h-8 w-8 flex items-center justify-center">
              <img src="/assets/cross-logo.png" alt="Mota Store" className="h-full w-auto object-contain" />
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
                <div className="relative mb-8 group">
                  <div className="h-32 w-32 rounded-[2.5rem] bg-accent/10 flex items-center justify-center overflow-hidden border-2 border-accent/20 relative">
                    <img 
                      src={user.avatarUrl || "/assets/default-avatar.jpg"} 
                      alt={user.name || "Avatar"} 
                      className="w-full h-full object-cover" 
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-accent animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Botão de Upload */}
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 h-10 w-10 bg-accent text-accent-foreground rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 border-4 border-card"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Carteira / Saldo */}
                <div className="w-full space-y-3 mb-6">
                  <button
                    onClick={() => navigate("/redeem-coupon")}
                    className="w-full p-4 rounded-2xl bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gift className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent">Cupom</p>
                          <p className="text-xs text-muted-foreground">Resgatar cupom promocional</p>
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-accent rotate-180" />
                    </div>
                  </button>

                  <div className="p-4 rounded-2xl bg-card/50 border border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Wallet className="h-5 w-5 text-green-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-2xl font-black text-green-500">R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</p>
                      <Button 
                        onClick={() => navigate("/wallet/deposit")}
                        size="sm"
                        className="h-8 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-3"
                      >
                        Recarregar
                      </Button>
                    </div>
                    {transactions && transactions.length > 0 && (
                      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                        {transactions.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between text-[10px] py-1 px-2 rounded-lg bg-muted/10">
                            <span className="font-medium text-muted-foreground">
                              {tx.type === "admin_credit" ? "Crédito" : tx.type === "purchase" ? "Compra" : tx.type === "coupon" ? "Cupom" : tx.type}
                            </span>
                            <span className={`font-black ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {tx.amount >= 0 ? "+" : ""}R$ {(Math.abs(tx.amount) / 100).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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

                    {/* Seção de Alterar Senha */}
                    {!showPasswordFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordFields(true);
                          setNewPassword("");
                          setConfirmNewPassword("");
                          setVerificationCode("");
                          setPasswordsMatch(null);
                          setCodeSent(false);
                        }}
                        className="w-full h-12 rounded-xl border-accent/20 text-accent font-bold text-xs uppercase tracking-widest hover:bg-accent/10"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </Button>
                    ) : (
                      <div className="space-y-4 p-4 rounded-2xl bg-accent/5 border border-accent/20 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent">Alterar Senha</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setShowPasswordFields(false);
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setVerificationCode("");
                              setPasswordsMatch(null);
                              setCodeSent(false);
                            }}
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

                        {/* Campo Nova Senha */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nova Senha</label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Mínimo 6 caracteres"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="h-12 rounded-xl bg-background/50 border-border/50 text-sm pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {newPassword.length > 0 && newPassword.length < 6 && (
                            <p className="text-[10px] text-red-400">Mínimo 6 caracteres</p>
                          )}
                        </div>

                        {/* Campo Confirmar Senha */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirmar Nova Senha</label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirme a nova senha"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              className="h-12 rounded-xl bg-background/50 border-border/50 text-sm pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {passwordsMatch === false && (
                            <p className="text-[10px] text-red-400 font-bold">As senhas não coincidem</p>
                          )}
                          {passwordsMatch === true && (
                            <p className="text-[10px] text-green-400 font-bold">Senhas coincidem ✓</p>
                          )}
                        </div>

                        {/* Campo Código de Verificação */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Código de Verificação
                            </label>
                            {!codeSent ? (
                              <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={isSendingCode}
                                className="text-[10px] text-accent hover:text-accent/80 font-black uppercase tracking-widest flex items-center gap-1"
                              >
                                {isSendingCode ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Enviar código
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={isSendingCode}
                                className="text-[10px] text-accent hover:text-accent/80 font-black uppercase tracking-widest flex items-center gap-1"
                              >
                                {isSendingCode ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Reenviar código
                              </button>
                            )}
                          </div>
                          <Input
                            type="text"
                            maxLength={4}
                            placeholder="0000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                            className="text-center text-2xl font-black tracking-[0.75rem] h-14 rounded-xl bg-background/50 border-2 border-accent/30 focus:border-accent"
                          />
                          <p className="text-[10px] text-muted-foreground/70">
                            {codeSent 
                              ? "Verifique seu e-mail (e a pasta spam) para obter o código." 
                              : "Clique em 'Enviar código' para receber o código de 4 dígitos."}
                          </p>
                        </div>

                        {/* Botão Alterar Senha */}
                        <Button
                          type="button"
                          onClick={handleUpdateProfile}
                          disabled={!canSubmitPassword || updateProfile.isPending}
                          className="w-full bg-accent text-accent-foreground font-black h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updateProfile.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ALTERANDO...
                            </>
                          ) : "ALTERAR SENHA"}
                        </Button>
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
