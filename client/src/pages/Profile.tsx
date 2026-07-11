import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme, ACCENT_COLORS } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, ShoppingBag, Moon, Sun, Check, Loader2, Lock, Eye, EyeOff, Mail, ShoppingCart, Gift, Wallet, Send, Camera, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, accentHue, setAccentHue } = useTheme();
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

  const uploadAvatarMutation = trpc.auth.uploadAvatar.useMutation();
  const requestCodeMutation = trpc.auth.requestVerificationCode.useMutation();


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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCodeInput, setShowDeleteCodeInput] = useState(false);
  const [deleteVerificationCode, setDeleteVerificationCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Sua conta foi excluída permanentemente.");
      logout();
      navigate("/");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir conta: " + (err.message || "Erro desconhecido"));
      setIsDeleting(false);
    }
  });



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
    if (isSendingCode) return;
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
      
      // 1. Ler arquivo como Data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;
          
          // 2. Redimensionar e comprimir imagem usando Canvas
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            const maxSize = 256; // máximo 256x256 pixels
            let width = img.width;
            let height = img.height;
            
            // Calcular novo tamanho mantendo proporção
            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Não foi possível obter contexto do canvas");
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // 3. Converter para base64 com compressão (qualidade 0.7)
            const base64Data = canvas.toDataURL("image/jpeg", 0.7);
            
            // 4. Enviar para o servidor
            await uploadAvatarMutation.mutateAsync({ base64Data });
            toast.success("Foto de perfil atualizada!");
            utils.auth.me.invalidate();
            setIsUploading(false);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          };
          img.onerror = () => {
            throw new Error("Não foi possível carregar a imagem");
          };
          img.src = dataUrl;
        } catch (err: any) {
          console.error("[AvatarUpload] Error:", err);
          toast.error("Erro ao processar imagem: " + err.message);
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.onerror = () => {
        throw new Error("Não foi possível ler o arquivo");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("[AvatarUpload] Error:", err);
      toast.error("Erro ao atualizar foto de perfil: " + err.message);
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

  const handleSendDeleteCode = async () => {
    if (isDeleting) return; // Evitar envio duplo
    try {
      setIsDeleting(true);
      await requestCodeMutation.mutateAsync({ digits: 6 });
      setShowDeleteCodeInput(true);
      toast.success("Código de 6 dígitos enviado para seu e-mail!");
    } catch (err: any) {
      toast.error("Erro ao enviar código: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteVerificationCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    try {
      setIsDeleting(true);
      await deleteAccountMutation.mutateAsync({ verificationCode: deleteVerificationCode });
    } catch (err: any) {
      // Erro já tratado no mutation
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
    if (user) {
      setName(user.name || "");
    }
  }, [user]);



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
            onClick={toggleTheme}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-accent" />}
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
		                    className="absolute -bottom-2 -right-2 h-10 w-10 bg-accent text-white dark:text-accent-foreground rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 border-4 border-card"
		                  >
		                    <Camera className="h-5 w-5 text-white dark:text-accent-foreground" />
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

                <div className="w-full space-y-3 mb-6">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cor de Destaque</label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setAccentHue(color.value)}
                        title={color.name}
                        className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                          accentHue === color.value
                            ? "border-foreground scale-110 shadow-lg"
                            : "border-transparent"
                        }`}
                        style={{ 
                          backgroundColor: color.hex 
                        }}
                      />
                    ))}
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="w-full space-y-6">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome de Exibição</label>
                    <div className="relative">
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-14 rounded-2xl bg-background/50 border-2 border-border/50 focus:border-accent font-bold pl-12"
                        placeholder="Como quer ser chamado?"
                      />
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu E-mail</label>
                    <div className="relative">
                      <Input 
                        value={user.email} 
                        disabled 
                        className="h-14 rounded-2xl bg-muted/30 border-2 border-border/50 font-bold pl-12 opacity-70"
                      />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    {!showPasswordFields ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPasswordFields(true)}
                        className="w-full h-14 rounded-2xl border-2 border-accent/20 hover:border-accent/40 hover:bg-accent/5 font-black text-xs uppercase tracking-widest"
                      >
                        <Lock className="h-4 w-4 mr-2 text-accent" />
                        ALTERAR SENHA DE ACESSO
                      </Button>
                    ) : (
                      <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nova Senha</label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="h-12 rounded-xl bg-background/50 border-2 border-border/50 focus:border-accent font-bold"
                              placeholder="Mínimo 6 caracteres"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirmar Nova Senha</label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              className={`h-12 rounded-xl bg-background/50 border-2 font-bold ${
                                passwordsMatch === true ? "border-green-500/50" : 
                                passwordsMatch === false ? "border-red-500/50" : "border-border/50"
                              }`}
                              placeholder="Repita a nova senha"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 p-4 rounded-2xl bg-accent/5 border border-accent/10">
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
                          className="w-full bg-accent text-white dark:text-accent-foreground font-black h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div className="pt-4 mt-4 border-t border-border/30">
                    {!showDeleteConfirm && !showDeleteCodeInput ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:text-red-500 transition-colors py-2"
                      >
                        Excluir conta permanentemente
                      </button>
                    ) : showDeleteConfirm && !showDeleteCodeInput ? (
                      <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 text-center">
                          Tem certeza que quer excluir sua conta permanente?<br/>
                          <span className="opacity-60">(essa ação não pode ser desfeita)</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSendDeleteCode}
                            disabled={isDeleting}
                            className="flex-1 h-10 bg-transparent text-zinc-500 dark:text-zinc-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center"
                          >
                            SIM
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="flex-1 h-10 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                          >
                            NÃO
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 text-center">
                          Verifique o código de 6 dígitos enviado pro seu e-mail
                        </p>
                        <Input
                          value={deleteVerificationCode}
                          onChange={(e) => setDeleteVerificationCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="bg-background/50 border-red-500/20 text-center font-black tracking-[0.5em] text-lg h-12 rounded-xl"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteCodeInput(false);
                              setShowDeleteConfirm(false);
                              setDeleteVerificationCode("");
                              setIsDeleting(false);
                            }}
                            disabled={isDeleting}
                            className="flex-1 h-10 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                          >
                            CANCELAR
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || deleteVerificationCode.length !== 6}
                            className="flex-1 h-10 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center"
                          >
                            EXCLUIR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black px-10 py-7 rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95"
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
