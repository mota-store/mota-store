import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Download } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Impede o navegador de mostrar o prompt automático
      e.preventDefault();
      // Salva o evento para ser disparado depois
      setDeferredPrompt(e);
      // Verifica se o usuário já fechou o banner nesta sessão
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação
    deferredPrompt.prompt();

    // Espera pela resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Limpa o prompt salvo
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <img src="/icon-192x192.png" alt="Mota Store" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Instalar Mota Store</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">Adicione à sua tela inicial para acesso rápido.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleInstallClick}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-white dark:text-black font-black text-[10px] uppercase tracking-widest px-4 py-5 rounded-2xl shadow-lg shadow-accent/20"
          >
            <Download className="h-3 w-3 mr-1.5 text-white dark:text-black" /> Instalar
          </Button>
          <button 
            onClick={handleDismiss}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
