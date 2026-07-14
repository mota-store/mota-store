import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme, ACCENT_COLORS } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, ShoppingBag, Moon, Sun, Check, Loader2, Lock, Eye, EyeOff, Mail, ShoppingCart, Gift, Wallet, Send, Camera, Sparkles, X } from "lucide-react";
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


  const { data: balance } = trpc.wallet.getBalance.useQuery(undefined, { enabled: !!user });
  const { data: transactions } = trpc.wallet.getTransactions.useQuery(undefined, { enabled: !!user });
  
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onMutate: async (variables) => {
      if (variables.name) {
        await utils.auth.me.cancel();
        const previousUser = utils.auth.me.getData();
        if (previousUser) {
          utils.auth.me.setData(undefined, {
            ...previousUser,
            name: variables.name
          });
        }
        return { previousUser };
      }
    },
    onSuccess: (data) => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
      if (data && 'name' in data) {
        setName(data.name as string);
      }
      setNewPassword("");
      setConfirmNewPassword("");
      setVerificationCode("");
      setShowPasswordFields(false);
      setPasswordsMatch(null);
      setShowNameConfirm(false);
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
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCodeInput, setShowDeleteCodeInput] = useState(false);
  const [deleteVerificationCode, setDeleteVerificationCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);

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

  // Verificar se o nome foi alterado e tem mais de 4 caracteres
  const nameChanged = name !== user?.name && name.length > 4;

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name !== user?.name && name.length > 4) {
      setShowNameConfirm(true);
      return;
    }

    if (!showPasswordFields) {
      if (name === user?.name) {
        toast.info("Nenhuma alteração foi feita.");
        return;
      }
      await updateProfile.mutateAsync({ name });
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      toast.error("Preencha todos os campos de senha");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (!verificationCode) {
      toast.error("Digite o código de verificação");
      return;
    }

    await updateProfile.mutateAsync({
      password: newPassword,
      verificationCode,
    });
  };

  const handleConfirmNameChange = async () => {
    await updateProfile.mutateAsync({ name });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > 256) {
              height *= 256 / width;
              width = 256;
            }
          } else {
            if (height > 256) {
              width *= 256 / height;
              height = 256;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          const attemptCompression = (quality: number) => {
            const base64 = canvas.toDataURL("image/jpeg", quality);
            const size = Math.round((base64.length * 3) / 4);
            
            if (size <= 60000) {
              resolve(base64);
            } else if (quality > 0.5) {
              attemptCompression(0.5);
            } else if (quality > 0.3) {
              attemptCompression(0.3);
            } else if (quality > 0.1) {
              attemptCompression(0.1);
            } else {
              // Se mesmo com qualidade 0.1 for maior que 60kb, resolvemos com o que tivermos,
              // mas o banco de dados longtext deveria suportar. O erro pode ser o limite do pacote MySQL.
              resolve(base64);
            }
          };

          attemptCompression(0.85);
        };
        img.onerror = () => reject(new Error("Erro ao carregar imagem."));
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(file);
      setPreviewAvatar(compressedBase64);
      
      await uploadAvatarMutation.mutateAsync({ base64Data: compressedBase64 });
      await utils.auth.me.invalidate();
      
      toast.success("Avatar atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload.");
      setPreviewAvatar(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteVerificationCode) {
      toast.error("Digite o código de verificação");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccountMutation.mutateAsync({ verificationCode: deleteVerificationCode });
    } catch (err: any) {
      toast.error("Erro ao excluir conta: " + err.message);
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20" style={{ paddingTop: "80px" }}>
      <div className="container max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate("/")} className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="text-3xl font-black tracking-tighter uppercase">MINHA <span className="text-accent">CONTA</span></h1>
        </div>

        {/* Avatar Section */}
        <div className="mb-8">
          <Card className="p-8 bg-card/30 border-border/30 rounded-3xl text-center space-y-6">
            <div className="relative w-32 h-32 mx-auto">
              <img 
                src={previewAvatar || user.avatarUrl || "/assets/default-avatar.jpg"} 
                alt="Avatar" 
                className={`w-full h-full object-cover rounded-[2rem] border-4 border-accent/20 ${isUploading ? "opacity-50" : ""}`}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-10 w-10 bg-accent text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
              >
                <Camera className="h-5 w-5 text-white dark:text-black" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Bem-vindo,</p>
              <h2 className="text-2xl font-black uppercase">{user.name}</h2>
              <p className="text-xs text-muted-foreground mt-2">{user.email}</p>
            </div>
          </Card>

          <Button
            onClick={() => navigate("/orders")}
            className="w-full h-12 rounded-xl bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest mb-4 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            MEUS PEDIDOS
          </Button>

          <Button
            onClick={() => navigate("/wallet-deposit")}
            className="w-full h-12 rounded-xl bg-card/50 border border-border/50 hover:border-accent/50 text-foreground font-black text-xs uppercase tracking-widest mb-4 flex items-center justify-center gap-2"
            variant="outline"
          >
            <Wallet className="h-4 w-4 text-accent" />
            RECARREGAR CARTEIRA
            <span className="text-accent ml-1">R$ {((balance || 0) / 100).toFixed(2).replace(".", ",")}</span>
          </Button>

          <Button
            onClick={() => navigate("/redeem-coupon")}
            className="w-full h-12 rounded-xl bg-card/50 border border-border/50 hover:border-accent/50 text-foreground font-black text-xs uppercase tracking-widest mb-8 flex items-center justify-center gap-2"
            variant="outline"
          >
            <Gift className="h-4 w-4 text-accent" />
            RESGATAR CUPOM
          </Button>
        </div>

        {/* Theme & Accent Selection */}
        <Card className="p-6 bg-card/30 border-border/30 rounded-2xl mb-8 space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Tema</label>
            <div className="flex gap-3">
              <button
                onClick={() => toggleTheme()}
                className={`flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                  theme === "light" ? "bg-accent text-white dark:text-black" : "bg-card/50 border border-border/50 hover:border-accent/50"
                }`}
              >
                <Sun className="h-4 w-4 inline mr-2" />
                Claro
              </button>
              <button
                onClick={() => toggleTheme()}
                className={`flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                  theme === "dark" ? "bg-accent text-white dark:text-black" : "bg-card/50 border border-border/50 hover:border-accent/50"
                }`}
              >
                <Moon className="h-4 w-4 inline mr-2" />
                Escuro
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Cor de Destaque</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setAccentHue(color.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                    accentHue === color.value
                      ? "border-foreground scale-110 shadow-lg"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Edit Profile Form */}
        <Card className="p-8 bg-card/30 border-border/30 rounded-2xl mb-8">
          <form onSubmit={handleUpdateProfile} className="w-full space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome</label>
              <div className="relative flex items-center gap-2">
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-12 rounded-xl bg-background/50 border-2 border-border/50 focus:border-accent font-bold pl-10 flex-1"
                  placeholder="Digite seu nome"
                />
                <Sparkles className="absolute left-3 h-4 w-4 text-accent" />
                
                {/* Green Check Icon - Aparece quando nome é alterado e tem >4 chars */}
                {nameChanged && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    onClick={() => setShowNameConfirm(true)}
                    className="h-10 w-10 rounded-lg bg-green-500/10 border border-green-500/50 flex items-center justify-center hover:bg-green-500/20 transition-all text-green-500 hover:scale-110"
                  >
                    <Check className="h-5 w-5" />
                  </motion.button>
                )}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu E-mail</label>
              <div className="relative">
                <Input 
                  value={user.email} 
                  disabled 
                  className="h-12 rounded-xl bg-muted/30 border-2 border-border/50 font-bold pl-10 opacity-70"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              {!showPasswordFields ? (
                <div className="space-y-3">
                  {!nameChanged && (
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest disabled:opacity-50"
                      disabled={name === user?.name}
                    >
                      SALVAR ALTERAÇÕES
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordFields(true)}
                    className="w-full h-12 rounded-xl border-2 border-accent/20 hover:border-accent/40 hover:bg-accent/5 font-black text-xs uppercase tracking-widest"
                  >
                    <Lock className="h-4 w-4 mr-2 text-accent" />
                    ALTERAR SENHA
                  </Button>
                </div>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!codeSent ? (
                    <Button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || !newPassword || !confirmNewPassword || passwordsMatch !== true}
                      className="w-full h-12 rounded-xl bg-accent/10 border-2 border-accent/30 hover:bg-accent/20 font-black text-xs uppercase tracking-widest text-accent disabled:opacity-50"
                    >
                      {isSendingCode ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Enviar Código de Verificação
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código de Verificação (4 dígitos)</label>
                      <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.slice(0, 4))}
                        className="h-12 rounded-xl bg-background/50 border-2 border-border/50 focus:border-accent font-black text-center text-lg tracking-widest"
                        placeholder="0000"
                        maxLength={4}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setVerificationCode("");
                        setCodeSent(false);
                      }}
                      variant="ghost"
                      className="flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-12 rounded-xl bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest disabled:opacity-50"
                      disabled={updateProfile.isPending || !verificationCode}
                    >
                      {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Confirmar Alteração
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Card>



        {/* Delete Account Section */}
        <Card className="p-8 bg-destructive/5 border border-destructive/20 rounded-2xl">
          <h3 className="text-xl font-black uppercase mb-4 text-destructive">Zona de Perigo</h3>
          <p className="text-xs text-muted-foreground mb-6">Excluir sua conta é permanente e não pode ser desfeito.</p>
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-black text-xs uppercase tracking-widest"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Excluir Minha Conta Permanentemente
          </Button>
        </Card>
      </div>

      {/* Modal de Confirmação de Nome */}
      <AnimatePresence>
        {showNameConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNameConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/50 rounded-2xl p-8 max-w-sm w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <Check className="h-12 w-12 text-green-500 mx-auto" />
              </div>
              
              <div className="bg-background/50 rounded-xl p-4 text-center space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Você está alterando seu nome para</p>
                  <p className="text-2xl font-black text-accent uppercase">{name}</p>
                </div>
                <p className="text-xl font-black uppercase">Você confirma?</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowNameConfirm(false)}
                  variant="ghost"
                  className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-widest"
                >
                  não
                </Button>
                <Button
                  onClick={handleConfirmNameChange}
                  className="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  sim
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-destructive/20 rounded-2xl p-8 max-w-sm w-full space-y-6"
            >
              <div className="text-center space-y-2">
                <X className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-black uppercase">Excluir Conta</h2>
                <p className="text-xs text-muted-foreground">Esta ação é permanente</p>
              </div>

              {!showDeleteCodeInput ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">Vamos enviar um código de verificação para seu e-mail.</p>
                  <Button
                    onClick={() => {
                      handleSendCode();
                      setShowDeleteCodeInput(true);
                    }}
                    className="w-full h-11 rounded-xl bg-accent/10 border-2 border-accent/30 hover:bg-accent/20 font-black text-xs uppercase tracking-widest text-accent"
                  >
                    Enviar Código
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    value={deleteVerificationCode}
                    onChange={(e) => setDeleteVerificationCode(e.target.value.slice(0, 6))}
                    className="h-12 rounded-xl bg-background/50 border-2 border-border/50 focus:border-accent font-black text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setShowDeleteCodeInput(false);
                        setDeleteVerificationCode("");
                      }}
                      variant="ghost"
                      className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-widest"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                      disabled={isDeleting || !deleteVerificationCode}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
