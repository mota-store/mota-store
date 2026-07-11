import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Lock, Eye, EyeOff, Users, ShoppingCart, Package, Gift, DollarSign, LogOut, ArrowLeft, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_COOKIE = "admin_session";

function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const resp = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await resp.json();
      if (data.success) {
        document.cookie = `${ADMIN_COOKIE}=true; path=/; max-age=86400`;
        navigate("/admin");
        window.location.reload();
      } else {
        toast.error("Usuário ou senha incorretos");
      }
    } catch (err) {
      toast.error("Erro ao conectar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Card className="p-10 bg-card/40 border-border/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-sm w-full mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/10 mb-4">
            <Lock className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Painel <span className="text-accent">Admin</span></h1>
          <p className="text-xs text-muted-foreground mt-2">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Usuário</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="whtxz" className="bg-background/50 rounded-xl border-border/50" />
          </div>
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Senha</label>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background/50 rounded-xl border-border/50 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[28px] text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-white dark:text-black font-black py-7 rounded-[1.5rem] shadow-xl shadow-accent/20 uppercase tracking-widest">
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// Verificar se está logado como admin
function checkAdminSession() {
  if (typeof document === "undefined") return false;
  const cookies = document.cookie.split("; ");
  return cookies.some(c => c.startsWith(`${ADMIN_COOKIE}=`));
}

function AdminDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"users" | "products" | "coupons" | "orders">("users");
  const [userSearch, setUserSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [showAddCoupon, setShowAddCoupon] = useState(false);

  // Admin queries
  const { data: allUsers, refetch: refetchUsers } = trpc.admin.listUsers.useQuery();
  const { data: allProducts, refetch: refetchProducts } = trpc.admin.listAllProducts.useQuery();
  const { data: allCoupons, refetch: refetchCoupons } = trpc.admin.listCoupons.useQuery();
  const { data: allOrders, refetch: refetchOrders } = trpc.admin.listAllOrders.useQuery();

  // Admin mutations
  const addUserBalance = trpc.admin.addUserBalance.useMutation({
    onSuccess: () => { refetchUsers(); toast.success("Saldo adicionado!"); },
    onError: () => toast.error("Erro ao adicionar saldo"),
  });
  const createCoupon = trpc.admin.createCoupon.useMutation({
    onSuccess: () => { refetchCoupons(); setShowAddCoupon(false); toast.success("Cupom criado!"); },
    onError: (err: any) => toast.error(`Erro ao criar cupom: ${err.message || "Erro desconhecido"}`),
  });
  const toggleCoupon = trpc.admin.toggleCoupon.useMutation({
    onSuccess: () => { refetchCoupons(); toast.success("Cupom atualizado"); },
  });
  const deleteCoupon = trpc.admin.deleteCoupon.useMutation({
    onSuccess: () => { refetchCoupons(); toast.success("Cupom excluído"); },
    onError: (err: any) => toast.error("Erro ao excluir cupom: " + (err.message || "Erro desconhecido")),
  });
  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: () => { 
      refetchProducts(); 
      setShowAddProduct(false); 
      setNewProduct({
        name: "", description: "", price: "", trialDays: "30", benefits: "", imageUrl: "",
        affiliateLink: "", category: "video",
      });
      toast.success("Produto criado!"); 
    },
    onError: () => toast.error("Erro ao criar produto"),
  });
  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { 
      refetchProducts(); 
      setEditingProduct(null);
      setShowAddProduct(false);
      toast.success("Produto atualizado!"); 
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });
  const deleteProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => { 
      refetchProducts(); 
      setIsDeleting(null);
      toast.success("Produto excluído permanentemente!"); 
    },
    onError: () => {
      setIsDeleting(null);
      toast.error("Erro ao excluir produto");
    }
  });

  // Transações de usuário
  const userTransactions = trpc.admin.getUserTransactions.useQuery(
    { userId: expandedUserId || 0 }, 
    { enabled: !!expandedUserId }
  );

  const handleLogout = () => {
    document.cookie = `${ADMIN_COOKIE}=; path=/; max-age=0`;
    navigate("/");
    window.location.reload();
  };

  // Novo produto form
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", trialDays: "30", benefits: "", imageUrl: "",
    affiliateLink: "", category: "video",
  });

  // Novo cupom form
  const [newCoupon, setNewCoupon] = useState({
    code: "", value: "", maxRedemptions: "1", description: "", expiresAt: "",
  });

  if (!checkAdminSession()) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-background pt-24 px-4 pb-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-auto items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => navigate("/")} className="text-accent hover:text-accent/80 flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
              <ArrowLeft className="h-5 w-5" /> Voltar
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">MOTA STORE — <span className="text-accent">ADMIN</span></h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Gerencie sua loja com facilidade</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive font-black uppercase tracking-widest text-xs">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mt-24">
        <div className="flex gap-2 mb-8">
          {([
            { key: "users", label: "Usuários", icon: <Users className="h-4 w-4" /> },
            { key: "products", label: "Produtos", icon: <Package className="h-4 w-4" /> },
            { key: "coupons", label: "Cupons", icon: <Gift className="h-4 w-4" /> },
            { key: "orders", label: "Pedidos", icon: <ShoppingCart className="h-4 w-4" /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                activeTab === tab.key
                  ? "bg-accent text-white dark:text-black shadow-lg shadow-accent/20"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black uppercase tracking-tighter">{allUsers?.length} Usuários</h2>
                <div className="px-4 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                    Saldo total: <span className="text-xs ml-1">R$ {((allUsers?.reduce((acc, user) => acc + user.balance, 0) || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-background/50 rounded-xl border-border/50"
              />
            </div>

            {(() => {
              const filteredUsers = allUsers?.filter(user => 
                (user.name?.toLowerCase().includes(userSearch.toLowerCase())) ||
                (user.email?.toLowerCase().includes(userSearch.toLowerCase()))
              );

              if (filteredUsers?.length === 0) {
                return (
                  <div className="text-center py-10 bg-card/20 rounded-2xl border border-dashed border-border/40">
                    <p className="text-muted-foreground font-medium">Nenhum usuário encontrado</p>
                  </div>
                );
              }

              return filteredUsers?.map(user => (
              <Card key={user.id} className="bg-card/30 border-border/40 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                >
<div className="flex items-center gap-4 min-w-0 flex-1">
	                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted flex-shrink-0">
	                      <img src={user.avatarUrl || "/assets/default-avatar.jpg"} alt="" className="w-full h-full object-cover" />
	                    </div>
	                    <div className="min-w-0">
	                      <p className="font-black text-sm truncate">{user.name || user.email?.split("@")[0] || `Usuário #${user.id}`}</p>
	                      <p className="text-[10px] text-muted-foreground truncate">{user.email || "Sem email"}</p>
	                      <p className="text-[9px] text-muted-foreground">Desde: {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
	                    </div>
	                  </div>
	                  <div className="flex items-center gap-4 flex-shrink-0 ml-2">
	                    <div className="text-right">
	                      <p className="text-xs font-black text-accent">R$ {(user.balance / 100).toFixed(2).replace(".", ",")}</p>
	                      <p className="text-[9px] text-muted-foreground font-medium">{(user as any).orderCount ?? 0} compras</p>
	                    </div>
	                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-accent/10 text-accent">{user.role}</span>
	                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
	                      user.loginMethod === "email" ? "bg-blue-500/10 text-blue-500" :
	                      user.loginMethod === "google" ? "bg-red-500/10 text-red-500" :
	                      user.loginMethod === "github" ? "bg-gray-500/10 text-gray-500" :
	                      "bg-muted/10 text-muted-foreground"
	                    }`}>
	                      {user.loginMethod || "desconhecido"}
	                    </span>
                    {expandedUserId === user.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedUserId === user.id && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border/30">
                    {/* Add balance */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Valor em reais (ex: 5.00)"
                        className="bg-background/50 rounded-xl border-border/50 max-w-xs"
                        id={`balance-${user.id}`}
                      />
		                      <Button
		                        size="sm"
		                        disabled={addUserBalance.isPending}
		                        onClick={() => {
		                          const input = document.getElementById(`balance-${user.id}`) as HTMLInputElement;
		                          const val = parseFloat(input.value);
		                          if (!val || val <= 0) { toast.error("Valor inválido"); return; }
		                          if (val < 1) { toast.error("Mínimo R$ 1,00"); return; }
		                          addUserBalance.mutate({ userId: user.id, amount: Math.round(val * 100) }, {
                                onSuccess: () => {
                                  input.value = "";
                                  userTransactions.refetch();
                                }
                              });
		                        }}
		                        className="bg-green-600 hover:bg-green-700 font-black text-xs uppercase tracking-widest"
		                      >
		                        {addUserBalance.isPending ? (
                              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                            ) : (
                              <DollarSign className="h-3 w-3 mr-1" />
                            )}
                            {addUserBalance.isPending ? "Processando..." : "Créditar"}
		                      </Button>
                    </div>

                    {/* Transactions */}
                    {userTransactions?.data && userTransactions.data.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Histórico de transações</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {userTransactions.data.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/10">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${tx.amount >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="font-medium">{tx.type === "admin_credit" ? "Crédito Admin" : tx.type === "purchase" ? "Compra" : tx.type === "coupon" ? "Cupom" : tx.type}</span>
                                {tx.description && <span className="text-muted-foreground text-[10px]">- {tx.description}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-black ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                                  {tx.amount >= 0 ? "+" : ""}R$ {(Math.abs(tx.amount) / 100).toFixed(2).replace(".", ",")}
                                </span>
                                <span className="text-[9px] text-muted-foreground tabular-nums">Saldo: R$ {(tx.newBalance / 100).toFixed(2).replace(".", ",")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ));
            })()}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tighter">Produtos ({allProducts?.length || 0})</h2>
<Button onClick={() => setShowAddProduct(true)} className="bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest">
	                <Plus className="h-4 w-4 mr-1" /> Novo Produto
	              </Button>
            </div>

            {allProducts?.map(product => (
              <Card key={product.id} className="bg-card/30 border-border/40 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mt-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm">{product.name}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${product.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {product.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{product.category} • R$ {(product.price / 100).toFixed(2).replace(".", ",")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct({
                          ...product,
                          price: (product.price / 100).toString(),
                          trialDays: product.trialDays.toString()
                        });
                        setShowAddProduct(true);
                      }}
                      className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      disabled={isDeleting === product.id}
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este produto permanentemente?")) {
                          setIsDeleting(product.id);
                          deleteProduct.mutate({ productId: product.id });
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Add/Edit Product Form */}
            {showAddProduct && (
              <Card className="p-6 bg-card/40 border-accent/30 rounded-2xl">
                <h3 className="font-black text-sm uppercase tracking-widest mb-4">
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Nome</label>
                    <Input 
                      value={editingProduct ? editingProduct.name : newProduct.name} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} 
                      className="bg-background/50 rounded-xl" placeholder="Spotify Premium" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Preço (R$)</label>
                    <Input 
                      value={editingProduct ? editingProduct.price : newProduct.price} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: e.target.value}) : setNewProduct({...newProduct, price: e.target.value})} 
                      className="bg-background/50 rounded-xl" placeholder="10.00" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Categoria</label>
                    <Input 
                      value={editingProduct ? editingProduct.category : newProduct.category} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})} 
                      className="bg-background/50 rounded-xl" placeholder="Streaming" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Dias Trial</label>
                    <Input 
                      type="number" 
                      value={editingProduct ? editingProduct.trialDays : newProduct.trialDays} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, trialDays: e.target.value}) : setNewProduct({...newProduct, trialDays: e.target.value})} 
                      className="bg-background/50 rounded-xl" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Descrição</label>
                    <Input 
                      value={editingProduct ? editingProduct.description : newProduct.description} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} 
                      className="bg-background/50 rounded-xl" placeholder="Descrição do produto..." 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">URL da Imagem</label>
                    <Input 
                      value={editingProduct ? editingProduct.imageUrl : newProduct.imageUrl} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, imageUrl: e.target.value}) : setNewProduct({...newProduct, imageUrl: e.target.value})} 
                      className="bg-background/50 rounded-xl" placeholder="https://..." 
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Benefícios (JSON)</label>
                    <Input 
                      value={editingProduct ? editingProduct.benefits : newProduct.benefits} 
                      onChange={e => editingProduct ? setEditingProduct({...editingProduct, benefits: e.target.value}) : setNewProduct({...newProduct, benefits: e.target.value})} 
                      className="bg-background/50 rounded-xl" placeholder='["Benefício 1", "Benefício 2"]' 
                    />
                  </div>
                  {editingProduct && (
                    <div className="col-span-2 flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="is-active" 
                        checked={editingProduct.isActive === 1 || editingProduct.isActive === true} 
                        onChange={e => setEditingProduct({...editingProduct, isActive: e.target.checked ? 1 : 0})}
                      />
                      <label htmlFor="is-active" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Produto Ativo</label>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    disabled={createProduct.isPending || updateProduct.isPending}
                    onClick={() => {
                      const data = editingProduct || newProduct;
                      if (!data.name || !data.price) {
                        toast.error("Preencha os campos obrigatórios");
                        return;
                      }
                      
                      if (editingProduct) {
                        updateProduct.mutate({
                          id: editingProduct.id,
                          name: editingProduct.name,
                          price: Math.round(parseFloat(editingProduct.price) * 100),
                          trialDays: parseInt(editingProduct.trialDays),
                          description: editingProduct.description,
                          benefits: editingProduct.benefits,
                          imageUrl: editingProduct.imageUrl,
                          affiliateLink: editingProduct.affiliateLink || "",
                          category: editingProduct.category,
                          isActive: editingProduct.isActive
                        });
                      } else {
                        createProduct.mutate({
                          name: newProduct.name,
                          price: Math.round(parseFloat(newProduct.price) * 100),
                          trialDays: parseInt(newProduct.trialDays),
                          description: newProduct.description,
                          benefits: newProduct.benefits,
                          imageUrl: newProduct.imageUrl,
                          affiliateLink: newProduct.affiliateLink || "",
                          category: newProduct.category,
                        });
                      }
                    }} className="bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest"
                  >
                    {createProduct.isPending || updateProduct.isPending ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Criar Produto"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAddProduct(false); setEditingProduct(null); }} className="font-black text-xs uppercase tracking-widest">
                    Cancelar
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* COUPONS TAB */}
        {activeTab === "coupons" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tighter">Cupons ({allCoupons?.length || 0})</h2>
<Button onClick={() => setShowAddCoupon(true)} className="bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest">
                  <Plus className="h-4 w-4 mr-1" /> Novo Cupom
                </Button>
            </div>

            {allCoupons?.map(coupon => (
              <Card key={coupon.id} className="bg-card/30 border-border/40 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${coupon.isActive ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      <Gift className={`h-5 w-5 ${coupon.isActive ? "text-green-500" : "text-red-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm">{coupon.code}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          coupon.expiresAt && new Date(coupon.expiresAt) < new Date()
                            ? "bg-gray-500/10 text-gray-500"
                            : coupon.isActive
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}>
                          {coupon.expiresAt && new Date(coupon.expiresAt) < new Date()
                            ? "Expirado"
                            : coupon.isActive
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Valor: R$ {(coupon.value / 100).toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-[10px] font-semibold text-accent mt-1">
                        {coupon.currentRedemptions} / {coupon.maxRedemptions} resgates
                      </p>
                      {coupon.expiresAt && (
                        <p className="text-[10px] text-muted-foreground">
                          Expira: {new Date(coupon.expiresAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {coupon.description && <p className="text-[10px] text-muted-foreground">{coupon.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleCoupon.mutate({ couponId: coupon.id, isActive: !coupon.isActive })}
                      className="p-2 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      title={coupon.isActive ? "Desativar" : "Ativar"}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.")) {
                          deleteCoupon.mutate({ couponId: coupon.id });
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Add Coupon Form */}
            {showAddCoupon && (
              <Card className="p-6 bg-card/40 border-accent/30 rounded-2xl">
                <h3 className="font-black text-sm uppercase tracking-widest mb-4">Novo Cupom</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Código</label>
                    <Input value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} className="bg-background/50 rounded-xl" placeholder="PROMO20" maxLength={50} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Valor (R$)</label>
                    <Input type="number" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: e.target.value})} className="bg-background/50 rounded-xl" placeholder="10.00" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Máx. Resgates</label>
                    <Input type="number" value={newCoupon.maxRedemptions} onChange={e => setNewCoupon({...newCoupon, maxRedemptions: e.target.value})} className="bg-background/50 rounded-xl" placeholder="1" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Descrição</label>
                    <Input value={newCoupon.description} onChange={e => setNewCoupon({...newCoupon, description: e.target.value})} className="bg-background/50 rounded-xl" placeholder="Cupom de promoção..." />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Data de Expiração (opcional)</label>
                    <Input type="date" value={newCoupon.expiresAt} onChange={e => setNewCoupon({...newCoupon, expiresAt: e.target.value})} className="bg-background/50 rounded-xl" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
<Button onClick={() => {
	                    createCoupon.mutate({
	                      code: newCoupon.code.toUpperCase(),
	                      value: Math.round(parseFloat(newCoupon.value) * 100),
	                      maxRedemptions: parseInt(newCoupon.maxRedemptions) || 1,
	                      description: newCoupon.description || undefined,
	                      expiresAt: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : undefined,
	                    });
	                  }} className="bg-accent text-white dark:text-black font-black text-xs uppercase tracking-widest">
		                    Criar Cupom
		                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddCoupon(false)} className="font-black text-xs uppercase tracking-widest">
                    Cancelar
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tighter">Pedidos ({allOrders?.length || 0})</h2>
            </div>
            {allOrders?.map(order => (
              <Card key={order.id} className="bg-card/30 border-border/40 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-sm">Pedido #{order.id}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {order.userName || "Usuário desconhecido"} ({order.userEmail || "—"})
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-accent text-sm">R$ {(order.totalAmount / 100).toFixed(2).replace(".", ",")}</p>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      order.status === "completed" ? "bg-green-500/10 text-green-500" :
                      order.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                      order.status === "failed" ? "bg-red-500/10 text-red-500" :
                      "bg-muted/10 text-muted-foreground"
                    }`}>
                      {order.status}
                    </span>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {order.paymentMethod === "balance" ? "💰 Saldo" : "📱 PIX"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  if (!checkAdminSession()) {
    return <AdminLogin />;
  }
  return <AdminDashboard />;
}
