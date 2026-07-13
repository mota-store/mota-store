import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Gift, ArrowLeft, CheckCircle2, XCircle, ArrowRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function RedeemCoupon() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; value?: number; error?: string } | null>(null);

  const redeemCoupon = trpc.coupon.redeem.useMutation();
  const { data: balance } = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated });

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedeeming) return;
    
    if (!isAuthenticated) {
      toast.error("Você precisa estar logado para resgatar cupons");
      return;
    }
    if (!code.trim()) {
      toast.error("Digite um código de cupom");
      return;
    }
    setIsRedeeming(true);
    setRedeemResult(null);
    try {
      const result = await redeemCoupon.mutateAsync({ code: code.trim().toUpperCase() });
      setRedeemResult({ success: result.success, value: result.value, error: result.error });
      if (result.success) {
        toast.success(`Cupom resgatado com sucesso! R$ ${((result.value ?? 0) / 100).toFixed(2).replace(".", ",")} creditados.`);
        // Voltar para o perfil após 3 segundos
        setTimeout(() => {
          navigate("/profile");
        }, 3000);
      } else {
        toast.error(result.error || "Erro ao resgatar cupom");
      }
    } catch (err) {
      toast.error("Erro ao resgatar cupom");
      setRedeemResult({ success: false, error: "Erro na conexão" });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-10 bg-card/40 border-border/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center">
          <Gift className="h-12 w-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-black tracking-tighter uppercase mb-2">Acesso Restrito</h2>
          <p className="text-xs text-muted-foreground mb-6">Você precisa estar logado para resgatar cupons</p>
          <Button onClick={() => navigate("/login")} className="bg-accent dark:text-black font-black rounded-2xl px-8 py-6 w-full uppercase tracking-widest">
            Fazer Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="p-10 bg-card/40 border-border/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="text-accent hover:text-accent/80 flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest">
            Saldo: R$ {(balance || 0) / 100 > 0 ? ((balance || 0) / 100).toFixed(2).replace(".", ",") : "0,00"}
          </div>
        </div>

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/10 mb-4"
          >
            <Gift className="h-8 w-8 text-accent" />
          </motion.div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Resgatar <span className="text-accent">Cupom</span></h1>
          <p className="text-xs text-muted-foreground mt-2">Digite o código do seu cupom abaixo</p>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Código do Cupom</label>
            <Input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setRedeemResult(null); }}
              placeholder="PROMO20"
              maxLength={50}
              className="bg-background/50 rounded-xl border-border/50 text-center font-black text-lg tracking-widest uppercase"
              disabled={isRedeeming || redeemResult?.success === true}
            />
          </div>

          {redeemResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border text-center ${
                redeemResult.success
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-red-500/10 border-red-500/20"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {redeemResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <p className={`font-black text-sm ${redeemResult.success ? "text-green-500" : "text-red-500"}`}>
                  {redeemResult.success ? "Cupom Resgatado!" : redeemResult.error}
                </p>
              </div>
              {redeemResult.success && (
                <p className="text-accent font-black text-2xl mt-2">
                  + R$ {((redeemResult.value ?? 0) / 100).toFixed(2).replace(".", ",")}
                </p>
              )}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={isRedeeming || !code.trim() || redeemResult?.success === true}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black py-7 rounded-[1.5rem] shadow-xl shadow-accent/20 transition-all active:scale-95 uppercase tracking-widest text-sm"
          >
            {isRedeeming ? "Resgatando..." : (
              redeemResult?.success === true ? (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Resgatado! Voltar
                </>
              ) : (
                <>
                  Resgatar Cupom
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )
            )}
          </Button>
        </form>

        {redeemResult?.success && (
          <div className="mt-6 p-4 rounded-2xl bg-accent/5 border border-accent/10 text-center animate-pulse">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">Retornando ao seu perfil em instantes...</p>
          </div>
        )}
      </Card>
    </div>
  );
}
