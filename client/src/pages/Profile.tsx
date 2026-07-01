import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, ShoppingBag, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: orders } = trpc.orders.list.useQuery();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

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
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          <span className="text-xl font-bold text-accent">MOTA STORE</span>
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={isDark ? "Modo claro" : "Modo escuro"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-accent">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-1">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-6 break-all">{user.email}</p>

                <div className="w-full space-y-3 mb-6 text-left">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Membro desde:</span>
                    <p className="font-semibold">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Método de login:</span>
                    <p className="font-semibold capitalize">
                      {user.loginMethod === "google" ? "Google" : "Email"}
                    </p>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="w-full mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Tema:</p>
                  <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-background hover:bg-background/80 transition-colors text-sm font-medium"
                  >
                    {isDark ? (
                      <>
                        <Sun className="h-4 w-4" />
                        Modo Claro
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        Modo Escuro
                      </>
                    )}
                  </button>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </Card>
          </div>

          {/* Orders Section */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Histórico de Compras</h3>
              <p className="text-muted-foreground">
                {orders && orders.length > 0
                  ? `Você tem ${orders.length} pedido${orders.length !== 1 ? "s" : ""}`
                  : "Nenhuma compra realizada ainda"}
              </p>
            </div>

            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Pedido #{order.id}</p>
                        <p className="text-2xl font-bold text-accent">
                          R$ {(order.totalAmount / 100).toFixed(2)}
                        </p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ml-4 ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                        }`}
                      >
                        {order.status === "completed"
                          ? "✓ Concluído"
                          : order.status === "pending"
                          ? "⏳ Pendente"
                          : "✕ Cancelado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {order.paymentMethod && (
                        <span className="capitalize">{order.paymentMethod}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6">
                  Você ainda não realizou nenhuma compra
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-accent hover:bg-accent/90"
                >
                  Explorar Ofertas
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
