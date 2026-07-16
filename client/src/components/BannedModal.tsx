import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BannedModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMsg: string;
  email?: string;
}

export function BannedModal({ isOpen, onClose, errorMsg, email }: BannedModalProps) {
  const whatsappNumber = "5591984886473";
  const supportMessage = email 
    ? `Olá, minha conta ${email} foi banida. Preciso de suporte.`
    : "Olá, minha conta foi banida. Preciso de suporte.";
  
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(supportMessage)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl shadow-red-500/10"
            >
              <div className="p-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-6">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">
                  Acesso Restrito
                </h2>
                
                <p className="text-white/70 text-sm font-medium leading-relaxed mb-8">
                  {errorMsg || "Sua conta está banida. Entre em contato com o suporte."}
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={() => window.open(whatsappLink, "_blank")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Suporte no WhatsApp
                  </Button>
                  
                  <button
                    onClick={onClose}
                    className="w-full text-white/40 hover:text-white/60 text-xs font-bold uppercase tracking-widest py-2 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
