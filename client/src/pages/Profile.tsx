import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, ShoppingBag, Moon, Sun, Camera, Check, Loader2, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const searchParams = new URLSearchParams(window.location.search);
  const isOnboarding = searchParams.get("onboarding") === "true";

  const { data: orders } = trpc.orders.list.useQuery();
  
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil.");
    }
  });

  const getUploadUrl = trpc.auth.getUploadUrl.useMutation();

  const [isDark, setIsDark] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatarUrl(user.avatarUrl || "");
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
    updateProfile.mutate({ name, avatarUrl });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      
      // 1. Obter URL de upload
      const result = await getUploadUrl.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      const { uploadUrl, publicUrl } = result as any;

      // 2. Upload direto para o S3
      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResp.ok) throw new Error("Falha no upload");

      // 3. Atualizar estado e banco
      setAvatarUrl(publicUrl);
      updateProfile.mutate({ avatarUrl: publicUrl });
      
      toast.success("Foto atualizada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Você precisa estar logado</p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isOnboarding && (
        <div className="bg-accent text-accent-foreground py-3 px-4 text-center font-black uppercase tracking-widest text-xs animate-pulse">
          Bem-vindo! Por favor, confirme seu nome e foto de perfil abaixo.
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl">
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
                <div className="relative mb-8 group">
                  <div className="h-32 w-32 rounded-[2.5rem] bg-accent/10 flex items-center justify-center overflow-hidden border-2 border-accent/20 relative">
                    <img 
                      src={avatarUrl || "/assets/default-avatar.jpg"} 
                      alt={user.name || "Avatar"} 
                      className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-30' : 'opacity-100'}`} 
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-accent animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute -bottom-2 -right-2 p-3 bg-accent text-accent-foreground rounded-2xl shadow-xl hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
                    title="Trocar Foto"
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
                    <p className="text-[10px] text-muted-foreground ml-1 font-medium">O nome será atualizado automaticamente ao clicar no check.</p>
                  </div>

                  <div className="w-full space-y-4 pt-4 text-left">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">E-mail da Conta</span>
                      <p className="font-bold text-sm truncate">{user.email}</p>
                    </div>

                  </div>

                  <Button
                    variant="outline"
                    type="button"
                    className="w-full h-14 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive font-black transition-all mt-4"
                    onClick={logout}
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
                  <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-50" />
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
